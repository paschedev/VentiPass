import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TicketsRepository {
  constructor(private prisma: PrismaService) {}

  async findOrderWithItems(orderId: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx || this.prisma;
    return prismaClient.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        orderItems: {
          include: { ticketType: { include: { event: true } } },
        },
      },
    });
  }

  async createTicketsTransaction(orderId: string, ticketData: Prisma.TicketCreateManyInput[], tx?: Prisma.TransactionClient) {
    const createTicketsFn = async (client: any) => {
      await client.ticket.createMany({
        data: ticketData,
      });
      return client.ticket.findMany({
        where: { orderId: orderId },
        include: { ticketType: { include: { event: true } } },
      });
    };

    if (tx) {
      return createTicketsFn(tx);
    } else {
      return this.prisma.$transaction(async (t: any) => {
        return createTicketsFn(t);
      });
    }
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

  async findTicketForValidation(qrCode: string) {
    return this.prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        ticketType: {
          include: { event: true }
        },
        user: true,
      }
    });
  }

  async findTicketById(ticketId: string) {
    return this.prisma.ticket.findUnique({
      where: { id: ticketId }
    });
  }

  async markTicketAsUsed(ticketId: string) {
    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'USED', usedAt: new Date() }
    });
  }

  async processCheckInTransaction(ticketId: string, scannerId: string, userAgent: string) {
    return this.prisma.$transaction([
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'USED', usedAt: new Date() },
      }),
      this.prisma.checkIn.create({
        data: {
          ticketId: ticketId,
          scannerId: scannerId,
          deviceInfo: userAgent || 'Unknown Device',
        }
      })
    ]);
  }

  async findEventStaff(eventId: string, userId: string, role: import('@prisma/client').StaffRole) {
    return this.prisma.eventStaff.findUnique({
      where: {
        eventId_userId_role: { eventId, userId, role }
      }
    });
  }

  async transferTicket(ticketId: string, newUserId: string) {
    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { userId: newUserId }
    });
  }

  async findEvent(eventId: string) {
    return this.prisma.event.findUnique({ where: { id: eventId } });
  }

  async findTicketType(ticketTypeId: string) {
    return this.prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  async createTicket(data: Prisma.TicketUncheckedCreateInput) {
    return this.prisma.ticket.create({ data });
  }
}
