import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PresetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizerId: string) {
    let presets = await this.prisma.ticketPreset.findMany({
      where: { organizerId },
      orderBy: { name: 'asc' },
    });

    if (presets.length === 0) {
      const general = await this.prisma.ticketPreset.create({
        data: { organizerId, name: 'General', price: 0 }
      });
      const vip = await this.prisma.ticketPreset.create({
        data: { organizerId, name: 'VIP', price: 0 }
      });
      presets = [general, vip];
    }

    return presets;
  }

  async create(organizerId: string, name: string, price: number) {
    const count = await this.prisma.ticketPreset.count({ where: { organizerId } });
    if (count >= 7) {
      throw new BadRequestException('Has alcanzado el límite máximo de 7 plantillas.');
    }

    return this.prisma.ticketPreset.create({
      data: {
        organizerId,
        name,
        price,
      },
    });
  }

  async update(id: string, organizerId: string, name: string, price: number) {
    const preset = await this.prisma.ticketPreset.findUnique({ where: { id } });
    if (!preset || preset.organizerId !== organizerId) {
      throw new NotFoundException('Plantilla no encontrada');
    }

    return this.prisma.ticketPreset.update({
      where: { id },
      data: { name, price },
    });
  }

  async remove(id: string, organizerId: string) {
    const preset = await this.prisma.ticketPreset.findUnique({ where: { id } });
    if (!preset || preset.organizerId !== organizerId) {
      throw new NotFoundException('Plantilla no encontrada');
    }

    return this.prisma.ticketPreset.delete({
      where: { id },
    });
  }
}
