import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { TicketsRepository } from './repositories/tickets.repository';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'mail',
    }),
  ],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService],
})
export class TicketsModule {}
