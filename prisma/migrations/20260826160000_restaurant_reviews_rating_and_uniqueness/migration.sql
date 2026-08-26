-- Nota de 1 a 5 nas avaliações.
--
-- O modelo `Review` tinha apenas `type` (Positive/Negative) e `comment` —
-- nenhum campo de nota em lugar nenhum do schema. Sem ele não há estrelas,
-- não há média e não há ordenação por melhor avaliado.
--
-- Nulável de propósito: as avaliações de serviço, produto, hospedagem e
-- transporte já existentes não têm nota e continuam válidas. Só a rota de
-- restaurante exige o campo.
ALTER TABLE `reviews` ADD COLUMN `rating` SMALLINT NULL;

-- Avaliação de restaurante só pode ser feita uma vez por cliente.
--
-- Serviço, produto, hospedagem e transporte já tinham essa trava; restaurante
-- ficou de fora quando a relação foi acrescentada. Sem ela, a média futura
-- seria manipulável por repetição.
--
-- Se já houver duplicatas na base, este índice falha ao ser criado. Nesse caso,
-- limpe antes mantendo a avaliação mais recente de cada par:
--
--   DELETE r FROM reviews r
--     JOIN reviews mais_nova
--       ON mais_nova.restaurantId = r.restaurantId
--      AND mais_nova.requesterId  = r.requesterId
--      AND mais_nova.id > r.id
--    WHERE r.restaurantId IS NOT NULL;
CREATE UNIQUE INDEX `reviews_restaurantId_requesterId_key`
  ON `reviews`(`restaurantId`, `requesterId`);

CREATE INDEX `reviews_restaurantId_idx` ON `reviews`(`restaurantId`);
