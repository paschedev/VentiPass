import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY || 're_test_key');
  }

  async sendTicketsEmail(to: string, name: string, tickets: any[]) {
    try {
      const ticketsHtml = tickets.map(t => `
        <div style="border: 1px solid #ccc; padding: 20px; margin-bottom: 20px; border-radius: 8px;">
          <h2>${t.eventName} - ${t.ticketTypeName}</h2>
          <p>Muestra este código QR en la entrada:</p>
          <img src="${t.qrDataUrl}" alt="Ticket QR" width="200" height="200" />
        </div>
      `).join('');

      const { data, error } = await this.resend.emails.send({
        from: 'VentiPass <entradas@ventipass.dev>',
        to: [to],
        subject: '¡Tus entradas para el evento están listas!',
        html: `
          <h1>Hola ${name},</h1>
          <p>¡Gracias por tu compra! Aquí tienes tus entradas:</p>
          ${ticketsHtml}
          <p>Disfruta del evento,</p>
          <p>El equipo de VentiPass</p>
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
    if (!process.env.RESEND_API_KEY) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`[DEV ONLY] Reset link generated for ${to}: ${resetLink}`);
      }
      return;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'VentiPass <onboarding@resend.dev>', // Resend test domain
        to: [to],
        subject: 'Recuperación de contraseña - VentiPass',
        html: `<p>Hola ${name},</p><p>Has solicitado restablecer tu contraseña.</p><p>Haz clic en el siguiente enlace para crear una nueva:</p><p><a href="${resetLink}">Restablecer mi contraseña</a></p><p>Este enlace expirará en 1 hora.</p>`
      });

      if (error) {
        this.logger.error('Resend error', error);
      } else {
        this.logger.log(`Password reset email sent to ${to} with ID ${data?.id}`);
      }
    } catch (error) {
      this.logger.error('Failed to send password reset email', error);
    }
  }
}
