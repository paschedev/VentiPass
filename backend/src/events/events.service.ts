import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, StaffRole, CommissionType } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.event.findMany({
      include: {
        ticketBatches: { include: { ticketTypes: true } },
        ticketTypes: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        ticketBatches: { include: { ticketTypes: true } },
        ticketTypes: true,
      },
    });
  }

  async create(userId: string, data: any) {
    const { batches, ...eventData } = data;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new BadRequestException('Usuario no encontrado');
    if (!user.mercadoPagoAccessToken) {
      throw new BadRequestException('Debes vincular Mercado Pago antes de crear un evento');
    }

    const event = await this.prisma.event.create({
      data: {
        ...eventData,
        organizerId: userId
      },
    });

    if (batches && batches.length > 0) {
      await this.updateBatches(event.id, userId, batches);
    }
    return event;
  }

  async update(id: string, organizerId: string, data: any) {
    const { batches, ...eventData } = data;
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event || event.organizerId !== organizerId) {
      throw new BadRequestException('No tienes permiso para editar este evento');
    }

    const updatedEvent = await this.prisma.event.update({
      where: { id },
      data: eventData,
    });

    if (batches) {
      await this.updateBatches(id, organizerId, batches);
    }
    return updatedEvent;
  }

  async findByOrganizer(userId: string) {
    return this.prisma.event.findMany({
      where: { organizerId: userId },
      include: {
        ticketBatches: { include: { ticketTypes: true } },
        ticketTypes: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateBatches(eventId: string, organizerId: string, batchesData: any[]) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketBatches: { include: { ticketTypes: true } } }
    });

    if (!event || event.organizerId !== organizerId) {
      throw new BadRequestException('No tienes permiso sobre este evento');
    }

    return this.prisma.$transaction(async (tx) => {
      const incomingBatchIds = batchesData.filter(b => b.id).map(b => b.id);
      
      const batchesToDelete = event.ticketBatches.filter(b => !incomingBatchIds.includes(b.id));
      for (const b of batchesToDelete) {
        const totalSold = b.ticketTypes.reduce((acc, tt) => acc + tt.sold, 0);
        if (totalSold > 0) {
          throw new BadRequestException(`No puedes eliminar la tanda "${b.name}" porque ya tiene entradas vendidas. Pausa su venta en su lugar.`);
        }
        await tx.ticketType.deleteMany({ where: { batchId: b.id } });
        await tx.ticketBatch.delete({ where: { id: b.id } });
      }

      for (const batch of batchesData) {
        let savedBatch;
        if (batch.id) {
          savedBatch = await tx.ticketBatch.update({
            where: { id: batch.id },
            data: {
              name: batch.name,
              status: batch.status,
              publishAt: batch.publishAt ? new Date(batch.publishAt) : null,
              closeAt: batch.closeAt ? new Date(batch.closeAt) : null,
              publishWhenPreviousSoldOut: batch.publishWhenPreviousSoldOut || false,
            }
          });
        } else {
          savedBatch = await tx.ticketBatch.create({
            data: {
              eventId,
              name: batch.name,
              status: batch.status || 'DRAFT',
              publishAt: batch.publishAt ? new Date(batch.publishAt) : null,
              closeAt: batch.closeAt ? new Date(batch.closeAt) : null,
              publishWhenPreviousSoldOut: batch.publishWhenPreviousSoldOut || false,
            }
          });
        }

        const incomingTypeIds = batch.ticketTypes.filter((t: any) => t.id).map((t: any) => t.id);
        const existingTypes = batch.id ? event.ticketBatches.find(b => b.id === batch.id)?.ticketTypes || [] : [];
        const typesToDelete = existingTypes.filter((t: any) => !incomingTypeIds.includes(t.id));

        for (const t of typesToDelete) {
          if (t.sold > 0) {
            throw new BadRequestException(`No puedes eliminar el ticket "${t.name}" porque ya tiene ventas. Pon su stock en 0 en su lugar.`);
          }
          await tx.ticketType.delete({ where: { id: t.id } });
        }

        for (const tType of batch.ticketTypes) {
          if (tType.id) {
            await tx.ticketType.update({
              where: { id: tType.id },
              data: {
                name: tType.name,
                price: tType.price,
                stock: tType.stock,
                saleStart: savedBatch.publishAt || new Date(),
                saleEnd: savedBatch.closeAt || new Date(Date.now() + 31536000000),
              }
            });
          } else {
            await tx.ticketType.create({
              data: {
                eventId,
                batchId: savedBatch.id,
                name: tType.name,
                price: tType.price,
                stock: tType.stock,
                saleStart: savedBatch.publishAt || new Date(),
                saleEnd: savedBatch.closeAt || new Date(Date.now() + 31536000000),
              }
            });
          }
        }
      }

      return tx.event.findUnique({
        where: { id: eventId },
        include: { ticketBatches: { include: { ticketTypes: true } } }
      });
    });
  }

  async getOrganizerStats(userId: string) {
    const events = await this.prisma.event.findMany({
      where: { organizerId: userId },
      include: {
        ticketTypes: true,
        organizer: true
      }
    });

    let totalSold = 0;
    let totalRevenue = 0;
    const recentSales = []; // We can fetch recent check-ins or sales if we want, but for now we'll just sum.

    events.forEach(event => {
      event.ticketTypes.forEach(tt => {
        totalSold += tt.sold;
        totalRevenue += tt.sold * Number(tt.price);
      });
    });

    return {
      totalEvents: events.length,
      totalTicketsSold: totalSold,
      totalRevenue: totalRevenue,
      activeEvents: events.filter(e => e.status === 'PUBLISHED').length
    };
  }

  async addStaff(eventId: string, organizerId: string, email: string, role: StaffRole, commissionType?: CommissionType, commissionValue?: number) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.organizerId !== organizerId) {
      throw new BadRequestException('No tienes permiso sobre este evento');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Usuario no registrado. Pídele que se registre en WePass primero.');
    }

    // Verificar si ya existe
    const existing = await this.prisma.eventStaff.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } }
    });

    if (existing) {
      return this.prisma.eventStaff.update({
        where: { id: existing.id },
        data: { role, commissionType, commissionValue }
      });
    }

    return this.prisma.eventStaff.create({
      data: {
        eventId,
        userId: user.id,
        role,
        commissionType,
        commissionValue,
      }
    });
  }

  async getEventStaff(eventId: string, organizerId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.organizerId !== organizerId) {
      throw new BadRequestException('No tienes permiso sobre este evento');
    }
    return this.prisma.eventStaff.findMany({
      where: { eventId },
      include: { user: { select: { name: true, email: true } } }
    });
  }

  async getMyPromoterStats(userId: string) {
    const assignments = await this.prisma.eventStaff.findMany({
      where: { userId, role: 'PROMOTER' },
      include: {
        event: { select: { title: true, status: true, startDate: true } }
      },
      orderBy: { event: { startDate: 'desc' } }
    });
    
    const totalEarned = assignments.reduce((acc, curr) => acc + Number(curr.totalEarned), 0);
    const totalPaid = assignments.reduce((acc, curr) => acc + Number(curr.totalPaid), 0);
    
    return {
      isPromoter: assignments.length > 0,
      totalEarned,
      totalPaid,
      pendingBalance: totalEarned - totalPaid,
      events: assignments
    };
  }
}
