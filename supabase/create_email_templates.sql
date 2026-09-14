-- SCRIPT DE MIGRACIÓN: CREACIÓN DE TABLA DE PLANTILLAS DE CORREO
-- Esquema: afinitivebd en Supabase

CREATE SCHEMA IF NOT EXISTS afinitivebd;

-- 1. Crear tabla email_templates si no existe
CREATE TABLE IF NOT EXISTS afinitivebd.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,                        -- Nombre descriptivo ej: "Preventa The New York Tower"
    subject TEXT NOT NULL,                              -- Asunto por defecto del correo
    type VARCHAR(50) NOT NULL DEFAULT 'full_html',     -- 'full_html' | 'standard_wrapper'
    html_content TEXT NOT NULL,                        -- Contenido HTML completo o cuerpo
    category VARCHAR(50) DEFAULT 'General',            -- 'Inmobiliario', 'Prospección', 'Eventos', 'General'
    created_by VARCHAR(50) DEFAULT 'manual',           -- 'manual' | 'ai_agent' | 'system'
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,                -- Metadatos adicionales (ej. tags detectados, links)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Deshabilitar RLS temporalmente o conceder permisos en el esquema afinitivebd para acceso libre en Sandbox
ALTER TABLE afinitivebd.email_templates DISABLE ROW LEVEL SECURITY;

GRANT ALL PRIVILEGES ON TABLE afinitivebd.email_templates TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA afinitivebd TO anon, authenticated, service_role;

-- 3. Insertar plantillas predeterminadas del sistema si no existen
-- A) Plantilla Institucional de Prospección LinkedIn (Modo Standard Wrapper)
INSERT INTO afinitivebd.email_templates (id, name, subject, type, html_content, category, created_by, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Prospección Institucional (LinkedIn)',
    'Invitación Exclusiva - Afinitive Wealth Management',
    'standard_wrapper',
    'Estimado/a {{nombre}}:

Le escribo porque encontré su perfil en LinkedIn. Compartimos varios contactos en común, y me pareció oportuno tomar la iniciativa de escribirle.

Mi nombre es <strong>{{firma_nombre}}</strong>. {{firma_cargo}}, una boutique de asesoría patrimonial. Le escribo porque sé perfectamente lo frustrante que es para perfiles como el suyo lidiar con la banca tradicional en Lima, donde casi siempre le intentan colocar sus propios productos financieros masivos, <strong>en lugar de ofrecer asesoría integral, objetiva y profesional</strong>.

Nosotros operamos al revés: no tenemos productos propios. Trabajamos con arquitectura abierta para optimizar la estructura de ingresos y el capital de un grupo muy selecto de personas:

• Morgan Stanley
• BNY Mellon
• Coril

Le adjunto una presentación muy ejecutiva (<em>Afinitive Wealth | Tailor Made</em>) que detalla cómo estructuramos los balances y flujos, y maximizamos ingresos a partir de una inversión más eficiente que la que la oferta masiva puede lograr. Si nos busca en Google o LinkedIn, verá que mi trayectoria y la de mi equipo es transparente y de largo aliento.

Entendiendo que sus tiempos son ajustados, ¿le acomodaría una reunión virtual vía Meet o una llamada telefónica de 20 minutos el día <strong>{{fecha_reunion}}</strong>?

[CONFIRMAR_CITA]

Me avisa para agendar,',
    'Prospección',
    'system',
    true
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content;
