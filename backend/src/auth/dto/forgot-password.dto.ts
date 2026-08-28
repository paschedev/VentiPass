import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  email: string;
}
