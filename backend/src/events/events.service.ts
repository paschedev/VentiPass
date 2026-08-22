import { Injectable, BadRequestException } from '@nestjs/common';
import { EventsRepository } from './repositories/events.repository';
import { UserRepository } from '../auth/repositories/user.repository';
import { Prisma, StaffRole, CommissionType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationsService: NotificationsService
  ) {}

  async findAll() {
    return this.eventsRepository.findAll();
  }

  async findOne(id: string) {
    return this.eventsRepository.findOne(id);
  }

  async create(userId: string, data: any) {
    const { batches, ...eventData } = data;
    const user = await this.userRepository.findById(userId);

    if (!user) throw new BadRequestException('Usuario no encontrado');
    if (!user.mercadoPagoAccessToken) {
      throw new BadRequestException('Debes vincular Mercado Pago antes de crear un evento');
    }

    const event = await this.eventsRepository.create({
      ...eventData,
      organizerId: userId
    });

    if (batches && batches.length > 0) {
      await this.updateBatches(event.id, userId, batches);
    }
    return event;
  }

  async update(id: string, organizerId: string, data: any) {
    const { batches, ...eventData } = data;
    const event = await this.eventsRepository.findOne(id);
    if (!event || event.organizerId !== organizerId) {
      throw new BadRequestException('No tienes permiso para editar este evento');
    }

    const updatedEvent = await this.eventsRepository.update(id, eventData);

    if (batches) {
      await this.updateBatches(id, organizerId, batches);
    }
    return updatedEvent;
  }

  async findByOrganizer(userId: string) {
    return this.eventsRepository.findByOrganizer(userId);
  }

  async updateBatches(eventId: string, organizerId: string, batchesData: any[]) {
    const eventContext = await this.eventsRepository.findOne(eventId);

    if (!eventContext || eventContext.organizerId !== organizerId) {
      throw new BadRequestException('No tienes permiso sobre este evento');
    }

    return this.eventsRepository.updateBatchesTransaction(eventId, batchesData, eventContext);
  }

  async getOrganizerStats(userId: string) {
    const events = await this.eventsRepository.getOrganizerEventsWithTickets(userId);

    const eventIds = events.map(e => e.id);

    // Fetch PAID orders containing items from these events
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const paidOrders = await this.eventsRepository.getPaidOrdersForEvents(eventIds, thirtyDaysAgo);

    let totalSold = 0;
    let totalRevenue = 0;
    
    // Calculate totals for ALL time based on ticketTypes.sold
    events.forEach(event => {
      event.ticketTypes.forEach(tt => {
        totalSold += tt.sold;
        totalRevenue += tt.sold * Number(tt.price);
      });
    });

    // Group revenue by day for the last 30 days (for the chart)
    const chartMap = new Map<string, number>();
    // Initialize last 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      chartMap.set(dateStr, 0);
    }

    paidOrders.forEach(order => {
      const dateStr = order.createdAt.toISOString().split('T')[0];
      if (chartMap.has(dateStr)) {
        let orderRevenue = 0;
        order.orderItems.forEach(item => {
          if (eventIds.includes(item.ticketType.eventId)) {
            // Organizer revenue is based on the ticket face value, without EntryPass fee
            orderRevenue += item.quantity * Number(item.unitPrice);
          }
        });
        chartMap.set(dateStr, chartMap.get(dateStr)! + orderRevenue);
      }
    });

    const chartData = Array.from(chartMap.entries()).map(([date, revenue]) => ({
      date,
      revenue
    }));

    return {
      totalEvents: events.length,
      totalTicketsSold: totalSold,
      totalRevenue: totalRevenue,
      activeEvents: events.filter(e => e.status === 'PUBLISHED').length,
      chartData // Returns last 30 days of real revenue
    };
  }

  async getOrganizerStaff(organizerId: string) {
    return this.eventsRepository.getOrganizerStaff(organizerId);
  }

  async addStaff(eventId: string, organizerId: string, email: string, role: StaffRole, commissionType?: CommissionType, commissionValue?: number) {
    const event = await this.eventsRepository.findOne(eventId);
    if (!event || event.organizerId !== organizerId) {
      throw new BadRequestException('No tienes permiso sobre este evento');
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Usuario no registrado. Pídele que se registre en EntryPass primero.');
    }

    // Verificar si ya existe
    const existing = await this.eventsRepository.findEventStaff(eventId, user.id);

    if (existing) {
      return this.eventsRepository.updateEventStaff(existing.id, { role, commissionType, commissionValue });
    }

    const staff = await this.eventsRepository.createEventStaff({
      event: { connect: { id: eventId } },
      user: { connect: { id: user.id } },
      role,
      commissionType,
      commissionValue,
    });

    await this.notificationsService.create({
      userId: user.id,
      type: 'STAFF_INVITE',
      title: `Nueva invitación de Staff`,
      message: `Has sido invitado como ${role === 'PROMOTER' ? 'Relaciones Públicas' : 'Escáner'} para el evento "${event.title}".`,
      eventId: event.id,
      metadata: { role, commissionType, commissionValue, status: 'PENDING' }
    });

    return staff;
  }

  async getEventStaff(eventId: string, organizerId: string) {
    const event = await this.eventsRepository.findOne(eventId);
    if (!event || event.organizerId !== organizerId) {
      throw new BadRequestException('No tienes permiso sobre este evento');
    }
    return this.eventsRepository.getEventStaffByEvent(eventId);
  }

  async getMyPromoterStats(userId: string) {
    const assignments = await this.eventsRepository.getPromoterStats(userId);
    
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

  async getPublicPromoters(eventId: string) {
    const staff = await this.eventsRepository.getEventStaffByEvent(eventId);
    // Return only PROMOTERs with their ID and Name for public use
    return staff
      .filter(s => s.role === 'PROMOTER')
      .map(s => ({
        id: s.userId,
        name: s.user.name,
      }));
  }
}
