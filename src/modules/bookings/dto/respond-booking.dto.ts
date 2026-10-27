import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatusEnum } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class RespondBookingDto {
  @ApiProperty({
    description: 'Resposta do anfitrião à solicitação de reserva.',
    enum: [BookingStatusEnum.Confirmed, BookingStatusEnum.Rejected],
    example: BookingStatusEnum.Confirmed,
  })
  @IsIn([BookingStatusEnum.Confirmed, BookingStatusEnum.Rejected], {
    message: 'A resposta deve ser Confirmed ou Rejected.',
  })
  status: typeof BookingStatusEnum.Confirmed | typeof BookingStatusEnum.Rejected;

  /**
   * Obrigatório quando `status` é `Rejected`.
   *
   * A regra é do produto: o hóspede precisa saber por que foi recusado. O
   * `@ValidateIf` deixa o campo livre no caminho de confirmação — mandar motivo numa
   * aprovação é inofensivo e o serviço o ignora.
   *
   * O `@Transform` apara antes de validar, senão `"   "` passaria pelo
   * `@IsNotEmpty` e gravaria motivo vazio, que é o mesmo que não ter motivo.
   *
   * Sem limite de tamanho, igual ao `cancelReason`: a coluna é LongText, e um
   * `@MaxLength` aqui fazia o caso mais comum — motivo omitido — responder
   * também "deve ter no máximo N caracteres", que não explica nada.
   */
  @ApiPropertyOptional({
    description: 'Motivo da recusa, exibido ao hóspede. Obrigatório quando `status` é `Rejected`.',
    example: 'A acomodação está indisponível nessas datas.',
  })
  @ValidateIf((dto: RespondBookingDto) => dto.status === BookingStatusEnum.Rejected)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'O motivo da recusa deve ser um texto.' })
  @IsNotEmpty({ message: 'Informe o motivo da recusa.' })
  rejectReason?: string;
}
