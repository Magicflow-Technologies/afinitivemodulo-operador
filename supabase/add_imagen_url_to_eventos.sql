-- Agregar columna imagen_url a la tabla afinitivebd.eventos en Supabase
ALTER TABLE afinitivebd.eventos 
ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- Comentario descriptivo
COMMENT ON COLUMN afinitivebd.eventos.imagen_url IS 'URL pública del flyer o banner del evento almacenado en Supabase Storage (bucket eventos)';
