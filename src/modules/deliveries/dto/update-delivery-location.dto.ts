import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude } from 'class-validator';

export class UpdateDeliveryLocationDto {
  @ApiProperty({ description: 'Latitude atual do entregador.', example: -23.55052 })
  @Type(() => Number)
  @IsLatitude({ message: 'A latitude informada é inválida.' })
  lat: number;

  @ApiProperty({ description: 'Longitude atual do entregador.', example: -46.633308 })
  @Type(() => Number)
  @IsLongitude({ message: 'A longitude informada é inválida.' })
  lng: number;
}
