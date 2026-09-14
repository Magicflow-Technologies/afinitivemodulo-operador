-- SCRIPT DE MIGRACIÓN: CAMPOS DE PERFILAMIENTO E INVERSIÓN PARA AGENDAMIENTO PÚBLICO
-- Ejecuta este script en el SQL Editor de Supabase (Esquema 'afinitivebd')

-- 1. Ampliar tabla email_tracking_test para almacenar datos de inversión y consentimiento
ALTER TABLE afinitivebd.email_tracking_test 
    ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS investment_range VARCHAR(100),
    ADD COLUMN IF NOT EXISTS consent_promo BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS consent_privacy BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS consent_demand BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS booking_notes TEXT,
    ADD COLUMN IF NOT EXISTS booking_source VARCHAR(100) DEFAULT 'calendario_publico';

-- 2. Ampliar tabla email_queue por si se sincroniza con la cola de contactos
ALTER TABLE afinitivebd.email_queue 
    ADD COLUMN IF NOT EXISTS investment_range VARCHAR(100),
    ADD COLUMN IF NOT EXISTS consent_promo BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS consent_privacy BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS consent_demand BOOLEAN DEFAULT FALSE;

-- 3. Crear tabla dedicada para citas agendadas públicas (Opcional para trazabilidad total)
CREATE TABLE IF NOT EXISTS afinitivebd.public_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_name VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(50) NOT NULL,
    investment_range VARCHAR(100) NOT NULL,
    proposed_time TIMESTAMPTZ NOT NULL,
    consent_promo BOOLEAN DEFAULT FALSE,
    consent_privacy BOOLEAN DEFAULT TRUE,
    consent_demand BOOLEAN DEFAULT FALSE,
    notes TEXT,
    advisor_name VARCHAR(255) DEFAULT 'Ricardo Bertalmio Ruibal',
    advisor_calendar VARCHAR(255) DEFAULT 'rbertalmio@afinitive.com',
    status VARCHAR(50) DEFAULT 'Agendado',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deshabilitar RLS para pruebas y dar permisos completos
ALTER TABLE afinitivebd.public_appointments DISABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON TABLE afinitivebd.public_appointments TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA afinitivebd TO anon, authenticated, service_role;
