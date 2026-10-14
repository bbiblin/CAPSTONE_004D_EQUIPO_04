-- ============================================================
-- migraciones/nuevo/17_bi_geo_temporal.sql
-- Ampliación de la capa BI con dimensiones geográficas y temporales
-- ------------------------------------------------------------
-- Objetivo:
--   1. Persistir en `public.incidents` la geografía administrativa
--      de Chile (país → región → provincia → comuna) y el desglose
--      de la dirección (calle, número, barrio), capturados con
--      reverse-geocoding (Nominatim) al momento de reportar.
--   2. Exponer en las vistas BI la dimensión temporal del reporte
--      (timestamp completo + hora / día de la semana / mes / semana,
--      en zona horaria America/Santiago), además de
--      `estimated_duration`.
--
-- Jerarquía administrativa local (Chile), a diferencia de una
-- convención global "city":
--   * región    : Región Metropolitana de Santiago
--   * provincia : Provincia de Santiago
--   * comuna    : Quilicura, Nuñoa, Puente Alto, La Reina, Providencia...
--   * ciudad    : colapsable (Santiago abarca varias provincias) → NO se
--                 captura; el nivel útil para BI es la comuna.
--
-- Mapeo desde el objeto `address` de Nominatim (addressdetails=1):
--   * state  -> region
--   * county -> province
--   * city / town / village / municipality -> comuna
--   * suburb / neighbourhood / quarter     -> neighbourhood (barrio)
--   * road                                 -> street
--   * house_number                         -> house_number
--   * country                              -> country
--
-- Idempotente: seguro de re-ejecutar.
-- ============================================================

-- ============================================
-- 1) COLUMNAS de geografía administrativa + dirección
-- ============================================
alter table public.incidents
  add column if not exists country       text,
  add column if not exists region        text,
  add column if not exists province      text,
  add column if not exists comuna        text,
  add column if not exists neighbourhood text,
  add column if not exists street        text,
  add column if not exists house_number  text;

comment on column public.incidents.country is
  'País del reporte (p. ej. Chile). Capturado con reverse-geocoding al reportar.';
comment on column public.incidents.region is
  'Región administrativa de Chile (p. ej. Región Metropolitana de Santiago).';
comment on column public.incidents.province is
  'Provincia de Chile (nivel intermedio) (p. ej. Provincia de Santiago).';
comment on column public.incidents.comuna is
  'Comuna administrada por un alcalde/municipio (p. ej. Providencia, Quilicura, Puente Alto).';
comment on column public.incidents.neighbourhood is
  'Barrio / localidad / suburbio (p. ej. el suburbio o neighbourhood).';
comment on column public.incidents.street is
  'Calle del reporte (de la dirección desglosada).';
comment on column public.incidents.house_number is
  'Número de la calle (de la dirección desglosada).';

-- ============================================
-- 2) DROP de vistas en orden de dependencias
--    Necesario porque se agregan columnas (create or replace no lo permite).
--    Las vistas espejo `public.analytics_*` dependen de las `bi.*`, por lo que
--    se dropean ANTES que sus dependencias.
-- ============================================
drop view if exists public.analytics_incident_daily;
drop view if exists public.analytics_incident_reports_daily;
drop view if exists bi.incident_daily;
drop view if exists bi.incident_reports_daily;

-- ============================================
-- 3) VISTA BI `bi.incident_daily`
--    + geografía admin, dirección desglosada, estimated_duration
--    + dimensión temporal (zona America/Santiago)
-- ============================================
create schema if not exists bi;

create or replace view bi.incident_daily
with (security_invoker = false) as
select
  i.id                       as incident_id,
  i.category,
  i.severity,
  i.status,
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
-- 4) VISTA BI `bi.incident_reports_daily` (denuncias anonimizadas)
--    + contexto geográfico y de duración de la incidencia
-- ============================================
create or replace view bi.incident_reports_daily
with (security_invoker = false) as
select
  r.id                as report_id,
  r.incident_id,
  i.category,
  i.severity,
  i.estimated_duration,
  i.status            as incident_status,
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
left join public.incidents i on i.id = r.incident_id;

-- ============================================
-- 5) VISTA espejo en `public` para exportación vía PostgREST
-- ============================================
create or replace view public.analytics_incident_daily
with (security_invoker = true) as
select * from bi.incident_daily;

create or replace view public.analytics_incident_reports_daily
with (security_invoker = true) as
select * from bi.incident_reports_daily;

-- ============================================
-- 6) GRANTS (se perdieron con el `drop view`)
--    Solo service_role y bi_reader leen; anon/authenticated revocados.
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

-- Otorga acceso a `bi_reader` solo si el rol existe (se crea en 14).
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
