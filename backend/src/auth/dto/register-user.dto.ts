import { IsString, IsEmail, MinLength, ValidateIf, IsOptional, IsIn, Matches } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsIn(['CUSTOMER', 'ORGANIZER', 'ADMIN'])
  role: string;

  // Organizer specific fields
  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString()
  @Matches(/^\d{2}-\d{8}-\d{1}$/, { message: 'El CUIL debe tener el formato válido XX-XXXXXXXX-X' })
  cuil: string;

  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString()
  cbuOrAlias: string;

  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString()
  country: string;

  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString()
  province: string;

  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString()
  city: string;

  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString()
  street: string;

  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString()
  number: string;

  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString()
  zipCode: string;

  @ValidateIf(o => o.role === 'ORGANIZER')
  @IsString()
  @Matches(/^\+?[0-9\s\-]{8,20}$/, { message: 'El número de teléfono debe tener entre 8 y 20 caracteres y puede incluir números, espacios, guiones o un símbolo + al inicio' })
  phone: string;
}
