import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Order } from '@prisma/client';

@Injectable()
export class OrdersRepository {
  constructor(private prisma: PrismaService) {}

  async createCheckoutOrderTransaction(userId: string, items: { ticketTypeId: string; quantity: number }[], promoterId?: string) {
    return this.prisma.$transaction(async (tx) => {
      let ticketAmount = 0;
      const mpItems = [];
      const orderItemsData = [];
      let eventFeePercentage = 0.10;
      let organizer: any = null;

      for (const item of items) {
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

        if (!organizer) {
          organizer = ticketType.event.organizer;
        }

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

      return { order, mpItems, serviceFee, organizer };
    });
  }

  async markOrderFailedAndRollbackStock(orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true }
      });

      if (!order || order.status !== 'PENDING') return;

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      });

      for (const item of order.orderItems) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { reserved: { decrement: item.quantity } }
        });
      }
    });
  }
}
