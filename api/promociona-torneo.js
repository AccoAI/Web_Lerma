/**
 * API: solicitud para promocionar un torneo (Resend).
 * POST /api/promociona-torneo
 * Body JSON: campos del formulario + foto_base64? + foto_filename?
 */

import { sendEmail } from '../lib/resend.js';

const EMAIL_DESTINO =
  process.env.RESEND_EMAIL_TORNEOS ||
  process.env.RESEND_EMAIL_EMPRESA ||
  'eventos@golflerma.com';

const MAX_FOTO_BYTES = 2.5 * 1024 * 1024;

const FIELD_LABELS = {
  contacto_nombre: 'Nombre del solicitante',
  contacto_email: 'Email de contacto',
  contacto_telefono: 'Teléfono',
  titulo: 'Título',
  nombre_torneo: 'Nombre del torneo',
  foto_url: 'Foto (URL)',
  descripcion: 'Descripción',
  modalidad: 'Modalidad',
  premios: 'Premios',
  tipo_evento: 'Tipo de evento',
  fecha_inicio: 'Fecha inicio',
  fecha_fin: 'Fecha fin',
  jornadas: 'Jornadas (Liga/Finde)',
  num_vueltas: 'Nº vueltas',
  tipo_salida: 'Tipo de salida',
  handicap_limitado: 'Hándicap limitado',
  limite_handicap: 'Límite hándicap',
  categorias: 'Categorías de juego',
  comite: 'Comité de competición',
  welcome_pack: 'Welcome Pack',
  picnic_hoyo9: 'Picnic / Carpa hoyo 9',
  coctel_premios: 'Cóctel / Entrega de premios',
  precio_socio: 'Precio Socio (€)',
  precio_no_socio: 'Precio No Socio (€)',
  precio_correspondencia: 'Precio Correspondencia (€)',
  patrocinador: 'Patrocinador principal',
  logo_patrocinador_url: 'Logo patrocinador (URL)',
  colaboradores: 'Colaboradores',
  galeria_urls: 'Galería imágenes (URLs)',
  fecha_limite_inscripcion: 'Fecha límite inscripción',
  cupo_max: 'Nº máximo jugadores (cupo)',
  link_pago: 'Link de pago / Pasarela',
  politica_cancelacion: 'Política de cancelación',
  sede: 'Sede',
  oferta_alojamiento: 'Oferta de alojamiento',
  url_reglamento: 'URL Reglamento (PDF)',
  formato_competicion: 'Formato de juego (competición)',
  tipo_torneo: 'Tipo de torneo',
  configurador_resumen: 'Reserva y logística (configurador)',
};

const SECTIONS = [
  {
    title: 'Contacto',
    keys: ['contacto_nombre', 'contacto_email', 'contacto_telefono'],
  },
  {
    title: 'Información general',
    keys: ['tipo_torneo', 'titulo', 'nombre_torneo', 'foto_url', 'descripcion', 'modalidad', 'formato_competicion', 'premios'],
  },
  {
    title: 'Formato y duración',
    keys: ['tipo_evento', 'fecha_inicio', 'fecha_fin', 'jornadas', 'num_vueltas'],
  },
  {
    title: 'Configuración deportiva',
    keys: ['tipo_salida', 'handicap_limitado', 'limite_handicap', 'categorias', 'comite'],
  },
  {
    title: 'Logística y hospitality',
    keys: [
      'welcome_pack',
      'picnic_hoyo9',
      'coctel_premios',
      'precio_socio',
      'precio_no_socio',
      'precio_correspondencia',
    ],
  },
  {
    title: 'Marketing y patrocinio',
    keys: ['patrocinador', 'logo_patrocinador_url', 'colaboradores', 'galeria_urls'],
  },
  {
    title: 'Inscripciones',
    keys: [
      'fecha_limite_inscripcion',
      'cupo_max',
      'link_pago',
      'politica_cancelacion',
    ],
  },
  {
    title: 'Otros',
    keys: ['sede', 'oferta_alojamiento', 'url_reglamento'],
  },
  {
    title: 'Reserva y logística',
    keys: ['configurador_resumen'],
  },
];

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function escapeHtml(s) {
  if (s == null) return '';
  const d = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s).replace(/[&<>"']/g, (c) => d[c]);
}

function str(v) {
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v).trim();
}

function formatValue(key, value) {
  const s = str(value);
  if (!s) return '—';
  if (key === 'fecha_inicio' && !s) return 'Próximamente';
  if (key === 'handicap_limitado') return value ? 'Sí' : 'No';
  if (key === 'galeria_urls' || key === 'configurador_resumen') {
    return s
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');
  }
  if (key === 'tipo_torneo') {
    if (s === 'publico') return 'Público (revisión del club para web)';
    if (s === 'privado') return 'Privado (solo su grupo)';
  }
  return s;
}

function buildEmailContent(data) {
  const textParts = [];
  const htmlParts = [];

  for (const section of SECTIONS) {
    const lines = [];
    const htmlLines = [];
    for (const key of section.keys) {
      const label = FIELD_LABELS[key] || key;
      const value = formatValue(key, data[key]);
      if (value === '—') continue;
      lines.push(`${label}: ${value}`);
      htmlLines.push(
        '<tr><td style="padding:4px 12px 4px 0;vertical-align:top;font-weight:600;white-space:nowrap;">' +
          escapeHtml(label) +
          '</td><td style="padding:4px 0;white-space:pre-wrap;">' +
          escapeHtml(value) +
          '</td></tr>'
      );
    }
    if (!lines.length) continue;
    textParts.push('--- ' + section.title + ' ---\n' + lines.join('\n'));
    htmlParts.push(
      '<h3 style="margin:1.25rem 0 0.5rem;font-size:1rem;color:#1a4d3a;">' +
        escapeHtml(section.title) +
        '</h3><table style="border-collapse:collapse;width:100%;max-width:640px;">' +
        htmlLines.join('') +
        '</table>'
    );
  }

  if (data.foto_adjunta) {
    textParts.push('Foto adjunta: ' + (data.foto_filename || 'imagen'));
    htmlParts.push(
      '<p style="margin-top:1rem;"><strong>Foto del torneo:</strong> adjunta (' +
        escapeHtml(data.foto_filename || 'imagen') +
        ')</p>'
    );
  }

  return { text: textParts.join('\n\n'), html: htmlParts.join('') };
}

export async function GET() {
  return jsonResponse({ error: 'Use POST para enviar la solicitud' }, 405);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const nombreTorneo = str(body.nombre_torneo);
    const contactoEmail = str(body.contacto_email);
    const contactoNombre = str(body.contacto_nombre);

    if (!nombreTorneo) {
      return jsonResponse({ error: 'El nombre del torneo es obligatorio' }, 400);
    }
    if (!contactoEmail) {
      return jsonResponse({ error: 'El email de contacto es obligatorio' }, 400);
    }
    if (!contactoNombre) {
      return jsonResponse({ error: 'Indique su nombre de contacto' }, 400);
    }

    const fotoBase64 = str(body.foto_base64);
    const fotoFilename = str(body.foto_filename) || 'foto-torneo.jpg';
    let attachments = [];

    if (fotoBase64) {
      const raw = fotoBase64.replace(/^data:[^;]+;base64,/, '');
      const approxBytes = Math.ceil((raw.length * 3) / 4);
      if (approxBytes > MAX_FOTO_BYTES) {
        return jsonResponse({ error: 'La foto no puede superar 2,5 MB' }, 400);
      }
      attachments = [{ filename: fotoFilename, content: raw }];
      body.foto_adjunta = true;
    }

    const { text, html } = buildEmailContent(body);
    const subject =
      'Solicitud promoción torneo (revisión)' +
      (nombreTorneo ? ' – ' + nombreTorneo : '') +
      (contactoNombre ? ' (' + contactoNombre + ')' : '');

    const result = await sendEmail({
      to: EMAIL_DESTINO,
      subject,
      html:
        '<p><strong>Nueva solicitud de promoción de torneo — pendiente de revisión por el club.</strong></p>' +
        '<p>Responder a: <a href="mailto:' +
        escapeHtml(contactoEmail) +
        '">' +
        escapeHtml(contactoEmail) +
        '</a></p>' +
        html,
      text: 'Nueva solicitud de promoción de torneo (revisión pendiente).\nResponder a: ' + contactoEmail + '\n\n' + text,
      attachments,
    });

    if (result.error) {
      return jsonResponse({ error: result.error }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('promociona-torneo:', err);
    return jsonResponse({ error: 'Error al enviar la solicitud' }, 500);
  }
}
