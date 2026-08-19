import { IsString, IsEmail, MinLength, ValidateIf, IsOptional, IsIn, Matches } from 'class-validator';

export class RegisterUserDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  firstName: string;

  @IsString({ message: 'El apellido debe ser un texto' })
  lastName: string;

  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  email: string;

  @IsString({ message: 'La contraseña debe ser un texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsString({ message: 'El rol debe ser un texto' })
  @IsIn(['CUSTOMER', 'ORGANIZER', 'ADMIN'], { message: 'El rol proporcionado no es válido' })
  role: string;

  // Organizer specific fields
  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString({ message: 'El CUIL debe ser un texto' })
  @Matches(/^\d{2}-\d{8}-\d{1}$/, { message: 'El CUIL debe tener el formato válido XX-XXXXXXXX-X' })
  cuil: string;

  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString({ message: 'El país debe ser un texto' })
  country: string;

  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString({ message: 'La provincia debe ser un texto' })
  province: string;

  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString({ message: 'La ciudad debe ser un texto' })
  city: string;

  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString({ message: 'La calle debe ser un texto' })
  street: string;

  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString({ message: 'El número debe ser un texto' })
  number: string;

  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString({ message: 'El código postal debe ser un texto' })
  zipCode: string;

  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString({ message: 'El teléfono debe ser un texto' })
  @Matches(/^\+?[0-9\s\-]{8,20}$/, { message: 'El número de teléfono debe tener entre 8 y 20 caracteres y puede incluir números, espacios, guiones o un símbolo + al inicio' })
  phone: string;
}
