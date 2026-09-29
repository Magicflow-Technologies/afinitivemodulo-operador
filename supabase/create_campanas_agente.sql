-- SCRIPT SQL: CREACIÓN DE TABLA PARA CAMPAÑAS Y CONVOCATORIAS DEL AGENTE IA
-- Ejecuta este script en el SQL Editor de tu panel de Supabase (Esquema 'afinitivebd')

CREATE SCHEMA IF NOT EXISTS afinitivebd;

CREATE TABLE IF NOT EXISTS afinitivebd.campanas_agente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo_evento VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    link_reunion TEXT,
    fecha_evento TIMESTAMPTZ,
    canal VARCHAR(50) DEFAULT 'email', -- 'email' | 'whatsapp' | 'ambos'
    filtro_destinatarios VARCHAR(100) DEFAULT 'todos', -- 'todos' | 'pendientes' | 'agendados' | 'bio_link_tiktok', etc.
    estado_envio VARCHAR(50) DEFAULT 'guardado', -- 'guardado' | 'enviado' | 'parcial' | 'fallido'
    total_destinatarios INT DEFAULT 0,
    destinatarios_enviados INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_campanas_agente_created_at ON afinitivebd.campanas_agente(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campanas_agente_titulo ON afinitivebd.campanas_agente(titulo_evento);
CREATE INDEX IF NOT EXISTS idx_campanas_agente_estado ON afinitivebd.campanas_agente(estado_envio);

-- Permisos y RLS
ALTER TABLE afinitivebd.campanas_agente DISABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON TABLE afinitivebd.campanas_agente TO anon, authenticated, service_role;
