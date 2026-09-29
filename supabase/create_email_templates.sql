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

-- B) Plantilla de Evento: Bonos vs Alquiler (Full HTML)
INSERT INTO afinitivebd.email_templates (id, name, subject, type, html_content, category, created_by, is_active, action_type)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'bonos vs alquiler',
    'Invitación exclusiva -  ¿Comprar para alquilar? Hay una alternativa más rentable',
    'full_html',
    '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Invitación al Evento</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #0b111e; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0b111e; font-family: Arial, Helvetica, sans-serif;">

  <!-- Contenedor Principal de Correo -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b111e;" role="presentation">
    <tr>
      <td align="center" style="padding: 24px 10px;">
        
        <!-- Tabla Central -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0e172a; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;" role="presentation">
          
          <!-- Bloque de la Imagen / Flyer -->
          <tr>
            <td align="center" style="padding: 0; line-height: 0;">
              <a href="{{whatsapp_link}}" target="_blank" style="text-decoration: none; display: block;">
                <img 
                  src="https://links.afinitive.com.pe/img/evento.jpeg" 
                  alt="Invitación al Evento" 
                  width="600" 
                  style="display: block; width: 100%; max-width: 600px; height: auto; border: 0; outline: none; text-decoration: none;" 
                />
              </a>
            </td>
          </tr>

          <!-- Bloque del Botón de Registro -->
          <tr>
            <td align="center" style="padding: 32px 20px 36px 20px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td align="center">
                    <a href="{{whatsapp_link}}" target="_blank" style="background: linear-gradient(135deg, #D4AF37 0%, #F5E6BE 50%, #B38738 100%); background-color: #D4AF37; color: #080D1A; display: inline-block; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 800; line-height: 1.2; text-decoration: none; padding: 18px 36px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; border: 2px solid #FFEBB5; text-align: center; box-shadow: 0 4px 20px rgba(212, 175, 55, 0.45); -webkit-text-size-adjust: none;">REGISTRARME AL EVENTO</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>',
    'Eventos',
    'system',
    true,
    'event_invitation'
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content;

