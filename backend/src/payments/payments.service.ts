import { Injectable, Logger } from '@nestjs/common';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { PaymentsRepository } from './repositories/payments.repository';
import { TicketsService } from '../tickets/tickets.service';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  private client: MercadoPagoConfig;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private ticketsService: TicketsService,
    private readonly config: ConfigService,
  ) {
    this.client = new MercadoPagoConfig({
      accessToken: this.config.getOrThrow<string>('MERCADOPAGO_ACCESS_TOKEN'),
    });
  }

  async exchangeOAuthCode(userId: string, code: string) {
    const clientId = this.config.getOrThrow<string>('MERCADOPAGO_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>(
      'MERCADOPAGO_CLIENT_SECRET',
    );
    const redirectUri = `${this.config.getOrThrow<string>('BACKEND_URL')}/payments/oauth/callback`;

    try {
      const response = await fetch('https://api.mercadopago.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${this.config.getOrThrow<string>('MERCADOPAGO_ACCESS_TOKEN')}`,
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }).toString(),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error en OAuth');

      // Update user with Mercado Pago credentials
      await this.paymentsRepository.updateUserMercadoPagoCredentials(userId, {
        accessToken: data.access_token,
        publicKey: data.public_key,
        userId: data.user_id.toString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error exchanging Mercado Pago code', error);
      throw error;
    }
  }

  async createPreference(
    orderId: string,
    items: any[],
    feeAmount: number,
    organizerToken?: string,
  ) {
    // If the organizer linked their MP account, we use their token. Otherwise fallback to the platform's test token.
    const client = organizerToken
      ? new MercadoPagoConfig({ accessToken: organizerToken })
      : this.client;

    const preference = new Preference(client);

    try {
      const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
      const backendUrl = this.config.getOrThrow<string>('BACKEND_URL');
      const bodyParams: any = {
        items: items,
        external_reference: orderId,
        back_urls: {
          success: `${frontendUrl}/checkout/success`,
          failure: `${frontendUrl}/checkout/failure`,
          pending: `${frontendUrl}/checkout/pending`,
        },
        auto_return: 'approved',
        notification_url: `${backendUrl}/payments/webhook`,
      };

      if (organizerToken && feeAmount > 0) {
        // Podemos detectarlos si la app está en desarrollo o si no pasamos validaciones estrictas.
        const isTestToken =
          organizerToken.includes('test') || organizerToken.startsWith('TEST');
        if (!isTestToken && !backendUrl.includes('localhost')) {
          bodyParams.marketplace_fee = feeAmount;
        }
      }

      // MP bloquea webhooks a localhost, lo omitimos en desarrollo local
      if (
        backendUrl.includes('localhost') ||
        backendUrl.includes('127.0.0.1')
      ) {
        delete bodyParams.notification_url;
      }

      const response = await preference.create({
        body: bodyParams,
      });

      return { initPoint: response.init_point };
    } catch (error) {
      this.logger.error('Error creating Mercado Pago preference', error);
      throw error;
    }
  }

  async handleWebhook(body: any, signature?: string) {
    // In production, you should verify the signature here.
    // X-Signature validation logic...

    if (body.type === 'payment') {
      const paymentId = body.data.id;
      try {
        const paymentData = await new Payment(this.client).get({
          id: paymentId,
        });

        if (paymentData.status === 'approved') {
          const orderId = paymentData.external_reference;
          if (!orderId) return;

          // Check if payment already exists
          const existingPayment =
            await this.paymentsRepository.findPaymentByProviderId(
              paymentId.toString(),
            );

          if (!existingPayment) {
            // Update order, create payment and perform all logic via repository transaction
            await this.paymentsRepository.processPaymentWebhookTransaction(
              orderId,
              paymentId.toString(),
              paymentData.transaction_amount || 0,
              async (tx: Prisma.TransactionClient) => {
                // Trigger ticket generation
                await this.ticketsService.generateTicketsForOrder(orderId, tx);
              },
            );

            this.logger.log(
              `Order ${orderId} marked as PAID and tickets generated.`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Error processing webhook for payment ${paymentId}`,
          error,
        );
      }
    }
  }
}
