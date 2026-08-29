import { IsString, IsNumber, Min, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString({ message: 'El ID del tipo de entrada es requerido' })
  ticketTypeId: string;

  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(1, { message: 'La cantidad mínima es 1' })
  quantity: number;
}

export class CreateOrderDto {
  @IsString({ message: 'Token de seguridad requerido' })
  captchaToken: string;

  @IsOptional()
  @IsString()
  promoterId?: string;

  @IsArray({ message: 'Debes incluir al menos un item' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
