-- SCRIPT DE ACTUALIZACIÓN: AGREGAR CAMPO 'TAG' (ETIQUETA)
-- Ejecuta este script en el SQL Editor de tu panel de Supabase.

-- 1. Agregar columna 'tag' a la tabla de cola de correos (afinitivebd.email_queue)
ALTER TABLE afinitivebd.email_queue ADD COLUMN IF NOT EXISTS tag VARCHAR(255);

-- 2. Agregar columna 'tag' a la tabla de historial de rastreo (afinitivebd.email_tracking_test)
ALTER TABLE afinitivebd.email_tracking_test ADD COLUMN IF NOT EXISTS tag VARCHAR(255);

-- 3. Asegurar permisos de acceso
GRANT ALL PRIVILEGES ON TABLE afinitivebd.email_queue TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE afinitivebd.email_tracking_test TO anon, authenticated, service_role;
