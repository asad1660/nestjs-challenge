import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Record } from '../schemas/record.schema';

export class ListRecordsResponseDTO {
  @ApiProperty({ type: [Record] })
  items: Record[];

  @ApiPropertyOptional({
    description:
      'Cursor to request the next page, omitted when there are no more records',
  })
  nextCursor?: string;

  @ApiProperty({ description: 'Number of records returned' })
  count: number;
}
