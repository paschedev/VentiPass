import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BatchDto } from './batch.dto';

export class UpdateBatchesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchDto)
  batches: BatchDto[];
}
