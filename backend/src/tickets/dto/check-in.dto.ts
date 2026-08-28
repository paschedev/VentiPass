import { IsString } from 'class-validator';

export class CheckInDto {
  @IsString({ message: 'El código QR es requerido' })
  qrCode: string;
}
