import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findOrganizerByCuil(cuil: string) {
    return this.prisma.organizerProfile.findUnique({ where: { cuil } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() }
      }
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data
    });
  }

  async search(query: string) {
    if (!query || query.length < 3) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ]
      },
      select: { id: true, name: true, email: true, role: true },
      take: 10
    });

    return users.map(user => {
      let maskedEmail = user.email;
      const [local, domain] = user.email.split('@');
      if (domain) {
        const maskedLocal = local.length > 2
          ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
          : local[0] + '***';
        maskedEmail = `${maskedLocal}@${domain}`;
      }
      return {
        ...user,
        email: maskedEmail
      };
    });
  }
}
