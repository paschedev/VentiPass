import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService
  ) {}

  @Post('checkout')
  async createCheckout(
    @Body() body: { userId?: string; guestEmail?: string; promoterId?: string; items: { ticketTypeId: string; quantity: number }[] }
  ) {
    let finalUserId = body.userId;

    if (!finalUserId && body.guestEmail) {
      // Intentar buscar el usuario por email
      let user = await this.prisma.user.findUnique({ where: { email: body.guestEmail } });
      
      if (!user) {
        // Crear usuario fantasma
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), salt);
        user = await this.prisma.user.create({
          data: {
            email: body.guestEmail,
            name: 'Invitado',
            passwordHash: hashedPassword,
            role: 'CUSTOMER'
          }
        });
      }
      finalUserId = user.id;
    }

    if (!finalUserId) {
      throw new BadRequestException('Se requiere el UserId o el GuestEmail');
    }

    return this.ordersService.createCheckoutSession(finalUserId, body.items, body.promoterId);
  }

  @Post('dev-bypass')
  async createDevBypassOrder(
    @Body() body: { userId?: string; guestEmail?: string; promoterId?: string; items: { ticketTypeId: string; quantity: number }[] }
  ) {
    let finalUserId = body.userId;

    if (!finalUserId && body.guestEmail) {
      let user = await this.prisma.user.findUnique({ where: { email: body.guestEmail } });
      if (!user) {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), salt);
        user = await this.prisma.user.create({
          data: {
            email: body.guestEmail,
            name: 'Invitado',
            passwordHash: hashedPassword,
            role: 'CUSTOMER'
          }
        });
      }
      finalUserId = user.id;
    }

    if (!finalUserId) {
      throw new BadRequestException('Se requiere el UserId o el GuestEmail');
    }

    return this.ordersService.createDevBypassOrder(finalUserId, body.items, body.promoterId);
  }
}
