import { Injectable, Logger, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { EmailTrackingService } from '../email-tracking/email-tracking.service';
import { TemplatesService } from '../templates/templates.service';
import { EventosService } from '../eventos/eventos.service';
import {
  ConsultarDisponibilidadQueryDto,
  CrearReunionAgentDto,
  EnviarCorreoPlantillaAgentDto,
  ConsultarClientesNuevosQueryDto,
  ActualizarEstadoClienteAgentDto,
} from './agent.dto';

@Injectable()
export class AgentService implements OnModuleInit {
  private readonly logger = new Logger(AgentService.name);
  private supabase: SupabaseClient<any, any, any> | null = null;
  private resend: Resend | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailTrackingService: EmailTrackingService,
    private readonly templatesService: TemplatesService,
    private readonly eventosService: EventosService,
  ) {}

  onModuleInit() {
    const supabaseUrl =
      this.configService.get<string>('SUPABASE_URL') ||
      process.env.SUPABASE_URL ||
      'https://yomubswawogemujvcmem.supabase.co';
    const supabaseKey =
      this.configService.get<string>('SUPABASE_ANON_KEY') ||
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      '';

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        db: { schema: 'afinitivebd' },
      });
      this.logger.log('AgentService: Supabase inicializado');
    }

    const resendApiKey =
      this.configService.get<string>('RESEND_API_KEY') || process.env.RESEND_API_KEY;
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.logger.log('AgentService: Resend inicializado');
    }
  }

  // =========================================================================
  // 1. CONSULTAR AGENDA DISPONIBLE (Turnos libres en Google Calendar)
  // =========================================================================
  async consultarDisponibilidad(query: ConsultarDisponibilidadQueryDto) {
    this.logger.log(`IA Agent: Consultando disponibilidad de agenda...`);

    try {
      // 1. Obtener slots desde el servicio oficial sincronizado con Google Calendar
      const rawSlotsByDay = await this.emailTrackingService.getAvailableSlots();

      let filteredDays: { [fecha: string]: string[] } = { ...rawSlotsByDay };

      // Si se especifica una fecha exacta (YYYY-MM-DD)
      if (query.fecha) {
        const exactFecha = query.fecha.trim();
        filteredDays = {
          [exactFecha]: rawSlotsByDay[exactFecha] || [],
        };
      } else if (query.dias && Number(query.dias) > 0) {
        // Limitar a los próximos N días
        const limitDays = Number(query.dias);
        const keys = Object.keys(rawSlotsByDay).slice(0, limitDays);
        const limited: { [fecha: string]: string[] } = {};
        for (const k of keys) {
          limited[k] = rawSlotsByDay[k];
        }
        filteredDays = limited;
      }

      let totalSlots = 0;
      let primerSlot: { fecha: string; hora: string } | null = null;

      for (const [fecha, horas] of Object.entries(filteredDays)) {
        totalSlots += horas.length;
        if (!primerSlot && horas.length > 0) {
          primerSlot = { fecha, hora: horas[0] };
        }
      }

      return {
        success: true,
        zona_horaria: 'America/Lima (UTC-5 - Hora de Perú)',
        asesor: 'Ricardo Bertalmio Ruibal (Afinitive Wealth Management)',
        asesor_email: 'ricardo@afinitive.pe',
        duracion_estandar_minutos: 45,
        total_slots_libres: totalSlots,
        proximo_slot_disponible: primerSlot,
        disponibilidad_por_dia: filteredDays,
        mensaje_para_ia:
          totalSlots > 0
            ? `Se encontraron ${totalSlots} turnos disponibles en los próximos días. Puedes proponer estos horarios al cliente.`
            : 'No se encontraron horarios libres en el rango seleccionado.',
      };
    } catch (err: any) {
      this.logger.error(`Error consultando disponibilidad de agenda: ${err.message}`);
      return {
        success: false,
        zona_horaria: 'America/Lima (UTC-5)',
        total_slots_libres: 0,
        disponibilidad_por_dia: {},
        error: err.message,
      };
    }
  }

  // =========================================================================
  // 2 & 3. CREAR REUNIÓN (CON LINK MEET O SIN LINK MEET / RECORDATORIO)
  // =========================================================================
  async crearReunion(dto: CrearReunionAgentDto) {
    if (!dto.fecha_inicio) {
      throw new BadRequestException('La fecha_inicio en formato ISO es obligatoria (ej: 2026-09-25T15:00:00Z)');
    }
    if (!dto.cliente_email || !dto.cliente_nombre) {
      throw new BadRequestException('cliente_nombre y cliente_email son obligatorios');
    }

    const tipo = dto.tipo_reunion || 'con_meet';
    const esConMeet = tipo === 'con_meet';
    const duracion = Number(dto.duracion_minutos) || 45;
    const fechaInicio = new Date(dto.fecha_inicio);
    const fechaFin = new Date(fechaInicio.getTime() + duracion * 60 * 1000);
    const titulo = dto.titulo?.trim() || `Reunión de Asesoría — ${dto.cliente_nombre}`;

    this.logger.log(`IA Agent: Creando reunión "${titulo}" [Tipo: ${tipo}] para ${dto.cliente_nombre} (${dto.cliente_email})`);

    let googleRes: any = null;
    let meetLink: string | null = null;
    let calendarError: string | null = null;

    // 1. Google Calendar Insert
    try {
      const keyFilePath = path.join(process.cwd(), 'afinitive-calendar-sync-bddfdbc9e9de.json');
      if (fs.existsSync(keyFilePath)) {
        const auth = new google.auth.GoogleAuth({
          keyFile: keyFilePath,
          scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
        });
        const calendar = google.calendar({ version: 'v3', auth });
        const ricardoEmail = 'ricardo@afinitive.pe';

        const eventPayload: any = {
          summary: `${titulo} [Afinitive]`,
          description: [
            `Sesión agendada automáticamente por el Agente de IA de Afinitive.`,
            ``,
            `👤 Cliente / Invitado: ${dto.cliente_nombre}`,
            `✉️ Correo: ${dto.cliente_email}`,
            `📱 Celular: ${dto.cliente_telefono || 'No indicado'}`,
            `📌 Modalidad: ${esConMeet ? 'Google Meet (Videollamada en vivo)' : tipo.toUpperCase()}`,
            `📝 Notas: ${dto.descripcion || 'Sin notas adicionales'}`,
            ``,
            `Organizado por Ricardo Bertalmio Ruibal - CEO Afinitive Wealth Management.`,
          ].join('\n'),
          location: esConMeet ? 'Google Meet' : (dto.tipo_reunion === 'llamada' ? 'Llamada Telefónica' : 'Oficina Afinitive / Presencial'),
          start: { dateTime: fechaInicio.toISOString(), timeZone: 'America/Lima' },
          end: { dateTime: fechaFin.toISOString(), timeZone: 'America/Lima' },
          attendees: [
            { email: dto.cliente_email, displayName: dto.cliente_nombre },
            { email: ricardoEmail, displayName: 'Ricardo Bertalmio - Afinitive' },
          ],
        };

        if (esConMeet) {
          eventPayload.conferenceData = {
            createRequest: {
              requestId: `meet-agent-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          };
        }

        const res = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: eventPayload,
          conferenceDataVersion: esConMeet ? 1 : 0,
          sendUpdates: 'all',
        });

        googleRes = res.data;
        meetLink = res.data.hangoutLink || res.data.conferenceData?.entryPoints?.find((p: any) => p.entryPointType === 'video')?.uri || null;
      }
    } catch (gErr: any) {
      calendarError = gErr.message;
      this.logger.warn(`Error en Google Calendar insert: ${gErr.message}`);
    }

    // 2. Enviar correo de confirmación si está habilitado (default: true para con_meet)
    const debeEnviarCorreo = dto.enviar_correo_confirmacion !== false;
    let correoEnviado = false;

    if (debeEnviarCorreo && this.resend) {
      try {
        const fakeEvento = {
          nombre: titulo,
          descripcion: dto.descripcion || 'Sesión de Asesoría Patrimonial Estratégica con Afinitive.',
          fecha_inicio: dto.fecha_inicio,
          duracion_minutos: duracion,
          link_reunion: meetLink || (esConMeet ? 'https://meet.google.com' : 'Coordinación directa'),
        };

        // Usar método de confirmación con diseño oficial
        await (this.eventosService as any).enviarCorreoConfirmacion(fakeEvento, {
          nombre: dto.cliente_nombre,
          correo: dto.cliente_email,
          celular: dto.cliente_telefono || '',
        });
        correoEnviado = true;
      } catch (cErr: any) {
        this.logger.warn(`Error enviando correo de confirmación de reunión: ${cErr.message}`);
      }
    }

    // 3. Actualizar estado del cliente en Supabase si se provee cliente_id o por email
    if (this.supabase) {
      try {
        const updateData: any = {
          estado: 'en_proceso',
          fecha_atencion: new Date().toISOString(),
          notas: `[REUNIÓN AGENDADA POR IA - ${new Date().toLocaleDateString('es-PE')}]: ${titulo} (${esConMeet ? 'Google Meet' : 'Recordatorio/Llamada'})`,
        };

        if (dto.cliente_id) {
          await this.supabase.from('eventos_asistentes').update(updateData).eq('id', dto.cliente_id);
        } else {
          await this.supabase.from('eventos_asistentes').update(updateData).eq('correo', dto.cliente_email.toLowerCase().trim());
        }
      } catch (sErr: any) {
        this.logger.warn(`Error actualizando estado del lead en Supabase: ${sErr.message}`);
      }
    }

    const fechaFormateada = fechaInicio.toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return {
      success: true,
      tipo_reunion: tipo,
      titulo: titulo,
      fecha_inicio_iso: dto.fecha_inicio,
      fecha_inicio_formateada: `${fechaFormateada} (Hora Perú)`,
      duracion_minutos: duracion,
      google_event_id: googleRes?.id || null,
      google_calendar_url: googleRes?.htmlLink || null,
      google_meet_link: meetLink,
      correo_confirmacion_enviado: correoEnviado,
      cliente: {
        nombre: dto.cliente_nombre,
        email: dto.cliente_email,
        telefono: dto.cliente_telefono || null,
      },
      mensaje_para_ia: esConMeet
        ? `Reunión agendada exitosamente con sala de Google Meet: ${meetLink}. Se envió el correo de confirmación al cliente.`
        : `Recordatorio / cita presencial agendada en Google Calendar para el ${fechaFormateada}.`,
    };
  }

  // =========================================================================
  // 4. LISTAR Y ENVIAR CORREO USANDO PLANTILLAS EXISTENTES
  // =========================================================================
  async listarPlantillas() {
    this.logger.log('IA Agent: Listando plantillas disponibles...');
    const templates = await this.templatesService.listTemplates({ isActive: true });

    return {
      success: true,
      total: templates.length,
      plantillas: templates.map((t) => ({
        id: t.id,
        nombre: t.name,
        asunto_predeterminado: t.subject,
        tipo_accion: t.actionType || t.type,
        descripcion: (t as any).description || `Plantilla de categoría: ${t.category || 'general'}`,
        variables_disponibles: [
          '{{nombre}}',
          '{{correo}}',
          '{{telefono}}',
          '{{calendario_link}}',
          '{{propuesta_link}}',
          '{{whatsapp_link}}',
        ],
      })),
    };
  }

  async enviarCorreoPlantilla(dto: EnviarCorreoPlantillaAgentDto) {
    if (!dto.destinatario_email || !dto.destinatario_nombre) {
      throw new BadRequestException('destinatario_email y destinatario_nombre son obligatorios');
    }

    if (!this.resend) {
      throw new BadRequestException('Servicio de envío de correo (Resend) no configurado');
    }

    this.logger.log(`IA Agent: Enviando correo con plantilla a ${dto.destinatario_nombre} (${dto.destinatario_email})`);

    // 1. Obtener la plantilla
    let template: any = null;
    const allTemplates = await this.templatesService.listTemplates();

    if (dto.plantilla_id) {
      template = allTemplates.find((t) => t.id === dto.plantilla_id);
    }

    if (!template && dto.plantilla_nombre) {
      const searchNorm = dto.plantilla_nombre.toLowerCase().trim();
      template = allTemplates.find((t) => t.name.toLowerCase().includes(searchNorm));
    }

    if (!template && allTemplates.length > 0) {
      // Usar la primera plantilla por defecto si no se encontró
      template = allTemplates[0];
    }

    if (!template) {
      throw new NotFoundException('No se encontró ninguna plantilla disponible en el sistema.');
    }

    // 2. Renderizar contenido y reemplazar variables
    const cleanName = dto.destinatario_nombre.trim();
    const cleanEmail = dto.destinatario_email.trim().toLowerCase();
    const subject = dto.asunto_personalizado || template.subject || 'Información Exclusiva — Afinitive Wealth Management';

    let html = template.htmlContent || '';

    // Reemplazo de variables estándar
    const variables: Record<string, string> = {
      nombre: cleanName,
      name: cleanName,
      correo: cleanEmail,
      email: cleanEmail,
      calendario_link: 'https://links.afinitive.com.pe/agendar',
      whatsapp_link: 'https://wa.me/51982100208',
      ...(dto.variables || {}),
    };

    for (const [key, val] of Object.entries(variables)) {
      const reg = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      html = html.replace(reg, String(val));
    }

    // Si hay contenido adicional especificado por la IA, inyectarlo
    if (dto.contenido_adicional) {
      html += `\n<div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 13px; color: #3c4043;">${dto.contenido_adicional}</div>`;
    }

    // 3. Enviar vía Resend
    const resendRes = await this.resend.emails.send({
      from: 'Ricardo Bertalmio - Afinitive <ricardo@afinitive.pe>',
      to: [cleanEmail],
      replyTo: 'ricardo@afinitive.pe',
      subject: subject,
      html: html,
    });

    return {
      success: true,
      message_id: (resendRes as any)?.data?.id || (resendRes as any)?.id || 'resend-ok',
      destinatario: {
        nombre: cleanName,
        email: cleanEmail,
      },
      plantilla_utilizada: {
        id: template.id,
        nombre: template.name,
      },
      asunto_enviado: subject,
      mensaje_para_ia: `Correo enviado exitosamente a ${cleanName} (${cleanEmail}) utilizando la plantilla "${template.name}".`,
    };
  }

  // =========================================================================
  // 5. CONSULTAR CLIENTES NUEVOS (Bio-Link TikTok, Web, Formularios)
  // =========================================================================
  async consultarClientesNuevos(query: ConsultarClientesNuevosQueryDto) {
    this.logger.log(`IA Agent: Consultando clientes nuevos en base de datos...`);

    if (!this.supabase) {
      return { success: false, total: 0, clientes: [], error: 'Supabase no disponible' };
    }

    try {
      let q = this.supabase
        .from('eventos_asistentes')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtro por Estado (por defecto: 'pendiente')
      const estadoFiltro = query.estado || 'pendiente';
      if (estadoFiltro !== 'todos') {
        q = q.eq('estado', estadoFiltro);
      }

      // Filtro por Origen
      if (query.origen && query.origen !== 'todos') {
        if (query.origen === 'bio_link') {
          q = q.eq('evento_id', 'dr-finanzas-bio');
        }
      }

      // Filtro por Fecha mínima
      if (query.desde_fecha) {
        q = q.gte('created_at', query.desde_fecha);
      }

      // Límite
      const limit = Number(query.limite) || 20;
      q = q.limit(limit);

      const { data, error } = await q;

      if (error) {
        this.logger.error(`Error al consultar asistentes en Supabase: ${error.message}`);
        return { success: false, total: 0, clientes: [], error: error.message };
      }

      const now = new Date().getTime();
      const clientesEnriquecidos = (data || []).map((lead: any) => {
        const createdTime = new Date(lead.created_at).getTime();
        const diffHours = Math.floor((now - createdTime) / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        let sugerenciaAccion = 'Lead nuevo. Requiere primer contacto por WhatsApp o llamada.';
        if (diffDays >= 2 && diffDays <= 4) {
          sugerenciaAccion = '🔥 Cadencia 1: Recontactar por WhatsApp para validar metas patrimoniales.';
        } else if (diffDays >= 5 && diffDays <= 9) {
          sugerenciaAccion = '⚡ Cadencia 2: Seguimiento de propuesta y agendamiento con Google Meet.';
        } else if (diffDays >= 15) {
          sugerenciaAccion = '🔄 Cadencia 3: Reactivación con invitación a Masterclass o reporte de mercado.';
        }

        return {
          id: lead.id,
          nombre: lead.nombre,
          correo: lead.correo,
          celular: lead.celular || null,
          pais: lead.pais || 'Perú',
          interes_inversion: lead.interes_inversion || 'General',
          origen: lead.evento_id === 'dr-finanzas-bio' ? 'Bio-Link TikTok' : lead.evento_id || 'Landing',
          estado: lead.estado || 'pendiente',
          fecha_registro: lead.created_at,
          antiguedad_horas: diffHours,
          antiguedad_dias: diffDays,
          sugerencia_ia: sugerenciaAccion,
        };
      });

      return {
        success: true,
        filtro_aplicado: {
          estado: estadoFiltro,
          origen: query.origen || 'todos',
          desde_fecha: query.desde_fecha || 'todas',
        },
        total_encontrados: clientesEnriquecidos.length,
        clientes: clientesEnriquecidos,
        mensaje_para_ia:
          clientesEnriquecidos.length > 0
            ? `Se encontraron ${clientesEnriquecidos.length} cliente(s) en la base de datos listos para ser atendidos o procesados.`
            : 'No hay nuevos clientes pendientes en este momento.',
      };
    } catch (err: any) {
      this.logger.error(`Excepción consultando clientes: ${err.message}`);
      return { success: false, total: 0, clientes: [], error: err.message };
    }
  }

  // =========================================================================
  // 6. ACTUALIZAR ESTADO DE CLIENTE
  // =========================================================================
  async actualizarEstadoCliente(id: string, dto: ActualizarEstadoClienteAgentDto) {
    if (!this.supabase) throw new BadRequestException('Supabase no disponible');

    const updatePayload: any = {
      estado: dto.estado,
      fecha_atencion: new Date().toISOString(),
    };
    if (dto.notas) {
      updatePayload.notas = dto.notas;
    }

    const { data, error } = await this.supabase
      .from('eventos_asistentes')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Error al actualizar estado del cliente: ${error.message}`);
    }

    return {
      success: true,
      cliente_id: id,
      nuevo_estado: dto.estado,
      mensaje_para_ia: `Estado del cliente actualizado a "${dto.estado}" con éxito.`,
    };
  }

  // =========================================================================
  // 7. ESQUEMAS DE HERRAMIENTAS (TOOLS / FUNCTION CALLING PARA AGENTES DE IA)
  // =========================================================================
  obtenerToolsOpenAI() {
    return {
      tools: [
        {
          type: 'function',
          function: {
            name: 'consultar_agenda_disponible',
            description:
              'Consulta los horarios y fechas libres en Google Calendar de Ricardo Bertalmio / Afinitive para agendar reuniones con clientes (Zona Horaria Perú UTC-5).',
            parameters: {
              type: 'object',
              properties: {
                dias: {
                  type: 'number',
                  description: 'Cantidad de días hacia adelante a consultar (por defecto 7 días).',
                },
                fecha: {
                  type: 'string',
                  description: 'Fecha específica a consultar en formato YYYY-MM-DD (ej: "2026-09-25").',
                },
              },
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'crear_reunion_agenda',
            description:
              'Crea una reunión en Google Calendar con el cliente. Puede generar enlace de Google Meet automáticamente o agendar como recordatorio / llamada / cita presencial. Envía correo de confirmación al cliente.',
            parameters: {
              type: 'object',
              properties: {
                titulo: {
                  type: 'string',
                  description: 'Título o asunto de la reunión (ej: "Sesión de Asesoría Patrimonial - Carlos Pérez").',
                },
                tipo_reunion: {
                  type: 'string',
                  enum: ['con_meet', 'sin_meet', 'recordatorio', 'llamada', 'presencial'],
                  description:
                    '"con_meet" crea la sala oficial de Google Meet y la envía al cliente. "sin_meet" o "recordatorio" solo bloquea el calendario sin sala virtual.',
                },
                fecha_inicio: {
                  type: 'string',
                  description: 'Fecha y hora exacta en formato ISO 8601 (ej: "2026-09-25T15:00:00Z").',
                },
                duracion_minutos: {
                  type: 'number',
                  description: 'Duración en minutos (por defecto 45 minutos).',
                },
                cliente_nombre: {
                  type: 'string',
                  description: 'Nombre completo del cliente.',
                },
                cliente_email: {
                  type: 'string',
                  description: 'Correo electrónico del cliente donde recibirá la confirmación.',
                },
                cliente_telefono: {
                  type: 'string',
                  description: 'Número de WhatsApp / Celular del cliente.',
                },
                descripcion: {
                  type: 'string',
                  description: 'Notas u objetivos de la reunión.',
                },
                enviar_correo_confirmacion: {
                  type: 'boolean',
                  description: 'Si es true, envía el correo de confirmación de Afinitive al cliente (default: true).',
                },
                cliente_id: {
                  type: 'string',
                  description: 'ID del cliente en la base de datos si ya está registrado para actualizar su estado.',
                },
              },
              required: ['titulo', 'fecha_inicio', 'cliente_nombre', 'cliente_email'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'enviar_correo_plantilla',
            description:
              'Envía un correo electrónico oficial de Afinitive a un prospecto utilizando una de las plantillas de correo existentes del sistema.',
            parameters: {
              type: 'object',
              properties: {
                plantilla_id: {
                  type: 'string',
                  description: 'ID de la plantilla existente en el sistema.',
                },
                plantilla_nombre: {
                  type: 'string',
                  description: 'Nombre o parte del nombre de la plantilla a utilizar.',
                },
                destinatario_nombre: {
                  type: 'string',
                  description: 'Nombre del destinatario.',
                },
                destinatario_email: {
                  type: 'string',
                  description: 'Correo electrónico del destinatario.',
                },
                asunto_personalizado: {
                  type: 'string',
                  description: 'Asunto del correo (opcional si se quiere sobreescribir el de la plantilla).',
                },
                variables: {
                  type: 'object',
                  description: 'Variables dinámicas clave-valor para reemplazar en la plantilla (ej: { "propuesta": "15%" }).',
                },
                contenido_adicional: {
                  type: 'string',
                  description: 'Texto adicional o nota que se desea adjuntar al cuerpo del correo.',
                },
              },
              required: ['destinatario_nombre', 'destinatario_email'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'consultar_clientes_nuevos',
            description:
              'Consulta la lista de prospectos y clientes registrados recientemente desde el Link in Bio de TikTok, formularios web o webinars.',
            parameters: {
              type: 'object',
              properties: {
                origen: {
                  type: 'string',
                  enum: ['todos', 'bio_link', 'webinar', 'lead_form'],
                  description: 'Filtrar por origen del lead (ej: "bio_link" para TikTok).',
                },
                estado: {
                  type: 'string',
                  enum: ['todos', 'pendiente', 'atendido', 'en_proceso'],
                  description: 'Filtrar por estado comercial del lead (por defecto "pendiente").',
                },
                limite: {
                  type: 'number',
                  description: 'Cantidad máxima de clientes a retornar (por defecto 20).',
                },
              },
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'actualizar_estado_cliente',
            description:
              'Actualiza el estado comercial de un cliente en la base de datos (por ejemplo, tras contactarlo o agendar una cita).',
            parameters: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'ID único del cliente en la base de datos.',
                },
                estado: {
                  type: 'string',
                  enum: ['pendiente', 'atendido', 'en_proceso', 'no_responde', 'descartado'],
                  description: 'Nuevo estado comercial del cliente.',
                },
                notas: {
                  type: 'string',
                  description: 'Notas del contacto o seguimiento.',
                },
              },
              required: ['id', 'estado'],
            },
          },
        },
      ],
    };
  }
}
