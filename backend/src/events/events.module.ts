import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BatchCronService } from './batch-cron.service';

@Module({
  imports: [PrismaModule],
  controllers: [EventsController],
  providers: [EventsService, BatchCronService]
})
export class EventsModule {}
