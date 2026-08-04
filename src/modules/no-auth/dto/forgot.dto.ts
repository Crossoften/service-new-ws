import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { ForgotChannelEnum } from '../enums/forgot-channel.enum';

export class ForgotDto {
  @ApiProperty({
    description: 'Canal usado para receber o código de recuperação de senha.',
    enum: ForgotChannelEnum,
    example: ForgotChannelEnum.Email,
  })
  @IsEnum(ForgotChannelEnum, { message: 'O canal deve ser email ou sms.' })
  channel: ForgotChannelEnum;

  @ApiProperty({
    description: 'Email ou telefone usado para recuperar a senha, de acordo com o canal informado.',
    example: 'joao@email.com',
  })
  @IsString({ message: 'O identificador deve ser um texto.' })
  @MinLength(1, { message: 'O identificador é obrigatório.' })
  @MaxLength(191)
  identifier: string;
}
