/**
 * Guía PDF «Golf en Burgos» — regalo post-pago Paquete Burgos / Campeonato.
 */

import { resolvePublicBaseUrl } from './site-base-url.js';

const PAQUETES_CON_GUIA = {
  'golf-burgos': true,
  'campeonato-burgos': true,
  'fin-semana': true,
};

export const GUIA_BURGOS_PATH = '/pdf/guia-golf-burgos.pdf';

export function paqueteIncluyeGuiaBurgos(paqueteId) {
  return !!(paqueteId && PAQUETES_CON_GUIA[paqueteId]);
}

export function guiaBurgosPublicUrl(request) {
  const base = resolvePublicBaseUrl(request);
  if (!base) return '';
  return `${base}${GUIA_BURGOS_PATH}`;
}

export function buildGuiaBurgosEmailHtml(guiaUrl) {
  if (!guiaUrl) return '';
  const safe = String(guiaUrl).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return (
    `<div style="margin-top:20px;padding:14px;background:#f0f5f1;border-radius:8px;border:1px solid #c5d4ca;">` +
    `<p style="margin:0 0 8px;"><strong>Regalo: guía Golf en Burgos</strong></p>` +
    `<p style="margin:0 0 10px;font-size:14px;color:#333;">Incluye ideas de visitas y restaurantes en la provincia. También la enviamos por WhatsApp cuando esté activo el envío automático.</p>` +
    `<p style="margin:0;"><a href="${safe}" style="color:#2c5530;font-weight:600;">Descargar guía PDF</a></p>` +
    `</div>`
  );
}

export function buildGuiaBurgosEmailText(guiaUrl) {
  if (!guiaUrl) return '';
  return `\n\nRegalo — Guía Golf en Burgos (PDF):\n${guiaUrl}\n`;
}
