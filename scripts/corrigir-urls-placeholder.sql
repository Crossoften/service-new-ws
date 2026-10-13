-- Corrige as URLs de arquivo que foram gravadas com o host de exemplo do .env.
--
-- Causa: `URL_INTEGRATION` ficou com o texto-modelo (`your-ngrok-url...`), e é
-- dela que a API monta a `fileUrl` no momento do upload. O valor fica GRAVADO
-- na linha, então corrigir o `.env` conserta os próximos uploads e não os que
-- já existem — daí este script.
--
-- COMO USAR
--   1. Corrija `URL_INTEGRATION` no `.env` e reinicie a API.
--   2. Rode o bloco de CONFERÊNCIA e veja quantas linhas serão tocadas.
--   3. Troque @BASE_ERRADA e @BASE_CERTA abaixo.
--   4. Rode a CORREÇÃO.
--
-- SEGURANÇA
--   Faça backup antes:  mysqldump -u <user> -p <banco> > backup.sql
--   O script troca apenas o prefixo do host e preserva o caminho e a chave.
--   Nenhuma linha é apagada.

SET @BASE_ERRADA = 'https://your-ngrok-url.ngrok-free.app';
SET @BASE_CERTA  = 'https://COLOQUE-A-URL-REAL-AQUI';

-- ============================================================
-- 1. CONFERÊNCIA — rode primeiro, não altera nada
-- ============================================================

SELECT 'users'                     AS tabela, 'fileUrl'  AS coluna, COUNT(*) AS linhas FROM users                     WHERE fileUrl  LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'files',                     'fileUrl',  COUNT(*) FROM files                     WHERE fileUrl  LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'budget_files',              'fileUrl',  COUNT(*) FROM budget_files              WHERE fileUrl  LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'work_files',                'fileUrl',  COUNT(*) FROM work_files                WHERE fileUrl  LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'chat_messages',             'fileUrl',  COUNT(*) FROM chat_messages             WHERE fileUrl  LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'services',                  'imageUrl', COUNT(*) FROM services                  WHERE imageUrl LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'products',                  'imageUrl', COUNT(*) FROM products                  WHERE imageUrl LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'products',                  'videoUrl', COUNT(*) FROM products                  WHERE videoUrl LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'accommodations',            'imageUrl', COUNT(*) FROM accommodations            WHERE imageUrl LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'accommodations',            'videoUrl', COUNT(*) FROM accommodations            WHERE videoUrl LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'transportations',           'imageUrl', COUNT(*) FROM transportations           WHERE imageUrl LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'transportations',           'videoUrl', COUNT(*) FROM transportations           WHERE videoUrl LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'restaurants',               'imageUrl', COUNT(*) FROM restaurants               WHERE imageUrl LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'menu_items',                'imageUrl', COUNT(*) FROM menu_items                WHERE imageUrl LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'service_categories',        'iconUrl',  COUNT(*) FROM service_categories        WHERE iconUrl  LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'product_categories',        'iconUrl',  COUNT(*) FROM product_categories        WHERE iconUrl  LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'accommodation_categories',  'iconUrl',  COUNT(*) FROM accommodation_categories  WHERE iconUrl  LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'transportation_categories', 'iconUrl',  COUNT(*) FROM transportation_categories WHERE iconUrl  LIKE CONCAT(@BASE_ERRADA, '%')
UNION ALL SELECT 'restaurant_categories',     'iconUrl',  COUNT(*) FROM restaurant_categories     WHERE iconUrl  LIKE CONCAT(@BASE_ERRADA, '%');

-- ============================================================
-- 2. CORREÇÃO — só depois de preencher @BASE_CERTA
-- ============================================================

UPDATE users                     SET fileUrl  = REPLACE(fileUrl,  @BASE_ERRADA, @BASE_CERTA) WHERE fileUrl  LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE files                     SET fileUrl  = REPLACE(fileUrl,  @BASE_ERRADA, @BASE_CERTA) WHERE fileUrl  LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE budget_files              SET fileUrl  = REPLACE(fileUrl,  @BASE_ERRADA, @BASE_CERTA) WHERE fileUrl  LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE work_files                SET fileUrl  = REPLACE(fileUrl,  @BASE_ERRADA, @BASE_CERTA) WHERE fileUrl  LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE chat_messages             SET fileUrl  = REPLACE(fileUrl,  @BASE_ERRADA, @BASE_CERTA) WHERE fileUrl  LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE services                  SET imageUrl = REPLACE(imageUrl, @BASE_ERRADA, @BASE_CERTA) WHERE imageUrl LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE products                  SET imageUrl = REPLACE(imageUrl, @BASE_ERRADA, @BASE_CERTA) WHERE imageUrl LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE products                  SET videoUrl = REPLACE(videoUrl, @BASE_ERRADA, @BASE_CERTA) WHERE videoUrl LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE accommodations            SET imageUrl = REPLACE(imageUrl, @BASE_ERRADA, @BASE_CERTA) WHERE imageUrl LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE accommodations            SET videoUrl = REPLACE(videoUrl, @BASE_ERRADA, @BASE_CERTA) WHERE videoUrl LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE transportations           SET imageUrl = REPLACE(imageUrl, @BASE_ERRADA, @BASE_CERTA) WHERE imageUrl LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE transportations           SET videoUrl = REPLACE(videoUrl, @BASE_ERRADA, @BASE_CERTA) WHERE videoUrl LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE restaurants               SET imageUrl = REPLACE(imageUrl, @BASE_ERRADA, @BASE_CERTA) WHERE imageUrl LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE menu_items                SET imageUrl = REPLACE(imageUrl, @BASE_ERRADA, @BASE_CERTA) WHERE imageUrl LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE service_categories        SET iconUrl  = REPLACE(iconUrl,  @BASE_ERRADA, @BASE_CERTA) WHERE iconUrl  LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE product_categories        SET iconUrl  = REPLACE(iconUrl,  @BASE_ERRADA, @BASE_CERTA) WHERE iconUrl  LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE accommodation_categories  SET iconUrl  = REPLACE(iconUrl,  @BASE_ERRADA, @BASE_CERTA) WHERE iconUrl  LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE transportation_categories SET iconUrl  = REPLACE(iconUrl,  @BASE_ERRADA, @BASE_CERTA) WHERE iconUrl  LIKE CONCAT(@BASE_ERRADA, '%');
UPDATE restaurant_categories     SET iconUrl  = REPLACE(iconUrl,  @BASE_ERRADA, @BASE_CERTA) WHERE iconUrl  LIKE CONCAT(@BASE_ERRADA, '%');
