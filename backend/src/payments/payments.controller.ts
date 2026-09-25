import {
  Controller,
  Post,
  Body,
  Req,
  Headers,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
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
    @Query('state') stateToken: string,
    @Res() res: Response,
  ) {
    if (!code || !stateToken) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/panel?mp_error=missing_params`,
      );
    }

    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(
        stateToken,
        process.env.JWT_SECRET || 'super-secret-jwt-key',
      );
      if (payload.purpose !== 'oauth_state' || !payload.sub) {
        throw new Error('Invalid state token purpose');
      }

      await this.paymentsService.exchangeOAuthCode(payload.sub, code);
      // Redirect to frontend dashboard with success flag
      return res.redirect(`${process.env.FRONTEND_URL}/panel?mp_success=true`);
    } catch (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/panel?mp_error=true`);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @Get('oauth/link')
  async getOauthLink(@Req() req: any) {
    const jwt = require('jsonwebtoken');
    const stateToken = jwt.sign(
      { sub: req.user.userId, purpose: 'oauth_state' },
      process.env.JWT_SECRET || 'super-secret-jwt-key',
      { expiresIn: '15m' },
    );

    const clientId = process.env.MERCADOPAGO_CLIENT_ID;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/payments/oauth/callback`;
    const url = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&redirect_uri=${redirectUri}&state=${stateToken}`;

    return { url };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @Post('oauth/manual')
  async manualToken(@Req() req: any, @Body() body: SaveManualTokenDto) {
    await this.paymentsService.saveManualToken(req.user.userId, body.token);
    return { success: true };
  }
}
