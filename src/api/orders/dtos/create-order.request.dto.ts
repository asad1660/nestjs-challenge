import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsMongoId, Min } from 'class-validator';

export class CreateOrderRequestDTO {
  @ApiProperty({
    description: 'Record ID being ordered',
    type: String,
  })
  @IsMongoId()
  recordId: string;

  @ApiProperty({
    description: 'Quantity to order',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;
}
