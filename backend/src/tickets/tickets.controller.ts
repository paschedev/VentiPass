import { Controller, Post, Get, Body, Param, UseGuards, Req, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private prisma: PrismaService, private ticketsService: TicketsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('my-tickets')
  async getMyTickets(@Req() req: any) {
    return this.ticketsService.findMyTickets(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/transfer')
  async transferTicket(@Param('id') id: string, @Body() body: { targetUserId: string }, @Req() req: any) {
    try {
      await this.ticketsService.transferTicket(id, req.user.userId, body.targetUserId);
      return { success: true, message: 'Entrada transferida con éxito' };
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  // Permite a todos, porque la seguridad real se valida por EventStaff en la lógica
  @Roles('ORGANIZER', 'ADMIN', 'CUSTOMER')
  @Post('check-in')
  async checkIn(@Body() body: { qrCode: string }, @Req() req: any) {
    const { qrCode } = body;
    const scannerId = req.user.userId;

    const ticket = await this.prisma.ticket.findUnique({
      where: { qrCode },
      include: { ticketType: { include: { event: true } } }
    });

    if (!ticket) {
      return { success: false, status: 'INVALID', message: 'INVÁLIDO' };
    }

    // Validar permisos del Scanner en EventStaff o si es el organizador global
    const event = ticket.ticketType.event;
    if (event.organizerId !== scannerId) {
      const staffPermission = await this.prisma.eventStaff.findFirst({
        where: {
          eventId: event.id,
          userId: scannerId,
          role: { in: ['SCANNER', 'MANAGER'] },
          status: 'ACCEPTED'
        }
      });

      if (!staffPermission) {
        return { success: false, status: 'WRONG_EVENT', message: 'OTRO EVENTO' };
      }
    }

    if (ticket.status === 'USED') {
      return { success: false, status: 'USED', message: 'USADO' };
    }

    if (ticket.status !== 'VALID') {
      return { success: false, status: 'INVALID', message: 'INVÁLIDO' };
    }

    // Mark as used
    await this.prisma.$transaction([
      this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'USED', usedAt: new Date() },
      }),
      this.prisma.checkIn.create({
        data: {
          ticketId: ticket.id,
          scannerId: scannerId,
          deviceInfo: req.headers['user-agent'] || 'Unknown Device',
        }
      })
    ]);

    return {
      success: true,
      status: 'VALID',
      message: 'VÁLIDO',
      event: ticket.ticketType.event.title,
      type: ticket.ticketType.name,
      isGuestList: ticket.isGuestList,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANIZER', 'ADMIN')
  @Post('guest-list')
  async emitGuestTicket(@Body() body: { eventId: string, email: string, ticketTypeId: string }, @Req() req: any) {
    try {
      return await this.ticketsService.emitGuestTicket(body.eventId, req.user.userId, body.email, body.ticketTypeId);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }
}
