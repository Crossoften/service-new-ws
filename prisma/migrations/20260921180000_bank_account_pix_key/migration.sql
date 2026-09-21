-- Chave Pix na conta bancária do entregador.
--
-- O repasse da Etapa 1 é pago à mão pelo admin, e na prática ninguém faz Pix
-- por agência e conta: a chave é o caminho. Sem ela, a tela de repasse mostrava
-- banco, agência, conta e CPF, e o admin tinha de descobrir a chave por fora.
--
-- Opcional de propósito: a conta bancária existe no projeto desde antes, e
-- tornar a chave obrigatória invalidaria todos os cadastros já feitos. Os dois
-- campos andam juntos — ou ambos preenchidos, ou ambos nulos —, regra que vive
-- no service porque o `class-validator` valida campo a campo.
--
-- A chave é gravada já normalizada (CPF e CNPJ só com dígitos, telefone em
-- E.164, e-mail em minúsculas), para que quem for pagar não precise limpar
-- máscara — é aí que um erro manda dinheiro para a pessoa errada.
ALTER TABLE `bank_accounts`
  ADD COLUMN `pixKey` VARCHAR(191) NULL,
  ADD COLUMN `pixKeyType` ENUM('Cpf', 'Cnpj', 'Email', 'Phone', 'Random') NULL;
