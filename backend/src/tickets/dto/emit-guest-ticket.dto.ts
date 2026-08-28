import { IsString, IsEmail } from 'class-validator';

export class EmitGuestTicketDto {
  @IsString({ message: 'El ID del evento es requerido' })
  eventId: string;

  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  email: string;

  @IsString({ message: 'El ID del tipo de entrada es requerido' })
  ticketTypeId: string;
}
