-- Orçamento ganha aceite e recusa explícitos, e o serviço deixa de exigir preço.
--
-- Decisões da reunião de 21/09 sobre o fluxo de orçamento:
-- cliente solicita → profissional responde com preço personalizado → cliente
-- aceita ou recusa. Faltavam as duas pontas: não havia estado para o aceite
-- (o orçamento aprovado ficava eternamente em `Responded`) nem caminho para a
-- recusa (ou virava `Cancelled`, que é desistência, ou era apagado do banco).
--
-- Tudo aditivo. Nenhuma linha existente muda de valor.

-- 1. Os dois estados terminais.
ALTER TABLE `budgets`
  MODIFY `status` ENUM(
    'Pending',
    'Responded',
    'WaitingInformation',
    'Cancelled',
    'Accepted',
    'Rejected'
  ) NOT NULL DEFAULT 'Pending';

-- 2. Quando o cliente decidiu, e por quê na recusa.
ALTER TABLE `budgets`
  ADD COLUMN `acceptedAt` DATETIME(3) NULL,
  ADD COLUMN `rejectedAt` DATETIME(3) NULL,
  ADD COLUMN `rejectReason` LONGTEXT NULL;

-- 3. Preço do serviço passa a ser opcional.
--
-- O valor que vale é o que o profissional informa ao responder a solicitação,
-- e é dele que o trabalho e o pagamento já tiram o total. O preço no cadastro
-- vira vitrine, ou some.
--
-- Afrouxar a coluna não invalida nada do que já está gravado: todo serviço
-- existente continua com o preço que tinha.
ALTER TABLE `services` MODIFY `price` DECIMAL(10, 2) NULL;
