-- ============================================================
-- migraciones/nuevo/25_delete_account.sql
-- Eliminación de la cuenta del usuario (derecho a supresión).
-- ------------------------------------------------------------
-- Objetivo:
--   1. Permitir que un usuario autenticado elimine SU cuenta
--      (perfil + identidad + sesiones) de forma permanente.
--   2. Conservar los REPORTES (incidents) que creó: quedan activos
--      en la app y en la capa BI, solo se ANONIMIZA su autoría
--      (created_by -> NULL), ya que la app es anónima y la vista
--      pública incidents_public no expone al autor.
--   3. Eliminar los DATOS PERSONALES del usuario: perfil, email,
--      identidad (auth.identities), sesiones (auth.sessions),
--      consentimiento de términos y auditoría.
--   4. Eliminar los VOTOS y DENUNCIAS del usuario (opinión personal
--      que referencia public.profiles y no puede conservarse al
--      desaparecer el perfil).
--   5. Permitir RE-REGISTRO con el mismo email: se hace HARD DELETE
--      de `auth.users`, que en cascada borra `auth.identities` y
--      `auth.sessions` (email queda libre y el nuevo signUp vuelve a
--      enviar el email de confirmación). El trigger `handle_new_user`
--      recrea el perfil automáticamente al darse de alta.
-- Idempotente (create or replace / drop ... if exists / alter ... if exists).
-- ============================================================

-- ============================================
-- 1) Anonimización de autoría al borrar el perfil
-- ============================================
-- `created_by` pasa a ser NULLABLE y la FK a ON DELETE SET NULL: cuando se
-- borre el perfil (vía cascada de auth.users), el reporte se conserva y su
-- autor queda anonimizado (NULL). `hidden_by` / `resolved_by` (referencias a
-- perfiles) también pasan a SET NULL para no bloquear el borrado cuando el
-- usuario fue moderador/administrador.
alter table public.incidents
  alter column created_by drop not null;

alter table public.incidents
  drop constraint if exists incidents_created_by_fkey;
alter table public.incidents
  add constraint incidents_created_by_fkey
  foreign key (created_by) references public.profiles(id)
  on delete set null;

alter table public.incidents
  drop constraint if exists incidents_hidden_by_fkey;
alter table public.incidents
  add constraint incidents_hidden_by_fkey
  foreign key (hidden_by) references public.profiles(id)
  on delete set null;

alter table public.incidents
  drop constraint if exists incidents_resolved_by_fkey;
alter table public.incidents
  add constraint incidents_resolved_by_fkey
  foreign key (resolved_by) references public.profiles(id)
  on delete set null;

-- ============================================
-- 2) Función delete_my_account() (SECURITY DEFINER)
-- ============================================
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
  delete from public.incident_votes   where user_id    = v_uid;
  delete from public.incident_reports where reported_by = v_uid;
  delete from public.audit_log        where user_id    = v_uid;

  -- `terms_acceptance_log` se borra en cascada al eliminar el perfil.
  -- Los `incidents` del usuario se CONSERVAN; al borrar el perfil la FK
  -- `created_by ... on delete set null` deja su autoría anonimizada.

  -- HARD DELETE del usuario en auth (cascada: profiles, identities, sessions).
  -- El email queda libre y se puede volver a registrar.
  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
