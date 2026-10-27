import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    required: false,
    description: 'Refresh token (can also be in cookie)',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
