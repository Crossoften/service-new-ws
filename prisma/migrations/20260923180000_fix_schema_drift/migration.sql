-- Correção de divergência entre as migrations escritas à mão e o schema.
--
-- Encontrada rodando `prisma migrate diff` contra um MySQL de verdade, algo que
-- só foi possível quando o ambiente ganhou banco. As duas migrations de origem
-- já estão na branch; esta corrige o que faltou nelas, em vez de reescrever
-- história que já foi commitada e pushada.

-- 1. `payments.referenceType` ficou para trás em 20260921230000.
--
-- Aquela migration alterou só `financial_transactions.referenceType` para
-- incluir `DeliveryPayout`, com a justificativa de que um pagamento nunca
-- referencia um repasse. O raciocínio de produto está certo, mas o Prisma
-- modela **um enum só** (`PaymentReferenceTypeEnum`) para as duas colunas: do
-- ponto de vista do schema, as duas precisam aceitar o mesmo conjunto.
--
-- Sem isto, `prisma migrate dev` geraria uma migration fantasma em qualquer
-- máquina, e o cliente do Prisma aceitaria em tipo um valor que o banco recusa
-- em runtime.
ALTER TABLE `payments`
  MODIFY `referenceType` ENUM(
    'Work',
    'CommercialTransaction',
    'Subscription',
    'FoodOrder',
    'Referral',
    'DeliveryPayout'
  ) NOT NULL;

-- 2. A chave estrangeira de `works.budgetId` ficou com a ação antiga.
--
-- 20260923120000 tornou a coluna opcional, mas deixou a FK como estava. Para
-- relação obrigatória o Prisma usa `ON DELETE RESTRICT`; ao virar opcional, o
-- esperado passa a ser `ON DELETE SET NULL`. `MODIFY` numa coluna com FK não
-- mexe na constraint, então a diferença passou despercebida.
--
-- Na prática: apagar um orçamento que já virou trabalho era recusado pelo
-- banco; com `SET NULL`, o trabalho sobrevive e perde só o vínculo — que é o
-- mesmo estado em que o reparo em garantia já nasce.
ALTER TABLE `works` DROP FOREIGN KEY `works_budgetId_fkey`;

ALTER TABLE `works`
  ADD CONSTRAINT `works_budgetId_fkey`
  FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
