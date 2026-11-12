import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpsertMessageTemplateDto {
  @ApiProperty({ type: String, example: 'יום חלוקה בחולון' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    type: String,
    example:
      'האם תוכל/י לחלק בחולון ב-{{date}} בין {{startTime}} ל-{{endTime}}?',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body!: string;
}
