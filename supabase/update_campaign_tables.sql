-- SCRIPT DE ACTUALIZACIÓN DE BASE DE DATOS (SUPABASE)
-- Corre este script en el SQL Editor de tu panel de Supabase en el esquema 'afinitivebd'.

-- 1. Crear tabla de configuraciones si no existe
CREATE TABLE IF NOT EXISTS afinitivebd.calendar_settings (
    id SERIAL PRIMARY KEY,
    slot_duration INT NOT NULL DEFAULT 60, -- en minutos
    morning_start VARCHAR(10) NOT NULL DEFAULT '09:00',
    morning_end VARCHAR(10) NOT NULL DEFAULT '12:00',
    afternoon_start VARCHAR(10) NOT NULL DEFAULT '14:00',
    afternoon_end VARCHAR(10) NOT NULL DEFAULT '17:00',
    send_interval INT NOT NULL DEFAULT 5, -- valor del intervalo
    send_interval_unit VARCHAR(20) NOT NULL DEFAULT 'minutes', -- 'seconds' | 'minutes' | 'hours'
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración por defecto con ID = 1 si no existe
INSERT INTO afinitivebd.calendar_settings (id, slot_duration, morning_start, morning_end, afternoon_start, afternoon_end, send_interval, send_interval_unit)
VALUES (1, 60, '09:00', '12:00', '14:00', '17:00', 5, 'minutes')
ON CONFLICT (id) DO NOTHING;

-- 2. Crear tabla de cola de envíos si no existe
CREATE TABLE IF NOT EXISTS afinitivebd.email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_name VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(50), -- columna para guardar el número de celular
    proposed_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'sent' | 'failed' | 'excluded'
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sentencia de migración rápida si la tabla ya existe
ALTER TABLE afinitivebd.email_queue ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(50);

-- Habilitar permisos públicos para lectura/escritura simples en el Sandbox de pruebas
ALTER TABLE afinitivebd.calendar_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE afinitivebd.email_queue DISABLE ROW LEVEL SECURITY;

-- Concesión de permisos para evitar el error 'permission denied' en el esquema afinitivebd
GRANT USAGE ON SCHEMA afinitivebd TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA afinitivebd TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA afinitivebd TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA afinitivebd GRANT ALL ON TABLES TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE afinitivebd.email_queue TO anon, authenticated, service_role;
