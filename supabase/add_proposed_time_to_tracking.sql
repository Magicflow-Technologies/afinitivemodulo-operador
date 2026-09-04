-- Script específico para agregar las columnas de agenda propuesta y nombre a email_tracking_test
-- Ejecutar en el SQL Editor de Supabase (Esquema: afinitivebd)

ALTER TABLE afinitivebd.email_tracking_test ADD COLUMN IF NOT EXISTS proposed_time TIMESTAMPTZ;
ALTER TABLE afinitivebd.email_tracking_test ADD COLUMN IF NOT EXISTS recipient_name TEXT;

-- Concesión de permisos
GRANT USAGE ON SCHEMA afinitivebd TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE afinitivebd.email_tracking_test TO anon, authenticated, service_role;
