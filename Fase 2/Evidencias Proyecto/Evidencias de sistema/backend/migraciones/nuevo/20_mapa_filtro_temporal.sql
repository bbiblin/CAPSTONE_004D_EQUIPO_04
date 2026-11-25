-- ============================================================
-- migraciones/nuevo/20_mapa_filtro_temporal.sql
-- Eficiencia del mapa: filtro temporal + agregados por celda
-- ------------------------------------------------------------
-- Objetivo (contrasta con 19_mapa_masivo.sql):
--   1. Fase 1: el mapa por defecto muestra un subconjunto temporal
--      (último mes). `get_incidents_in_bounds` acepta `p_since` y
--      filtra por `created_at`, reduciendo filas a pintar y el
--      tiempo del fetch.
--   2. Fase 3: `get_incident_heat_cells(...)` agrega los reportes de
--      la zona en una grilla lat/lng y devuelve una fila por celda
--      (`weight` = suma de severidad, `count`). Así el heatmap a zoom
--      bajo refleja el total real de la zona (aunque supere 500),
--      no un tope arbitrario.
--
-- Regla de oro: NO hay polling. El canal realtime (WebSocket) solo
-- empuja; el filtro por fecha + viewport decide qué se pinta.
--
-- Idempotente: `create or replace`, `drop ... if exists`,
-- `create index if not exists`, `grant` sin duplicar.
-- ============================================================

-- ============================================
-- RPC: incidencias dentro de un bounding box
--      (+ ventana temporal `p_since`)
-- ============================================
-- Se eliminan AMBAS firmas: la anterior sin `p_since` y la nueva, para que
-- `create or replace` no deje una versión obsoleta/ambigua conviviendo.
drop function if exists public.get_incidents_in_bounds(numeric, numeric, numeric, numeric, text, text, int);
drop function if exists public.get_incidents_in_bounds(numeric, numeric, numeric, numeric, text, text, timestamptz, int);

create or replace function public.get_incidents_in_bounds(
  p_min_lat numeric,
  p_max_lat numeric,
  p_min_lng numeric,
  p_max_lng numeric,
  p_category text default null,
  p_status   text default null,
  p_since    timestamptz default 'epoch',
  p_limit    int  default 500
)
returns table (
  id                uuid,
  category          text,
  severity          int,
  status            text,
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
    i.status,
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
    and (p_status   is null or i.status   = p_status)
  order by i.created_at desc
  limit p_limit;
$$;

grant execute on function public.get_incidents_in_bounds(numeric, numeric, numeric, numeric, text, text, timestamptz, int) to anon, authenticated;

-- ============================================
-- ÍNDICE para el patrón temporal + por rango
-- ============================================
create index if not exists idx_incidents_bounds_created
  on public.incidents (created_at, latitude, longitude);

-- ============================================
-- RPC: agregados por celda para el heatmap (Fase 3)
--      Devuelve una fila por celda de la grilla visible, con
--      `weight` (suma de severidad) y `count` para pintar la
--      densidad real de la zona sin descargar cada reporte.
--      Acepta filtros opcionales de categoría / estado para que
--      el heatmap respete los mismos filtros que el listado.
-- ============================================
-- Se eliminan AMBAS firmas (la anterior sin filtros y la nueva),
-- para que `create or replace` no deje una versión obsoleta.
drop function if exists public.get_incident_heat_cells(numeric, numeric, numeric, numeric, timestamptz, numeric);
drop function if exists public.get_incident_heat_cells(numeric, numeric, numeric, numeric, timestamptz, numeric, text, text);

create or replace function public.get_incident_heat_cells(
  p_min_lat   numeric,
  p_max_lat   numeric,
  p_min_lng   numeric,
  p_max_lng   numeric,
  p_since     timestamptz default 'epoch',
  p_cell_deg  numeric default 0.02,  -- tamaño de celda en grados
  p_category  text default null,
  p_status    text default null
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
    and (p_status   is null or i.status   = p_status)
  group by cell_lat, cell_lng;
$$;

grant execute on function public.get_incident_heat_cells(numeric, numeric, numeric, numeric, timestamptz, numeric, text, text) to anon, authenticated;
