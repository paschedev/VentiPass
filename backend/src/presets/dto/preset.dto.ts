import { IsString, IsNumber, Min } from 'class-validator';

export class PresetDto {
  @IsString({ message: 'El nombre del preset es requerido' })
  name: string;

  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price: number;
}
