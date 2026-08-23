import { Controller, Post, Body, UnauthorizedException, BadRequestException, Get, UseGuards, Req, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly captchaService: CaptchaService
  ) {}

  @Post('login')
  async login(@Body() body: any) {
    if (!body.captchaToken) throw new BadRequestException('Se requiere token de seguridad');
    const isHuman = await this.captchaService.verifyToken(body.captchaToken);
    if (!isHuman) throw new UnauthorizedException('Validación de seguridad fallida');

    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() body: RegisterUserDto & { captchaToken: string }) {
    if (!body.captchaToken) throw new BadRequestException('Se requiere token de seguridad');
    const isHuman = await this.captchaService.verifyToken(body.captchaToken);
    if (!isHuman) throw new UnauthorizedException('Validación de seguridad fallida');

    return this.authService.register(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() req: any, @Body() body: any) {
    return this.authService.changePassword(req.user.userId, body.oldPassword, body.newPassword);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: any) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: any) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/search')
  searchUsers(@Query('q') query: string, @Req() req: any) {
    return this.authService.searchUsers(query, req.user.userId);
  }
}
