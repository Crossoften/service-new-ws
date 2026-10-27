import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RentalStatusEnum } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class RespondRentalDto {
  @ApiProperty({
    description: 'Resposta do locador à solicitação de aluguel.',
    enum: [RentalStatusEnum.Accepted, RentalStatusEnum.Rejected],
    example: RentalStatusEnum.Accepted,
  })
  @IsIn([RentalStatusEnum.Accepted, RentalStatusEnum.Rejected], {
    message: 'A resposta deve ser Accepted ou Rejected.',
  })
  status: typeof RentalStatusEnum.Accepted | typeof RentalStatusEnum.Rejected;

  /**
   * Obrigatório quando `status` é `Rejected`.
   *
   * A regra é do produto: o locatário precisa saber por que foi recusado. O
   * `@ValidateIf` deixa o campo livre no caminho de aceite — mandar motivo numa
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
    description:
      'Motivo da recusa, exibido ao locatário. Obrigatório quando `status` é `Rejected`.',
    example: 'O item já está reservado para esse período.',
  })
  @ValidateIf((dto: RespondRentalDto) => dto.status === RentalStatusEnum.Rejected)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'O motivo da recusa deve ser um texto.' })
  @IsNotEmpty({ message: 'Informe o motivo da recusa.' })
  rejectReason?: string;
}
