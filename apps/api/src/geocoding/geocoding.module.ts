import { Module } from '@nestjs/common';
import { GEOCODER } from './geocoding.tokens';
import { NominatimGeocoder } from './nominatim.geocoder';

@Module({
  providers: [
    {
      provide: GEOCODER,
      useFactory: (): NominatimGeocoder => new NominatimGeocoder(),
    },
  ],
  exports: [GEOCODER],
})
export class GeocodingModule {}
