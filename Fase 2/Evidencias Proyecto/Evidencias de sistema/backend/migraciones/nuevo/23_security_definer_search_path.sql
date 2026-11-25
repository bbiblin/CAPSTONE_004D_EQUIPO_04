-- 23_security_definer_search_path.sql
-- Endurecer search_path de funciones security definer que faltan.
-- Sin search_path, un usuario podría crear tablas con nombres internos
-- que engañen a la función. Las 9 restantes ya tienen search_path endurecido.
-- Idempotente: ALTER FUNCTION SET no genera error si ya está aplicado.

ALTER FUNCTION public.recalculate_incident_score() SET search_path = pg_catalog, '';
ALTER FUNCTION public.log_incident_action() SET search_path = pg_catalog, '';
