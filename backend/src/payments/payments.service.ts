import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JobsOptions, Queue } from 'bullmq';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { PaymentsRepository } from './repositories/payments.repository';
import { TicketsService } from '../tickets/tickets.service';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { isValidWebhookSignature } from './webhook-signature';
import type { PaymentNotificationJob } from './payments.processor';

// 8 attempts, the last one about an hour after the notification.
const PAYMENT_JOB_OPTIONS: JobsOptions = {
  attempts: 8,
  backoff: { type: 'exponential', delay: 30_000 },
};

@Injectable()
export class PaymentsService {
  private client: MercadoPagoConfig;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private ticketsService: TicketsService,
    private readonly config: ConfigService,
    @InjectQueue('payments') private readonly paymentsQueue: Queue,
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

  // Only checks the signature and queues the notification: Mercado Pago gets its
  // answer right away and the processing retries on its own if it fails.
  async enqueueNotification(notification: {
    signature?: string;
    requestId?: string;
    dataId?: string;
    type?: string;
    mpUserId?: string;
  }) {
    const isValid = isValidWebhookSignature({
      xSignature: notification.signature,
      xRequestId: notification.requestId,
      dataId: notification.dataId,
      secret: this.config.getOrThrow<string>('MERCADOPAGO_WEBHOOK_SECRET'),
    });
    if (!isValid) {
      this.logger.warn(
        `Rejected Mercado Pago webhook with an invalid signature (request ${notification.requestId})`,
      );
      throw new UnauthorizedException();
    }
    if (notification.type !== 'payment' || !notification.dataId) return;

    const job: PaymentNotificationJob = {
      paymentId: notification.dataId,
      mpUserId: notification.mpUserId,
    };
    await this.paymentsQueue.add('process-payment', job, PAYMENT_JOB_OPTIONS);
  }

  async processPaymentNotification(paymentId: string, mpUserId?: string) {
    // The payment lives in the seller's account: read it with the token of the
    // organizer that Mercado Pago names in the notification, if we know them.
    const sellerToken = mpUserId
      ? await this.paymentsRepository.findMercadoPagoTokenByUserId(mpUserId)
      : null;
    const client = sellerToken
      ? new MercadoPagoConfig({ accessToken: sellerToken })
      : this.client;

    const paymentData = await new Payment(client).get({ id: paymentId });
    if (paymentData.status !== 'approved') return;

    const orderId = paymentData.external_reference;
    if (!orderId) {
      this.logger.warn(`Approved payment ${paymentId} has no order reference`);
      return;
    }

    const existingPayment =
      await this.paymentsRepository.findPaymentByProviderId(paymentId);
    if (existingPayment) return;

    await this.paymentsRepository.processPaymentWebhookTransaction(
      orderId,
      paymentId,
      paymentData.transaction_amount || 0,
      async (tx: Prisma.TransactionClient) => {
        await this.ticketsService.generateTicketsForOrder(orderId, tx);
      },
    );
    this.logger.log(`Order ${orderId} marked as PAID and tickets generated.`);
  }
}
