import { Controller, Post, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CaptchaService } from '../auth/captcha.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService,
    private readonly captchaService: CaptchaService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async createCheckout(
    @CurrentUser() user: any,
    @Body() body: { captchaToken: string; promoterId?: string; items: { ticketTypeId: string; quantity: number }[] }
  ) {
    if (!body.captchaToken) throw new BadRequestException('Se requiere token de seguridad');
    const isHuman = await this.captchaService.verifyToken(body.captchaToken);
    if (!isHuman) throw new BadRequestException('Validación de seguridad fallida');

    const finalUserId = user?.id;
    if (!finalUserId) {
      throw new BadRequestException('Se requiere sesión activa para procesar la compra.');
    }

    return this.ordersService.createCheckoutSession(finalUserId, body.items, body.promoterId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('dev-bypass')
  async createDevBypassOrder(
    @CurrentUser() user: any,
    @Body() body: { captchaToken: string; promoterId?: string; items: { ticketTypeId: string; quantity: number }[] }
  ) {
    if (!body.captchaToken) throw new BadRequestException('Se requiere token de seguridad');
    const isHuman = await this.captchaService.verifyToken(body.captchaToken);
    if (!isHuman) throw new BadRequestException('Validación de seguridad fallida');

    const finalUserId = user?.id;
    if (!finalUserId) {
      throw new BadRequestException('Se requiere sesión activa para procesar la compra.');
    }

    return this.ordersService.createDevBypassOrder(finalUserId, body.items, body.promoterId);
  }
}
