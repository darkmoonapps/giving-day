import { ApiProperty } from '@nestjs/swagger';

export class ConfirmRemindersJobResultDto {
  @ApiProperty({ type: Number, example: 3 })
  attempted!: number;

  @ApiProperty({ type: Number, example: 1 })
  sent!: number;

  @ApiProperty({ type: Number, example: 1 })
  failed!: number;

  @ApiProperty({ type: Number, example: 1 })
  skipped!: number;

  @ApiProperty({ type: Number, example: 2 })
  daysProcessed!: number;
}
