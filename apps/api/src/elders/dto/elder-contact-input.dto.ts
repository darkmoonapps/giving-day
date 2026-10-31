import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const CONTACT_RELATIONS = [
  'child',
  'spouse',
  'sibling',
  'caregiver',
  'social_worker',
  'neighbor',
  'other',
] as const;

export class ElderContactInputDto {
  @ApiProperty({ type: String, example: 'Contact 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    type: String,
    enum: CONTACT_RELATIONS,
    example: 'child',
  })
  @IsIn(CONTACT_RELATIONS)
  relation!: (typeof CONTACT_RELATIONS)[number];

  @ApiProperty({ type: String, example: '+972500000001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @ApiPropertyOptional({ type: Boolean, example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
