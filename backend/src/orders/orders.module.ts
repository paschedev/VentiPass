import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PaymentsModule } from '../payments/payments.module';
import { BullModule } from '@nestjs/bullmq';
import { OrdersProcessor } from './orders.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersRepository } from './repositories/orders.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PaymentsModule,
    PrismaModule,
    AuthModule,
    BullModule.registerQueue({
      name: 'orders',
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersProcessor, OrdersRepository],
})
export class OrdersModule {}
