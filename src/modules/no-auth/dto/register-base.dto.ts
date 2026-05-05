import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class RegisterBaseDto extends OmitType(CreateUserDto, ['profileType'] as const) {}
