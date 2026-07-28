import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    @InjectQueue('orders') private ordersQueue: Queue,
  ) {}

  async createCheckoutSession(userId: string, items: { ticketTypeId: string; quantity: number }[], promoterId?: string) {
    return await this.prisma.$transaction(async (tx) => {
      let ticketAmount = 0;
      const mpItems = [];
      const orderItemsData = [];
      let eventFeePercentage = 0.10;

      for (const item of items) {
        // Find ticket and lock row for update (if using raw queries, otherwise rely on optimistic concurrency or sequential transaction)
        const ticketType = await tx.ticketType.findUnique({
          where: { id: item.ticketTypeId },
          include: { event: { include: { organizer: true } } },
        });

        if (!ticketType) throw new BadRequestException(`TicketType ${item.ticketTypeId} not found`);
        
        // Calculate available stock
        const availableStock = ticketType.stock - ticketType.sold - ticketType.reserved;
        
        if (availableStock < item.quantity) {
          throw new BadRequestException(`Not enough stock for ${ticketType.name}`);
        }

        // Increment reserved stock
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { reserved: { increment: item.quantity } },
        });

        eventFeePercentage = Number(ticketType.event.wePassFeePercentage) / 100;

        const itemTotal = Number(ticketType.price) * item.quantity;
        ticketAmount += itemTotal;

        mpItems.push({
          id: ticketType.id,
          title: `${ticketType.event.title} - ${ticketType.name}`,
          quantity: item.quantity,
          unit_price: Number(ticketType.price),
          currency_id: 'ARS',
        });

        orderItemsData.push({
          ticketTypeId: ticketType.id,
          quantity: item.quantity,
          unitPrice: ticketType.price,
        });
      }

      // Add service fee
      const serviceFee = ticketAmount * eventFeePercentage;
      mpItems.push({
        id: 'service_fee',
        title: 'Cargo por servicio',
        quantity: 1,
        unit_price: serviceFee,
        currency_id: 'ARS',
      });
      const totalAmount = ticketAmount + serviceFee;

      // Create Order in PENDING status
      const order = await tx.order.create({
        data: {
          userId,
          status: 'PENDING',
          totalAmount,
          ticketAmount,
          serviceFee,
          promoterId,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes to pay
          orderItems: {
            create: orderItemsData,
          },
        },
        include: {
          orderItems: {
            include: { ticketType: { include: { event: { include: { organizer: true } } } } }
          }
        }
      });

      // Schedule expiration job
      await this.ordersQueue.add('expire-order', { orderId: order.id }, { delay: 10 * 60 * 1000 });

      // Create Mercado Pago preference (Wait to execute until here to have the order)
      // Note: In a real environment you'd want the preference creation outside the DB transaction if it's slow, 
      // but keeping it here guarantees we rollback reserved stock if MP fails.
      const organizer = order.orderItems[0].ticketType.event.organizer;
      let initPoint = '';
      try {
        const res = await this.paymentsService.createPreference(order.id, mpItems, serviceFee, organizer.mercadoPagoAccessToken || undefined);
        initPoint = res.initPoint || '';
      } catch (error) {
        throw new BadRequestException('Fallo de conexión con Mercado Pago. Es posible que el token del organizador sea inválido o haya caducado.');
      }

      return { orderId: order.id, checkoutUrl: initPoint };
    });
  }
}
