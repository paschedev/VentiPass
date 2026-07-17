import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, StaffRole, CommissionType } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.event.findMany({
      include: {
        ticketTypes: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        ticketTypes: true,
      },
    });
  }

  async create(userId: string, data: Prisma.EventCreateInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new BadRequestException('Usuario no encontrado');
    if (!user.mercadoPagoAccessToken) {
      throw new BadRequestException('Debes vincular Mercado Pago antes de crear un evento');
    }

    return this.prisma.event.create({
      data,
    });
  }

  async findByOrganizer(userId: string) {
    return this.prisma.event.findMany({
      where: { organizerId: userId },
      include: {
        ticketTypes: true,
      },
      orderBy: { createdAt: 'desc' }
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
