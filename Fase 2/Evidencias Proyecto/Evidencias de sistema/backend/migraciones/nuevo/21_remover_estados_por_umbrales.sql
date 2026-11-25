-- ============================================================
-- migraciones/nuevo/21_remover_estados_por_umbrales.sql
-- Reportes sin estados: visibilidad regida por umbrales + moderación
-- ------------------------------------------------------------
-- Objetivo: eliminar el concepto de `status` de los reportes
-- (`incidents`). La visibilidad para el usuario final se deriva de
-- los votos vs. umbrales y de la moderación del administrador:
--
--   * activo            : no oculto y sin superar umbral.
--   * inactivo_rechazo  : votes_down  >= downvote_threshold
--   * inactivo_resuelta : votes_resuelta >= resuelto_threshold
--   * oculto_moderacion : `hidden_at` fijado por un moderador.
--
-- Los 3 votos (up/down/resuelta) se conservan para la capa BI, y se
-- expone una columna derivada `visibility` en las vistas BI para
-- interpretar las notas de inactividad sin perder semántica.
--
-- Columnas:
--   * SE ELIMINA `incidents.status` (+ su índice y trigger de auditoría).
--   * SE AGREGA `incidents.hidden_at/hidden_by/hidden_reason`
--     (moderación del administrador).
--   * SE CONSERVAN `resolved_at/resolved_by` (pueden aportar a BI).
--
-- Idempotente: seguro de re-ejecutar.
-- ============================================================

-- ============================================
-- 1) AUDITORÍA DE ESTADO → MODERACIÓN
--    Se debe eliminar el trigger/función que dependen de `status`
--    ANTES de dropear la columna.
-- ============================================
drop trigger if exists on_incident_status_change on public.incidents;
drop function if exists public.log_status_change();

-- ============================================
-- 2) COLUMNAS DE MODERACIÓN
-- ============================================
alter table public.incidents
  add column if not exists hidden_at    timestamptz,
  add column if not exists hidden_by    uuid references public.profiles(id),
  add column if not exists hidden_reason text;

comment on column public.incidents.hidden_at is
  'Marca cuándo un moderador dio de baja (ocultó) el reporte. Si es NULL, no está oculto por moderación.';
comment on column public.incidents.hidden_by is
  'Perfil del moderador que dio de baja el reporte (se conserva junto al flag de moderación).';
comment on column public.incidents.hidden_reason is
  'Motivo de la baja/moderación (p. ej. denuncia fundamentada).';

-- Auditoría de moderación (reemplaza a log_status_change; depende de hidden_at).
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
$$ language plpgsql security definer;

drop trigger if exists on_incident_moderation on public.incidents;
create trigger on_incident_moderation
  after update on public.incidents
  for each row when (old.hidden_at is distinct from new.hidden_at)
  execute function public.log_moderation_change();

-- ============================================
-- 3) DROP de dependencias de `status` (columnas de vistas/RPCs)
--    Para poder dropear la columna de forma segura.
-- ============================================
drop view if exists public.analytics_incident_reports_daily;
drop view if exists public.analytics_incident_daily;
drop view if exists bi.incident_reports_daily;
drop view if exists bi.incident_daily;
drop view if exists public.incidents_public;
drop view if exists public.incidents_with_stats;

drop function if exists public.get_incidents_in_bounds(numeric, numeric, numeric, numeric, text, text, int);
drop function if exists public.get_incidents_in_bounds(numeric, numeric, numeric, numeric, text, text, timestamptz, int);
drop function if exists public.get_incident_heat_cells(numeric, numeric, numeric, numeric, timestamptz, numeric);
drop function if exists public.get_incident_heat_cells(numeric, numeric, numeric, numeric, timestamptz, numeric, text, text);
drop function if exists public.get_heatmap_data(date, date);
drop function if exists public.find_nearby_incidents(numeric, numeric, numeric, text);

-- ============================================
-- 4) DROP de índices sobre `status` y de la columna
-- ============================================
drop index if exists public.idx_incidents_status;
drop index if exists public.idx_incidents_bounds;

alter table public.incidents drop column if exists status;

-- Índice de bounds sin `status` (el RPC filtra por lat/lng).
create index if not exists idx_incidents_bounds
  on public.incidents (latitude, longitude);

-- ============================================
-- 5) VISTA `public.incidents_with_stats`
--    Solo conteos de votos + umbrales + moderación (sin score).
-- ============================================
create or replace view public.incidents_with_stats
with (security_invoker = true) as
select
  i.id, i.category, i.description, i.latitude, i.longitude, i.severity,
  i.observed_at, i.estimated_duration, i.image_url,
  i.place_name, i.address,
  i.created_by, i.created_at, i.updated_at, i.resolved_at, i.resolved_by,
  i.resuelto_threshold, i.downvote_threshold,
  i.hidden_at, i.hidden_by, i.hidden_reason,
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
) v on v.incident_id = i.id;

-- ============================================
-- 6) VISTA `public.incidents_public`
--    Ocultamiento automático por umbrales y por moderación.
-- ============================================
create or replace view public.incidents_public
with (security_invoker = true) as
select *
from public.incidents_with_stats
where hidden_at is null
  and votes_down    < downvote_threshold
  and votes_resuelta < resuelto_threshold;

-- ============================================
-- 7) VISTA BI `bi.incident_daily`
--    + columna derivada `visibility` (activo / inactivo_rechazo /
--      inactivo_resuelta / oculto_moderacion).
-- ============================================
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

-- ============================================
-- 8) VISTA BI `bi.incident_reports_daily` (denuncias anonimizadas)
--    + visibilidad derivada de la incidencia.
-- ============================================
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

-- ============================================
-- 9) VISTAS espejo en `public` (PostgREST no refleja `bi`)
-- ============================================
create or replace view public.analytics_incident_daily
with (security_invoker = true) as
select * from bi.incident_daily;

create or replace view public.analytics_incident_reports_daily
with (security_invoker = true) as
select * from bi.incident_reports_daily;

-- ============================================
-- 10) GRANTS
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
-- 11) RPC `get_incidents_in_bounds`
--     Sin `status`; consulta `incidents_public` (ya oculta por umbrales
--     y moderación). Firma: (bounds, category, since, limit).
-- ============================================
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
security definer
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

-- ============================================
-- 12) RPC `get_incident_heat_cells`
--     Sin `status`; agrega por celda sobre `incidents_public`.
-- ============================================
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
security definer
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

-- ============================================
-- 13) RPC `find_nearby_incidents`
--     Sin `status`; oculta por umbrales y moderación.
-- ============================================
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
  distance_m        integer,
  resuelto_threshold int,
  downvote_threshold int,
  votes_up          bigint,
  votes_down        bigint,
  votes_resuelta    bigint
)
language plpgsql security definer
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

-- ============================================
-- 14) RPC `get_heatmap_data`
--     Excluye ocultos por moderación y por umbrales.
-- ============================================
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
$$ language plpgsql security definer;

grant execute on function public.get_heatmap_data(date, date) to authenticated, anon;
