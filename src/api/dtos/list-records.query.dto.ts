import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { RecordCategory, RecordFormat } from '../schemas/record.enum';

export const DEFAULT_RECORD_LIMIT = 20;
export const MAX_RECORD_LIMIT = 100;

export class ListRecordsQueryDTO {
  @ApiPropertyOptional({
    description: 'Search artist, album, or category',
    type: String,
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by artist', type: String })
  @IsOptional()
  @IsString()
  artist?: string;

  @ApiPropertyOptional({ description: 'Filter by album', type: String })
  @IsOptional()
  @IsString()
  album?: string;

  @ApiPropertyOptional({ enum: RecordFormat })
  @IsOptional()
  @IsEnum(RecordFormat)
  format?: RecordFormat;

  @ApiPropertyOptional({ enum: RecordCategory })
  @IsOptional()
  @IsEnum(RecordCategory)
  category?: RecordCategory;

  @ApiPropertyOptional({
    description: `Page size. Defaults to ${DEFAULT_RECORD_LIMIT}; max ${MAX_RECORD_LIMIT}.`,
    minimum: 1,
    maximum: MAX_RECORD_LIMIT,
    default: DEFAULT_RECORD_LIMIT,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? DEFAULT_RECORD_LIMIT : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(MAX_RECORD_LIMIT)
  limit = DEFAULT_RECORD_LIMIT;

  @ApiPropertyOptional({
    description: 'Opaque cursor returned by the previous list response',
    type: String,
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
