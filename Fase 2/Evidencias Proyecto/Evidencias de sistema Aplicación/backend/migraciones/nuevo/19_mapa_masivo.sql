-- ============================================================
-- migraciones/nuevo/19_mapa_masivo.sql
-- Mapa con datos masivos: carga por viewport (bounds)
-- ------------------------------------------------------------
-- Objetivo: permitir que el mapa renderice miles de reportes sin
-- degradarse. El frontend carga únicamente los reportes del área
-- visible (viewport) en lugar de pedir todos con un `limit` fijo.
--
-- Aporta un único RPC:
--   * `get_incidents_in_bounds(...)`: reportes dentro de un bounding
--     box (minLat/maxLat/minLng/maxLng) con filtros opcionales de
--     categoría / estado y un tope (limit). Respeta el ocultamiento
--     automático (umbral de downvotes/resuelta) porque consulta la
--     vista `incidents_public`, y excluye `rechazado`/`expirado`.
--
-- No altera las vistas BI (`bi.incident_daily` / `bi.incident_reports_daily`)
-- ni el rol `bi_reader`: el trabajo es solo sobre la capa de visualización.
--
-- Idempotente: seguro de re-ejecutar (`create or replace`, `drop ... if
-- exists`, `create index if not exists`, grants sin duplicar).
-- ============================================================

-- ============================================
-- RPC: incidencias dentro de un bounding box
-- ============================================
drop function if exists public.get_incidents_in_bounds(numeric, numeric, numeric, numeric, text, text, int);

create or replace function public.get_incidents_in_bounds(
  p_min_lat numeric,
  p_max_lat numeric,
  p_min_lng numeric,
  p_max_lng numeric,
  p_category text default null,
  p_status   text default null,
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
    and (p_category is null or i.category = p_category)
    and (p_status   is null or i.status   = p_status)
  order by i.created_at desc
  limit p_limit;
$$;

grant execute on function public.get_incidents_in_bounds(numeric, numeric, numeric, numeric, text, text, int) to anon, authenticated;

-- ============================================
-- ÍNDICE para el patrón de consulta por rango
-- ============================================
create index if not exists idx_incidents_bounds
  on public.incidents (status, latitude, longitude);
