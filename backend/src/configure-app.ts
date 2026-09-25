import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

// Configuración HTTP compartida entre main.ts y los tests e2e,
// para que los tests corran contra la misma app que producción.
export function configureApp(app: INestApplication) {
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [
      frontendUrl,
      'https://neopass.com',
      'https://www.neopass.com',
      'https://ventipass.com',
      'https://www.ventipass.com',
      'https://venti-pass.vercel.app',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
}
