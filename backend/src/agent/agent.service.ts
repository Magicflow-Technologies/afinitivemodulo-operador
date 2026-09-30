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
  ConsultarClientesRegistradosQueryDto,
  ActualizarEstadoClienteAgentDto,
  RegistrarClientePotencialAgentDto,
  CrearCampanaAgentDto,
  ConsultarCampanasQueryDto,
  ReenviarCampanaDto,
  ProcesarRecordatoriosCampanaDto,
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
      'https://mqsupabase.dashbportal.com';
    const supabaseKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      this.configService.get<string>('SUPABASE_ANON_KEY') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        db: { schema: 'afinitivebd' },
      });
      this.logger.log('AgentService: Supabase inicializado con SERVICE_ROLE_KEY');
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
          await this.supabase.from('asistentes_evento').update(updateData).eq('id', dto.cliente_id);
        } else {
          await this.supabase.from('asistentes_evento').update(updateData).eq('correo', dto.cliente_email.toLowerCase().trim());
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
  // HELPER: LÍMITES TEMPORALES EN ZONA HORARIA PERÚ (AMERICA/LIMA UTC-5)
  // =========================================================================
  private getLimaDateBoundaries() {
    const now = new Date();
    const limaDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); // 'YYYY-MM-DD'
    const [year, month, day] = limaDateStr.split('-').map(Number);

    // Inicio de hoy en Lima (00:00:00 -05:00)
    const hoyInicio = new Date(`${limaDateStr}T00:00:00-05:00`);

    // Inicio de semana (Lunes a las 00:00:00 -05:00)
    const dateObj = new Date(`${limaDateStr}T12:00:00-05:00`);
    const dayOfWeek = dateObj.getDay(); // 0: dom, 1: lun, ...
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mondayObj = new Date(dateObj.getTime() - diffToMonday * 24 * 60 * 60 * 1000);
    const mondayStr = mondayObj.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    const semanaInicio = new Date(`${mondayStr}T00:00:00-05:00`);

    // Inicio de mes (Día 1 a las 00:00:00 -05:00)
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const mesInicio = new Date(`${year}-${monthStr}-01T00:00:00-05:00`);

    return {
      hoy: hoyInicio.toISOString(),
      semana: semanaInicio.toISOString(),
      mes: mesInicio.toISOString(),
    };
  }

  // =========================================================================
  // 5.1. MÉTRICAS Y RESUMEN GENERAL DE CLIENTES (PARA AGENTE IA)
  // =========================================================================
  async consultarResumenClientes() {
    this.logger.log('IA Agent: Consultando resumen y métricas generales de clientes...');

    if (!this.supabase) {
      return {
        success: false,
        error: 'Supabase no disponible',
        totales: { total_registrados: 0, registrados_hoy: 0, registrados_esta_semana: 0, registrados_este_mes: 0 },
        por_estado: {},
        por_origen: {},
        ultimos_registrados: [],
      };
    }

    try {
      const { hoy, semana, mes } = this.getLimaDateBoundaries();

      // 1. Consultas simultáneas a la tabla oficial afinitivebd.asistentes_evento
      const [allRowsRes, ultimosRes] = await Promise.all([
        this.supabase.from('asistentes_evento').select('id, created_at, estado, evento_id, persona_contacto'),
        this.supabase.from('asistentes_evento').select('*').order('created_at', { ascending: false }).limit(10),
      ]);

      const allRows = allRowsRes.data || [];
      const totalRegistrados = allRows.length;
      const registradosHoy = allRows.filter((r: any) => r.created_at && new Date(r.created_at) >= new Date(hoy)).length;
      const registradosEstaSemana = allRows.filter((r: any) => r.created_at && new Date(r.created_at) >= new Date(semana)).length;
      const registradosEsteMes = allRows.filter((r: any) => r.created_at && new Date(r.created_at) >= new Date(mes)).length;

      // 2. Desglose por Estado
      const porEstado: Record<string, number> = {
        pendiente: 0,
        contactado: 0,
        calificado: 0,
        reunion_agendada: 0,
        ganado: 0,
        descartado: 0,
      };

      // 3. Desglose por Origen
      const porOrigen: Record<string, number> = {
        bio_link_tiktok: 0,
        landing_page: 0,
        whatsapp_directo: 0,
      };

      if (allRowsRes.data) {
        for (const row of allRowsRes.data) {
          // Estado
          const est = (row.estado || 'pendiente').toLowerCase().trim();
          porEstado[est] = (porEstado[est] || 0) + 1;

          // Origen
          const evId = (row.evento_id || '').toLowerCase().trim();
          const pContacto = (row.persona_contacto || '').toLowerCase().trim();

          if (evId === 'dr-finanzas-bio' || evId.includes('tiktok') || pContacto.includes('tiktok') || pContacto.includes('bio')) {
            porOrigen['bio_link_tiktok'] = (porOrigen['bio_link_tiktok'] || 0) + 1;
          } else if (evId.includes('whatsapp') || pContacto.includes('whatsapp')) {
            porOrigen['whatsapp_directo'] = (porOrigen['whatsapp_directo'] || 0) + 1;
          } else if (evId) {
            porOrigen[evId] = (porOrigen[evId] || 0) + 1;
          } else {
            porOrigen['landing_page'] = (porOrigen['landing_page'] || 0) + 1;
          }
        }
      }

      // 4. Últimos registrados enriquecidos
      const ultimosRegistrados = (ultimosRes.data || []).map((lead: any) => {
        let orig = 'landing_page';
        const evId = (lead.evento_id || '').toLowerCase();
        const pContacto = (lead.persona_contacto || '').toLowerCase();
        if (evId === 'dr-finanzas-bio' || evId.includes('tiktok') || pContacto.includes('tiktok')) {
          orig = 'bio_link_tiktok';
        } else if (evId.includes('whatsapp') || pContacto.includes('whatsapp')) {
          orig = 'whatsapp_directo';
        } else if (lead.evento_id) {
          orig = lead.evento_id;
        }

        return {
          id: lead.id,
          nombre: lead.nombre,
          telefono: lead.celular || null,
          email: lead.correo || null,
          empresa_o_interes: lead.interes_inversion || lead.persona_contacto || 'General',
          origen: orig,
          estado: lead.estado || 'pendiente',
          fecha_registro: lead.created_at,
        };
      });

      return {
        success: true,
        totales: {
          total_registrados: totalRegistrados,
          registrados_hoy: registradosHoy,
          registrados_esta_semana: registradosEstaSemana,
          registrados_este_mes: registradosEsteMes,
        },
        por_estado: porEstado,
        por_origen: porOrigen,
        ultimos_registrados: ultimosRegistrados,
      };
    } catch (err: any) {
      this.logger.error(`Error consultando resumen de clientes: ${err.message}`);
      return {
        success: false,
        error: err.message,
        totales: { total_registrados: 0, registrados_hoy: 0, registrados_esta_semana: 0, registrados_este_mes: 0 },
        por_estado: {},
        por_origen: {},
        ultimos_registrados: [],
      };
    }
  }

  // =========================================================================
  // 5.2. LISTADO FLEXIBLE DE CLIENTES REGISTRADOS (CON FILTROS Y BÚSQUEDA)
  // =========================================================================
  async consultarClientesRegistrados(query: ConsultarClientesRegistradosQueryDto) {
    this.logger.log(`IA Agent: Listando clientes registrados con filtros: ${JSON.stringify(query)}`);

    if (!this.supabase) {
      return { success: false, total_encontrados: 0, pagina_actual: 1, limite: 10, clientes: [], error: 'Supabase no disponible' };
    }

    try {
      const limite = Math.min(Math.max(Number(query.limite) || 10, 1), 100);
      const pagina = Math.max(Number(query.pagina) || 1, 1);
      const offset = query.offset !== undefined ? Number(query.offset) : (pagina - 1) * limite;

      let q = this.supabase
        .from('asistentes_evento')
        .select('*', { count: 'exact' });

      // Filtro por Estado
      if (query.estado && query.estado !== 'todos') {
        q = q.eq('estado', query.estado.toLowerCase().trim());
      }

      // Filtro por Origen
      if (query.origen && query.origen !== 'todos') {
        const origClean = query.origen.toLowerCase().trim();
        if (origClean === 'bio_link_tiktok' || origClean === 'bio_link' || origClean === 'tiktok') {
          q = q.or('evento_id.eq.dr-finanzas-bio,evento_id.ilike.%tiktok%,persona_contacto.ilike.%tiktok%');
        } else if (origClean === 'whatsapp' || origClean === 'whatsapp_directo') {
          q = q.or('evento_id.ilike.%whatsapp%,persona_contacto.ilike.%whatsapp%');
        } else {
          q = q.eq('evento_id', query.origen);
        }
      }

      // Filtro por Periodo
      if (query.periodo && query.periodo !== 'historico' && query.periodo !== 'todos') {
        const { hoy, semana, mes } = this.getLimaDateBoundaries();
        if (query.periodo === 'hoy') {
          q = q.gte('created_at', hoy);
        } else if (query.periodo === 'semana') {
          q = q.gte('created_at', semana);
        } else if (query.periodo === 'mes') {
          q = q.gte('created_at', mes);
        }
      }

      // Filtro por Búsqueda de Texto (nombre, correo o celular)
      if (query.busqueda && query.busqueda.trim()) {
        const term = query.busqueda.trim();
        q = q.or(`nombre.ilike.%${term}%,correo.ilike.%${term}%,celular.ilike.%${term}%`);
      }

      // Orden y Paginación
      q = q.order('created_at', { ascending: false })
           .range(offset, offset + limite - 1);

      const { data, count, error } = await q;

      if (error) {
        throw new BadRequestException(error.message);
      }

      const clientes = (data || []).map((lead: any) => {
        let orig = 'landing_page';
        const evId = (lead.evento_id || '').toLowerCase();
        const pContacto = (lead.persona_contacto || '').toLowerCase();
        if (evId === 'dr-finanzas-bio' || evId.includes('tiktok') || pContacto.includes('tiktok')) {
          orig = 'bio_link_tiktok';
        } else if (evId.includes('whatsapp') || pContacto.includes('whatsapp')) {
          orig = 'whatsapp_directo';
        } else if (lead.evento_id) {
          orig = lead.evento_id;
        }

        return {
          id: lead.id,
          nombre: lead.nombre,
          telefono: lead.celular || null,
          email: lead.correo || null,
          empresa_o_interes: lead.interes_inversion || lead.persona_contacto || 'General',
          origen: orig,
          estado: lead.estado || 'pendiente',
          fecha_registro: lead.created_at,
          notas: lead.notas || null,
        };
      });

      return {
        success: true,
        total_encontrados: count !== null ? count : clientes.length,
        pagina_actual: pagina,
        limite: limite,
        clientes: clientes,
      };
    } catch (err: any) {
      this.logger.error(`Error al listar clientes registrados: ${err.message}`);
      return {
        success: false,
        total_encontrados: 0,
        pagina_actual: Number(query.pagina) || 1,
        limite: Number(query.limite) || 10,
        clientes: [],
        error: err.message,
      };
    }
  }

  // =========================================================================
  // 5.3. CONSULTAR CLIENTES NUEVOS (Bio-Link TikTok, Web, Formularios)
  // =========================================================================
  async consultarClientesNuevos(query: ConsultarClientesNuevosQueryDto) {
    this.logger.log(`IA Agent: Consultando clientes nuevos en base de datos...`);

    if (!this.supabase) {
      return { success: false, total: 0, clientes: [], error: 'Supabase no disponible' };
    }

    try {
      let q = this.supabase
        .from('asistentes_evento')
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

    let q = this.supabase
      .from('asistentes_evento')
      .update(updatePayload);

    const cleanIdentifier = id.trim();
    if (cleanIdentifier.includes('@')) {
      q = q.eq('correo', cleanIdentifier.toLowerCase());
    } else if (cleanIdentifier.length > 30 && cleanIdentifier.includes('-')) {
      q = q.eq('id', cleanIdentifier);
    } else {
      q = q.or(`id.eq.${cleanIdentifier},celular.eq.${cleanIdentifier},celular.ilike.%${cleanIdentifier.replace(/[^0-9]/g, '')}%`);
    }

    const { data, error } = await q
      .select()
      .maybeSingle();

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
  // 7. REGISTRAR CLIENTE POTENCIAL (Captación Inbound WhatsApp / Redes Sociales)
  // =========================================================================
  async registrarClientePotencial(dto: RegistrarClientePotencialAgentDto) {
    if (!dto.nombre || !dto.celular) {
      throw new BadRequestException('El nombre y número de celular del cliente son obligatorios');
    }

    if (!this.supabase) {
      throw new BadRequestException('Supabase no disponible');
    }

    const cleanName = dto.nombre.trim();
    const cleanPhone = dto.celular.trim();
    const cleanEmail = (dto.correo || '').trim().toLowerCase();
    const cleanOrigin = dto.origen || 'WhatsApp Inbound';
    const cleanInteres = dto.interes_inversion || 'General';
    const cleanEstado = dto.estado || 'en_proceso';

    this.logger.log(`IA Agent: Registrando cliente potencial ${cleanName} (${cleanPhone}) desde ${cleanOrigin}`);

    try {
      // 1. Verificar si ya existe un cliente con este celular
      const { data: existingLeads } = await this.supabase
        .from('asistentes_evento')
        .select('*')
        .or(`celular.eq.${cleanPhone},celular.eq.${cleanPhone.replace(/[^0-9]/g, '')}`)
        .limit(1);

      if (existingLeads && existingLeads.length > 0) {
        const lead = existingLeads[0];
        const updatePayload: any = {
          nombre: cleanName,
          estado: cleanEstado,
          fecha_atencion: new Date().toISOString(),
        };
        if (cleanEmail && !lead.correo) updatePayload.correo = cleanEmail;
        if (dto.interes_inversion) updatePayload.interes_inversion = cleanInteres;
        if (dto.notas) {
          updatePayload.notas = lead.notas ? `${lead.notas}\n[UPDATE IA]: ${dto.notas}` : dto.notas;
        }

        const { data: updated, error: updateErr } = await this.supabase
          .from('asistentes_evento')
          .update(updatePayload)
          .eq('id', lead.id)
          .select()
          .single();

        if (updateErr) throw new BadRequestException(updateErr.message);

        return {
          success: true,
          accion: 'actualizado',
          cliente: {
            id: updated.id,
            nombre: updated.nombre,
            celular: updated.celular,
            correo: updated.correo,
            estado: updated.estado,
            interes: updated.interes_inversion,
            origen: updated.persona_contacto || updated.evento_id,
          },
          mensaje_para_ia: `Cliente existente identificado y actualizado a estado "${cleanEstado}".`,
        };
      }

      // 2. Insertar nuevo cliente en Supabase
      const insertPayload: any = {
        evento_id: dto.evento_id || 'whatsapp-inbound',
        nombre: cleanName,
        celular: cleanPhone,
        correo: cleanEmail || '',
        pais: dto.pais || 'Perú',
        interes_inversion: cleanInteres,
        persona_contacto: dto.persona_contacto || cleanOrigin,
        estado: cleanEstado,
        notas: dto.notas || 'Prospecto registrado automáticamente por Agente IA vía WhatsApp',
        created_at: new Date().toISOString(),
      };

      const { data: created, error: createErr } = await this.supabase
        .from('asistentes_evento')
        .insert(insertPayload)
        .select()
        .single();

      if (createErr) {
        throw new BadRequestException(`Error al insertar cliente potencial: ${createErr.message}`);
      }

      return {
        success: true,
        accion: 'creado',
        cliente: {
          id: created.id,
          nombre: created.nombre,
          celular: created.celular,
          correo: created.correo,
          estado: created.estado,
          interes: created.interes_inversion,
          origen: created.persona_contacto || created.evento_id,
        },
        mensaje_para_ia: `Nuevo cliente potencial registrado exitosamente en la base de datos con estado "${cleanEstado}".`,
      };
    } catch (err: any) {
      this.logger.error(`Error en registrarClientePotencial: ${err.message}`);
      throw new BadRequestException(`No se pudo registrar el cliente: ${err.message}`);
    }
  }

  // =========================================================================
  // 8. GESTIÓN Y LANZAMIENTO DE CAMPAÑAS / CONVOCATORIAS (AGENTE IA)
  // =========================================================================
  async crearCampana(dto: CrearCampanaAgentDto) {
    if (!dto.titulo_evento || !dto.mensaje) {
      throw new BadRequestException('titulo_evento y mensaje son campos obligatorios');
    }

    this.logger.log(`IA Agent: Procesando campaña "${dto.titulo_evento}" (enviar_ahora=${!!dto.enviar_ahora})`);

    // 1. Obtener destinatarios según filtro_destinatarios
    let destinatarios: any[] = [];
    if (this.supabase) {
      try {
        let q = this.supabase
          .from('asistentes_evento')
          .select('id, nombre, correo, celular, evento_id, estado');

        const filtro = (dto.filtro_destinatarios || 'todos').toLowerCase().trim();
        if (filtro === 'pendientes' || filtro === 'pendiente') {
          q = q.eq('estado', 'pendiente');
        } else if (filtro === 'contactados' || filtro === 'contactado') {
          q = q.eq('estado', 'contactado');
        } else if (filtro === 'agendados' || filtro === 'agendado') {
          q = q.or('estado.eq.agendado,estado.eq.reunion_agendada');
        } else if (filtro === 'bio_link_tiktok' || filtro === 'tiktok') {
          q = q.or('evento_id.eq.dr-finanzas-bio,evento_id.ilike.%tiktok%');
        } else if (filtro !== 'todos' && filtro !== 'all') {
          q = q.eq('evento_id', filtro);
        }

        const { data: contacts, error: contErr } = await q;
        if (!contErr && contacts) {
          destinatarios = contacts;
        }
      } catch (err: any) {
        this.logger.warn(`No se pudieron cargar destinatarios de asistentes_evento: ${err.message}`);
      }
    }

    const totalDestinatarios = destinatarios.length;
    let destinatariosEnviados = 0;
    let campanaId = `camp_${Date.now()}`;

    // 2. Guardar en Supabase tabla afinitivebd.campanas_agente si está disponible
    if (this.supabase) {
      try {
        const { data: createdCampana, error: insertErr } = await this.supabase
          .from('campanas_agente')
          .insert({
            titulo_evento: dto.titulo_evento,
            mensaje: dto.mensaje,
            link_reunion: dto.link_reunion || null,
            fecha_evento: dto.fecha_evento || null,
            canal: dto.canal || 'email',
            filtro_destinatarios: dto.filtro_destinatarios || 'todos',
            estado_envio: dto.enviar_ahora ? 'en_proceso' : 'guardado',
            total_destinatarios: totalDestinatarios,
            destinatarios_enviados: 0,
            metadata: {
              asunto_email: dto.asunto_email || dto.titulo_evento,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!insertErr && createdCampana) {
          campanaId = createdCampana.id;
        }
      } catch (err: any) {
        this.logger.warn(`Error guardando en campanas_agente: ${err.message}`);
      }
    }

    // 3. Si enviar_ahora es true, realizar el envío
    if (dto.enviar_ahora && totalDestinatarios > 0) {
      const canal = dto.canal || 'email';
      const senderEmail = this.configService.get<string>('RESEND_SENDER_EMAIL') || 'onboarding@resend.dev';
      const emailSubject = dto.asunto_email || dto.titulo_evento;

      for (const dest of destinatarios) {
        const recipientEmail = (dest.correo || '').trim();
        const recipientName = (dest.nombre || 'Estimado(a)').trim();

        // Personalizar mensaje
        const personalizedMessage = dto.mensaje
          .replace(/{nombre}/gi, recipientName)
          .replace(/{{nombre}}/gi, recipientName)
          .replace(/{link}/gi, dto.link_reunion || '')
          .replace(/{{link}}/gi, dto.link_reunion || '')
          .replace(/{link_reunion}/gi, dto.link_reunion || '')
          .replace(/{{link_reunion}}/gi, dto.link_reunion || '');

        // Enviar por correo si aplica
        if ((canal === 'email' || canal === 'ambos') && recipientEmail && recipientEmail.includes('@') && this.resend) {
          try {
            const htmlContent = `
              <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
                <div style="background-color: #0f172a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h2 style="color: #ffffff; margin: 0; font-size: 20px;">${dto.titulo_evento}</h2>
                </div>
                <div style="background-color: #ffffff; padding: 25px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
                  <p style="font-size: 16px; margin-top: 0;">${personalizedMessage.replace(/\n/g, '<br/>')}</p>
                  ${
                    dto.link_reunion
                      ? `<div style="text-align: center; margin: 30px 0;">
                          <a href="${dto.link_reunion}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acceder a la Reunión / Evento</a>
                        </div>`
                      : ''
                  }
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                  <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">
                    Afinitive Wealth Management &bull; Notificación enviada por el equipo de asesoría
                  </p>
                </div>
              </div>
            `;

            await this.resend.emails.send({
              from: senderEmail,
              to: recipientEmail,
              subject: emailSubject,
              html: htmlContent,
            });

            destinatariosEnviados++;
          } catch (err: any) {
            this.logger.error(`Error enviando correo de campaña a ${recipientEmail}: ${err.message}`);
          }
        }
      }

      // Actualizar estado en Supabase
      if (this.supabase && campanaId) {
        try {
          await this.supabase
            .from('campanas_agente')
            .update({
              estado_envio: destinatariosEnviados === totalDestinatarios ? 'enviado' : 'parcial',
              destinatarios_enviados: destinatariosEnviados,
              updated_at: new Date().toISOString(),
            })
            .eq('id', campanaId);
        } catch (e: any) {
          this.logger.warn(`Error actualizando campanas_agente tras envío: ${e.message}`);
        }
      }
    }

    return {
      success: true,
      campana_id: campanaId,
      total_destinatarios: totalDestinatarios,
      destinatarios_enviados: destinatariosEnviados,
      estado: dto.enviar_ahora ? (destinatariosEnviados > 0 ? 'enviado' : 'fallido') : 'guardado',
      mensaje: dto.enviar_ahora
        ? `Campaña guardada y enviada a ${destinatariosEnviados} de ${totalDestinatarios} contactos registrados.`
        : `Campaña "${dto.titulo_evento}" guardada exitosamente. Total de contactos elegibles: ${totalDestinatarios}.`,
    };
  }

  // =========================================================================
  // 8.1. PROCESAMIENTO INTELIGENTE DE RECORDATORIOS (AGENTE IA)
  // =========================================================================
  async procesarRecordatorios(dto: ProcesarRecordatoriosCampanaDto = {}) {
    this.logger.log(`IA Agent: Procesando recordatorios automáticos de eventos (filtro=${dto.evento_id || 'todos'})...`);

    if (!this.supabase) {
      throw new BadRequestException('Supabase no disponible');
    }

    try {
      // 1. Obtener eventos activos
      let eventosQuery = this.supabase
        .from('eventos')
        .select('*')
        .eq('activo', true);

      if (dto.evento_id && dto.evento_id !== 'todos') {
        eventosQuery = eventosQuery.eq('id', dto.evento_id);
      }

      const { data: eventos, error: evError } = await eventosQuery;
      if (evError) {
        throw new BadRequestException(`Error al consultar eventos: ${evError.message}`);
      }

      const ahora = new Date();
      // Fechas en zona horaria America/Lima
      const limaDateStr = ahora.toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); // YYYY-MM-DD
      const hoyInicio = new Date(`${limaDateStr}T00:00:00-05:00`).getTime();
      const hoyFin = new Date(`${limaDateStr}T23:59:59.999-05:00`).getTime();

      const mananaDate = new Date(hoyInicio + 24 * 60 * 60 * 1000);
      const mananaDateStr = mananaDate.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      const mananaInicio = new Date(`${mananaDateStr}T00:00:00-05:00`).getTime();
      const mananaFin = new Date(`${mananaDateStr}T23:59:59.999-05:00`).getTime();

      let enviados24h = 0;
      let enviadosHoy = 0;
      const detallesEnviados: any[] = [];
      const errores: any[] = [];

      for (const ev of (eventos || [])) {
        if (!ev.fecha_inicio) continue;
        const evTime = new Date(ev.fecha_inicio).getTime();

        const esHoy = evTime >= hoyInicio && evTime <= hoyFin;
        const esManana = evTime >= mananaInicio && evTime <= mananaFin;

        if (!esHoy && !esManana && !dto.forzar_reenvio) {
          continue;
        }

        // Consultar asistentes del evento
        let astQuery = this.supabase
          .from('asistentes_evento')
          .select('*')
          .eq('evento_id', ev.id);

        const { data: asistentes, error: astErr } = await astQuery;
        if (astErr || !asistentes) continue;

        for (const ast of asistentes) {
          const estadoRec = (ast.recordatorio_estado || 'pendiente').toLowerCase().trim();

          let tipoAviso: 'aviso_hoy' | 'aviso_24h' | null = null;
          let labelDia = '';

          if (esHoy) {
            // Caso B: Mismo día (Hoy) -> si no se le envió aviso_hoy
            if (estadoRec !== 'aviso_hoy' || dto.forzar_reenvio) {
              tipoAviso = 'aviso_hoy';
              labelDia = 'Hoy';
            }
          } else if (esManana) {
            // Caso A: Falta 1 día (24h antes) -> si está pendiente, confirmado, null o != aviso_24h
            if (['pendiente', 'confirmado', 'null', ''].includes(estadoRec) || (estadoRec !== 'aviso_24h' && estadoRec !== 'aviso_hoy') || dto.forzar_reenvio) {
              tipoAviso = 'aviso_24h';
              labelDia = 'Mañana';
            }
          }

          if (!tipoAviso) continue;

          const firstName = (ast.nombre || 'Estimado(a)').trim().split(' ')[0] || ast.nombre;
          const zoomLink = (ev.link_reunion || '').trim();
          const horaStr = new Date(ev.fecha_inicio).toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Lima',
          });

          // Variables de la plantilla WhatsApp (matriz_anti_noshow_recordatorios_de_evento_2026):
          // {{1}}: Nombre del contacto
          // {{2}}: Fecha / Día ("Mañana" u "Hoy")
          // {{3}}: Hora + Link de Zoom (ej: "7:30 PM. Link: https://zoom.us/...")
          const var1 = firstName;
          const var2 = labelDia;
          const var3 = zoomLink ? `${horaStr}. Link: ${zoomLink}` : `${horaStr}`;

          try {
            // Envío por correo si tiene email y el canal lo incluye
            if (ast.correo && (dto.canal === 'email' || dto.canal === 'ambos' || !dto.canal)) {
              if (this.resend) {
                const asunto = `Recordatorio: ${ev.nombre} - ${labelDia} (${horaStr})`;
                const htmlContent = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                      <img src="https://links.afinitive.com.pe/img/afinitive_logo.png" alt="Afinitive" width="130" style="display: inline-block;">
                      <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 19px;">¡Recordatorio de tu Sesión!</h2>
                      <p style="color: #64748b; font-size: 13px; margin: 0;">${ev.nombre}</p>
                    </div>
                    <p>Hola <strong>${firstName}</strong>,</p>
                    <p>Te recordamos que tu sesión privada de inversión está programada para <strong>${labelDia}</strong>:</p>
                    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin: 16px 0;">
                      <p style="margin: 4px 0;">📅 <strong>Día:</strong> ${labelDia}</p>
                      <p style="margin: 4px 0;">⏰ <strong>Hora:</strong> ${horaStr}</p>
                      ${zoomLink ? `<p style="margin: 4px 0;">💻 <strong>Acceso Virtual:</strong> <a href="${zoomLink}" target="_blank" style="color: #2563eb; font-weight: bold;">${zoomLink}</a></p>` : ''}
                    </div>
                    ${zoomLink ? `<div style="text-align: center; margin: 20px 0;"><a href="${zoomLink}" target="_blank" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">🚀 Ingresar a la Reunión</a></div>` : ''}
                  </div>
                `;

                await this.resend.emails.send({
                  from: `Ricardo Bertalmio - Afinitive <${process.env.RESEND_SENDER_EMAIL || 'onboarding@resend.dev'}>`,
                  to: [ast.correo],
                  subject: asunto,
                  html: htmlContent,
                });
              }
            }

            // Actualizar recordatorio_estado en Supabase
            await this.supabase
              .from('asistentes_evento')
              .update({ recordatorio_estado: tipoAviso })
              .eq('id', ast.id);

            if (tipoAviso === 'aviso_24h') enviados24h++;
            if (tipoAviso === 'aviso_hoy') enviadosHoy++;

            detallesEnviados.push({
              id: ast.id,
              nombre: ast.nombre,
              correo: ast.correo,
              celular: ast.celular,
              evento: ev.nombre,
              tipo_aviso: tipoAviso,
              variables_whatsapp: { var1, var2, var3 },
            });
          } catch (sendErr: any) {
            this.logger.warn(`Error enviando recordatorio a ${ast.correo || ast.nombre}: ${sendErr.message}`);
            errores.push({ id: ast.id, nombre: ast.nombre, error: sendErr.message });
          }
        }
      }

      const totalProcesados = enviados24h + enviadosHoy;

      // Registrar la campaña consolidada en campanas_agente
      if (totalProcesados > 0) {
        try {
          await this.supabase.from('campanas_agente').insert({
            titulo_evento: `Recordatorios: ${enviados24h} (24h) / ${enviadosHoy} (Hoy)`,
            mensaje: `Despacho de recordatorios con plantilla matriz_anti_noshow_recordatorios_de_evento_2026`,
            canal: dto.canal || 'ambos',
            filtro_destinatarios: dto.evento_id || 'todos',
            estado_envio: 'completado',
            total_destinatarios: totalProcesados,
            destinatarios_enviados: totalProcesados,
            recordatorio_estado: 'completado',
            metadata: {
              enviados_24h: enviados24h,
              enviados_hoy: enviadosHoy,
              plantilla_whatsapp: 'matriz_anti_noshow_recordatorios_de_evento_2026',
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } catch (e: any) {
          this.logger.warn(`Error registrando en campanas_agente: ${e.message}`);
        }
      }

      return {
        success: true,
        enviados_24h: enviados24h,
        enviados_hoy: enviadosHoy,
        total_procesados: totalProcesados,
        mensaje: `Se procesaron ${totalProcesados} recordatorios exitosamente.`,
        detalles: detallesEnviados.length > 0 ? detallesEnviados : undefined,
      };
    } catch (err: any) {
      this.logger.error(`Error en procesarRecordatorios: ${err.message}`);
      throw new BadRequestException(`Error al procesar recordatorios: ${err.message}`);
    }
  }

  // =========================================================================
  // 9. CONSULTAR CAMPAÑAS ANTERIORES (AGENTE IA)
  // =========================================================================
  async consultarCampanas(query: ConsultarCampanasQueryDto) {
    this.logger.log(`IA Agent: Consultando historial de campañas (buscar="${query.buscar || ''}")`);

    if (!this.supabase) {
      return {
        success: true,
        total_campanas: 0,
        pagina_actual: Number(query.pagina) || 1,
        limite: Number(query.limite) || 10,
        campanas: [],
      };
    }

    try {
      const limite = Math.min(Math.max(Number(query.limite) || 10, 1), 50);
      const pagina = Math.max(Number(query.pagina) || 1, 1);
      const offset = (pagina - 1) * limite;

      let q = this.supabase
        .from('campanas_agente')
        .select('*', { count: 'exact' });

      if (query.buscar && query.buscar.trim()) {
        const term = query.buscar.trim();
        q = q.or(`titulo_evento.ilike.%${term}%,mensaje.ilike.%${term}%`);
      }

      if (query.estado && query.estado !== 'todos') {
        q = q.eq('estado_envio', query.estado);
      }

      q = q.order('created_at', { ascending: false }).range(offset, offset + limite - 1);

      const { data, count, error } = await q;

      if (error) {
        this.logger.warn(`Error en campanas_agente: ${error.message}`);
        return {
          success: true,
          total_campanas: 0,
          pagina_actual: pagina,
          limite: limite,
          campanas: [],
        };
      }

      return {
        success: true,
        total_campanas: count !== null ? count : (data || []).length,
        pagina_actual: pagina,
        limite: limite,
        campanas: (data || []).map((c: any) => ({
          id: c.id,
          titulo_evento: c.titulo_evento,
          mensaje: c.mensaje,
          link_reunion: c.link_reunion,
          fecha_evento: c.fecha_evento,
          canal: c.canal || 'email',
          filtro_destinatarios: c.filtro_destinatarios || 'todos',
          estado_envio: c.estado_envio || 'guardado',
          total_destinatarios: c.total_destinatarios || 0,
          destinatarios_enviados: c.destinatarios_enviados || 0,
          created_at: c.created_at,
        })),
      };
    } catch (err: any) {
      this.logger.error(`Error consultando campañas: ${err.message}`);
      return {
        success: false,
        total_campanas: 0,
        pagina_actual: Number(query.pagina) || 1,
        limite: Number(query.limite) || 10,
        campanas: [],
        error: err.message,
      };
    }
  }

  // =========================================================================
  // 10. REENVIAR CAMPAÑA EXISTENTE (AGENTE IA)
  // =========================================================================
  async reenviarCampana(id: string, dto: ReenviarCampanaDto) {
    if (!this.supabase) throw new BadRequestException('Supabase no disponible');

    const { data: campana, error } = await this.supabase
      .from('campanas_agente')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !campana) {
      throw new NotFoundException(`No se encontró la campaña con ID ${id}`);
    }

    return await this.crearCampana({
      titulo_evento: campana.titulo_evento,
      mensaje: campana.mensaje,
      link_reunion: campana.link_reunion,
      fecha_evento: campana.fecha_evento,
      canal: dto.canal || campana.canal,
      filtro_destinatarios: dto.filtro_destinatarios || campana.filtro_destinatarios,
      enviar_ahora: true,
    });
  }

  // =========================================================================
  // 11. ESQUEMAS DE HERRAMIENTAS (TOOLS / FUNCTION CALLING PARA AGENTES DE IA)
  // =========================================================================

  obtenerToolsOpenAI() {
    return {
      tools: [
        {
          type: 'function',
          function: {
            name: 'consultar_resumen_clientes',
            description:
              'Obtiene métricas y estadísticas consolidadas de clientes y prospectos registrados en Afinitive: totales (hoy, semana, mes, histórico), desglose por estado y desglose por canal de origen (TikTok, Web, WhatsApp).',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'consultar_clientes_registrados',
            description:
              'Lista clientes y prospectos registrados en el sistema con soporte de filtros por estado, canal de origen, periodo temporal (hoy/semana/mes), paginación y búsqueda por texto.',
            parameters: {
              type: 'object',
              properties: {
                estado: {
                  type: 'string',
                  enum: ['todos', 'pendiente', 'contactado', 'calificado', 'reunion_agendada', 'ganado', 'descartado'],
                  description: 'Filtrar por estado comercial del cliente.',
                },
                origen: {
                  type: 'string',
                  description: 'Filtrar por canal o evento (ej: "bio_link_tiktok", "dr-finanzas-bio", "whatsapp_directo").',
                },
                periodo: {
                  type: 'string',
                  enum: ['hoy', 'semana', 'mes', 'historico'],
                  description: 'Filtrar por ventana de tiempo de registro (Zona Horaria Perú).',
                },
                busqueda: {
                  type: 'string',
                  description: 'Texto para buscar por nombre, correo electrónico o celular.',
                },
                limite: {
                  type: 'number',
                  description: 'Cantidad máxima de registros a retornar (por defecto 10, máximo 100).',
                },
                pagina: {
                  type: 'number',
                  description: 'Número de página para paginación (por defecto 1).',
                },
              },
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'guardar_o_lanzar_campana',
            description:
              'Guarda un evento, taller, convocatoria o mensaje masivo con su link de reunión (Zoom/Meet), fecha y texto; y opcionalmente lo envía inmediatamente a los contactos registrados.',
            parameters: {
              type: 'object',
              properties: {
                titulo_evento: {
                  type: 'string',
                  description: 'Título o nombre del evento / taller (ej: "Taller Automatización IA con Zoom").',
                },
                mensaje: {
                  type: 'string',
                  description: 'Texto del mensaje a guardar y/o enviar a los contactos. Puede incluir placeholders como {nombre} o {link}.',
                },
                link_reunion: {
                  type: 'string',
                  description: 'Enlace de la sala de reunión (ej: Zoom, Google Meet o Teams).',
                },
                fecha_evento: {
                  type: 'string',
                  description: 'Fecha y hora del evento en formato ISO (ej: "2026-10-25T17:00:00-05:00").',
                },
                enviar_ahora: {
                  type: 'boolean',
                  description: 'Si es true, envía el mensaje inmediatamente a los contactos registrados. Si es false, solo lo guarda.',
                },
                canal: {
                  type: 'string',
                  enum: ['email', 'whatsapp', 'ambos'],
                  description: 'Canal de envío del mensaje (por defecto "email").',
                },
                filtro_destinatarios: {
                  type: 'string',
                  description: 'Segmento a enviar: "todos", "pendientes", "contactados", "agendados", "bio_link_tiktok", o un ID de evento.',
                },
              },
              required: ['titulo_evento', 'mensaje'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'consultar_campanas_anteriores',
            description:
              'Consulta el historial de campañas, talleres y mensajes guardados previamente para recuperar enlaces de Zoom, fechas o contenidos enviados.',
            parameters: {
              type: 'object',
              properties: {
                buscar: {
                  type: 'string',
                  description: 'Palabra clave para buscar por título del evento o contenido del mensaje (ej: "Taller", "Zoom").',
                },
                limite: {
                  type: 'number',
                  description: 'Cantidad máxima de campañas a retornar (por defecto 10).',
                },
                pagina: {
                  type: 'number',
                  description: 'Número de página (por defecto 1).',
                },
              },
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'reenviar_campana',
            description:
              'Reenvía una campaña o convocatoria existente por su ID a los contactos registrados o a un subconjunto específico.',
            parameters: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'UUID de la campaña que se desea reenviar.',
                },
                filtro_destinatarios: {
                  type: 'string',
                  description: 'Segmento de destinatarios: "todos", "pendientes", "contactados", "bio_link_tiktok", etc.',
                },
              },
              required: ['id'],
            },
          },
        },
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
        {
          type: 'function',
          function: {
            name: 'registrar_cliente_potencial',
            description:
              'Registra un nuevo prospecto o cliente potencial que se contacta por WhatsApp o redes sociales en la base de datos de Afinitive y le asigna su estado comercial.',
            parameters: {
              type: 'object',
              properties: {
                nombre: {
                  type: 'string',
                  description: 'Nombre completo o nombre con el que se identificó el cliente.',
                },
                celular: {
                  type: 'string',
                  description: 'Número de celular o WhatsApp del cliente (ej: "+51987654321").',
                },
                correo: {
                  type: 'string',
                  description: 'Correo electrónico del cliente si lo ha proporcionado.',
                },
                pais: {
                  type: 'string',
                  description: 'País de residencia del cliente (por defecto "Perú").',
                },
                interes_inversion: {
                  type: 'string',
                  description: 'Interés principal del cliente (ej: "Inmobiliaria", "Bolsa", "Patrimonial", etc.).',
                },
                origen: {
                  type: 'string',
                  description: 'Canal de captación (ej: "WhatsApp Inbound", "TikTok DM", "Instagram").',
                },
                estado: {
                  type: 'string',
                  enum: ['pendiente', 'atendido', 'en_proceso'],
                  description: 'Estado inicial del cliente (por defecto "en_proceso" o "pendiente").',
                },
                notas: {
                  type: 'string',
                  description: 'Notas adicionales sobre la conversación o necesidades del prospecto.',
                },
              },
              required: ['nombre', 'celular'],
            },
          },
        },
      ],
    };
  }
}
