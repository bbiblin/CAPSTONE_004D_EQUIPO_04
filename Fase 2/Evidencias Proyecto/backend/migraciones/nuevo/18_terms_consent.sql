-- ============================================================
-- migraciones/nuevo/18_terms_consent.sql
-- Consentimiento de Términos y Condiciones + consentimiento de
-- fotografías para usuarios finales.
-- ------------------------------------------------------------
-- Objetivo:
--   1. Registrar en `public.profiles` la fecha/versión de
--      términos aceptados y el consentimiento de fotografías.
--   2. Guardar un historial auditable de consentimiento.
--   3. Endurecer la RLS para que NADIE pueda aportar datos
--      (crear reporte / votar / denunciar) sin haber aceptado
--      los términos, y no pueda subir fotografías sin el
--      consentimiento fotográfico. Esto evita que se eluda el
--      frontend (requerimiento de robustez).
-- Idempotente.
-- ============================================================

-- ============================================
-- 1. Columnas de consentimiento en profiles
-- ============================================
alter table public.profiles
  add column if not exists terms_version             text,
  add column if not exists accepted_terms_at         timestamptz,
  add column if not exists accepted_photo_consent_at timestamptz;

comment on column public.profiles.terms_version is
  'Versión de Términos y Condiciones aceptada por el usuario (null si no ha aceptado).';
comment on column public.profiles.accepted_terms_at is
  'Fecha en que el usuario aceptó los Términos y Condiciones generales.';
comment on column public.profiles.accepted_photo_consent_at is
  'Fecha en que el usuario consintió la cesión/publicación de fotografías.';

-- ============================================
-- 2. Tabla de auditoría de consentimiento
-- ============================================
create table if not exists public.terms_acceptance_log (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references public.profiles(id) on delete cascade,
  terms_version            text        not null,
  accepted_terms_at        timestamptz,
  accepted_photo_consent_at timestamptz,
  source                   text        not null default 'registration'
                           check (source in ('registration', 'profile')),
  created_at               timestamptz not null default now()
);

create index if not exists idx_terms_log_user on public.terms_acceptance_log (user_id);
create index if not exists idx_terms_log_created on public.terms_acceptance_log (created_at);

alter table public.terms_acceptance_log enable row level security;

drop policy if exists "Only admin can view terms log" on public.terms_acceptance_log;
create policy "Only admin can view terms log" on public.terms_acceptance_log
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================
-- 3. Trigger de alta de usuario (consiente al registrarse)
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_accept_terms boolean;
  v_accept_photo boolean;
  v_version     text;
begin
  v_accept_terms := coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean, false);
  v_accept_photo := coalesce((new.raw_user_meta_data->>'photo_consent')::boolean, false);
  v_version      := coalesce(new.raw_user_meta_data->>'terms_version', '1.0');

  insert into public.profiles
    (id, email, display_name, role, terms_version, accepted_terms_at, accepted_photo_consent_at)
  values
    (new.id, new.email,
     coalesce(new.raw_user_meta_data->>'display_name', 'Usuario'),
     'user',
     case when v_accept_terms or v_accept_photo then v_version else null end,
     case when v_accept_terms then now() else null end,
     case when v_accept_photo then now() else null end);

  if v_accept_terms or v_accept_photo then
    insert into public.terms_acceptance_log
      (user_id, terms_version, accepted_terms_at, accepted_photo_consent_at, source)
    values
      (new.id, v_version,
       case when v_accept_terms then now() else null end,
       case when v_accept_photo then now() else null end,
       'registration');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- 4. Función para aceptar/actualizar consentimiento (usuarios existentes)
-- ============================================
create or replace function public.accept_terms(
  p_terms_version text,
  p_accept_terms  boolean,
  p_accept_photo  boolean
)
returns void
language plpgsql security definer
as $$
begin
  update public.profiles
  set terms_version              = p_terms_version,
      accepted_terms_at          = case when p_accept_terms then now() else accepted_terms_at end,
      accepted_photo_consent_at  = case when p_accept_photo then now() else accepted_photo_consent_at end,
      updated_at                 = now()
  where id = auth.uid();

  if p_accept_terms or p_accept_photo then
    insert into public.terms_acceptance_log
      (user_id, terms_version, accepted_terms_at, accepted_photo_consent_at, source)
    values
      (auth.uid(), p_terms_version,
       case when p_accept_terms then now() else null end,
       case when p_accept_photo then now() else null end,
       'profile');
  end if;
end;
$$;

grant execute on function public.accept_terms(text, boolean, boolean) to authenticated;

-- ============================================
-- 5. Endurecer la RLS: imposible aportar datos sin consentimiento
--    * incidentes: exige términos + consentimiento de fotos si sube imagen
--    * votos:      exige términos
--    * denuncias:  exige términos
-- ============================================

-- incidents — insert (crear reporte)
drop policy if exists "Authenticated users can create incidents" on public.incidents;
create policy "Authenticated users can create incidents" on public.incidents
  for insert to authenticated
  with check (
    auth.uid() = created_by
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.accepted_terms_at is not null)
    and (
      image_url is null
      or exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.accepted_photo_consent_at is not null)
    )
  );

-- incident_votes — insert (votar)
drop policy if exists "Users can create own votes" on public.incident_votes;
create policy "Users can create own votes" on public.incident_votes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.accepted_terms_at is not null)
  );

-- incident_reports — insert (denunciar)
drop policy if exists "Users can create own reports" on public.incident_reports;
create policy "Users can create own reports" on public.incident_reports
  for insert to authenticated
  with check (
    auth.uid() = reported_by
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.accepted_terms_at is not null)
  );
