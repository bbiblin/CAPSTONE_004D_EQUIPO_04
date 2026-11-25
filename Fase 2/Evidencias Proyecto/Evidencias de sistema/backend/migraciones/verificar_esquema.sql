-- ============================================================
-- VERIFICACIÓN (SOLO LECTURA) del esquema real de Movimap
-- ------------------------------------------------------------
-- Objetivo: confirmar que la base de producción ya refleja el
-- ESTADO FINAL del modelo (sin `status`, con moderación y
-- `downvote_threshold`), es decir, que `00_esquema_actual.sql`
-- (versión canónica final) coincide con lo aplicado.
--
-- USO: pégalo en el SQL Editor de Supabase (o `psql`) y ejecútalo.
-- No modifica nada: solo hace SELECT/consultas de catálogo.
-- ============================================================

-- 1) ¿Existe la columna `status` en incidents? (debería ser NO)
select 'incidents.status' as check,
       case when exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'incidents' and column_name = 'status'
       ) then 'PRESENTE (problema)' else 'AUSENTE (ok)' end as resultado;

-- 2) Columnas de moderación y umbrales (deberían existir todas)
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'incidents'
  and column_name in ('hidden_at', 'hidden_by', 'hidden_reason', 'downvote_threshold', 'resuelto_threshold')
order by column_name;

-- 3) ¿Existe la vista incidents_public y sus vistas BI?
--    `table_type` vive en information_schema.tables (no en .views).
select table_name, table_type
from information_schema.tables
where table_schema = 'public' and table_name in ('incidents_public', 'incidents_with_stats', 'analytics_incident_daily', 'analytics_incident_reports_daily')
union all
select table_name, table_type
from information_schema.tables
where table_schema = 'bi' and table_name in ('incident_daily', 'incident_reports_daily');

-- 4) Firmas de los RPCs finales (deben existir; no debe haber versión vieja con `status`)
select p.oid::regprocedure as firma,
       p.provolatile as volatile
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_incidents_in_bounds', 'get_incident_heat_cells', 'find_nearby_incidents', 'get_heatmap_data', 'accept_terms')
order by p.proname, p.oid::regprocedure::text;

-- 5) ¿Los RPCs devuelven la columna `image_url` en find_nearby_incidents? (debería tener)
select count(*) as cols_from_find_nearby
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral unnest(p.proargnames) t(argname)
where n.nspname = 'public' and p.proname = 'find_nearby_incidents'
  and t.argname = 'image_url';

-- 6) Grants a `bi_reader` sobre las vistas BI
select has_schema_privilege('bi_reader', 'bi', 'USAGE') as bi_reader_usage,
       has_table_privilege('bi_reader', 'bi.incident_daily', 'SELECT') as bi_reader_select_incident,
       has_table_privilege('bi_reader', 'bi.incident_reports_daily', 'SELECT') as bi_reader_select_reports;

-- 7) ¿El rol bi_reader existe?
select exists (select 1 from pg_roles where rolname = 'bi_reader') as rol_bi_reader_existe;

-- 8) Columnas de consentimiento de términos en profiles (deberían existir)
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('terms_version', 'accepted_terms_at', 'accepted_photo_consent_at')
order by column_name;
