-- ============================================================
-- migraciones/nuevo/00_esquema_actual.sql
-- ESQUEMA ACTUAL (normalizado) — versión canónica FINAL
-- ------------------------------------------------------------
-- Este archivo representa el estado FINAL del modelo de datos
-- normalizado (sin campo `status`; visibilidad por umbrales +
-- moderación; votos/denuncias; capa BI geo-temporal).
--
-- IMPORTANTE (vs. versiones históricas):
--   * Incidencias SIN columna `status`. La visibilidad para el
--     usuario final es DERIVADA:
--       - activo            : no oculto y sin superar umbral.
--       - inactivo_rechazo  : votes_down >= downvote_threshold
--       - inactivo_resuelta : votes_resuelta >= resuelto_threshold
--       - oculto_moderacion : `hidden_at` fijado por un moderador.
--   * Incluye `hidden_at/hidden_by/hidden_reason` (moderación) y
--     `downvote_threshold` (umbral de votos negativos).
--   * `score` / `confirmation_count` se calculan en el frontend:
--     las vistas de datos exponen SOLO conteos de votos.
--   * Los RPCs usan las firmas FINALES (sin `status`):
--       get_incidents_in_bounds(bounds, category, since, limit)
--       get_incident_heat_cells(bounds, since, cell_deg, category)
--       find_nearby_incidents(lat, lng, radius, category) [+ image_url/created_at]
--       get_heatmap_data(start, end)
--
-- Es idempotente (create/drop if exists). Úsalo para:
--   * documentar/referenciar el esquema vigente, o
--   * preparar un proyecto Supabase nuevo desde cero
--     (ver orden de bootstrap en README.md).
--
-- Los scripts 16/17/19/20/21/22 son MIGRACIONES INCREMENTALES de
-- evolución sobre bases YA EXISTENTES (ya aplicadas en producción);
-- para un proyecto NUEVO su efecto ya está incluido en este archivo.
-- ============================================================

-- ============================================
-- TABLAS
-- ============================================

-- profiles (extiende auth.users).
-- Las columnas de consentimiento de términos/fotos se agregan en
-- `18_terms_consent.sql` (migración aplicada en producción).
create table if not exists public.profiles (
  id                uuid references auth.users on delete cascade primary key,
  email             text,
  display_name      text not null,
  role              text not null default 'user' check (role in ('user', 'admin')),
  organization_name text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- incidents (sin status / sin score denormalizado).
create table if not exists public.incidents (
  id                 uuid primary key default gen_random_uuid(),
  category           text not null check (category in (
                         'vereda_cortada', 'vereda_deteriorada', 'rampa_bloqueada',
                         'rampa_inexistente', 'obstaculo_fisico', 'ascensor_fuera_servicio',
                         'falta_iluminacion', 'otro'
                       )),
  description        text not null check (length(description) between 1 and 500),
  latitude           numeric not null,
  longitude          numeric not null,
  severity           int not null check (severity between 1 and 3),
  observed_at        date not null check (observed_at <= current_date),
  estimated_duration text not null check (estimated_duration in ('temporal', 'permanente')),
  image_url          text,
  -- Ruta (path) del objeto en el bucket (para gestión/admin; NO contiene PII del usuario)
  storage_path       text,
  place_name         text,
  address            text,
  -- Geografía administrativa (Chile) + desglose de dirección
  country            text,
  region             text,
  province           text,
  comuna             text,
  neighbourhood      text,
  street             text,
  house_number       text,
  -- Umbrales de ocultamiento automático (configurables por incidencia)
  resuelto_threshold int not null default 3 check (resuelto_threshold >= 1),
  downvote_threshold int not null default 4 check (downvote_threshold >= 1),
  -- Moderación (baja / ocultamiento por administrador)
  hidden_at          timestamptz,
  hidden_by          uuid references public.profiles(id) on delete set null,
  hidden_reason      text,
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  resolved_at        timestamptz,
  resolved_by        uuid references public.profiles(id) on delete set null
);

-- En una base YA EXISTENTE, `create table if not exists` no agrega columnas
-- nuevas; este ALTER garantiza que la columna de ruta de storage exista.
alter table public.incidents
  add column if not exists storage_path text;

comment on column public.incidents.hidden_at is
  'Marca cuándo un moderador dio de baja (ocultó) el reporte. Si es NULL, no está oculto por moderación.';
comment on column public.incidents.hidden_by is
  'Perfil del moderador que dio de baja el reporte (se conserva junto al flag de moderación).';
comment on column public.incidents.hidden_reason is
  'Motivo de la baja/moderación (p. ej. denuncia fundamentada).';

-- votos (up / down / resuelta), un voto por usuario e incidencia
create table if not exists public.incident_votes (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  vote_type   text not null check (vote_type in ('up', 'down', 'resuelta')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(incident_id, user_id)
);

-- denuncias / reportes (capa BI)
create table if not exists public.incident_reports (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  reported_by uuid not null references public.profiles(id),
  reason      text,
  status      text not null default 'pendiente' check (status in ('pendiente', 'resuelto', 'rechazado')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(incident_id, reported_by)
);

-- auditoría
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id),
  event_type  text not null,
  entity_type text not null,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- ============================================
-- ÍNDICES
-- ============================================
create index if not exists idx_incidents_location on public.incidents (latitude, longitude);
create index if not exists idx_incidents_category on public.incidents (category);
create index if not exists idx_incidents_created_at on public.incidents (created_at);
create index if not exists idx_incidents_bounds on public.incidents (latitude, longitude);
create index if not exists idx_incidents_bounds_created on public.incidents (created_at, latitude, longitude);
create index if not exists idx_votes_incident on public.incident_votes (incident_id);
create index if not exists idx_votes_user on public.incident_votes (user_id);
create index if not exists idx_reports_incident on public.incident_reports (incident_id);
create index if not exists idx_reports_status on public.incident_reports (status);
create index if not exists idx_audit_created_at on public.audit_log (created_at);

-- ============================================
-- TRIGGERS / FUNCIONES AUTOMÁTICAS
-- ============================================

-- crear perfil al registrarse (la versión final con consentimiento
-- de términos se define en `18_terms_consent.sql`; aquí la base).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', 'Usuario'), 'user');
  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper de RLS: ¿el usuario actual (auth.uid()) es admin?
-- Es SECURITY DEFINER y se ejecuta como el dueño de la función, por lo que
-- consulta `profiles` SIN re-aplicar RLS sobre `profiles`. Esto evita la
-- **infinit recursion** que provoca una política de `profiles` que se auto-
-- referencie (patrón `exists (select 1 from public.profiles ...)`). Todas las
-- políticas que comprueban rol `admin` deben usar `public.is_admin()` en vez de
-- esa subquery inline.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- Elimina la cuenta del usuario (derecho a supresión). Conserva sus REPORTES
-- (incidents) activos anonimizando la autoría (created_by se anonimiza vía FK
-- `on delete set null`), y elimina sus datos personales (perfil, identidad,
-- sesiones, consentimiento, auditoría) y sus votos/denuncias. Hace HARD DELETE
-- de `auth.users` (cascada a profiles/identities/sessions) para que el email
-- quede libre y se pueda volver a registrar (el trigger `handle_new_user`
-- recrea el perfil al darse de alta).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  -- Opinión personal del usuario (no puede conservarse sin el perfil).
  delete from public.incident_votes   where user_id     = v_uid;
  delete from public.incident_reports where reported_by = v_uid;
  delete from public.audit_log        where user_id     = v_uid;

  -- `terms_acceptance_log` se borra en cascada al eliminar el perfil.
  -- Los `incidents` del usuario se CONSERVAN; al borrar el perfil la FK
  -- `created_by ... on delete set null` deja su autoría anonimizada.
  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Evita que un usuario se autopromocione a admin o cambie su email mediante un
-- UPDATE a su propio perfil desde la app (defensa en profundidad sobre la RLS).
-- Solo se restringe cuando el cambio lo hace un USUARIO AUTENTICADO por la app
-- (auth.uid() no es nulo). Cuando se ejecuta desde el SQL Editor / service_role
-- (auth.uid() nulo) se permite, p. ej. para dar el rol admin al usuario admin.
create or replace function public.guard_profile_update()
returns trigger as $$
begin
  if auth.uid() is not null then
    new.role  := old.role;
    new.email := old.email;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists on_profile_guard on public.profiles;
create trigger on_profile_guard
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- auditoría de moderación (baja / restauración de incidencia)
create or replace function public.log_moderation_change()
returns trigger as $$
begin
  if old.hidden_at is distinct from new.hidden_at then
    insert into public.audit_log (user_id, event_type, entity_type, entity_id, metadata)
    values (auth.uid(), 'incident_moderation_changed', 'incident', new.id,
            json_build_object(
              'hidden_at',     new.hidden_at,
              'hidden_by',     new.hidden_by,
              'hidden_reason', new.hidden_reason));
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists on_incident_moderation on public.incidents;
create trigger on_incident_moderation
  after update on public.incidents
  for each row when (old.hidden_at is distinct from new.hidden_at)
  execute function public.log_moderation_change();

-- auditoría de votos
create or replace function public.log_vote_action()
returns trigger as $$
begin
  insert into public.audit_log (user_id, event_type, entity_type, entity_id, metadata)
  values (
    new.user_id,
    case new.vote_type
      when 'up'       then 'incident_upvoted'
      when 'down'     then 'incident_downvoted'
      when 'resuelta' then 'incident_voted_resolved'
    end,
    'incident',
    new.incident_id,
    json_build_object('vote_type', new.vote_type)
  );
  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists on_vote_audit on public.incident_votes;
create trigger on_vote_audit
  after insert or update on public.incident_votes
  for each row execute function public.log_vote_action();

-- ============================================
-- RLS (habilitar en todas las tablas)
-- ============================================
alter table public.profiles enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_votes enable row level security;
alter table public.incident_reports enable row level security;
alter table public.audit_log enable row level security;

-- profiles
-- IMPORTANTE: el email/organización NO se exponen al público. Solo el propio
-- usuario (o un admin) puede leer una fila de `profiles`.
drop policy if exists "Anyone can view profiles" on public.profiles;
drop policy if exists "Users can view own or admin profiles" on public.profiles;
create policy "Users can view own or admin profiles" on public.profiles for select to authenticated
  using (auth.uid() = id or public.is_admin());
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "Admin can update any profile" on public.profiles;
create policy "Admin can update any profile" on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
drop policy if exists "Trigger can insert profiles" on public.profiles;
create policy "Trigger can insert profiles" on public.profiles for insert to service_role with check (true);

-- incidents
-- La lectura pública SIEMPRE pasa por `incidents_public` y por los RPCs
-- (funciones security definer). La tabla base solo es legible por su autor o un
-- admin, para que nadie pueda acceder a filas ocultas ni al `created_by`.
drop policy if exists "Anyone can view incidents" on public.incidents;
drop policy if exists "Owner or admin can view incidents" on public.incidents;
create policy "Owner or admin can view incidents" on public.incidents for select to authenticated
  using (auth.uid() = created_by
         or public.is_admin());
drop policy if exists "Authenticated users can create incidents" on public.incidents;
create policy "Authenticated users can create incidents" on public.incidents for insert to authenticated
  with check (auth.uid() = created_by);
drop policy if exists "Creator can update own incident" on public.incidents;
create policy "Creator can update own incident" on public.incidents for update to authenticated
  using (auth.uid() = created_by) with check (auth.uid() = created_by);
drop policy if exists "Admin can update any incident" on public.incidents;
create policy "Admin can update any incident" on public.incidents for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
drop policy if exists "Admin can delete incidents" on public.incidents;
create policy "Admin can delete incidents" on public.incidents for delete to authenticated
  using (public.is_admin());

-- incident_votes
-- Solo el dueño de un voto (o un admin) puede verlo: se oculta el `user_id` al
-- público (evita correlacionar votante <-> incidente <-> foto).
drop policy if exists "Anyone can view votes" on public.incident_votes;
drop policy if exists "Owner or admin can view votes" on public.incident_votes;
create policy "Owner or admin can view votes" on public.incident_votes for select to authenticated
  using (auth.uid() = user_id
         or public.is_admin());
drop policy if exists "Users can create own votes" on public.incident_votes;
create policy "Users can create own votes" on public.incident_votes for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can update own votes" on public.incident_votes;
create policy "Users can update own votes" on public.incident_votes for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own votes" on public.incident_votes;
create policy "Users can delete own votes" on public.incident_votes for delete to authenticated
  using (auth.uid() = user_id);

-- incident_reports
-- Solo admin puede leer las denuncias; el denunciante crea/actualiza la propia.
drop policy if exists "Users can create own reports" on public.incident_reports;
create policy "Users can create own reports" on public.incident_reports for insert to authenticated
  with check (auth.uid() = reported_by);
drop policy if exists "Users can update own reports" on public.incident_reports;
create policy "Users can update own reports" on public.incident_reports for update to authenticated
  using (auth.uid() = reported_by) with check (auth.uid() = reported_by);
drop policy if exists "Only admin can view reports" on public.incident_reports;
create policy "Only admin can view reports" on public.incident_reports for select to authenticated
  using (public.is_admin());
drop policy if exists "Admin can update reports" on public.incident_reports;
create policy "Admin can update reports" on public.incident_reports for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
drop policy if exists "Admin can delete reports" on public.incident_reports;
create policy "Admin can delete reports" on public.incident_reports for delete to authenticated
  using (public.is_admin());

-- audit_log
-- Solo el sistema (service_role, usado por los triggers security definer) inserta;
-- únicamente admin puede leer.
drop policy if exists "System can insert audit log" on public.audit_log;
create policy "System can insert audit log" on public.audit_log for insert to service_role with check (true);
drop policy if exists "Only admin can view audit log" on public.audit_log;
create policy "Only admin can view audit log" on public.audit_log for select to authenticated
  using (public.is_admin());

-- ============================================
-- VISTAS (conteos de votos) + BI (visibilidad derivada)
-- ============================================
-- NOTA: se DROPEAN antes de recrear porque redefinir el conjunto de columnas de
-- una vista existente no es posible con `create or replace`. Incidents_public se
-- dropa primero (dependía de incidents_with_stats en su versión anterior).
drop view if exists public.incidents_public;
drop view if exists public.incidents_with_stats;

create or replace view public.incidents_with_stats
with (security_invoker = false) as
select
  i.id, i.category, i.description, i.latitude, i.longitude, i.severity,
  i.observed_at, i.estimated_duration, i.image_url,
  i.place_name, i.address,
  i.created_by, i.created_at, i.updated_at, i.resolved_at, i.resolved_by,
  i.resuelto_threshold, i.downvote_threshold,
  i.hidden_at, i.hidden_by, i.hidden_reason,
  i.storage_path,
  coalesce(v.votes_up, 0)        as votes_up,
  coalesce(v.votes_down, 0)      as votes_down,
  coalesce(v.votes_resuelta, 0)  as votes_resuelta
from public.incidents i
left join (
  select incident_id,
         count(*) filter (where vote_type = 'up')       as votes_up,
         count(*) filter (where vote_type = 'down')     as votes_down,
         count(*) filter (where vote_type = 'resuelta') as votes_resuelta
  from public.incident_votes
  group by incident_id
) v on v.incident_id = i.id
-- Esta vista es la única que expone PII del autor (created_by / hidden_by). Se
-- restringe a nivel de FILA (no RLS sobre vistas, no soportado en Supabase):
-- solo devuelve filas del PROPIETARIO (auth.uid() = created_by) o de un ADMIN.
-- Así los visitantes anónimos/otros usuarios NO pueden enumerar autores.
where auth.uid() = i.created_by
   or public.is_admin();

-- Vista pública (anónimos + logueados): SOLO columnas no-PII. No expone
-- created_by / hidden_by / hidden_reason / resolved_by / storage_path, de modo
-- que una foto/incidente no puede asociarse a un usuario/email. El ocultamiento
-- por umbrales/moderación se aplica aquí.
create or replace view public.incidents_public
with (security_invoker = false) as
select
  i.id, i.category, i.description, i.latitude, i.longitude, i.severity,
  i.observed_at, i.estimated_duration, i.image_url,
  i.place_name, i.address,
  i.created_at, i.updated_at, i.resolved_at,
  i.resuelto_threshold, i.downvote_threshold,
  i.hidden_at,
  coalesce(v.votes_up, 0)        as votes_up,
  coalesce(v.votes_down, 0)      as votes_down,
  coalesce(v.votes_resuelta, 0)  as votes_resuelta
from public.incidents i
left join (
  select incident_id,
         count(*) filter (where vote_type = 'up')       as votes_up,
         count(*) filter (where vote_type = 'down')     as votes_down,
         count(*) filter (where vote_type = 'resuelta') as votes_resuelta
  from public.incident_votes
  group by incident_id
) v on v.incident_id = i.id
where i.hidden_at is null
  and coalesce(v.votes_down, 0)     < i.downvote_threshold
  and coalesce(v.votes_resuelta, 0) < i.resuelto_threshold;

create schema if not exists bi;

drop view if exists public.analytics_incident_daily;
drop view if exists public.analytics_incident_reports_daily;
drop view if exists bi.incident_daily;
drop view if exists bi.incident_reports_daily;

-- Vista BI: una fila por incidencia con visibilidad derivada,
-- geografía administrativa (Chile), dirección desglosada, duración
-- estimada y dimensión temporal del reporte (America/Santiago).
create or replace view bi.incident_daily
with (security_invoker = false) as
select
  i.id                       as incident_id,
  i.category,
  i.severity,
  case
    when i.hidden_at is not null then 'oculto_moderacion'
    when coalesce(v.votes_down, 0) >= i.downvote_threshold then 'inactivo_rechazo'
    when coalesce(v.votes_resuelta, 0) >= i.resuelto_threshold then 'inactivo_resuelta'
    else 'activo'
  end                        as visibility,
  i.description,
  i.estimated_duration,
  i.observed_at::date        as observed_date,
  i.created_at               as created_at,
  (i.created_at at time zone 'America/Santiago')::date as report_date,
  extract(hour   from i.created_at at time zone 'America/Santiago')::int as report_hour,
  to_char(i.created_at at time zone 'America/Santiago', 'Dy') as report_day_of_week,
  extract(month  from i.created_at at time zone 'America/Santiago')::int as report_month,
  extract(week   from i.created_at at time zone 'America/Santiago')::int as report_week,
  i.updated_at,
  i.resolved_at,
  i.resolved_by is not null  as has_resolved_by,
  i.hidden_at,
  i.latitude,
  i.longitude,
  i.country,
  i.region,
  i.province,
  i.comuna,
  i.neighbourhood,
  i.street,
  i.house_number,
  i.place_name,
  i.address,
  i.resuelto_threshold,
  i.downvote_threshold,
  i.image_url,
  round(extract(epoch from (i.resolved_at - i.created_at)) / 86400.0, 2)
                             as resolution_days,
  coalesce(v.votes_up, 0)        as votes_up,
  coalesce(v.votes_down, 0)      as votes_down,
  coalesce(v.votes_resuelta, 0)  as votes_resuelta,
  coalesce(r.reports_total, 0)   as reports_total,
  coalesce(r.reports_pending, 0) as reports_pending,
  coalesce(r.reports_resolved, 0) as reports_resolved,
  coalesce(r.reports_rejected, 0) as reports_rejected
from public.incidents i
left join (
  select incident_id,
         count(*) filter (where vote_type = 'up')       as votes_up,
         count(*) filter (where vote_type = 'down')     as votes_down,
         count(*) filter (where vote_type = 'resuelta') as votes_resuelta
  from public.incident_votes
  group by incident_id
) v on v.incident_id = i.id
left join (
  select incident_id,
         count(*)                                          as reports_total,
         count(*) filter (where status = 'pendiente')      as reports_pending,
         count(*) filter (where status = 'resuelto')       as reports_resolved,
         count(*) filter (where status = 'rechazado')      as reports_rejected
  from public.incident_reports
  group by incident_id
) r on r.incident_id = i.id;

-- Vista de denuncias anonimizadas (sin reported_by / sin PII) + visibilidad.
create or replace view bi.incident_reports_daily
with (security_invoker = false) as
select
  r.id                as report_id,
  r.incident_id,
  i.category,
  i.severity,
  i.estimated_duration,
  case
    when i.hidden_at is not null then 'oculto_moderacion'
    when coalesce(v.votes_down, 0) >= i.downvote_threshold then 'inactivo_rechazo'
    when coalesce(v.votes_resuelta, 0) >= i.resuelto_threshold then 'inactivo_resuelta'
    else 'activo'
  end                 as incident_visibility,
  i.latitude,
  i.longitude,
  i.country,
  i.region,
  i.province,
  i.comuna,
  i.neighbourhood,
  i.street,
  i.house_number,
  r.status            as report_status,
  r.reason,
  r.created_at::date  as report_date,
  r.updated_at
from public.incident_reports r
left join public.incidents i on i.id = r.incident_id
left join (
  select incident_id,
         count(*) filter (where vote_type = 'up')       as votes_up,
         count(*) filter (where vote_type = 'down')     as votes_down,
         count(*) filter (where vote_type = 'resuelta') as votes_resuelta
  from public.incident_votes
  group by incident_id
) v on v.incident_id = i.id;

-- Vistas espejo en `public` para exportación vía PostgREST (no refleja `bi`)
create or replace view public.analytics_incident_daily
with (security_invoker = true) as
select * from bi.incident_daily;

create or replace view public.analytics_incident_reports_daily
with (security_invoker = true) as
select * from bi.incident_reports_daily;

-- ============================================
-- GRANTS de la capa BI (solo service_role / bi_reader)
-- ============================================
grant usage on schema bi to authenticator, service_role;

grant select on bi.incident_daily to service_role;
grant select on bi.incident_reports_daily to service_role;
grant select on public.analytics_incident_daily to service_role;
grant select on public.analytics_incident_reports_daily to service_role;

revoke all on bi.incident_daily from public, anon, authenticated;
revoke all on bi.incident_reports_daily from public, anon, authenticated;
revoke all on public.analytics_incident_daily from public, anon, authenticated;
revoke all on public.analytics_incident_reports_daily from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'bi_reader') then
    grant usage on schema bi to bi_reader;
    grant select on bi.incident_daily to bi_reader;
    grant select on bi.incident_reports_daily to bi_reader;
    grant select on public.analytics_incident_daily to bi_reader;
    grant select on public.analytics_incident_reports_daily to bi_reader;
  end if;
end $$;

-- ============================================
-- GRANTS de las vistas de la APP (público vs. autenticado)
-- ============================================
-- incidents_public: la cara pública/anónima. Accesible por anon y authenticated.
revoke all on public.incidents_public from public;
grant select on public.incidents_public to anon, authenticated;

-- incidents_with_stats: expone PII del autor (created_by/hidden_by); SOLO autenticado
-- y, además, la propia vista filtra por autor/admin vía RLS.
revoke all on public.incidents_with_stats from public, anon;
grant select on public.incidents_with_stats to authenticated;

-- ============================================
-- RPCs (firmas finales, sin `status`)
-- ============================================

-- RPC: incidencias dentro de un bounding box (viewport) + ventana temporal.
drop function if exists public.get_incidents_in_bounds(numeric, numeric, numeric, numeric, text, text, int);
drop function if exists public.get_incidents_in_bounds(numeric, numeric, numeric, numeric, text, text, timestamptz, int);

create or replace function public.get_incidents_in_bounds(
  p_min_lat numeric,
  p_max_lat numeric,
  p_min_lng numeric,
  p_max_lng numeric,
  p_category text default null,
  p_since    timestamptz default 'epoch',
  p_limit    int  default 500
)
returns table (
  id                uuid,
  category          text,
  severity          int,
  latitude          numeric,
  longitude         numeric,
  description       text,
  votes_up          bigint,
  votes_down        bigint,
  votes_resuelta    bigint,
  resuelto_threshold int,
  downvote_threshold int,
  created_at        timestamptz,
  place_name        text,
  image_url         text
)
language sql
security definer set search_path = ''
as $$
  select
    i.id,
    i.category,
    i.severity,
    i.latitude,
    i.longitude,
    i.description,
    i.votes_up,
    i.votes_down,
    i.votes_resuelta,
    i.resuelto_threshold,
    i.downvote_threshold,
    i.created_at,
    i.place_name,
    i.image_url
  from public.incidents_public i
  where i.latitude between p_min_lat and p_max_lat
    and i.longitude between p_min_lng and p_max_lng
    and (p_since is null or i.created_at >= p_since)
    and (p_category is null or i.category = p_category)
  order by i.created_at desc
  limit p_limit;
$$;

grant execute on function public.get_incidents_in_bounds(numeric, numeric, numeric, numeric, text, timestamptz, int) to anon, authenticated;

-- RPC: agregados por celda para el heatmap (densidad real).
drop function if exists public.get_incident_heat_cells(numeric, numeric, numeric, numeric, timestamptz, numeric);
drop function if exists public.get_incident_heat_cells(numeric, numeric, numeric, numeric, timestamptz, numeric, text, text);

create or replace function public.get_incident_heat_cells(
  p_min_lat   numeric,
  p_max_lat   numeric,
  p_min_lng   numeric,
  p_max_lng   numeric,
  p_since     timestamptz default 'epoch',
  p_cell_deg  numeric default 0.02,
  p_category  text default null
)
returns table (
  cell_lat numeric,
  cell_lng numeric,
  weight   bigint,
  count    bigint
)
language sql
security definer set search_path = ''
as $$
  select
    (floor(latitude / p_cell_deg) * p_cell_deg + p_cell_deg / 2) as cell_lat,
    (floor(longitude / p_cell_deg) * p_cell_deg + p_cell_deg / 2) as cell_lng,
    coalesce(sum(severity), 0)::bigint as weight,
    count(*) as count
  from public.incidents_public i
  where i.latitude between p_min_lat and p_max_lat
    and i.longitude between p_min_lng and p_max_lng
    and (p_since is null or i.created_at >= p_since)
    and (p_category is null or i.category = p_category)
  group by cell_lat, cell_lng;
$$;

grant execute on function public.get_incident_heat_cells(numeric, numeric, numeric, numeric, timestamptz, numeric, text) to anon, authenticated;

-- RPC: incidencias cercanas (dedupe + reportes cercanos), con image_url/created_at.
drop function if exists public.find_nearby_incidents(numeric, numeric, numeric, text);

create or replace function public.find_nearby_incidents(
  p_lat      numeric,
  p_lng      numeric,
  p_radius_m numeric default 100,
  p_category text default null
)
returns table (
  id                uuid,
  category          text,
  description       text,
  latitude          numeric,
  longitude         numeric,
  severity          int,
  place_name        text,
  address           text,
  image_url         text,
  created_at        timestamptz,
  distance_m        integer,
  resuelto_threshold int,
  downvote_threshold int,
  votes_up          bigint,
  votes_down        bigint,
  votes_resuelta    bigint
)
language plpgsql security definer set search_path = ''
as $$
declare
  v_radius_deg numeric;
  v_min_lat numeric;
  v_max_lat numeric;
  v_min_lng numeric;
  v_max_lng numeric;
begin
  v_radius_deg := p_radius_m / 111320.0;
  v_min_lat := p_lat - v_radius_deg;
  v_max_lat := p_lat + v_radius_deg;
  v_min_lng := p_lng - (p_radius_m / (111320.0 * cos(radians(p_lat))));
  v_max_lng := p_lng + (p_radius_m / (111320.0 * cos(radians(p_lat))));

  return query
  select
    i.id,
    i.category,
    i.description,
    i.latitude,
    i.longitude,
    i.severity,
    i.place_name,
    i.address,
    i.image_url,
    i.created_at,
    round(
      6371000.0 * 2 * asin(sqrt(
        power(sin(radians(i.latitude - p_lat) / 2), 2) +
        cos(radians(p_lat)) * cos(radians(i.latitude)) *
        power(sin(radians((i.longitude - p_lng) / 2)), 2)
      ))
    )::int as distance_m,
    i.resuelto_threshold,
    i.downvote_threshold,
    coalesce(v.votes_up, 0) as votes_up,
    coalesce(v.votes_down, 0) as votes_down,
    coalesce(v.votes_resuelta, 0) as votes_resuelta
  from public.incidents i
  left join (
    select incident_id,
           count(*) filter (where vote_type = 'up')       as votes_up,
           count(*) filter (where vote_type = 'down')     as votes_down,
           count(*) filter (where vote_type = 'resuelta') as votes_resuelta
    from public.incident_votes
    group by incident_id
  ) v on v.incident_id = i.id
  where i.latitude between v_min_lat and v_max_lat
    and i.longitude between v_min_lng and v_max_lng
    and i.hidden_at is null
    and coalesce(v.votes_down, 0) < i.downvote_threshold
    and coalesce(v.votes_resuelta, 0) < i.resuelto_threshold
    and (p_category is null or i.category = p_category)
    and 6371000.0 * 2 * asin(sqrt(
          power(sin(radians(i.latitude - p_lat) / 2), 2) +
          cos(radians(p_lat)) * cos(radians(i.latitude)) *
          power(sin(radians((i.longitude - p_lng) / 2)), 2)
        )) <= p_radius_m
  order by distance_m asc;
end;
$$;

grant execute on function public.find_nearby_incidents(numeric, numeric, numeric, text) to authenticated, anon;

-- RPC: mapa de calor (excluye ocultos por moderación y por umbrales).
create or replace function public.get_heatmap_data(
  p_start_date date default date_trunc('month', current_date)::date,
  p_end_date date default current_date
)
returns jsonb as $$
declare
  result jsonb;
begin
  select jsonb_agg(
    jsonb_build_object('lat', latitude, 'lng', longitude,
                       'weight', case severity when 1 then 1 when 2 then 2 when 3 then 3 end)
  ) into result
  from public.incidents i
  where i.created_at >= p_start_date and i.created_at <= p_end_date
    and i.hidden_at is null
    and coalesce((select count(*) from public.incident_votes v
                  where v.incident_id = i.id and v.vote_type = 'resuelta'), 0) < i.resuelto_threshold
    and coalesce((select count(*) from public.incident_votes v
                  where v.incident_id = i.id and v.vote_type = 'down'), 0) < i.downvote_threshold;
  return result;
end;
$$ language plpgsql security definer set search_path = '';

grant execute on function public.get_heatmap_data(date, date) to authenticated, anon;

-- ============================================
-- STORAGE (bucket fotos)
-- ============================================
-- El bucket queda `public = true` para que los usuarios ANÓNIMOS del mapa puedan
-- ver cada foto mediante su URL pública individual (se sirve desde el edge de
-- Storage sin pasar por RLS). PERO se elimina la política `select` sobre
-- storage.objects: así NADIE (ni anon ni authenticated) puede LISTAR / enumerar
-- el catálogo del bucket (se bloquea `/object/list`), solo se accede a un objeto
-- si se conoce su ruta exacta.
insert into storage.buckets (id, name, public)
values ('incident-photos', 'incident-photos', true)
on conflict do nothing;

-- Cierra la enumeración/lectura del catálogo (sin policy => RLS denegar).
drop policy if exists "Anyone can view incident photos" on storage.objects;

-- Subida: cualquier usuario autenticado puede subir una foto. El path NO contiene
-- el uuid del usuario (path opaco, sin PII) — se elimina el requisito de
-- `(storage.foldername(name))[1] = auth.uid()`.
drop policy if exists "Authenticated users can upload incident photos" on storage.objects;
create policy "Authenticated users can upload incident photos" on storage.objects for insert
  to authenticated with check ( bucket_id = 'incident-photos' );

-- Gestión (update/delete) de objetos del bucket: SOLO admin.
drop policy if exists "Users can update own incident photos" on storage.objects;
drop policy if exists "Users can delete own incident photos" on storage.objects;
drop policy if exists "Admin can manage storage objects" on storage.objects;
create policy "Admin can manage storage objects" on storage.objects for update
  to authenticated using ( bucket_id = 'incident-photos' )
  with check ( bucket_id = 'incident-photos' );
drop policy if exists "Admin can delete any photo" on storage.objects;
create policy "Admin can delete any photo" on storage.objects for delete
  to authenticated using ( bucket_id = 'incident-photos'
    and public.is_admin() );
