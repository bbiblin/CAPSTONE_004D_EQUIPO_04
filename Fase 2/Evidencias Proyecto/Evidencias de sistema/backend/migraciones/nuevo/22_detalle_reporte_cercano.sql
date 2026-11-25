-- ============================================
-- RPC `find_nearby_incidents`
--     Añade `image_url` y `created_at` para que el usuario pueda revisar
--     el detalle completo (foto y fecha) del reporte cercano desde el
--     formulario de reporte (dedupe). Recrea la función de la migración 21
--     agregando estas dos columnas; el resto de la lógica no cambia.
-- ============================================
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
