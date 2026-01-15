-- Script de corrección para SKU en productos
BEGIN;

-- 1. Corregir SKUs NULL
UPDATE productos 
SET sku = 'MAB-' || id || '-' || EXTRACT(EPOCH FROM fecha_creacion)::INT
WHERE sku IS NULL OR sku = '\N';

-- 2. Corregir SKUs duplicados
WITH duplicados AS (
    SELECT sku, COUNT(*) as count, MIN(id) as min_id
    FROM productos 
    WHERE sku IS NOT NULL AND sku != '\N'
    GROUP BY sku 
    HAVING COUNT(*) > 1
)
UPDATE productos p
SET sku = 'MAB-' || p.id || '-' || EXTRACT(EPOCH FROM p.fecha_creacion)::INT
FROM duplicados d
WHERE p.sku = d.sku AND p.id != d.min_id;

-- 3. Asegurar que todos los SKUs sean únicos
ALTER TABLE productos 
DROP CONSTRAINT IF EXISTS productos_sku_unique;

ALTER TABLE productos 
ADD CONSTRAINT productos_sku_unique UNIQUE (sku);

-- 4. Hacer SKU obligatorio
ALTER TABLE productos 
ALTER COLUMN sku SET NOT NULL;

-- 5. Ver resultados
SELECT id, nombre, sku FROM productos ORDER BY id;

COMMIT;

-- Resetear secuencia
SELECT setval('productos_id_seq', COALESCE((SELECT MAX(id) FROM productos), 0) + 1, false);

-- Verificar después
SELECT 'Verificación:' as mensaje;
SELECT sku, COUNT(*) as duplicados
FROM productos 
GROUP BY sku 
HAVING COUNT(*) > 1;

SELECT 'Total productos:' as estadistica, COUNT(*) FROM productos;
