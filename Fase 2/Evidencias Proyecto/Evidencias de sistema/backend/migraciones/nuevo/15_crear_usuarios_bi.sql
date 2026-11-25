-- ============================================
-- 15_crear_usuarios_bi.sql
-- Usuarios de LOGIN con rol `bi_reader` (lectura BI)
-- ------------------------------------------------------------
-- Deja definir la contraseña de forma segura (no hardcodeada) y permite crear
-- UNO O MÁS usuarios con el rol `bi_reader` para el dashboard / Power BI.
--
-- La contraseña del usuario demo se toma del GUC `app.bi_password` (igual que
-- en 14). Para crear usuarios adicionales se lista un JSON en `app.bi_users`.
--
-- Ejemplos (pegarlas ANTES de ejecutar este script, misma sesión):
--
--   select set_config('app.bi_password', '<TU-CONTRASEÑA-FUERTE>', false);
--
--   -- Uno o más usuarios (opcional; cada uno define su propia contraseña):
--   select set_config('app.bi_users',
--     '[{"username":"bi_demo","password":"<pass1>"},
--       {"username":"bi_analista","password":"<pass2>"}]', false);
--
-- Si `app.bi_users` NO se define, se crea un único usuario `bi_demo` con
-- `app.bi_password`. Todos los usuarios creados tendrán el rol `bi_reader`
-- (solo lectura sobre las vistas BI) y SIN privilegios de escritura/DDL.
-- Requiere ejecutar antes `14_bi_reader_role.sql`.
-- ============================================

do $$
declare
  v_pw       text := current_setting('app.bi_password', true);
  v_users    jsonb := coalesce(current_setting('app.bi_users', true)::jsonb, 'null'::jsonb);
  u          jsonb;
  v_username text;
  v_upw      text;
begin
  -- Contraseña por defecto para el fallback `bi_demo`.
  if v_pw is null or v_pw = '' then
    raise exception 'Definí la contraseña antes de ejecutar: select set_config(''app.bi_password'', ''<TU-CONTRASEÑA>'', false);';
  end if;

  -- Si no se listaron usuarios, se crea `bi_demo` con la contraseña principal.
  if v_users is null or jsonb_array_length(v_users) = 0 then
    v_users := jsonb_build_array(jsonb_build_object('username', 'bi_demo', 'password', v_pw));
  end if;

  for u in select * from jsonb_array_elements(v_users) loop
    v_username := coalesce(u->>'username', '');
    v_upw      := u->>'password';
    if v_username = '' or v_upw is null or v_upw = '' then
      raise exception 'Cada usuario de app.bi_users debe tener "username" y "password".';
    end if;

    if exists (select 1 from pg_roles where rolname = v_username) then
      -- No se tocan atributos de superusuario (requeriría ser superusuario).
      execute format(
        'alter role %I with login password %L in role %I',
        v_username, v_upw, 'bi_reader'
      );
    else
      execute format(
        'create role %I login nosuperuser nocreatedb nocreaterole nobypassrls password %L in role %I',
        v_username, v_upw, 'bi_reader'
      );
    end if;
    raise notice 'Usuario BI creado/actualizado: %', v_username;
  end loop;
end $$;

-- Asegurar permisos de lectura para los roles con rol `bi_reader` (los heredan).
grant usage on schema bi to bi_reader;
grant select on bi.incident_daily to bi_reader;
grant select on public.analytics_incident_daily to bi_reader;

-- ------------------------------------------------------------------
-- Uso para Power BI (conexión Postgres):
--   host: <proyecto>.supabase.co   port: 5432  dbname: postgres
--   user: bi_demo (o el creado)    password: la definida arriba
-- ------------------------------------------------------------------
