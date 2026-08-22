import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { MailModule } from '../mail/mail.module';
import { UserRepository } from './repositories/user.repository';
import { CaptchaService } from './captcha.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
      signOptions: { expiresIn: '30d' },
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, UserRepository, CaptchaService],
  exports: [AuthService, UserRepository, CaptchaService],
})
export class AuthModule {}
