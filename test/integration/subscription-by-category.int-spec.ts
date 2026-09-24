import { PrismaService } from '@database/PrismaService';

import { SubscriptionGuardService } from '../../src/modules/subscription-guard/subscription-guard.service';
import { ProviderNotSellingException } from '../../src/modules/subscription-guard/exceptions/provider-not-selling.exception';
import { SupplierSubscriptionRequiredException } from '../../src/modules/subscription-guard/exceptions/supplier-subscription-required.exception';
import {
  criarAssinaturaAtiva,
  criarCategoriaDeServico,
  criarPlano,
  criarUsuario,
  limparBanco,
  prisma,
} from './db';

/**
 * A cobrança por categoria, exercitada contra o banco de verdade.
 *
 * O teste unitário prova o formato da consulta; este prova o resultado dela.
 * São coisas diferentes: um `where` com a forma certa ainda pode selecionar a
 * linha errada, e foi exatamente esse tipo de divergência que um teste sem
 * banco deixou passar no acionamento de garantia.
 */
describe('assinatura por categoria', () => {
  const guard = new SubscriptionGuardService(prisma as unknown as PrismaService);

  const EM_UM_MES = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  // Fora da carência de 3 dias, para separar 'vencida' de 'tolerada'. A
  // tolerância em si é exercitada em `subscription-lifecycle.int-spec.ts`.
  const VENCIDA = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

  beforeEach(limparBanco);
  afterAll(() => prisma.$disconnect());

  it('o fornecedor mantém duas categorias com planos e vencimentos diferentes', async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    const pintor = await criarCategoriaDeServico('Pintor');
    const pedreiro = await criarCategoriaDeServico('Pedreiro');
    const mensal = await criarPlano('Plano mensal', '19.90', 1);
    const anual = await criarPlano('Plano anual', '118.80', 12);

    await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: mensal.id,
      categoryId: pintor.id,
      terminaEm: EM_UM_MES,
    });
    await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: anual.id,
      categoryId: pedreiro.id,
      terminaEm: EM_UM_MES,
    });

    // Era isto que a trava antiga impedia: a segunda assinatura não existia.
    await expect(
      guard.assertProviderCanSell(fornecedor.id, { categoryId: pintor.id }),
    ).resolves.toBeUndefined();
    await expect(
      guard.assertProviderCanSell(fornecedor.id, { categoryId: pedreiro.id }),
    ).resolves.toBeUndefined();
  });

  it('uma categoria vencida não derruba a outra', async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    const pintor = await criarCategoriaDeServico('Pintor');
    const jardineiro = await criarCategoriaDeServico('Jardineiro');
    const mensal = await criarPlano('Plano mensal', '19.90', 1);

    await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: mensal.id,
      categoryId: pintor.id,
      terminaEm: VENCIDA,
    });
    await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: mensal.id,
      categoryId: jardineiro.id,
      terminaEm: EM_UM_MES,
    });

    await expect(
      guard.assertProviderCanSell(fornecedor.id, { categoryId: pintor.id }),
    ).rejects.toBeInstanceOf(ProviderNotSellingException);
    await expect(
      guard.assertProviderCanSell(fornecedor.id, { categoryId: jardineiro.id }),
    ).resolves.toBeUndefined();
  });

  it('a assinatura de uma categoria não libera outra', async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    const pintor = await criarCategoriaDeServico('Pintor');
    const advogado = await criarCategoriaDeServico('Advogado');
    const mensal = await criarPlano('Plano mensal', '19.90', 1);

    await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: mensal.id,
      categoryId: pintor.id,
      terminaEm: EM_UM_MES,
    });

    await expect(
      guard.assertProviderCanSell(fornecedor.id, { categoryId: advogado.id }),
    ).rejects.toBeInstanceOf(ProviderNotSellingException);
  });

  it('a concessão administrativa cobre qualquer categoria', async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    const pintor = await criarCategoriaDeServico('Pintor');
    const mensal = await criarPlano('Plano mensal', '19.90', 1);

    await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: mensal.id,
      categoryId: null,
      terminaEm: EM_UM_MES,
    });

    await expect(
      guard.assertProviderCanSell(fornecedor.id, { categoryId: pintor.id }),
    ).resolves.toBeUndefined();
  });

  it('assinatura vencida fora da carência, da categoria certa, não passa', async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    const pintor = await criarCategoriaDeServico('Pintor');
    const mensal = await criarPlano('Plano mensal', '19.90', 1);

    await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: mensal.id,
      categoryId: pintor.id,
      terminaEm: VENCIDA,
    });

    // Se as condições de período e de categoria colidissem na mesma chave do
    // `where`, esta assinatura vencida passaria — e nenhum teste de formato
    // pegaria isso, porque o formato continuaria parecendo correto.
    await expect(
      guard.assertProviderCanSell(fornecedor.id, { categoryId: pintor.id }),
    ).rejects.toBeInstanceOf(ProviderNotSellingException);
  });

  it('as verticais sem categoria continuam aceitando qualquer assinatura vigente', async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    const pintor = await criarCategoriaDeServico('Pintor');
    const mensal = await criarPlano('Plano mensal', '19.90', 1);

    await criarAssinaturaAtiva({
      userId: fornecedor.id,
      planId: mensal.id,
      categoryId: pintor.id,
      terminaEm: EM_UM_MES,
    });

    // Produtos, hospedagem, transporte, vagas e delivery não passam categoria.
    // É a brecha conhecida e registrada: quem assina uma categoria destrava as
    // outras verticais. O teste existe para que a mudança seja deliberada.
    await expect(guard.assertProviderCanSell(fornecedor.id)).resolves.toBeUndefined();
  });

  it('o erro do próprio fornecedor carrega a categoria cobrada', async () => {
    const fornecedor = await criarUsuario('Fornecedor');
    const pintor = await criarCategoriaDeServico('Pintor');

    const usuario = await prisma.user.findUniqueOrThrow({ where: { id: fornecedor.id } });

    await expect(
      guard.assertActiveSubscription(usuario, { categoryId: pintor.id }),
    ).rejects.toMatchObject({
      response: { categoryId: pintor.id },
    });
    await expect(
      guard.assertActiveSubscription(usuario, { categoryId: pintor.id }),
    ).rejects.toBeInstanceOf(SupplierSubscriptionRequiredException);
  });
});
