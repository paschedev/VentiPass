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
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

// Signed with the session secret: `purpose` keeps a login token from being used as state.
type OAuthState = { sub?: string; purpose?: string };

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

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
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    if (!code || !stateToken) {
      return res.redirect(`${frontendUrl}/panel?mp_error=missing_params`);
    }

    try {
      const payload = this.jwtService.verify<OAuthState>(stateToken);
      if (payload.purpose !== 'oauth_state' || !payload.sub) {
        throw new Error('Invalid state token purpose');
      }

      await this.paymentsService.exchangeOAuthCode(payload.sub, code);
      // Redirect to frontend dashboard with success flag
      return res.redirect(`${frontendUrl}/panel?mp_success=true`);
    } catch (error) {
      return res.redirect(`${frontendUrl}/panel?mp_error=true`);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER)
  @Get('oauth/link')
  async getOauthLink(@Req() req: any) {
    const state: OAuthState = { sub: req.user.userId, purpose: 'oauth_state' };
    const stateToken = this.jwtService.sign(state, { expiresIn: '15m' });

    const clientId = this.config.getOrThrow<string>('MERCADOPAGO_CLIENT_ID');
    const redirectUri = `${this.config.getOrThrow<string>('BACKEND_URL')}/payments/oauth/callback`;
    const url = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&redirect_uri=${redirectUri}&state=${stateToken}`;

    return { url };
  }
}
