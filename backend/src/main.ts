import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  
  try {
    const prisma = app.get(PrismaService);
    await prisma.$executeRawUnsafe(`ALTER TABLE "TicketType" ADD CONSTRAINT "check_stock_limits" CHECK (stock >= (sold + reserved));`);
    Logger.log('TicketType constraint applied or verified successfully', 'Bootstrap');
  } catch (error: any) {
    if (!error.message?.includes('already exists') && !error.message?.includes('42710')) {
      Logger.warn('Could not apply TicketType constraint automatically (might already exist).', 'Bootstrap');
    }
  }

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [
      frontendUrl, 
      'https://ventipass.com', 
      'https://www.ventipass.com',
      'https://venti-pass.vercel.app',
      'http://localhost:3000', 
      'http://127.0.0.1:3000'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
