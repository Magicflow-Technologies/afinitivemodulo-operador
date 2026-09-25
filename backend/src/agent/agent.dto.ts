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
  origen?: 'todos' | 'bio_link' | 'webinar' | 'lead_form';
  estado?: 'todos' | 'pendiente' | 'atendido' | 'en_proceso' | string;
  desde_fecha?: string; // ISO datetime
  limite?: number;
}

export class ActualizarEstadoClienteAgentDto {
  estado: 'pendiente' | 'atendido' | 'en_proceso' | 'no_responde' | 'descartado' | string;
  notas?: string;
}
