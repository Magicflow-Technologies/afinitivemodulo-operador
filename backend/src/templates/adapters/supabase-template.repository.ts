import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ITemplateRepository } from '../ports/template-repository.port';
import { EmailTemplate, CreateTemplateDto, UpdateTemplateDto } from '../domain/email-template.entity';

const DEFAULT_IN_MEMORY_TEMPLATES: EmailTemplate[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Prospección Institucional (LinkedIn)',
    subject: 'Invitación Exclusiva - Afinitive Wealth Management',
    type: 'standard_wrapper',
    htmlContent: `Estimado/a {{nombre}}:

Le escribo porque encontré su perfil en LinkedIn. Compartimos varios contactos en común, y me pareció oportuno tomar la iniciativa de escribirle.

Mi nombre es <strong>{{firma_nombre}}</strong>. {{firma_cargo}}, una boutique de asesoría patrimonial. Le escribo porque sé perfectamente lo frustrante que es para perfiles como el suyo lidiar con la banca tradicional en Lima, donde casi siempre le intentan colocar sus propios productos financieros masivos, <strong>en lugar de ofrecer asesoría integral, objetiva y profesional</strong>.

Nosotros operamos al revés: no tenemos productos propios. Trabajamos con arquitectura abierta para optimizar la estructura de ingresos y el capital de un grupo muy selecto de personas:

• Morgan Stanley
• BNY Mellon
• Coril

Le adjunto una presentación muy ejecutiva (<em>Afinitive Wealth | Tailor Made</em>) que detalla cómo estructuramos los balances y flujos, y maximizamos ingresos a partir de una inversión más eficiente que la que la oferta masiva puede lograr. Si nos busca en Google o LinkedIn, verá que mi trayectoria y la de mi equipo es transparente y de largo aliento.

Entendiendo que sus tiempos son ajustados, ¿le acomodaría una reunión virtual vía Meet o una llamada telefónica de 20 minutos el día <strong>{{fecha_reunion}}</strong>?

[CONFIRMAR_CITA]

Me avisa para agendar,`,
    category: 'Prospección',
    createdBy: 'system',
    isActive: true,
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

@Injectable()
export class SupabaseTemplateRepository implements ITemplateRepository {
  private readonly logger = new Logger(SupabaseTemplateRepository.name);
  private supabase: SupabaseClient | any;
  private memoryFallbackTemplates: EmailTemplate[] = [...DEFAULT_IN_MEMORY_TEMPLATES];

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || this.configService.get<string>('SUPABASE_ANON_KEY');

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        db: { schema: 'afinitivebd' },
      });
    } else {
      this.logger.error('No se pudo inicializar Supabase para plantillas (Faltan credenciales).');
    }
  }

  private mapRowToEntity(row: any): EmailTemplate {
    return {
      id: row.id,
      name: row.name,
      subject: row.subject,
      type: row.type || 'full_html',
      htmlContent: row.html_content || row.htmlContent,
      category: row.category || 'General',
      createdBy: row.created_by || row.createdBy || 'manual',
      isActive: row.is_active ?? row.isActive ?? true,
      metadata: row.metadata || {},
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt,
    };
  }

  async create(dto: CreateTemplateDto): Promise<EmailTemplate> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('email_templates')
        .insert({
          name: dto.name,
          subject: dto.subject,
          type: dto.type || 'full_html',
          html_content: dto.htmlContent,
          category: dto.category || 'General',
          created_by: dto.createdBy || 'manual',
          metadata: dto.metadata || {},
        })
        .select()
        .single();

      if (!error && data) {
        return this.mapRowToEntity(data);
      }
      this.logger.warn(`Inserción en Supabase falló (${error?.message}). Guardando en memoria local como fallback.`);
    }

    const memoryEntity: EmailTemplate = {
      id: `local-${Date.now()}`,
      name: dto.name,
      subject: dto.subject,
      type: dto.type || 'full_html',
      htmlContent: dto.htmlContent,
      category: dto.category || 'General',
      createdBy: dto.createdBy || 'manual',
      isActive: true,
      metadata: dto.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.memoryFallbackTemplates.unshift(memoryEntity);
    return memoryEntity;
  }

  async findAll(filter?: { category?: string; isActive?: boolean }): Promise<EmailTemplate[]> {
    if (this.supabase) {
      try {
        let query = this.supabase
          .from('email_templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (filter?.category) {
          query = query.eq('category', filter.category);
        }

        if (filter?.isActive !== undefined) {
          query = query.eq('is_active', filter.isActive);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          return data.map((row: any) => this.mapRowToEntity(row));
        }
      } catch (err: any) {
        this.logger.warn(`Error al consultar tabla en Supabase: ${err.message}.`);
      }
    }

    // Fallback a plantillas en memoria
    return this.memoryFallbackTemplates.filter(t => {
      if (filter?.category && t.category !== filter.category) return false;
      if (filter?.isActive !== undefined && t.isActive !== filter.isActive) return false;
      return true;
    });
  }

  async findById(id: string): Promise<EmailTemplate | null> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('email_templates')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return this.mapRowToEntity(data);
        }
      } catch (err: any) {
        this.logger.warn(`Error al buscar plantilla en Supabase: ${err.message}.`);
      }
    }

    return this.memoryFallbackTemplates.find(t => t.id === id) || null;
  }

  async update(id: string, dto: UpdateTemplateDto): Promise<EmailTemplate> {
    if (this.supabase) {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (dto.name !== undefined) updatePayload.name = dto.name;
      if (dto.subject !== undefined) updatePayload.subject = dto.subject;
      if (dto.type !== undefined) updatePayload.type = dto.type;
      if (dto.htmlContent !== undefined) updatePayload.html_content = dto.htmlContent;
      if (dto.category !== undefined) updatePayload.category = dto.category;
      if (dto.isActive !== undefined) updatePayload.is_active = dto.isActive;
      if (dto.metadata !== undefined) updatePayload.metadata = dto.metadata;

      const { data, error } = await this.supabase
        .from('email_templates')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return this.mapRowToEntity(data);
      }
    }

    const idx = this.memoryFallbackTemplates.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.memoryFallbackTemplates[idx] = {
        ...this.memoryFallbackTemplates[idx],
        ...dto,
        updatedAt: new Date().toISOString(),
      };
      return this.memoryFallbackTemplates[idx];
    }

    throw new HttpException(`Plantilla ${id} no encontrada`, HttpStatus.NOT_FOUND);
  }

  async delete(id: string): Promise<boolean> {
    if (this.supabase) {
      await this.supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
    }

    this.memoryFallbackTemplates = this.memoryFallbackTemplates.filter(t => t.id !== id);
    return true;
  }
}
