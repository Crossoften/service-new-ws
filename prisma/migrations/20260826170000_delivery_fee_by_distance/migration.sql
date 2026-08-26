-- Frete calculado no servidor, por faixa de distância.
--
-- Até aqui `deliveryFee` vinha no corpo do pedido, enviado pelo cliente, com
-- `@Min(0)` como única validação — e quando não vinha, o servidor usava um
-- valor fixo de 8 escrito no código. Como o entregador recebe 100% dessa taxa,
-- quem pagava a conta definia quanto o entregador ganhava; um pedido com
-- `deliveryFee: 0` era aceito.

-- Coordenadas do endereço, para medir a distância.
-- Opcionais: nenhum endereço existente tem, e o preenchimento vem do front,
-- ao geocodificar o endereço escolhido pelo usuário.
ALTER TABLE `addresses`
  ADD COLUMN `latitude` DECIMAL(10, 7) NULL,
  ADD COLUMN `longitude` DECIMAL(10, 7) NULL;

-- Faixas de distância, mantidas pelo admin.
CREATE TABLE `delivery_fee_rules` (
  `id`        INTEGER NOT NULL AUTO_INCREMENT,
  `minKm`     DECIMAL(6, 2) NOT NULL,
  `maxKm`     DECIMAL(6, 2) NULL,
  `type`      ENUM('Fixed', 'Percent') NOT NULL DEFAULT 'Fixed',
  `value`     DECIMAL(10, 2) NOT NULL,
  `isActive`  BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `delivery_fee_rules_isActive_minKm_idx`(`isActive`, `minKm`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Uma faixa inicial que reproduz o comportamento atual: R$ 8,00 para qualquer
-- distância. Sem nenhuma faixa cadastrada o cálculo cairia no valor padrão do
-- código, e o admin veria uma tela vazia sem entender de onde vem a taxa.
-- Ajuste ou substitua pelas faixas reais assim que elas forem definidas.
INSERT INTO `delivery_fee_rules` (`minKm`, `maxKm`, `type`, `value`, `isActive`, `updatedAt`)
VALUES (0.00, NULL, 'Fixed', 8.00, true, NOW(3));
