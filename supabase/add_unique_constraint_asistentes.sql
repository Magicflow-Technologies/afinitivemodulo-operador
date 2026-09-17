-- Índice único para evitar registros duplicados de un mismo usuario en un mismo evento
CREATE UNIQUE INDEX IF NOT EXISTS idx_asistentes_evento_unique_email 
ON afinitivebd.asistentes_evento (evento_id, correo);

CREATE UNIQUE INDEX IF NOT EXISTS idx_asistentes_evento_unique_celular 
ON afinitivebd.asistentes_evento (evento_id, celular);
