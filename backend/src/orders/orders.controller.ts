import { Controller, Post, Body, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CaptchaService } from '../auth/captcha.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly captchaService: CaptchaService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async createCheckout(
    @Req() req: any,
    @Body() body: CreateOrderDto
  ) {
    if (!body.captchaToken) throw new BadRequestException('Validación de seguridad fallida. Recargá la página.');
    const isHuman = await this.captchaService.verifyToken(body.captchaToken);
    if (!isHuman) throw new BadRequestException('Validación de seguridad fallida');

    const finalUserId = req.user?.userId;
    if (!finalUserId) {
      throw new BadRequestException('Se requiere sesión activa para procesar la compra.');
    }

    return this.ordersService.createCheckoutSession(finalUserId, body.items, body.promoterId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('dev-bypass')
  async createDevBypassOrder(
    @Req() req: any,
    @Body() body: CreateOrderDto
  ) {
    if (!body.captchaToken) throw new BadRequestException('Validación de seguridad fallida. Recargá la página.');
    const isHuman = await this.captchaService.verifyToken(body.captchaToken);
    if (!isHuman) throw new BadRequestException('Validación de seguridad fallida');

    const finalUserId = req.user?.userId;
    if (!finalUserId) {
      throw new BadRequestException('Se requiere sesión activa para procesar la compra.');
    }

    return this.ordersService.createDevBypassOrder(finalUserId, body.items, body.promoterId);
  }
}
