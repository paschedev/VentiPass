import { Module } from '@nestjs/common';
import { PresetsService } from './presets.service';
import { PresetsController } from './presets.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PresetsController],
  providers: [PresetsService],
  exports: [PresetsService],
})
export class PresetsModule {}
