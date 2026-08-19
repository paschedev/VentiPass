import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from './repositories/user.repository';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { RegisterUserDto } from './dto/register-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userRepository.findByEmail(email);
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
    const user = await this.userRepository.findById(userId);
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
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya existe');
    }

    if (data.role === 'ORGANIZER') {
      const existingCuil = await this.userRepository.findOrganizerByCuil(data.cuil);
      if (existingCuil) {
        throw new ConflictException('El CUIL ingresado ya se encuentra registrado');
      }
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

    const user = await this.userRepository.create(userCreateInput);

    const { passwordHash, ...result } = user;
    return result;
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const isValid = await bcrypt.compare(oldPass, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const salt = await bcrypt.genSalt();
    const newHash = await bcrypt.hash(newPass, salt);

    await this.userRepository.update(userId, { passwordHash: newHash });

    return { message: 'Contraseña actualizada con éxito' };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Return success even if not found for security reasons
      return { message: 'Si el correo existe, se ha enviado un enlace de recuperación.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.userRepository.update(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetTokenExpires
    });

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/panel/configuracion?token=${resetToken}`;

    await this.mailService.sendPasswordResetEmail(user.email, user.name, resetLink);

    return { message: 'Si el correo existe, se ha enviado un enlace de recuperación.' };
  }

  async resetPassword(token: string, newPass: string) {
    const user = await this.userRepository.findByResetToken(token);

    if (!user) {
      throw new UnauthorizedException('El token es inválido o ha expirado');
    }

    const salt = await bcrypt.genSalt();
    const newHash = await bcrypt.hash(newPass, salt);

    await this.userRepository.update(user.id, {
      passwordHash: newHash,
      passwordResetToken: null,
      passwordResetExpires: null
    });

    return { message: 'Contraseña restablecida con éxito' };
  }

  async searchUsers(query: string) {
    if (!query || query.length < 3) return [];
    return this.userRepository.search(query);
  }
}
