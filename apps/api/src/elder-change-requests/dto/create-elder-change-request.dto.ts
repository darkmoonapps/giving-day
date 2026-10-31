import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ProposedElderChangesDto } from './proposed-elder-changes.dto';

export class CreateElderChangeRequestDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '12121212-1212-4121-8121-121212121212',
  })
  @IsUUID()
  elderId!: string;

  @ApiProperty({ type: () => ProposedElderChangesDto })
  @ValidateNested()
  @Type(() => ProposedElderChangesDto)
  changes!: ProposedElderChangesDto;

  @ApiPropertyOptional({
    type: String,
    example: 'Moved within Holon',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string | null;
}
