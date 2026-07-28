import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { RegisterUserDto } from './dto/register-user.dto';
import { Resend } from 'resend';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hasLinkedMp: !!user.mercadoPagoAccessToken
      }
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasLinkedMp: !!user.mercadoPagoAccessToken
    };
  }

  async register(data: RegisterUserDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const userCreateInput: Prisma.UserCreateInput = {
      name: `${data.firstName} ${data.lastName}`.trim(),
      email: data.email,
      passwordHash: hashedPassword,
      role: data.role as any,
    };

    if (data.role === 'ORGANIZER') {
      userCreateInput.organizerProfile = {
        create: {
          cuil: data.cuil,
          cbuOrAlias: data.cbuOrAlias,
          country: data.country,
          province: data.province,
          city: data.city,
          street: data.street,
          number: data.number,
          zipCode: data.zipCode,
          phone: data.phone,
        }
      };
      
      userCreateInput.ticketPresets = {
        create: [
          { name: 'General', price: 5000 },
          { name: 'VIP', price: 15000 }
        ]
      };
    }

    const user = await this.prisma.user.create({
      data: userCreateInput,
    });

    const { passwordHash, ...result } = user;
    return result;
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const isValid = await bcrypt.compare(oldPass, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const salt = await bcrypt.genSalt();
    const newHash = await bcrypt.hash(newPass, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });

    return { message: 'Contraseña actualizada con éxito' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success even if not found for security reasons
      return { message: 'Si el correo existe, se ha enviado un enlace de recuperación.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpires
      }
    });

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/panel/configuracion?token=${resetToken}`;

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'WePass <onboarding@resend.dev>', // Resend test domain
          to: user.email,
          subject: 'Recuperación de contraseña - WePass',
          html: `<p>Hola ${user.name},</p><p>Has solicitado restablecer tu contraseña.</p><p>Haz clic en el siguiente enlace para crear una nueva:</p><p><a href="${resetLink}">Restablecer mi contraseña</a></p><p>Este enlace expirará en 1 hora.</p>`
        });
      } catch (error) {
        console.error('Error sending email via Resend', error);
      }
    } else {
      // Security fix: Do not log the token to the console in production
      if (process.env.NODE_ENV !== 'production') {
         console.log(`[DEV ONLY] Reset link generated for ${user.email}: ${resetLink}`);
      }
    }

    return { message: 'Si el correo existe, se ha enviado un enlace de recuperación.' };
  }

  async resetPassword(token: string, newPass: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() }
      }
    });

    if (!user) {
      throw new UnauthorizedException('El token es inválido o ha expirado');
    }

    const salt = await bcrypt.genSalt();
    const newHash = await bcrypt.hash(newPass, salt);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    return { message: 'Contraseña restablecida con éxito' };
  }

  async searchUsers(query: string) {
    if (!query || query.length < 3) return [];
    return this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ]
      },
      select: { id: true, name: true, email: true, role: true },
      take: 10
    });
  }
}
