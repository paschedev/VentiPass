import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsRepository {
  constructor(private prisma: PrismaService) {}

  async updateUserMercadoPagoCredentials(userId: string, data: { accessToken: string; publicKey?: string; userId?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        mercadoPagoAccessToken: data.accessToken,
        mercadoPagoPublicKey: data.publicKey,
        mercadoPagoUserId: data.userId,
      },
    });
  }

  async findPaymentByProviderId(providerPaymentId: string) {
    return this.prisma.payment.findFirst({
      where: { providerPaymentId }
    });
  }

  async processPaymentWebhookTransaction(orderId: string, paymentId: string, transactionAmount: number, generateTicketsCallback: (tx: Prisma.TransactionClient) => Promise<void>) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
        include: { orderItems: true },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: 'MERCADO_PAGO',
          providerPaymentId: paymentId,
          status: 'APPROVED',
          amount: transactionAmount,
        },
      });

      // Execute callback to generate tickets
      await generateTicketsCallback(tx);

      // Calculate promoter commission if a promoter is linked
      if (order.promoterId) {
        const promoter = await tx.eventStaff.findUnique({ where: { id: order.promoterId } });
        if (promoter) {
          let commission = 0;
          if (promoter.commissionType === 'FIXED' && promoter.commissionValue) {
            const ticketCount = order.orderItems.reduce((acc, curr) => acc + curr.quantity, 0);
            commission = Number(promoter.commissionValue) * ticketCount;
          } else if (promoter.commissionType === 'PERCENTAGE' && promoter.commissionValue) {
            commission = Number(order.ticketAmount) * (Number(promoter.commissionValue) / 100);
          }
          
          if (commission > 0) {
            await tx.eventStaff.update({
              where: { id: promoter.id },
              data: { totalEarned: { increment: commission } }
            });
          }
        }
      }

      // Decrement reserved and increment sold
      for (const item of order.orderItems) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: {
            reserved: { decrement: item.quantity },
            sold: { increment: item.quantity }
          }
        });
      }
      
      return order;
    });
  }
}
