import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsObject, IsString, MaxLength, ValidateNested } from 'class-validator';

export class PushSubscriptionKeysDto {
  @ApiProperty({ description: 'Chave pública da inscrição, devolvida pelo navegador.' })
  @IsString({ message: 'A chave p256dh deve ser um texto.' })
  @IsNotEmpty({ message: 'A chave p256dh é obrigatória.' })
  @MaxLength(255)
  p256dh: string;

  @ApiProperty({ description: 'Segredo de autenticação da inscrição.' })
  @IsString({ message: 'A chave auth deve ser um texto.' })
  @IsNotEmpty({ message: 'A chave auth é obrigatória.' })
  @MaxLength(255)
  auth: string;
}

export class SavePushSubscriptionDto {
  @ApiProperty({
    description: 'Endereço da inscrição, devolvido pelo navegador. Identifica o aparelho.',
    example: 'https://fcm.googleapis.com/fcm/send/abc123',
  })
  @IsString({ message: 'O endpoint deve ser um texto.' })
  @IsNotEmpty({ message: 'O endpoint é obrigatório.' })
  @MaxLength(500, { message: 'O endpoint não pode ter mais que 500 caracteres.' })
  endpoint: string;

  @ApiProperty({ type: PushSubscriptionKeysDto })
  @IsObject({ message: 'As chaves da inscrição são obrigatórias.' })
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys: PushSubscriptionKeysDto;
}

export class RemovePushSubscriptionDto {
  @ApiProperty({ description: 'Endereço da inscrição a remover.' })
  @IsString({ message: 'O endpoint deve ser um texto.' })
  @IsNotEmpty({ message: 'O endpoint é obrigatório.' })
  @MaxLength(500)
  endpoint: string;
}

export class ResponsePushPublicKeyDto {
  @ApiProperty({
    description:
      'Chave pública VAPID, para o `applicationServerKey` do `pushManager.subscribe`. ' +
      'Nula quando o servidor não tem Web Push configurado — nesse caso a tela deve ' +
      'omitir a oferta de notificações em vez de falhar.',
    nullable: true,
  })
  publicKey: string | null;
}
