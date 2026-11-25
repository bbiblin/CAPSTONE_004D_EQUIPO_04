-- ============================================
-- 14_bi_reader_role.sql
-- Rol de SOLO LECTURA para Business Intelligence
-- ------------------------------------------------------------
-- Usuario de base de datos dedicado para Power BI / clientes Postgres.
-- No puede escribir datos ni alterar el esquema.
-- NO usar el usuario `postgres` (superusuario) para BI.
--
-- IMPORTANTE (SEGURIDAD): la contraseña NO está hardcodeada en el repositorio.
-- Se define al ejecutar mediante un GUC de sesión. Pega ANTES (en la misma
-- sesión / SQL Editor) la línea:
--
--     select set_config('app.bi_password', '<TU-CONTRASEÑA-FUERTE>', false);
--
-- Si no se define, el script falla con un mensaje claro (NO crea el rol con una
-- contraseña débil o por defecto).
-- ============================================

-- 1) Crear el rol (LOGIN + sin privilegios de escritura/DDL) con la contraseña definida.
--    Se usa SQL dinámico porque CREATE ROLE no acepta expresiones en PASSWORD.
do $$
declare
  v_pw text := current_setting('app.bi_password', true);
begin
  if v_pw is null or v_pw = '' then
    raise exception 'Definí la contraseña antes de ejecutar: select set_config(''app.bi_password'', ''<TU-CONTRASEÑA>'', false);';
  end if;

  if exists (select 1 from pg_roles where rolname = 'bi_reader') then
    -- Si el rol ya existe, NO se tocan atributos de superusuario (NOSUPERUSER
    -- requiere ser superusuario). Solo se actualizan login + password.
    execute format(
      'alter role %I with login password %L',
      'bi_reader', v_pw
    );
  else
    execute format(
      'create role %I login nosuperuser nocreatedb nocreaterole nobypassrls password %L',
      'bi_reader', v_pw
    );
  end if;
end $$;

-- 2) Acceso de solo lectura a las vistas analíticas (producto de datos)
grant usage on schema bi to bi_reader;
grant select on bi.incident_daily to bi_reader;

grant usage on schema public to bi_reader;
grant select on public.analytics_incident_daily to bi_reader;

-- 3) Las vistas de BI se ejecutan como su dueño (security definer), de modo que
--    bi_reader NO necesita (ni puede) acceder a las tablas base
--    (incident_reports, profiles, incidents, etc.): solo ve la vista agregada.
alter view bi.incident_daily set (security_invoker = false);

-- ------------------------------------------------------------------
-- Verificación rápida (opcional, en SQL Editor):
--   select * from bi.incident_daily;          -- como postgres funciona
-- El rol bi_reader NO puede hacer DML/DDL en ninguna tabla.
-- ------------------------------------------------------------------
