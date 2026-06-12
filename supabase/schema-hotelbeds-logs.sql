-- Trazas auditadas Hotelbeds (Availability, CheckRate, Booking)
-- Ejecutar en Supabase: SQL Editor > New query > Pegar y Run

create table if not exists public.hotelbeds_api_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  step text not null check (step in ('availability', 'checkrate', 'booking', 'unknown')),
  client_reference text,
  booking_reference text,
  http_status int,
  ok boolean not null default false,
  error_message text,
  duration_ms int,
  request_payload jsonb,
  response_payload jsonb
);

create index if not exists hotelbeds_api_logs_client_ref_idx
  on public.hotelbeds_api_logs (client_reference)
  where client_reference is not null;

create index if not exists hotelbeds_api_logs_booking_ref_idx
  on public.hotelbeds_api_logs (booking_reference)
  where booking_reference is not null;

create index if not exists hotelbeds_api_logs_created_at_idx
  on public.hotelbeds_api_logs (created_at desc);

comment on table public.hotelbeds_api_logs is
  'Trazas request/response Hotelbeds para incidencias y certificación. Solo escribe el servidor (service role).';

-- RLS desactivado: el servidor usa service_role (bypass). Sin políticas para anon.
alter table public.hotelbeds_api_logs disable row level security;

grant all on table public.hotelbeds_api_logs to service_role;
grant all on table public.hotelbeds_api_logs to postgres;
