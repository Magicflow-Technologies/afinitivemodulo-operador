-- MIGRACIÓN: AGREGAR CAMPO DINÁMICO DE WHATSAPP EN CALENDAR_SETTINGS
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE afinitivebd.calendar_settings 
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50) DEFAULT '51982100208';

-- Actualizar registro existente con valor por defecto
UPDATE afinitivebd.calendar_settings 
SET whatsapp_number = '51982100208'
WHERE whatsapp_number IS NULL OR whatsapp_number = '';
