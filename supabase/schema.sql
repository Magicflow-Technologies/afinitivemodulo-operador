-- Script SQL para la base de datos PostgreSQL en Supabase
-- Crea la tabla para almacenar el rastreo de los correos electrónicos de prueba.

-- Asegurar la existencia del esquema
CREATE SCHEMA IF NOT EXISTS afinitivebd;

-- 1. Crear tabla email_tracking_test en el esquema afinitivebd
CREATE TABLE IF NOT EXISTS afinitivebd.email_tracking_test (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Enviado',
    resend_email_id TEXT NOT NULL UNIQUE,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    opened_at TIMESTAMP WITH TIME ZONE
);

-- 2. Habilitar el Row Level Security (RLS) en Supabase (Opcional pero recomendado)
ALTER TABLE afinitivebd.email_tracking_test ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas de Acceso RLS para pruebas
-- Nota: En un entorno de producción real, restringe las políticas al usuario autenticado.
-- Para pruebas, permitimos lectura pública y que el Service Role (Backend) inserte y actualice libremente.

-- Política 1: Permitir lectura pública a cualquier persona (para que la app frontend pueda consultar la tabla)
CREATE POLICY "Permitir lectura publica" 
    ON afinitivebd.email_tracking_test 
    FOR SELECT 
    USING (true);

-- Política 2: Permitir inserción al service_role (backend)
CREATE POLICY "Permitir insercion al service_role" 
    ON afinitivebd.email_tracking_test 
    FOR INSERT 
    TO service_role 
    WITH CHECK (true);

-- Política 3: Permitir actualización al service_role (backend)
CREATE POLICY "Permitir actualizacion al service_role" 
    ON afinitivebd.email_tracking_test 
    FOR UPDATE 
    TO service_role 
    USING (true)
    WITH CHECK (true);

-- Nota: Si usas una API Key "Anon" de Supabase en el backend y no una "Service Role Key", 
-- es posible que necesites crear políticas para el rol 'anon'. Sin embargo, para este MVP
-- recomendamos deshabilitar RLS temporalmente si tienes problemas de permisos durante las pruebas:
-- ALTER TABLE afinitivebd.email_tracking_test DISABLE ROW LEVEL SECURITY;

