import { IsString, IsOptional, IsDateString, IsIn, IsNumber, Min } from 'class-validator';

export class BatchDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString({ message: 'El nombre de la tanda debe ser texto' })
  name: string;

  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0)
  price: number;

  @IsNumber({}, { message: 'La capacidad debe ser un número' })
  @Min(1)
  capacity: number;

  @IsString()
  @IsIn(['ACTIVE', 'SCHEDULED', 'PAUSED', 'SOLD_OUT', 'ARCHIVED'])
  status: string;

  @IsOptional()
  @IsDateString()
  publishAt?: string;

  @IsOptional()
  @IsNumber()
  feePercentage?: number;
}
