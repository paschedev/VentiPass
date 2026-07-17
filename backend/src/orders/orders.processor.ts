import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Processor('orders')
export class OrdersProcessor extends WorkerHost {
  private readonly logger = new Logger(OrdersProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'expire-order') {
      const { orderId } = job.data;
      
      try {
        await this.prisma.$transaction(async (tx) => {
          const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { orderItems: true },
          });

          if (!order) return;

          if (order.status === 'PENDING') {
            this.logger.log(`Expiring order ${orderId} due to timeout`);
            
            // Mark order as expired
            await tx.order.update({
              where: { id: orderId },
              data: { status: 'EXPIRED' },
            });

            // Release reserved stock
            for (const item of order.orderItems) {
              await tx.ticketType.update({
                where: { id: item.ticketTypeId },
                data: {
                  reserved: { decrement: item.quantity },
                },
              });
            }
          }
        });
      } catch (error) {
        this.logger.error(`Error expiring order ${orderId}`, error);
        throw error;
      }
    }
  }
}
