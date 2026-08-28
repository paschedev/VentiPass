import { IsString } from 'class-validator';

export class SaveManualTokenDto {
  @IsString({ message: 'El token es requerido' })
  token: string;
}
