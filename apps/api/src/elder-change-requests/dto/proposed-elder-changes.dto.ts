import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ElderContactInputDto } from '../../elders/dto/elder-contact-input.dto';

export class ProposedElderChangesDto {
  @ApiPropertyOptional({ type: String, example: '4 Park Ave' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  street?: string;

  @ApiPropertyOptional({ type: String, example: '12' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  houseNumber?: string;

  @ApiPropertyOptional({ type: String, example: 'B', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  entrance?: string | null;

  @ApiPropertyOptional({ type: String, example: '3', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  floor?: string | null;

  @ApiPropertyOptional({ type: String, example: '7', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  apartment?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'Ring the Holon courtyard bell',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  addressNotes?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'Entrance is around the back',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({ type: () => [ElderContactInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ElderContactInputDto)
  contacts?: ElderContactInputDto[];
}
