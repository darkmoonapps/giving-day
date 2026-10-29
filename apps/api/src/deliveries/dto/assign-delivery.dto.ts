import { ApiProperty } from '@nestjs/swagger';
import { Allow, IsUUID, ValidateIf } from 'class-validator';

export class AssignDeliveryDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    example: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    description:
      'Active city volunteer to assign, or null to put the delivery on the needs-a-volunteer list',
  })
  @Allow()
  @ValidateIf((_dto: AssignDeliveryDto, value: unknown) => value !== null)
  @IsUUID()
  volunteerId!: string | null;
}
