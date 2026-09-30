-- ==============================================================================
-- MIGRACIÓN: AGREGAR COLUMNA recordatorio_estado
-- Para control y seguimiento de recordatorios automáticos enviados por el Agente IA
-- ==============================================================================

-- 1. Agregar columna recordatorio_estado a la tabla de asistentes / leads
ALTER TABLE IF EXISTS afinitivebd.asistentes_evento 
ADD COLUMN IF NOT EXISTS recordatorio_estado VARCHAR(50) DEFAULT 'pendiente';

-- 2. Agregar columna recordatorio_estado a la tabla de campañas del agente
ALTER TABLE IF EXISTS afinitivebd.campanas_agente 
ADD COLUMN IF NOT EXISTS recordatorio_estado VARCHAR(50) DEFAULT 'pendiente';

-- 3. Índices para acelerar las consultas de recordatorios pendientes
CREATE INDEX IF NOT EXISTS idx_asistentes_recordatorio_estado 
ON afinitivebd.asistentes_evento (recordatorio_estado);

CREATE INDEX IF NOT EXISTS idx_campanas_recordatorio_estado 
ON afinitivebd.campanas_agente (recordatorio_estado);

-- Comentario explicativo
COMMENT ON COLUMN afinitivebd.asistentes_evento.recordatorio_estado IS 'Estado del recordatorio enviado al cliente: pendiente, enviado_24h, enviado_1h, completado, descartado';
COMMENT ON COLUMN afinitivebd.campanas_agente.recordatorio_estado IS 'Estado de la campaña de recordatorio: pendiente, en_proceso, completado';
