import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  async verifyToken(token: string): Promise<boolean> {
    // Si estamos en entorno de pruebas locales (y no configuraron la key), podemos simular que es válido
    // para no bloquear el desarrollo, pero siempre debemos exigir la validación en PROD.
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      this.logger.warn('TURNSTILE_SECRET_KEY no está configurada. Omitiendo validación (solo apto para DEV).');
      return true;
    }

    if (!token) {
      return false;
    }

    try {
      const response = await fetch(this.TURNSTILE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
        }),
      });

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      this.logger.error('Error validando CAPTCHA de Turnstile', error);
      return false;
    }
  }
}
