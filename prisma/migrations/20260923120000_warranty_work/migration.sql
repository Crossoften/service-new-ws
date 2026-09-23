-- Execução da garantia: o reparo vira um Work próprio (BE-W1).
--
-- Até aqui, aprovar uma garantia (`PATCH /works/:id/respond-warranty` com
-- `Approved`) só gravava `warrantyRequestStatus`. `Approved` e `Rejected`
-- rodavam exatamente o mesmo update: nada era reaberto, nada era criado, e o
-- cliente ficava sem rastreio do conserto que lhe foi prometido.
--
-- Decisão de produto Q-A: opção B — um **Work de garantia vinculado** ao
-- original, com `serviceValue = 0` e ciclo próprio. Reaproveita
-- `start`/`confirm-arrival`/`finish`/`cancel` sem endpoint novo, e preserva o
-- histórico do atendimento original em vez de sobrescrevê-lo.
--
-- Tudo aditivo; nenhum trabalho existente muda de comportamento.

-- 1. O vínculo pai↔filho e a marca do reparo.
ALTER TABLE `works`
  ADD COLUMN `parentWorkId` INTEGER NULL,
  ADD COLUMN `isWarranty` BOOLEAN NOT NULL DEFAULT false;

-- 2. `budgetId` passa a ser opcional.
--
-- O reparo em garantia não nasce de orçamento. O índice único continua: em
-- MySQL ele aceita vários NULL, então a unicidade segue valendo para todo
-- trabalho que veio de um orçamento — que é o caso de 100% dos existentes.
ALTER TABLE `works` MODIFY `budgetId` INTEGER NULL;

-- 3. Índices.
--
-- O composto `(providerId, isWarranty, status)` serve o contador de garantias
-- do perfil (BE-W7), que conta reparos concluídos e em aberto por fornecedor.
CREATE INDEX `works_parentWorkId_idx` ON `works`(`parentWorkId`);
CREATE INDEX `works_providerId_isWarranty_status_idx`
  ON `works`(`providerId`, `isWarranty`, `status`);

ALTER TABLE `works`
  ADD CONSTRAINT `works_parentWorkId_fkey`
  FOREIGN KEY (`parentWorkId`) REFERENCES `works`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
