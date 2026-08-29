import { IsString } from 'class-validator';

export class TransferTicketDto {
  @IsString({ message: 'El ID de usuario destino es requerido' })
  targetUserId: string;
}
