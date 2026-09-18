export interface EventoTemplateData {
  id: string;
  nombre: string;
  fecha_inicio: string;
  link_reunion?: string;
  descripcion?: string;
  imagen_url?: string;
}

export function buildEventEmailTemplateBackend(evento: EventoTemplateData): {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  category: string;
} {
  let fechaFormateada = 'Próximamente';
  try {
    const fecha = new Date(evento.fecha_inicio);
    if (!isNaN(fecha.getTime())) {
      fechaFormateada = fecha.toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  } catch (e) {
    fechaFormateada = evento.fecha_inicio;
  }

  const landingUrl = `https://eventos.afinitive.com.pe/?id=${evento.id}`;
  const subject = `Invitación Exclusiva: ${evento.nombre}`;

  let cleanDesc = (evento.descripcion || '').replace(/\[IMG_URL:.*?\]\n?/g, '').trim();
  if (!cleanDesc) {
    cleanDesc = 'Te invito a una presentación privada donde conocerás cómo invertir utilizando financiamiento y renta por alquiler.';
  }

  const htmlContent = `
<p>{{saludo}} {{nombre}}:</p>

<p>Es un gusto saludarle. Le escribo para extenderle una invitación exclusiva a nuestra próxima sesión ejecutiva de presentación de oportunidades de inversión inmobiliaria y estructuración patrimonial:</p>

<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #c9a84c; padding: 22px; border-radius: 12px; margin: 24px 0;">
  <h3 style="color: #0f172a; margin: 0 0 12px 0; font-size: 18px; font-weight: 800; line-height: 1.3;">
    ${evento.nombre}
  </h3>
  <p style="color: #334155; margin: 0 0 8px 0; font-size: 14px; line-height: 1.5;">
    📅 <strong>Fecha y Hora:</strong> ${fechaFormateada} (Hora de Lima)
  </p>
  <p style="color: #334155; margin: 0 0 10px 0; font-size: 14px; line-height: 1.5;">
    💻 <strong>Modalidad:</strong> En vivo vía Zoom
  </p>
  <div style="color: #475569; font-size: 13.5px; line-height: 1.6; margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 12px; white-space: pre-line;">
${cleanDesc}
  </div>
</div>

${
  evento.imagen_url
    ? `
<div style="text-align: center; margin: 26px 0;">
  <a href="${landingUrl}" target="_blank" style="text-decoration: none;">
    <img 
      src="${evento.imagen_url}" 
      alt="${evento.nombre}" 
      style="max-width: 100%; width: 520px; height: auto; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.06); display: block; margin: 0 auto;" 
    />
  </a>
</div>
`
    : ''
}

<div style="text-align: center; margin: 30px 0 24px 0;">
  <a href="${landingUrl}" target="_blank" style="display: inline-block; background-color: #c9a84c; background-image: linear-gradient(135deg, #d4af37 0%, #b38e2d 100%); color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 28px; box-shadow: 0 4px 14px rgba(201, 168, 76, 0.4); text-align: center;">
    🎟️ Confirmar Asistencia y Ver Proyecto
  </a>
</div>

<p style="font-size: 12.5px; color: #64748b; text-align: center; margin: 0 0 20px 0;">
  Los cupos para esta sesión privada son limitados. Ricardo Bertalmio te espera puntualmente.
</p>
`.trim();

  return {
    id: `evento:${evento.id}`,
    name: `🎯 [Evento] ${evento.nombre}`,
    subject,
    htmlContent,
    category: 'Eventos & Landings',
  };
}
