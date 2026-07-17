import { Injectable, Logger } from '@nestjs/common';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';

@Injectable()
export class PaymentsService {
  private client: MercadoPagoConfig;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private ticketsService: TicketsService,
  ) {
    this.client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
    });
  }

  async exchangeOAuthCode(userId: string, code: string) {
    const clientId = process.env.MERCADOPAGO_CLIENT_ID;
    const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
    const redirectUri = `${process.env.BACKEND_URL}/payments/oauth/callback`;

    try {
      const response = await fetch('https://api.mercadopago.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
        },
        body: new URLSearchParams({
          client_id: clientId || '',
          client_secret: clientSecret || '',
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }).toString(),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error en OAuth');

      // Update user with Mercado Pago credentials
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          mercadoPagoAccessToken: data.access_token,
          mercadoPagoPublicKey: data.public_key,
          mercadoPagoUserId: data.user_id.toString(),
        },
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error exchanging Mercado Pago code', error);
      throw error;
    }
  }

  async saveManualToken(userId: string, token: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mercadoPagoAccessToken: token },
    });
    return { success: true };
  }

  async createPreference(orderId: string, items: any[], feeAmount: number, organizerToken?: string) {
    // If the organizer linked their MP account, we use their token. Otherwise fallback to the platform's test token.
    const client = organizerToken 
      ? new MercadoPagoConfig({ accessToken: organizerToken }) 
      : this.client;
      
    const preference = new Preference(client);

    try {
      const response = await preference.create({
        body: {
          items: items,
          external_reference: orderId,
          back_urls: {
            success: `${process.env.FRONTEND_URL}/checkout/success`,
            failure: `${process.env.FRONTEND_URL}/checkout/failure`,
            pending: `${process.env.FRONTEND_URL}/checkout/pending`,
          },
          auto_return: 'approved',
          notification_url: `${process.env.BACKEND_URL}/payments/webhook`,
          marketplace_fee: feeAmount, // This is the split payment fee (10%) that goes to the platform
        },
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
        const paymentData = await new Payment(this.client).get({ id: paymentId });
        
        if (paymentData.status === 'approved') {
          const orderId = paymentData.external_reference;
          if (!orderId) return;

          // Check if payment already exists
          const existingPayment = await this.prisma.payment.findFirst({
            where: { providerPaymentId: paymentId.toString() },
          });

          if (!existingPayment) {
            // Update order and create payment
            await this.prisma.$transaction(async (tx) => {
              const order = await tx.order.update({
                where: { id: orderId },
                data: { status: 'PAID' },
                include: { orderItems: true },
              });

              await tx.payment.create({
                data: {
                  orderId: order.id,
                  provider: 'MERCADO_PAGO',
                  providerPaymentId: paymentId.toString(),
                  status: 'APPROVED',
                  amount: paymentData.transaction_amount || 0,
                },
              });

              // Trigger ticket generation
              await this.ticketsService.generateTicketsForOrder(order.id, tx);

              // Calculate promoter commission if a promoter is linked
              if (order.promoterId) {
                const promoter = await tx.eventStaff.findUnique({ where: { id: order.promoterId } });
                if (promoter) {
                  let commission = 0;
                  if (promoter.commissionType === 'FIXED' && promoter.commissionValue) {
                    const ticketCount = order.orderItems.reduce((acc, curr) => acc + curr.quantity, 0);
                    commission = Number(promoter.commissionValue) * ticketCount;
                  } else if (promoter.commissionType === 'PERCENTAGE' && promoter.commissionValue) {
                    commission = Number(order.ticketAmount) * (Number(promoter.commissionValue) / 100);
                  }
                  
                  if (commission > 0) {
                    await tx.eventStaff.update({
                      where: { id: promoter.id },
                      data: { totalEarned: { increment: commission } }
                    });
                  }
                }
              }

              // Decrement reserved and increment sold
              for (const item of order.orderItems) {
                await tx.ticketType.update({
                  where: { id: item.ticketTypeId },
                  data: {
                    reserved: { decrement: item.quantity },
                    sold: { increment: item.quantity }
                  }
                });
              }
            });
            this.logger.log(`Order ${orderId} marked as PAID and tickets generated.`);
          }
        }
      } catch (error) {
        this.logger.error(`Error processing webhook for payment ${paymentId}`, error);
      }
    }
  }
}
