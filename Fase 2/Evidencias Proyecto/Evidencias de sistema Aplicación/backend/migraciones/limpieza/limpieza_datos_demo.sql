-- ============================================================
-- migraciones/limpieza/limpieza_datos_demo.sql
-- Limpieza de datos de prueba / demo (reportes antiguos de otras
-- versiones) para dejar la base lista para datos reales.
-- ------------------------------------------------------------
-- ⚠️  DESTRUCTIVO: borra TODOS los datos de la capa transaccional
--     (reportes, votos, denuncias, auditoría) y las imágenes del
--     bucket de evidencia. NO toca el esquema, las políticas RLS
--     ni los perfiles/usuarios.
--
-- Qué borra:
--   * public.incidents          → reportes (cascade a votos/denuncias)
--   * public.incident_votes     → votos up/down/resuelta
--   * public.incident_reports   → denuncias
--   * public.audit_log          → auditoría
--   * storage.objects           → archivos del bucket incident-photos
--
-- Qué conserva:
--   * public.profiles y usuarios de auth (identidad/roles)
--   * Las vistas del esquema `bi` y `public.analytics_*` (quedan vacías
--     automáticamente, porque se derivan de `incidents`)
--   * La columna `downvote_threshold` y sus defaults (para datos nuevos)
--
-- NOTA: la capa BI (esquema `bi` + vistas espejo) NO se recrea aquí. Las
-- vistas son derivadas de las tablas transaccionales, por lo que al borrar
-- los reportes quedan vacías por sí solas. El esquema y las definiciones
-- canónicas viven en `backend/migraciones/nuevo/` (00/16/17): mantener aquí
-- una copia de las vistas provocaba que se revirtieran a una versión antigua
-- al ejecutar este script después de 17 (perdiendo geografía admin, dimensión
-- temporal y `estimated_duration`).
--
-- Idempotente: no falla si ya hay datos limpios.
-- ============================================================

BEGIN;

-- Auditoría primero (sin dependencias de FK).
delete from public.audit_log;

-- Denuncias y votos (tienen FK a incidents; da igual el orden al ser
-- on delete cascade, pero las borramos explícitamente por claridad).
delete from public.incident_reports;
delete from public.incident_votes;

-- Reportes (los votos/denuncias ya no dependen de ellos).
delete from public.incidents;

-- Imágenes de evidencia del bucket de fotos.
-- Supabase bloquea el borrado directo de `storage.objects` mediante el
-- trigger `protect_objects_delete`, y el rol del SQL Editor a veces no es
-- dueño de esa tabla para deshabilitar triggers. Por eso esta parte es
-- "best-effort": si no hay permisos, la salta con un aviso (NO aborta la
-- limpieza del resto). Si queda fuera, limpia las fotos manualmente desde
-- Storage / Storage API.
do $$
begin
  -- intento 1: deshabilitar triggers y borrar
  begin
    execute (select
      string_agg('alter table storage.objects disable trigger ' || quote_ident(t.tgname), '; ')
      from pg_trigger t
      where t.tgrelid = 'storage.objects'::regclass and not t.tgisinternal);

    delete from storage.objects where bucket_id = 'incident-photos';

    execute (select
      string_agg('alter table storage.objects enable trigger ' || quote_ident(t.tgname), '; ')
      from pg_trigger t
      where t.tgrelid = 'storage.objects'::regclass and not t.tgisinternal);
  exception
    -- intento 2 (sin permisos para alterar triggers): borrado directo
    when others then
      begin
        delete from storage.objects where bucket_id = 'incident-photos';
      exception
        when others then
          raise notice 'AVISO: no se pudieron borrar las fotos automáticamente (%). Limpia bucket "incident-photos" desde Storage / Storage API.', sqlerrm;
      end;
  end;
end $$;

COMMIT;

-- ============================================
-- Verificación
-- ============================================
select 'incidents'             as tabla, count(*) as filas from public.incidents
union all select 'incident_votes', count(*) from public.incident_votes
union all select 'incident_reports', count(*) from public.incident_reports
union all select 'audit_log', count(*) from public.audit_log
union all select 'fotos storage', count(*) from storage.objects where bucket_id = 'incident-photos';
