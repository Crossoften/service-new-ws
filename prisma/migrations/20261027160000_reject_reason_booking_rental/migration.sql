-- Motivo da recusa, em reserva e em aluguel.
--
-- Coluna separada de `cancelReason` de propósito: cancelamento e recusa são
-- transições diferentes, feitas por partes diferentes — o cliente cancela, o
-- fornecedor recusa. Reaproveitar a mesma coluna faria o motivo de um
-- sobrescrever o do outro no histórico.
--
-- Nullable porque recusa é minoria dos registros e todo o histórico anterior
-- não tem motivo gravado.
ALTER TABLE `bookings` ADD COLUMN `rejectReason` LONGTEXT NULL;
ALTER TABLE `rentals` ADD COLUMN `rejectReason` LONGTEXT NULL;
