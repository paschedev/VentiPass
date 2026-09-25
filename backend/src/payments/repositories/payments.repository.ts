import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsRepository {
  constructor(private prisma: PrismaService) {}

  async updateUserMercadoPagoCredentials(
    userId: string,
    data: { accessToken: string; publicKey?: string; userId?: string },
  ) {
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
      where: { providerPaymentId },
    });
  }

  async processPaymentWebhookTransaction(
    orderId: string,
    paymentId: string,
    transactionAmount: number,
    generateTicketsCallback: (tx: Prisma.TransactionClient) => Promise<void>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch current order state to handle Race Conditions (Late Webhooks)
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: { include: { ticketType: true } } },
      });

      if (!currentOrder) throw new Error(`Order ${orderId} not found`);

      // 2. Check if we are reviving a CANCELLED/EXPIRED order
      const isReviving = currentOrder.status === 'CANCELLED';

      if (isReviving) {
        // Validate stock again because it was released when cancelled
        for (const item of currentOrder.orderItems) {
          const tt = item.ticketType;
          const available = tt.stock - tt.sold - tt.reserved;
          if (available < item.quantity) {
            // LATE WEBHOOK RACE CONDITION FAILED: No stock available
            // Here we should ideally flag it for manual review or refund.
            // For now, we throw an error to prevent DB corruption.
            // A higher level catch should notify admins.
            throw new Error(
              `RACE_CONDITION: Cannot revive order ${orderId}, out of stock for ticket ${tt.name}`,
            );
          }
        }
      }

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
        const promoter = await tx.eventStaff.findUnique({
          where: { id: order.promoterId },
        });
        if (promoter) {
          let commission = 0;
          if (promoter.commissionType === 'FIXED' && promoter.commissionValue) {
            const ticketCount = order.orderItems.reduce(
              (acc, curr) => acc + curr.quantity,
              0,
            );
            commission = Number(promoter.commissionValue) * ticketCount;
          } else if (
            promoter.commissionType === 'PERCENTAGE' &&
            promoter.commissionValue
          ) {
            commission =
              Number(order.ticketAmount) *
              (Number(promoter.commissionValue) / 100);
          }

          if (commission > 0) {
            await tx.eventStaff.update({
              where: { id: promoter.id },
              data: { totalEarned: { increment: commission } },
            });
          }
        }
      }

      // Decrement reserved and increment sold
      for (const item of order.orderItems) {
        if (isReviving) {
          // If reviving, reserved was already decremented by the expiry job.
          // We only increment sold.
          await tx.ticketType.update({
            where: { id: item.ticketTypeId },
            data: {
              sold: { increment: item.quantity },
            },
          });
        } else {
          // Normal flow: transition from reserved to sold
          await tx.ticketType.update({
            where: { id: item.ticketTypeId },
            data: {
              reserved: { decrement: item.quantity },
              sold: { increment: item.quantity },
            },
          });
        }
      }

      return order;
    });
  }
}
