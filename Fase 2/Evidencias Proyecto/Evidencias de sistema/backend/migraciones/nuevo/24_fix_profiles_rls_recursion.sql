-- ============================================================
-- migraciones/nuevo/24_fix_profiles_rls_recursion.sql
-- FIX (ISO 27001): elimina la INFINITA RECURSIÓN de RLS en `profiles`.
-- ------------------------------------------------------------
-- Problema:
--   La política de SELECT de `profiles` se auto-referenciaba:
--       using (auth.uid() = id
--              or exists (select 1 from public.profiles
--                         where id = auth.uid() and role = 'admin'))
--   Al consultar `profiles` como usuario autenticado, Postgres intenta
--   evaluar la subquery sobre la MISMA tabla, lo que provoca
--   "infinite recursion detected in policy for relation profiles" y
--   PostgREST responde **HTTP 500**. Como `getProfile()` hace un SELECT
--   de `profiles` tras iniciar sesión, el app recibe 500 -> el perfil se
--   ve como no logueado (aunque GoTrue sí emitió el token).
--   El mismo patrón aparecía en las comprobaciones de rol `admin` de otras
--   políticas (incidents, incident_votes, incident_reports, audit_log,
--   terms_acceptance_log, storage.objects) y en la vista incidents_with_stats.
--
-- Solución:
--   Helper `public.is_admin()` (SECURITY DEFINER) que consulta `profiles`
--   como dueño (sin re-aplicar RLS), evitando la recursión. Todas las
--   comprobaciones de rol `admin` pasan a usar `public.is_admin()`.
--
-- Idempotente (create or replace / drop policy if exists).
-- Aplicable a bases existentes y ya contemplado en 00_esquema_actual.sql
-- y 18_terms_consent.sql.
-- ============================================================

-- ============================================
-- 1) Helper is_admin() (SECURITY DEFINER, sin recursión)
-- ============================================
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

-- ============================================
-- 2) Recrear políticas con comprobación de rol `admin` (usando is_admin)
-- ============================================

-- profiles
drop policy if exists "Users can view own or admin profiles" on public.profiles;
create policy "Users can view own or admin profiles" on public.profiles for select to authenticated
  using (auth.uid() = id or public.is_admin());
drop policy if exists "Admin can update any profile" on public.profiles;
create policy "Admin can update any profile" on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- incidents
drop policy if exists "Owner or admin can view incidents" on public.incidents;
create policy "Owner or admin can view incidents" on public.incidents for select to authenticated
  using (auth.uid() = created_by or public.is_admin());
drop policy if exists "Admin can update any incident" on public.incidents;
create policy "Admin can update any incident" on public.incidents for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
drop policy if exists "Admin can delete incidents" on public.incidents;
create policy "Admin can delete incidents" on public.incidents for delete to authenticated
  using (public.is_admin());

-- incident_votes
drop policy if exists "Owner or admin can view votes" on public.incident_votes;
create policy "Owner or admin can view votes" on public.incident_votes for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- incident_reports
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
drop policy if exists "Only admin can view audit log" on public.audit_log;
create policy "Only admin can view audit log" on public.audit_log for select to authenticated
  using (public.is_admin());

-- terms_acceptance_log (si la tabla existe; la crea 18_terms_consent.sql)
drop policy if exists "Only admin can view terms log" on public.terms_acceptance_log;
create policy "Only admin can view terms log" on public.terms_acceptance_log
  for select to authenticated
  using (public.is_admin());

-- storage.objects (gestión de fotos: solo admin)
drop policy if exists "Admin can delete any photo" on storage.objects;
create policy "Admin can delete any photo" on storage.objects for delete
  to authenticated using ( bucket_id = 'incident-photos'
    and public.is_admin() );

-- ============================================
-- 3) Recrear vista incidents_with_stats (usa is_admin en su definición)
--    Para poder `create or replace` una vista cuya lista de columnas no varía
--    es válido; en caso de restricción del motor, se recrea tras drop.
-- ============================================
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
where auth.uid() = i.created_by
   or public.is_admin();

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

-- Re-aplicar los grants de las vistas (al recrearlas se pierden)
revoke all on public.incidents_public from public;
grant select on public.incidents_public to anon, authenticated;
revoke all on public.incidents_with_stats from public, anon;
grant select on public.incidents_with_stats to authenticated;
