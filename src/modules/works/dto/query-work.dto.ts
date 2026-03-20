import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { WorkScope } from '../enums/work-scope.enum';
import { WorkStatus } from '../enums/work-status.enum';

export class QueryWorkDto {
  @ApiProperty({
    description:
      'Escopo da listagem de trabalhos. Define se a consulta retorna trabalhos recebidos pelo usuário logado ou enviados por ele.',
    enum: WorkScope,
    enumName: 'WorkScope',
    required: false,
    example: WorkScope.Received,
  })
  @IsEnum(WorkScope, { message: 'O escopo informado é inválido.' })
  @IsOptional()
  scope?: WorkScope;

  @ApiProperty({
    description: 'Filtro opcional pelo status atual do trabalho.',
    enum: WorkStatus,
    enumName: 'WorkStatus',
    required: false,
    example: WorkStatus.InProgress,
  })
  @IsEnum(WorkStatus, { message: 'O status do trabalho é inválido.' })
  @IsOptional()
  status?: WorkStatus;

  @ApiProperty({
    description:
      'Filtro textual aplicado sobre nome do cliente, nome do fornecedor ou nome do serviço relacionado ao trabalho.',
    required: false,
    example: 'Susana',
    type: String,
  })
  @IsString({ message: 'O termo de busca deve ser um texto.' })
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filtro opcional pelo identificador do serviço vinculado ao trabalho.',
    required: false,
    example: '3',
    type: String,
  })
  @IsNumberString({}, { message: 'O campo serviceId deve conter apenas números.' })
  @IsOptional()
  serviceId?: number;

  @ApiProperty({
    description: 'Quantidade de registros retornados por página na listagem paginada.',
    required: false,
    example: '10',
    type: String,
  })
  @IsNumberString({}, { message: 'O campo take deve conter apenas números.' })
  @IsOptional()
  take?: number;

  @ApiProperty({
    description:
      'Página atual da listagem paginada. Apesar do nome do campo ser `skip`, o valor esperado é o número da página.',
    required: false,
    example: '1',
    type: String,
  })
  @IsNumberString({}, { message: 'O campo skip deve conter apenas números.' })
  @IsOptional()
  skip?: number;
}
