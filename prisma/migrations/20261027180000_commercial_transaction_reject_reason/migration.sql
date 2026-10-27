-- Motivo da recusa da negociação, para o comprador ver no detalhe.
--
-- O texto já existia: o `message` da recusa é postado como mensagem no chat da
-- negociação. A coluna guarda o mesmo texto no registro, de modo que a tela de
-- detalhe possa exibi-lo sem depender de abrir o chat e procurar.
--
-- Nullable porque recusa é minoria dos registros e nenhuma negociação anterior
-- tem o motivo gravado — o histórico delas segue só no chat.
ALTER TABLE `commercial_transactions` ADD COLUMN `rejectReason` LONGTEXT NULL;
