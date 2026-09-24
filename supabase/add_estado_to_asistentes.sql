-- SCRIPT DE MIGRACIÓN: ESTADO DE ATENCIÓN PARA CLIENTES REGISTRADOS / LEADS
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase (Esquema 'afinitivebd')

-- 1. Agregar columna 'estado' a la tabla asistentes_evento
ALTER TABLE afinitivebd.asistentes_evento 
    ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'pendiente',
    ADD COLUMN IF NOT EXISTS notas TEXT,
    ADD COLUMN IF NOT EXISTS fecha_atencion TIMESTAMP WITH TIME ZONE;

-- 2. Asegurar que los registros existentes tengan estado 'pendiente' si es nulo
UPDATE afinitivebd.asistentes_evento 
SET estado = 'pendiente' 
WHERE estado IS NULL;

-- 3. Crear índice para filtrado rápido por estado
CREATE INDEX IF NOT EXISTS idx_asistentes_evento_estado ON afinitivebd.asistentes_evento(estado);

-- 4. Dar permisos a los roles de Supabase
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA afinitivebd TO anon, authenticated, service_role;
