-- Vínculo da conta do vendedor no Mercado Pago, para o split automático.
--
-- Esta migration é o que faltava na implementação original: as colunas existiam
-- só no schema.prisma, e os commits vinham marcados com [RESET DB] — o que não
-- é caminho aplicável a homologação nem a produção.
--
-- Os dois tokens são gravados CIFRADOS pela aplicação (AES-256-GCM, ver
-- src/utils/secretBox.ts). O VarChar(500) acomoda o texto cifrado, que é maior
-- que o original. `mpUserId` e `mpPublicKey` são identificadores públicos e
-- ficam em claro.
ALTER TABLE `users`
  ADD COLUMN `mpUserId` VARCHAR(120) NULL,
  ADD COLUMN `mpAccessToken` VARCHAR(500) NULL,
  ADD COLUMN `mpRefreshToken` VARCHAR(500) NULL,
  ADD COLUMN `mpPublicKey` VARCHAR(255) NULL,
  ADD COLUMN `mpLinkedAt` DATETIME(3) NULL;

-- Percentual retido pela plataforma no split, configurável pelo admin.
-- Fica aqui, e não fixo no código, porque é decisão comercial: mudar a taxa não
-- deveria exigir deploy. O padrão de 10% reproduz o valor que estava no código.
ALTER TABLE `platform_settings`
  ADD COLUMN `marketplaceFeeRate` DECIMAL(5, 2) NOT NULL DEFAULT 10.00;
