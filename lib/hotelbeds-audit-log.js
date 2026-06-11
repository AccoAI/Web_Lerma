import { createClient } from '@supabase/supabase-js';

const STEP_FROM_PATH = {
  '/hotel-api/1.0/hotels': 'availability',
  '/hotel-api/1.0/checkrates': 'checkrate',
  '/hotel-api/1.0/bookings': 'booking',
};

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function safeJsonClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj ?? null));
  } catch {
    return { _serializeError: true, preview: String(obj).slice(0, 2000) };
  }
}

function extractClientReference(requestBody) {
  if (!requestBody || typeof requestBody !== 'object') return null;
  if (requestBody.booking && requestBody.booking.clientReference) {
    return String(requestBody.booking.clientReference).trim();
  }
  if (requestBody.clientReference) return String(requestBody.clientReference).trim();
  return null;
}

function extractBookingReference(responseData) {
  if (!responseData || typeof responseData !== 'object') return null;
  const b = responseData.booking || (responseData.data && responseData.data.booking);
  if (b && b.reference) return String(b.reference).trim();
  if (responseData.reference) return String(responseData.reference).trim();
  return null;
}

function inferStep(pathSuffix, overrideStep) {
  if (overrideStep) return overrideStep;
  return STEP_FROM_PATH[pathSuffix] || 'unknown';
}

function hotelbedsErrorFromData(data) {
  if (!data || !data.error) return null;
  if (typeof data.error === 'string') return data.error;
  return data.error.message || JSON.stringify(data.error);
}

/**
 * Registra traza auditada: consola (Vercel) + Supabase si está configurado.
 * No lanza excepción si falla el insert.
 */
export async function logHotelbedsApiCall({
  step,
  pathSuffix,
  requestBody,
  responseData,
  httpStatus,
  ok,
  errorMessage,
  durationMs,
  clientReference: clientRefOverride,
}) {
  const stepName = inferStep(pathSuffix, step);
  const clientReference = clientRefOverride || extractClientReference(requestBody);
  const bookingReference = extractBookingReference(responseData);
  const hbErr = hotelbedsErrorFromData(responseData);
  const logicalOk = ok != null ? !!ok : !!(httpStatus >= 200 && httpStatus < 300 && !hbErr);

  const record = {
    step: stepName,
    client_reference: clientReference || null,
    booking_reference: bookingReference || null,
    http_status: httpStatus ?? null,
    ok: logicalOk,
    error_message: (errorMessage || hbErr || null)
      ? String(errorMessage || hbErr).slice(0, 2000)
      : null,
    duration_ms: durationMs != null ? Math.round(durationMs) : null,
    request_payload: safeJsonClone(requestBody),
    response_payload: safeJsonClone(responseData),
  };

  console.log(
    '[HB-AUDIT]',
    JSON.stringify({
      audit: 'hotelbeds',
      timestamp: new Date().toISOString(),
      ...record,
    })
  );

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('hotelbeds_api_logs').insert(record);
    if (error) console.warn('[HB-AUDIT] Supabase insert failed:', error.message);
  } catch (e) {
    console.warn('[HB-AUDIT] Supabase insert error:', e?.message || e);
  }
}

/** Consulta logs por referencia de agencia o de reserva HB. */
export async function fetchHotelbedsLogs({ clientReference, bookingReference, limit = 50 }) {
  const supabase = getSupabase();
  if (!supabase) return { error: 'Supabase no configurado (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)' };

  const lim = Math.min(Math.max(1, parseInt(limit, 10) || 50), 200);
  let query = supabase
    .from('hotelbeds_api_logs')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(lim);

  if (clientReference) query = query.eq('client_reference', String(clientReference).trim());
  if (bookingReference) query = query.eq('booking_reference', String(bookingReference).trim());

  if (!clientReference && !bookingReference) {
    return { error: 'Indica clientReference o bookingReference' };
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { logs: data || [] };
}

export function isLogsReadAuthorized(request) {
  const secret = (process.env.HOTELBEDS_LOGS_SECRET || '').trim();
  if (!secret) return false;
  const fromHeader = request?.headers?.get('x-hb-logs-secret');
  if (fromHeader === secret) return true;
  const url = request?.url ? new URL(request.url) : null;
  return url?.searchParams?.get('secret') === secret;
}
