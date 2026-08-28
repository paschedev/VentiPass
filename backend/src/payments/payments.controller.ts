import { Controller, Post, Body, Req, Headers, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SaveManualTokenDto } from './dto/save-manual-token.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  async handleWebhook(
    @Body() body: any,
    @Headers('x-signature') signature: string,
  ) {
    // Acknowledge webhook immediately
    this.paymentsService.handleWebhook(body, signature);
    return { status: 'received' };
  }

  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: Response
  ) {
    if (!code || !userId) {
      return res.status(400).json({ message: 'Faltan parámetros code o state' });
    }

    try {
      await this.paymentsService.exchangeOAuthCode(userId, code);
      // Redirect to frontend dashboard with success flag
      return res.redirect(`${process.env.FRONTEND_URL}/panel?mp_success=true`);
    } catch (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/panel?mp_error=true`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('oauth/manual')
  async manualToken(@Req() req: any, @Body() body: SaveManualTokenDto) {
    await this.paymentsService.saveManualToken(req.user.userId, body.token);
    return { success: true };
  }
}
