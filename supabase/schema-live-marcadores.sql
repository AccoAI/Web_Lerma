-- Marcador en vivo de partidas (app Golf Lerma y Saldana)
-- Ejecutar en Supabase: SQL Editor > New query > Pegar y Run

create table if not exists public.live_marcadores (
  code text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists live_marcadores_updated_at_idx
  on public.live_marcadores (updated_at desc);

comment on table public.live_marcadores is
  'Snapshots del marcador en vivo. Escribe el servidor (service role); lectura publica via /api/marcador.';

alter table public.live_marcadores disable row level security;

grant all on table public.live_marcadores to service_role;
grant all on table public.live_marcadores to postgres;
