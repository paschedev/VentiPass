import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { TicketsModule } from '../tickets/tickets.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsRepository } from './repositories/payments.repository';

@Module({
  imports: [TicketsModule, PrismaModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
  exports: [PaymentsService],
})
export class PaymentsModule {}
