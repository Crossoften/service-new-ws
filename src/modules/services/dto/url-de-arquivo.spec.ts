import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CreateBudgetFileDto } from '../../budgets/dto/create-budget-file.dto';
import { CreateWorkFileDto } from '../../works/dto/create-work-file.dto';
import { CreateServiceDto } from './create-service.dto';

/**
 * As URLs de arquivo são emitidas pela própria API, a partir de
 * `URL_INTEGRATION`. Em ambiente local isso é `http://localhost:8000`, que não
 * tem TLD — e o `@IsUrl` com opções padrão recusa host sem ponto. O resultado
 * era a API recusar a URL que ela mesma acabara de devolver no upload.
 *
 * Estes testes fixam as duas pontas: as URLs nossas passam, e lixo continua
 * sendo recusado. Relaxar demais (trocar por `@IsString`, como fazem outros
 * DTOs) deixaria `javascript:alert(1)` entrar.
 */

const NOSSAS = [
  'http://localhost:8000/v1/files/1791230853240-foto.png',
  'http://127.0.0.1:8000/v1/files/foto.png',
  'http://192.168.1.3:8000/v1/files/foto.png',
  'https://homolog.crosoften.com:8029/v1/files/foto.png',
  'https://bkt-service.s3.amazonaws.com/foto.png',
];

/**
 * Lixo que as duas configurações recusam — antes e depois da mudança.
 *
 * `'foto.png'` ficou de fora de propósito: o validador **já o aceitava** com as
 * opções padrão, porque `.png` parece TLD e `require_protocol` é falso. Não é
 * efeito desta mudança, e afirmar o contrário aqui faria o teste mentir sobre
 * o que ela fez.
 */
const LIXO = ['não é uma url', 'javascript:alert(1)', '/v1/files/foto.png', ''];

function erros(classe: new () => object, campo: string, valor: string): string[] {
  const instancia = plainToInstance(classe, { [campo]: valor });
  return validateSync(instancia)
    .filter((erro) => erro.property === campo)
    .flatMap((erro) => Object.values(erro.constraints ?? {}));
}

describe('CreateServiceDto.imageUrl', () => {
  it.each(NOSSAS)('aceita a URL que a própria API emite: %s', (url) => {
    expect(erros(CreateServiceDto, 'imageUrl', url)).toEqual([]);
  });

  it.each(LIXO)('recusa %s', (valor) => {
    expect(erros(CreateServiceDto, 'imageUrl', valor)).toContain(
      'A URL da imagem do serviço é inválida.',
    );
  });

  it('continua aceitando ausência, que é o campo opcional', () => {
    const instancia = plainToInstance(CreateServiceDto, { name: 'x' });
    const doCampo = validateSync(instancia).filter((erro) => erro.property === 'imageUrl');

    expect(doCampo).toEqual([]);
  });
});

describe('CreateWorkFileDto.fileUrl', () => {
  it.each(NOSSAS)('aceita %s', (url) => {
    expect(erros(CreateWorkFileDto, 'fileUrl', url)).toEqual([]);
  });

  it.each(LIXO)('recusa %s', (valor) => {
    expect(erros(CreateWorkFileDto, 'fileUrl', valor)).toContain('A URL do arquivo é inválida.');
  });
});

/**
 * O recorte exato da mudança: só o host sem ponto passou a ser aceito. Se
 * alguém trocar `require_tld: false` por `@IsString`, este teste continua
 * verde — mas o de lixo acima quebra, que é onde a diferença importa.
 */
describe('o que exatamente mudou', () => {
  it('passa a aceitar host sem ponto, que é o caso do localhost', () => {
    expect(erros(CreateServiceDto, 'imageUrl', 'http://localhost:8000/v1/files/x.png')).toEqual([]);
    expect(erros(CreateWorkFileDto, 'fileUrl', 'http://localhost:8000/v1/files/x.png')).toEqual([]);
  });

  it('não passou a aceitar texto sem forma de URL', () => {
    expect(erros(CreateServiceDto, 'imageUrl', 'não é uma url')).not.toEqual([]);
  });
});

describe('CreateBudgetFileDto.fileUrl', () => {
  it.each(NOSSAS)('aceita %s', (url) => {
    expect(erros(CreateBudgetFileDto, 'fileUrl', url)).toEqual([]);
  });

  it.each(LIXO)('recusa %s', (valor) => {
    expect(erros(CreateBudgetFileDto, 'fileUrl', valor)).toContain('A URL do arquivo é inválida.');
  });
});
