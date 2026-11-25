-- ============================================================
-- VERIFICACIÓN DE SEGURIDAD (SOLO LECTURA) — Movimap
-- ------------------------------------------------------------
-- Objetivo: confirmar en el proyecto Supabase real que el
-- endurecimiento de ISO/IEC 27001 quedó aplicado. No modifica nada.
--
-- USO: pégalo en el SQL Editor y ejecútalo. Interpreta cada bloque.
-- ============================================================

-- 1) Bucket de fotos: NO debe existir una política `select` para anon/public
--    que permita listar/enumerar el catálogo.
select 'storage.objects SELECT policies (debe ser VACÍO o solo de gestión) ' as check,
       p.policyname, p.roles, p.cmd
from pg_policies p
where p.schemaname = 'storage' and p.tablename = 'objects'
  and p.cmd = 'SELECT'
  and p.qual like '%incident-photos%';

-- 2) La vista pública NO debe exponer PII del autor.
select 'incidents_public columnas PII (debe ser VACÍO)' as check,
       column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'incidents_public'
  and column_name in ('created_by', 'hidden_by', 'hidden_reason', 'resolved_by');

-- 3) La vista admin (incidents_with_stats) filtra por autor/admin en su
--    definición (Supabase no soporta RLS sobre vistas). Debe referenciar
--    `created_by` y `auth.uid()`.
select 'incidents_with_stats filtra autor/admin (debe ser t)' as check,
       (position('created_by' in v.view_definition) > 0
        and position('auth.uid()' in v.view_definition) > 0) as filtra
from information_schema.views v
where v.table_schema = 'public' and v.table_name = 'incidents_with_stats';

-- 4) profiles: no debe haber política `select` para `public` (anon).
select 'profiles SELECT policies (no debe listar public/anon)' as check,
       p.policyname, p.roles, p.cmd
from pg_policies p
where p.schemaname = 'public' and p.tablename = 'profiles'
  and p.cmd = 'SELECT';

-- 5) Trigger anti-escalada de rol/email en profiles.
select 'guard_profile_update trigger (debe existir)' as check,
       exists (
         select 1 from pg_trigger t
         join pg_class c on c.oid = t.tgrelid
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relname = 'profiles'
           and t.tgname = 'on_profile_guard'
       ) as existe;

-- 6) Funciones `security definer` SIN `search_path` endurecido (debe ser VACÍO).
select 'security definer sin search_path (debe ser VACÍO)' as check,
       p.oid::regprocedure as funcion
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and (p.proconfig is null
       or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path%'));

-- 7) Columna storage_path en incidents.
select 'incidents.storage_path (debe existir)' as check,
       column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'incidents'
  and column_name = 'storage_path';

-- 8) Rol bi_reader: existe, puede hacer login y tiene SELECT en las 4 vistas BI.
--    Esperado: existe=t, login=t, y los 4 has_*_privilege = t.
--    Si algún has_*_privilege = f, re-ejecuta los grants (see 17/21/00_esquema_actual).
select 'bi_reader privileges (esperado: todo t)' as check,
       exists (select 1 from pg_roles where rolname = 'bi_reader') as existe,
       (select rolcanlogin from pg_roles where rolname = 'bi_reader') as login,
       has_schema_privilege('bi_reader', 'bi', 'USAGE') as bi_usage,
       has_table_privilege('bi_reader', 'bi.incident_daily', 'SELECT') as select_incident_daily,
       has_table_privilege('bi_reader', 'bi.incident_reports_daily', 'SELECT') as select_reports_daily,
       has_table_privilege('bi_reader', 'public.analytics_incident_daily', 'SELECT') as select_analytics_incident,
       has_table_privilege('bi_reader', 'public.analytics_incident_reports_daily', 'SELECT') as select_analytics_reports;

-- 9) Usuarios de login con el rol bi_reader (bi_demo / bi_analista / ..., incluido bi_reader).
select 'login users with bi_reader (debe haber al menos uno)' as check,
       m.member::regrole as usuario
from pg_auth_members m
join pg_roles gr on gr.oid = m.roleid
where gr.rolname = 'bi_reader'
order by 2;
