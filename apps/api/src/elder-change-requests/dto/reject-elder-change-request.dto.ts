import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectElderChangeRequestDto {
  @ApiPropertyOptional({
    type: String,
    example: 'Please call the Holon office first',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string | null;
}
