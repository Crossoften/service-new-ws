import { PartialType } from '@nestjs/swagger';
import { CreateTransportationDto } from './create-transportation.dto';

export class UpdateTransportationDto extends PartialType(CreateTransportationDto) {}
