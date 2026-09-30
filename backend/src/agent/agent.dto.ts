export class ConsultarDisponibilidadQueryDto {
  dias?: number;
  fecha?: string; // YYYY-MM-DD
}

export class CrearReunionAgentDto {
  titulo: string;
  tipo_reunion?: 'con_meet' | 'sin_meet' | 'recordatorio' | 'llamada' | 'presencial';
  fecha_inicio: string; // ISO string e.g. "2026-09-25T15:00:00.000Z"
  duracion_minutos?: number; // default: 45
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono?: string;
  descripcion?: string;
  enviar_correo_confirmacion?: boolean; // default: true
  cliente_id?: string; // ID opcional en la tabla de clientes/asistentes
}

export class EnviarCorreoPlantillaAgentDto {
  plantilla_id?: string;
  plantilla_nombre?: string;
  destinatario_email: string;
  destinatario_nombre: string;
  asunto_personalizado?: string;
  variables?: Record<string, string>;
  contenido_adicional?: string;
}

export class ConsultarClientesNuevosQueryDto {
  origen?: 'todos' | 'bio_link' | 'webinar' | 'lead_form' | string;
  estado?: 'todos' | 'pendiente' | 'atendido' | 'en_proceso' | string;
  desde_fecha?: string; // ISO datetime
  limite?: number;
}

export class ConsultarClientesRegistradosQueryDto {
  estado?: string; // 'todos' | 'pendiente' | 'contactado' | 'calificado' | 'ganado' | 'reunion_agendada' | 'descartado'
  origen?: string; // 'dr-finanzas-bio' | 'regsitro-de-tiktok' | 'bio_link_tiktok' | etc.
  periodo?: 'hoy' | 'semana' | 'mes' | 'historico' | string;
  limite?: number; // default: 10, max: 100
  pagina?: number; // default: 1
  offset?: number;
  busqueda?: string; // Búsqueda por nombre, email o teléfono
}

export class ActualizarEstadoClienteAgentDto {
  estado: 'pendiente' | 'atendido' | 'en_proceso' | 'no_responde' | 'descartado' | string;
  notas?: string;
}

export class RegistrarClientePotencialAgentDto {
  nombre: string;
  celular: string;
  correo?: string;
  pais?: string;
  interes_inversion?: string;
  origen?: string;
  estado?: 'pendiente' | 'atendido' | 'en_proceso' | 'no_responde' | 'descartado' | string;
  notas?: string;
  persona_contacto?: string;
  evento_id?: string;
}

export class CrearCampanaAgentDto {
  titulo_evento: string;
  mensaje: string;
  link_reunion?: string;
  fecha_evento?: string; // ISO string
  enviar_ahora?: boolean; // default: false
  canal?: 'email' | 'whatsapp' | 'ambos' | string; // default: 'email'
  filtro_destinatarios?: 'todos' | 'pendientes' | 'contactados' | 'agendados' | 'bio_link_tiktok' | string; // default: 'todos'
  asunto_email?: string;
}

export class ConsultarCampanasQueryDto {
  buscar?: string;
  limite?: number; // default: 10
  pagina?: number; // default: 1
  estado?: string;
}

export class ReenviarCampanaDto {
  filtro_destinatarios?: string;
  canal?: 'email' | 'whatsapp' | 'ambos' | string;
}

export class ProcesarRecordatoriosCampanaDto {
  evento_id?: string;
  tipo_recordatorio?: '24h' | '1h' | 'mismo_dia' | 'todos' | string;
  canal?: 'email' | 'whatsapp' | 'ambos' | string;
  limite?: number;
  mensaje_personalizado?: string;
  forzar_reenvio?: boolean;
}

