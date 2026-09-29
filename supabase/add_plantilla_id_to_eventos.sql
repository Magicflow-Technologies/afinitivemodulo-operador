-- SCRIPT DE MIGRACIÓN: AGREGAR CAMPO PLANTILLA_ID A LA TABLA EVENTOS
-- Esquema: afinitivebd en Supabase

CREATE SCHEMA IF NOT EXISTS afinitivebd;

-- Agregar columna 'plantilla_id' a la tabla afinitivebd.eventos si no existe
ALTER TABLE afinitivebd.eventos 
    ADD COLUMN IF NOT EXISTS plantilla_id VARCHAR(255);

-- Crear índice para consultas rápidas por plantilla vinculada
CREATE INDEX IF NOT EXISTS idx_eventos_plantilla_id ON afinitivebd.eventos(plantilla_id);

-- Conceder permisos a los roles de Supabase
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA afinitivebd TO anon, authenticated, service_role;
