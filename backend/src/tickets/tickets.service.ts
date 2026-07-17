import { Injectable, Logger } from '@nestjs/common';
import * as qrcode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('mail') private mailQueue: Queue,
  ) {}

  async generateTicketsForOrder(orderId: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx || this.prisma;

    const order = await prismaClient.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        orderItems: {
          include: { ticketType: { include: { event: true } } },
        },
      },
    });

    if (!order) throw new Error('Order not found');

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

    // Si ya estamos dentro de una transacción (tx provisto), usamos ese cliente,
    // si no, creamos una nueva transacción.
    const createTicketsFn = async (client: any) => {
      await client.ticket.createMany({
        data: ticketData,
      });
      return client.ticket.findMany({
        where: { orderId: order.id },
        include: { ticketType: { include: { event: true } } },
      });
    };

    let createdTickets;
    if (tx) {
      createdTickets = await createTicketsFn(tx);
    } else {
      createdTickets = await this.prisma.$transaction(async (t: any) => {
        return createTicketsFn(t);
      });
    }

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
    return this.prisma.ticket.findMany({
      where: { userId },
      include: {
        ticketType: {
          include: {
            event: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async transferTicket(ticketId: string, currentUserId: string, targetEmail: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Entrada no encontrada');
    if (ticket.userId !== currentUserId) throw new Error('No eres el dueño de esta entrada');
    if (ticket.status !== 'VALID') throw new Error('La entrada no es válida para transferencia');

    const targetUser = await this.prisma.user.findUnique({ where: { email: targetEmail } });
    if (!targetUser) throw new Error('El usuario destino no está registrado en WePass');

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { userId: targetUser.id }
    });
  }

  async emitGuestTicket(eventId: string, organizerId: string, email: string, ticketTypeId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.organizerId !== organizerId) {
      throw new Error('No tienes permiso sobre este evento');
    }

    const ticketType = await this.prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!ticketType || ticketType.eventId !== eventId) {
      throw new Error('Tipo de ticket inválido');
    }

    // Usamos o creamos el usuario fantasma
    let targetUser = await this.prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), salt);
      targetUser = await this.prisma.user.create({
        data: {
          email,
          name: 'Invitado',
          passwordHash: hashedPassword,
          role: 'CUSTOMER'
        }
      });
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        ticketTypeId,
        userId: targetUser.id,
        isGuestList: true,
      }
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
}
