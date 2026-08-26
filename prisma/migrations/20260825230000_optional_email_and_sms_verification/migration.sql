-- O e-mail deixa de ser obrigatório: a identidade principal do usuário passa a
-- ser o telefone, verificado por SMS. O índice único continua — no MySQL ele
-- admite vários NULL, então só quem informa e-mail é obrigado a ser único.
ALTER TABLE `users` MODIFY `email` VARCHAR(191) NULL;

-- Colunas próprias da verificação de conta.
-- Não reaproveitam `code`/`codeExpiresIn`, que são da recuperação de senha:
-- com um campo só, pedir "esqueci a senha" apagaria o código de verificação
-- ainda não usado, e vice-versa.
ALTER TABLE `users`
  ADD COLUMN `verificationCode` VARCHAR(72) NULL,
  ADD COLUMN `verificationExpiresIn` DATETIME(3) NULL;

-- As contas que já existem ficam como estão, por decisão registrada em
-- docs/STATUS-BACKEND.md: exigir verificação retroativa trancaria para fora as
-- contas sem telefone — os administradores entre elas — sem caminho de volta.
-- A exigência vale apenas para cadastros novos, que nascem com status Pending.
