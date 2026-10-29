import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsIn,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function blankToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().length === 0 ? undefined : value;
}

export class OnboardingDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ example: '+972501234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({
    required: false,
    example: '1990-01-15',
    format: 'date',
    description: 'Optional calendar date (YYYY-MM-DD). Omitted when empty.',
  })
  @Transform(({ value }: { value: unknown }) => blankToUndefined(value))
  @IsOptional()
  @IsDateString()
  @Matches(DATE_ONLY)
  birthDate?: string;

  @ApiProperty({ required: false, example: 'he', enum: ['he', 'en'] })
  @IsOptional()
  @IsIn(['he', 'en'])
  locale?: 'he' | 'en';
}
