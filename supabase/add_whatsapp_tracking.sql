-- SCRIPT DE MIGRACIÓN: AGREGAR RASTREO DE CLICS DE WHATSAPP
-- Ejecutar en el SQL Editor de Supabase en el esquema 'afinitivebd'

-- 1. Agregar columna whatsapp_clicked_at a email_tracking_test
ALTER TABLE afinitivebd.email_tracking_test 
ADD COLUMN IF NOT EXISTS whatsapp_clicked_at TIMESTAMPTZ;

-- 2. Agregar columna whatsapp_clicked_at a email_queue
ALTER TABLE afinitivebd.email_queue 
ADD COLUMN IF NOT EXISTS whatsapp_clicked_at TIMESTAMPTZ;

-- 3. Asegurar permisos para los roles
GRANT ALL PRIVILEGES ON TABLE afinitivebd.email_tracking_test TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE afinitivebd.email_queue TO anon, authenticated, service_role;
