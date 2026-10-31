import { ApiProperty } from '@nestjs/swagger';
import { DeliveryElderDto } from './delivery-response.dto';

export class VolunteerRouteCenterDto {
  @ApiProperty({
    type: String,
    example: '10 Warehouse Rd, Holon',
    description: 'Distribution center address from city settings',
  })
  address!: string;

  @ApiProperty({ type: Number, nullable: true, example: 32.0114 })
  lat!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 34.7748 })
  lng!: number | null;

  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'False when the center address could not be placed on the map',
  })
  placed!: boolean;
}

export class VolunteerRouteStopDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '16161616-1616-4161-8161-161616161616',
  })
  deliveryId!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 1,
    description:
      '1-based suggested visit order; null when the stop is unplaced',
  })
  visitOrder!: number | null;

  @ApiProperty({ type: Boolean, example: true })
  placed!: boolean;

  @ApiProperty({ type: Number, nullable: true, example: 32.0188 })
  lat!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 34.7792 })
  lng!: number | null;

  @ApiProperty({
    type: String,
    enum: [
      'unassigned',
      'assigned',
      'picked',
      'delivered',
      'not_delivered',
      'cancelled',
    ],
    example: 'assigned',
  })
  status!:
    | 'unassigned'
    | 'assigned'
    | 'picked'
    | 'delivered'
    | 'not_delivered'
    | 'cancelled';

  @ApiProperty({ type: DeliveryElderDto })
  elder!: DeliveryElderDto;
}

export class VolunteerDayRouteResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '33333333-3333-4333-8333-333333333333',
  })
  dayId!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  cityId!: string;

  @ApiProperty({ type: String, example: 'חולון' })
  cityNameHe!: string;

  @ApiProperty({ type: String, example: 'Holon' })
  cityNameEn!: string;

  @ApiProperty({ type: VolunteerRouteCenterDto })
  center!: VolunteerRouteCenterDto;

  @ApiProperty({ type: [VolunteerRouteStopDto] })
  stops!: VolunteerRouteStopDto[];
}
