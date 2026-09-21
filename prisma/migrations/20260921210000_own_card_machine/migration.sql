-- Maquininha própria do estabelecimento.
--
-- Decisão da reunião de 21/09: o estabelecimento pode sinalizar que cobra
-- cartão na própria maquininha, mediante aceite de responsabilidade, e passa a
-- ser responsável pelo repasse ao entregador.
--
-- O risco que isto fecha é o sistema continuar tratando o pedido como split
-- normal quando o dinheiro nunca passou pela plataforma: sem a trava, o
-- checkout seria gerado, o entregador seria creditado por um frete que ninguém
-- reteve, e o razão acumularia passivo inexistente.
--
-- Tudo aditivo, com padrão que reproduz o comportamento atual: nenhum
-- restaurante nasce com maquininha, e nenhum pedido existente muda.

-- 1. A modalidade e o aceite que a autoriza.
--
-- Os três campos de aceite nascem juntos ao ligar e são limpos ao desligar:
-- religar exige aceitar de novo, porque o texto do termo pode ter mudado.
ALTER TABLE `restaurants`
  ADD COLUMN `usesOwnCardMachine` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `cardMachineAcceptedAt` DATETIME(3) NULL,
  ADD COLUMN `cardMachineAcceptedById` INTEGER NULL,
  ADD COLUMN `cardMachineTermsVersion` VARCHAR(40) NULL;

CREATE INDEX `restaurants_cardMachineAcceptedById_idx`
  ON `restaurants`(`cardMachineAcceptedById`);

ALTER TABLE `restaurants`
  ADD CONSTRAINT `restaurants_cardMachineAcceptedById_fkey`
  FOREIGN KEY (`cardMachineAcceptedById`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. A marca no pedido.
--
-- Gravada na criação em vez de deduzida do restaurante na leitura: a
-- modalidade pode ser desligada depois, e o pedido antigo precisa continuar
-- contando a verdade do dia em que foi feito. É esta coluna, e não o
-- `paymentMethod`, que decide se há checkout, se há confirmação manual e se
-- há repasse ao entregador.
--
ALTER TABLE `food_orders`
  ADD COLUMN `settledOffPlatform` BOOLEAN NOT NULL DEFAULT false;

-- 3. Backfill dos pedidos em dinheiro.
--
-- Pedido em dinheiro sempre foi liquidado fora da plataforma: o cliente paga em
-- mãos, na porta. Marcar os antigos deixa a coluna ser a única fonte de verdade
-- e evita que o código precise perguntar as duas coisas ("é dinheiro OU está
-- marcado?") em cada um dos três pontos que dependem disso.
--
-- Não muda comportamento nenhum: é exatamente o que o `paymentMethod = 'Cash'`
-- já significava.
UPDATE `food_orders` SET `settledOffPlatform` = true WHERE `paymentMethod` = 'Cash';
