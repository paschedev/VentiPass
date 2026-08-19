import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OrdersRepository } from './repositories/orders.repository';
import { PaymentsService } from '../payments/payments.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private paymentsService: PaymentsService,
    @InjectQueue('orders') private ordersQueue: Queue,
  ) {}

  async createCheckoutSession(userId: string, items: { ticketTypeId: string; quantity: number }[], promoterId?: string) {
    // 1. Transaction to reserve stock and create order in PENDING status
    const { order, mpItems, serviceFee, organizer } = await this.ordersRepository.createCheckoutOrderTransaction(userId, items, promoterId);

    // 2. Schedule expiration job (Queue doesn't hold the DB connection)
    await this.ordersQueue.add('expire-order', { orderId: order.id }, { delay: 10 * 60 * 1000 });

    // 3. Create Mercado Pago preference OUTSIDE the DB transaction to avoid blocking resources
    let initPoint = '';
    try {
      const res = await this.paymentsService.createPreference(order.id, mpItems, serviceFee, organizer.mercadoPagoAccessToken || undefined);
      initPoint = res.initPoint || '';
    } catch (error) {
      this.logger.error('Error creating preference:', error);
      
      // If external payment API fails, rollback stock manually
      await this.ordersRepository.markOrderFailedAndRollbackStock(order.id);
      
      throw new BadRequestException('Fallo de conexión con Mercado Pago. Es posible que el token del organizador sea inválido o haya caducado.');
    }

    return { orderId: order.id, checkoutUrl: initPoint };
  }

  async createDevBypassOrder(userId: string, items: { ticketTypeId: string; quantity: number }[], promoterId?: string) {
    // 1. Transaction to reserve stock and create order in PENDING status
    const { order, mpItems, serviceFee, organizer } = await this.ordersRepository.createCheckoutOrderTransaction(userId, items, promoterId);

    // 2. We don't schedule expiration because we will pay it immediately

    // 3. Process fake payment
    await this.paymentsService.processDevBypassPayment(order.id, Number(order.totalAmount));

    return { orderId: order.id, success: true };
  }
}
