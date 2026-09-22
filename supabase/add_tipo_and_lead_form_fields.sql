-- SCRIPT DE MIGRACIÓN: TIPOS DE EVENTOS Y CAMPOS PARA FORMULARIO DE CAPTURA (TIKTOK / REDES)
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase (Esquema 'afinitivebd')

-- 1. Agregar columna 'tipo' a la tabla eventos ('webinar' o 'lead_form')
ALTER TABLE afinitivebd.eventos 
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'webinar';

-- Permitir que fecha_inicio y link_reunion sean opcionales/nulos para formularios de captura
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE afinitivebd.eventos ALTER COLUMN fecha_inicio DROP NOT NULL;
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
    BEGIN
        ALTER TABLE afinitivebd.eventos ALTER COLUMN link_reunion DROP NOT NULL;
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
END $$;

-- 2. Agregar columnas 'pais' e 'interes_inversion' a la tabla de asistentes_evento
ALTER TABLE afinitivebd.asistentes_evento 
    ADD COLUMN IF NOT EXISTS pais VARCHAR(100),
    ADD COLUMN IF NOT EXISTS interes_inversion VARCHAR(255);

-- 3. Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON afinitivebd.eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_asistentes_evento_pais ON afinitivebd.asistentes_evento(pais);
CREATE INDEX IF NOT EXISTS idx_asistentes_evento_created_at ON afinitivebd.asistentes_evento(created_at DESC);

-- Dar permisos a los roles de Supabase
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA afinitivebd TO anon, authenticated, service_role;
