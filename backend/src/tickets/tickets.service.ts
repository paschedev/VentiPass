import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as qrcode from 'qrcode';
import { TicketsRepository } from './repositories/tickets.repository';
import { Prisma } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly ticketsRepository: TicketsRepository,
    @InjectQueue('mail') private mailQueue: Queue,
  ) {}

  async generateTicketsForOrder(orderId: string, tx?: Prisma.TransactionClient) {
    const order = await this.ticketsRepository.findOrderWithItems(orderId, tx);

    if (!order) throw new BadRequestException('Orden no encontrada');

    const ticketData: Prisma.TicketCreateManyInput[] = [];
    for (const item of order.orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        ticketData.push({
          orderId: order.id,
          ticketTypeId: item.ticketType.id,
          userId: order.userId,
          // Prisma will generate uuid for qrCode and id automatically
        });
      }
    }

    const createdTickets = await this.ticketsRepository.createTicketsTransaction(order.id, ticketData, tx);

    const generatedTickets = await Promise.all(
      createdTickets.map(async (ticket: any) => {
        const qrDataUrl = await qrcode.toDataURL(ticket.qrCode);
        return {
          id: ticket.id,
          eventName: ticket.ticketType.event.title,
          ticketTypeName: ticket.ticketType.name,
          qrDataUrl,
        };
      })
    );

    this.logger.log(`Generated ${generatedTickets.length} tickets for Order ${order.id}`);

    // Offload email sending to BullMQ
    await this.mailQueue.add('send-tickets', {
      to: order.user.email,
      name: order.user.name,
      tickets: generatedTickets,
    });

    return generatedTickets;
  }

  async findMyTickets(userId: string) {
    return this.ticketsRepository.findMyTickets(userId);
  }

  async validateTicket(qrCode: string, scannerUserId: string) {
    const ticket = await this.ticketsRepository.findTicketForValidation(qrCode);

    if (!ticket) {
      return { success: false, message: 'Entrada inválida o no encontrada' };
    }

    const isStaff = await this.ticketsRepository.findEventStaff(ticket.ticketType.eventId, scannerUserId, 'SCANNER');
    if (!isStaff || isStaff.status !== 'ACCEPTED') {
      throw new BadRequestException('No tienes permisos para validar entradas en este evento');
    }

    if (ticket.status !== 'VALID') {
      return { success: false, message: 'La entrada ya fue utilizada o no es válida' };
    }

    await this.ticketsRepository.markTicketAsUsed(ticket.id);
    return { success: true, message: 'Entrada validada correctamente' };
  }

  async processCheckIn(qrCode: string, scannerId: string, userAgent: string) {
    const ticket = await this.ticketsRepository.findTicketForValidation(qrCode);

    if (!ticket) {
      return { success: false, status: 'INVALID', message: 'INVÁLIDO' };
    }

    // Validar permisos del Scanner en EventStaff o si es el organizador global
    const event = ticket.ticketType.event;
    if (event.organizerId !== scannerId) {
      const staffPermission = await this.ticketsRepository.findEventStaff(event.id, scannerId, 'SCANNER');
      
      // Intentamos validar también MANAGER por si el frontend no distingue bien
      const managerPermission = await this.ticketsRepository.findEventStaff(event.id, scannerId, 'MANAGER');

      if ((!staffPermission || staffPermission.status !== 'ACCEPTED') && 
          (!managerPermission || managerPermission.status !== 'ACCEPTED')) {
        return { success: false, status: 'WRONG_EVENT', message: 'OTRO EVENTO' };
      }
    }

    if (ticket.status === 'USED') {
      return { success: false, status: 'USED', message: 'USADO' };
    }

    if (ticket.status !== 'VALID') {
      return { success: false, status: 'INVALID', message: 'INVÁLIDO' };
    }

    await this.ticketsRepository.processCheckInTransaction(ticket.id, scannerId, userAgent);

    return {
      success: true,
      status: 'VALID',
      message: 'VÁLIDO',
      event: ticket.ticketType.event.title,
      type: ticket.ticketType.name,
      isGuestList: ticket.isGuestList,
    };
  }

  async emitGuestTicket(eventId: string, organizerId: string, email: string, ticketTypeId: string) {
    const event = await this.ticketsRepository.findEvent(eventId);
    if (!event || event.organizerId !== organizerId) {
      throw new BadRequestException('No tienes permiso sobre este evento');
    }

    const ticketType = await this.ticketsRepository.findTicketType(ticketTypeId);
    if (!ticketType || ticketType.eventId !== eventId) {
      throw new BadRequestException('Tipo de ticket inválido');
    }

    // Exigimos que el usuario exista en el sistema, mitigando creación de usuarios falsos (reducción superficie de ataque)
    let targetUser = await this.ticketsRepository.findUserByEmail(email);
    if (!targetUser) {
      throw new BadRequestException('El usuario destino no está registrado. Por favor, indícale que cree una cuenta en VentiPass primero.');
    }

    const ticket = await this.ticketsRepository.createTicket({
      ticketTypeId,
      userId: targetUser.id,
      isGuestList: true,
    });

    const qrDataUrl = await qrcode.toDataURL(ticket.qrCode);

    await this.mailQueue.add('send-tickets', {
      to: targetUser.email,
      name: targetUser.name,
      tickets: [{
        id: ticket.id,
        eventName: event.title,
        ticketTypeName: ticketType.name + ' (Cortesía)',
        qrDataUrl
      }],
    });

    return { success: true, ticketId: ticket.id };
  }

  async transferTicket(ticketId: string, currentUserId: string, targetUserId: string) {
    const targetUser = await this.ticketsRepository.findUserById(targetUserId);
    if (!targetUser) {
      throw new BadRequestException('El usuario destino no existe. Pídele que se registre primero.');
    }

    if (targetUser.id === currentUserId) {
      throw new BadRequestException('No puedes transferirte la entrada a ti mismo.');
    }

    const ticket = await this.ticketsRepository.findTicketById(ticketId);
    
    if (!ticket || ticket.userId !== currentUserId) {
      throw new BadRequestException('La entrada no te pertenece o no existe.');
    }

    if (ticket.status !== 'VALID') {
      throw new BadRequestException('Solo se pueden transferir entradas válidas.');
    }

    return this.ticketsRepository.transferTicket(ticketId, targetUser.id);
  }
}
