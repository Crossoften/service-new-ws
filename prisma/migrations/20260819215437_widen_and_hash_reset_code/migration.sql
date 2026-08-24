-- AlterTable
ALTER TABLE `users` MODIFY `code` VARCHAR(72) NULL;

-- Invalida os códigos de recuperação em trânsito.
-- A partir daqui a coluna guarda o HASH do código, não o código em texto claro;
-- qualquer valor antigo deixaria de casar na verificação e ficaria órfão no banco.
UPDATE `users` SET `code` = NULL, `codeExpiresIn` = NULL WHERE `code` IS NOT NULL;
