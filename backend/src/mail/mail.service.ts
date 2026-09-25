import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

// Must be a domain verified in Resend, otherwise every send is rejected.
const MAIL_DOMAIN = 'neopass.ar';
const TICKETS_SENDER = `NeoPass <entradas@${MAIL_DOMAIN}>`;
const SUPPORT_SENDER = `NeoPass <soporte@${MAIL_DOMAIN}>`;

@Injectable()
export class MailService {
  private resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor(config: ConfigService) {
    this.resend = new Resend(config.getOrThrow<string>('RESEND_API_KEY'));
  }

  async sendTicketsEmail(to: string, name: string, tickets: any[]) {
    try {
      const ticketsHtml = tickets
        .map(
          (t) => `
        <div style="border: 1px solid #ccc; padding: 20px; margin-bottom: 20px; border-radius: 8px;">
          <h2>${t.eventName} - ${t.ticketTypeName}</h2>
          <p>Muestra este código QR en la entrada:</p>
          <img src="${t.qrDataUrl}" alt="Ticket QR" width="200" height="200" />
        </div>
      `,
        )
        .join('');

      const { data, error } = await this.resend.emails.send({
        from: TICKETS_SENDER,
        to: [to],
        subject: '¡Tus entradas para el evento están listas!',
        html: `
          <h1>Hola ${name},</h1>
          <p>¡Gracias por tu compra! Aquí tienes tus entradas:</p>
          ${ticketsHtml}
          <p>Disfruta del evento,</p>
          <p>El equipo de NeoPass</p>
        `,
      });

      if (error) {
        this.logger.error('Resend error', error);
      } else {
        this.logger.log(`Tickets email sent to ${to} with ID ${data?.id}`);
      }
    } catch (error) {
      this.logger.error('Failed to send tickets email', error);
    }
  }

  async sendPasswordResetEmail(to: string, name: string, resetLink: string) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: SUPPORT_SENDER,
        to: [to],
        subject: 'Recuperación de contraseña - NeoPass',
        html: `<p>Hola ${name},</p><p>Has solicitado restablecer tu contraseña.</p><p>Haz clic en el siguiente enlace para crear una nueva:</p><p><a href="${resetLink}">Restablecer mi contraseña</a></p><p>Este enlace expirará en 1 hora.</p>`,
      });

      if (error) {
        this.logger.error('Resend error', error);
      } else {
        this.logger.log(
          `Password reset email sent to ${to} with ID ${data?.id}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to send password reset email', error);
    }
  }
}
