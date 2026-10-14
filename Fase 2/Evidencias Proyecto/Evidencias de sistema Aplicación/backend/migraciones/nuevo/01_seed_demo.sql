-- ============================================================
-- migraciones/nuevo/01_seed_demo.sql
-- Datos de ejemplo RICOS para Demo / análisis BI
-- ------------------------------------------------------------
-- Objetivo: poblar el esquema con un set variado y realista de
-- incidencias (categorías, severidades, estados), votos (up/down/
-- resuelta) de varios usuarios, denuncias (con motivo y estado) y
-- casos resueltos, de modo que las vistas BI
-- (bi.incident_daily / bi.incident_reports_daily) muestren datos
-- con los que se puedan generar gráficos en Power BI.
--
-- Requisitos previos:
--   1. Crear el usuario admin en Authentication → Users:
--      Email: admin@movimap.cl | Auto Confirm: SI
--   2. Darle rol admin:
--      update public.profiles set role = 'admin' where email = 'admin@movimap.cl';
--   3. (Opcional) Más usuarios de prueba en Authentication. El script
--      usa CUALQUIER perfil existente como "votante"/"denunciante",
--      además del admin, para enriquecer votos y denuncias.
--
-- Idempotente: si se re-ejecuta no duplica (usa `not exists` y `on conflict`).
-- ============================================================

do $$
declare
  v_admin uuid;
  v_all   uuid[] := array[]::uuid[];
  v_n     int;
  v_uid   uuid;
  v_idx   int;
  v_idx2  int;
  v_row   record;
begin
  -- 0) Identificar al admin. Sin él no hay datos (todo cuelga de profiles).
  select id into v_admin from public.profiles where email = 'admin@movimap.cl';
  if v_admin is null then
    raise exception 'ERROR: El usuario admin@movimap.cl no existe. Créalo primero (ver comentarios del archivo).';
  end if;

  -- Pool de "actores" (admin + todos los perfiles existentes) para votos/denuncias.
  select array_agg(id order by id) into v_all from public.profiles;
  v_n := coalesce(array_length(v_all, 1), 0);
  if v_n = 0 then
    v_all := array[v_admin];
    v_n   := 1;
  end if;

  -- 1) INCIDENCIAS ---------------------------------------------------------
  --    Columnas: category, description, latitude, longitude, severity,
  --    observed_at, estimated_duration, status, place_name, address,
  --    country, region, province, comuna,
  --    created_by, created_at, resolved_at, resolved_by,
  --    resuelto_threshold, downvote_threshold.
  --    created_ago  = días hacia atrás de now() para created_at.
  --    resolve_ago  = días hacia atrás de now() para resolved_at (debe ser < created_ago).
  insert into public.incidents
    (category, description, latitude, longitude, severity, observed_at,
     estimated_duration, status, place_name, address,
     country, region, province, comuna,
     created_by, created_at, resolved_at, resolved_by,
     resuelto_threshold, downvote_threshold)
  select
    category, description, latitude, longitude, severity,
    current_date - observed_ago,
    duration, status, place_name, address,
    'Chile' as country,
    'Región Metropolitana de Santiago' as region,
    'Provincia de Santiago' as province,
    'Providencia' as comuna,
    v_admin,
    now() - (created_ago * interval '1 day'),
    case when status = 'resuelto' then now() - (resolve_ago * interval '1 day') end,
    case when status = 'resuelto' then v_admin end,
    res_threshold, down_threshold
  from (values
    -- confirmada, severa
    ('vereda_cortada', 'Vereda cortada a la altura de Apoquindo con Eléctra. No permite el paso de sillas de ruedas ni andadores. Se necesita reparación urgente para garantizar la accesibilidad peatonal en esta zona comercial de alta concurrencia.', -33.4180, -70.6007, 3, 2, 'permanente', 'confirmado', 'Apoquindo 4800', 'Apoquindo 4800, Providencia, Santiago, Chile', 3, 0, 3, 4),
    -- en revisión
    ('rampa_bloqueada', 'Rampa bloqueada por contenedores de basura abandonados desde hace varios días. Impide el acceso accesible al edificio comercial ubicado en esta dirección.', -33.4293, -70.6213, 2, 5, 'temporal', 'en_revision', 'Costanera Center', 'Av. Andrés Bello 2425, Providencia, Santiago, Chile', 7, 0, 3, 4),
    -- confirmada
    ('obstaculo_fisico', 'Árbol caído bloqueando completamente la vereda en la intersección de Avenida Providencia con Manuel Montt. Riesgo significativo para personas con movilidad reducida.', -33.4267, -70.6159, 3, 1, 'temporal', 'confirmado', 'Providencia con Manuel Montt', 'Av. Providencia 1550, Providencia, Santiago, Chile', 5, 0, 3, 4),
    -- confirmada, ascensor
    ('ascensor_fuera_servicio', 'Ascensor del centro comercial fuera de servicio desde hace aproximadamente 3 días. Afecta gravemente la accesibilidad del nivel subterráneo.', -33.4285, -70.6196, 3, 3, 'permanente', 'confirmado', 'Mall Costanera', 'Av. Andrés Bello 2425, Providencia, Santiago, Chile', 9, 0, 3, 4),
    -- nueva, iluminación
    ('falta_iluminacion', 'Sección sin iluminación adecuada en la vereda de San Martín con O''Higgins durante la noche. Riesgo de accidentes para peatones y personas con discapacidad visual.', -33.4373, -70.6352, 2, 7, 'permanente', 'nuevo', 'Ideal con San Martín', 'Av. San Martín 200, Providencia, Santiago, Chile', 12, 0, 3, 4),
    -- en revisión, deteriorada
    ('vereda_deteriorada', 'Vereda con grietas profundas y desniveles considerables en el tramo entre Eléctra y Nueva de Lyon. Dificulta el desplazamiento de personas con andadores.', -33.4267, -70.6159, 2, 4, 'permanente', 'en_revision', 'Eléctor Lyon', 'Av. Nueva de Lyon 180, Providencia, Santiago, Chile', 10, 0, 3, 4),
    -- oculta por downvotes (umbral bajo) — visible en BI y admin
    ('rampa_inexistente', 'No existe rampa de accesibilidad en la intersección de Apoquindo con Manuel Montt. Solo hay escalones que impiden el acceso con movilidad reducida.', -33.4311, -70.6188, 3, 10, 'permanente', 'nuevo', 'Apoquindo 3050', 'Av. Apoquindo 3050, Providencia, Santiago, Chile', 15, 0, 3, 1),
    -- oculta por votos "resuelta" (umbral bajo) — visible en BI y admin
    ('otro', 'Hueco grande y profundo en la acera a la altura del metro Manuel Montt. Peligro considerable para peatones y personas con movilidad reducida.', -33.4285, -70.6196, 2, 1, 'temporal', 'nuevo', 'Metro Manuel Montt', 'Av. Manuel Montt, Providencia, Santiago, Chile', 18, 0, 1, 4),
    -- RESUELTA leve
    ('vereda_deteriorada', 'Socavón pequeño en la vereda frente a la Biblioteca Municipal. Recorrido frecuente de personas mayores en horario matutino.', -33.4252, -70.6090, 1, 20, 'permanente', 'resuelto', 'Biblioteca Municipal', 'Av. Providencia 1050, Providencia, Santiago, Chile', 22, 6, 3, 4),
    -- RESUELTA grave
    ('rampa_bloqueada', 'Rampa de acceso principal al edificio municipal ocupada por un vehículo estacionado las 24 horas. Bloquea la entrada para sillas de ruedas.', -33.4412, -70.6245, 3, 15, 'temporal', 'resuelto', 'Municipalidad de Providencia', 'Av. Pedro de Valdivia 963, Providencia, Santiago, Chile', 25, 4, 3, 4),
    -- RESUELTA iluminación
    ('falta_iluminacion', 'Faro apagado en el paseo peatonal de la Plaza Italia. Sectores oscuros durante la noche que incrementan la inseguridad.', -33.4352, -70.6325, 2, 12, 'permanente', 'resuelto', 'Plaza Italia', 'Plaza Baquedano, Providencia, Santiago, Chile', 28, 8, 3, 4),
    -- RESUELTA obstáculo leve
    ('obstaculo_fisico', 'Poste de señalización mal instalado en medio de la vereda. Reduce el ancho útil de paso a menos de 80 cm.', -33.4228, -70.6140, 1, 30, 'permanente', 'resuelto', 'Av. El Bosque', 'Av. El Bosque Norte, Providencia, Santiago, Chile', 30, 12, 3, 4),
    -- RECHAZADA
    ('obstaculo_fisico', 'Reporte de escombros en la calzada que resultó ser un desecho de construcción ya retirado por el vecino.', -33.4331, -70.6283, 2, 18, 'temporal', 'rechazado', 'Av. Nueva Providencia', 'Av. Nueva Providencia 2300, Providencia, Santiago, Chile', 20, 0, 3, 4),
    -- RECHAZADA
    ('vereda_cortada', 'Denuncia de vereda en mal estado que corresponde a una propiedad privada en construcción, no al espacio público.', -33.4199, -70.6055, 2, 26, 'temporal', 'rechazado', 'Av. 11 de Septiembre', 'Av. 11 de Septiembre 2100, Providencia, Santiago, Chile', 24, 0, 3, 4),
    -- EXPIRADA
    ('rampa_inexistente', 'Intersección con rampa provisional de madera que ya no está vigente; se notificó como inexistente pero el punto quedó sin confirmar.', -33.4305, -70.6170, 3, 35, 'temporal', 'expirado', 'Apoquindo 3600', 'Av. Apoquindo 3600, Providencia, Santiago, Chile', 33, 0, 3, 4),
    -- RESUELTA ascensor
    ('ascensor_fuera_servicio', 'Ascensor del estacionamiento subterráneo fuera de servicio. Afecta el acceso a personas con movilidad reducida.', -33.4278, -70.6210, 2, 27, 'permanente', 'resuelto', 'Torre Titanium', 'Av. Apoquindo 4840, Providencia, Santiago, Chile', 27, 10, 3, 4),
    -- confirmada cortada
    ('vereda_cortada', 'Obras menores de vereda cortada sin señalización en la salida del Liceo. Paso casi intransitable a la hora de salida escolar.', -33.4235, -70.6112, 3, 8, 'temporal', 'confirmado', 'Liceo José Victorino Lastarria', 'Av. Providencia 1900, Providencia, Santiago, Chile', 8, 0, 3, 4),
    -- nueva iluminación severa
    ('falta_iluminacion', 'Tramo oscuro en el acceso al metro Los Leones. Zona de mucho tránsito nocturno con riesgo elevado.', -33.4210, -70.6120, 3, 3, 'permanente', 'nuevo', 'Metro Los Leones', 'Av. Los Leones 101, Providencia, Santiago, Chile', 4, 0, 3, 4),
    -- confirmada deteriorada
    ('vereda_deteriorada', 'Vereda levantada por raíces de árboles en el eje verde del Parque Balmaceda. Tropezones frecuentes.', -33.4380, -70.6300, 2, 6, 'permanente', 'confirmado', 'Parque Balmaceda', 'Parque Balmaceda, Providencia, Santiago, Chile', 14, 0, 3, 4),
    -- en revisión otro
    ('otro', 'Señalética táctil despegada en el cruce peatonal. Se desplaza y representa un riesgo para personas con discapacidad visual.', -33.4262, -70.6141, 2, 9, 'temporal', 'en_revision', 'Hospital del Salvador', 'Av. Salvador 364, Providencia, Santiago, Chile', 16, 0, 3, 4)
  ) as t(category, description, latitude, longitude, severity, observed_ago,
         duration, status, place_name, address, created_ago, resolve_ago,
         res_threshold, down_threshold)
  where not exists (
    select 1 from public.incidents i
    where i.created_by = v_admin
      and i.category   = t.category
      and i.latitude   = t.latitude
      and i.longitude  = t.longitude
      and i.description = t.description
  );

  -- 2) VOTOS (up / down / resuelta) ---------------------------------------
  --    Se reparten entre el pool de usuarios; el constraint
  --    unique(incident_id, user_id) evita duplicados (on conflict).
  for v_row in
    select i.id as incident_id, x.votes_up, x.votes_down, x.votes_resuelta
    from (
      values
        ('Apoquindo 4800',                              4, 0, 1),
        ('Costanera Center',                            2, 0, 0),
        ('Providencia con Manuel Montt',                3, 1, 0),
        ('Ideal con San Martín',                        1, 0, 0),
        ('Eléctor Lyon',                                2, 1, 0),
        ('Apoquindo 3050',                              0, 2, 0),
        ('Metro Manuel Montt',                          0, 0, 1),
        ('Biblioteca Municipal',                        3, 0, 5),
        ('Municipalidad de Providencia',                5, 0, 4),
        ('Plaza Italia',                                2, 0, 3),
        ('Av. El Bosque',                               1, 0, 2),
        ('Torre Titanium',                              2, 0, 3),
        ('Liceo José Victorino Lastarria',              3, 0, 0),
        ('Metro Los Leones',                            1, 0, 0),
        ('Parque Balmaceda',                            2, 1, 0),
        ('Hospital del Salvador',                       1, 0, 0)
    ) as x(place_name, votes_up, votes_down, votes_resuelta)
    join public.incidents i
      on i.created_by = v_admin and i.place_name = x.place_name
  loop
    -- up
    for v_idx in 1..v_row.votes_up loop
      v_uid := v_all[ ((v_idx - 1) % v_n) + 1 ];
      insert into public.incident_votes (incident_id, user_id, vote_type)
      values (v_row.incident_id, v_uid, 'up')
      on conflict (incident_id, user_id) do nothing;
    end loop;
    -- down (distinto offset de usuario para no chocar con up)
    for v_idx in 1..v_row.votes_down loop
      v_uid := v_all[ ((v_row.votes_up + v_idx - 1) % v_n) + 1 ];
      insert into public.incident_votes (incident_id, user_id, vote_type)
      values (v_row.incident_id, v_uid, 'down')
      on conflict (incident_id, user_id) do nothing;
    end loop;
    -- resuelta (otro offset)
    for v_idx in 1..v_row.votes_resuelta loop
      v_uid := v_all[ ((v_row.votes_up + v_row.votes_down + v_idx - 1) % v_n) + 1 ];
      insert into public.incident_votes (incident_id, user_id, vote_type)
      values (v_row.incident_id, v_uid, 'resuelta')
      on conflict (incident_id, user_id) do nothing;
    end loop;
  end loop;

  -- 3) DENUNCIAS (reportes) ------------------------------------------------
  --    Una fila por denuncia; constraint unique(incident_id, reported_by).
  insert into public.incident_reports
    (incident_id, reported_by, reason, status, created_at, updated_at)
  select
    i.id,
    v_all[ ((rn - 1) % v_n) + 1 ],
    r.reason, r.status,
    now() - (r.created_ago * interval '1 day'),
    now() - (r.created_ago * interval '1 day')
  from (
    select id, category, place_name,
           row_number() over (order by id) as rn
    from public.incidents
    where created_by = v_admin
  ) i
  join (
    values
      ('Apoquindo 3050',                 'Duplicado de otro reporte',   'pendiente', 9),
      ('Metro Manuel Montt',             'Ubicación incorrecta',        'pendiente', 4),
      ('Providencia con Manuel Montt',   'Información incompleta',      'pendiente', 2),
      ('Costanera Center',               'Denuncia sin fundamento',     'pendiente', 5),
      ('Hospital del Salvador',          'Señalética ya repuesta',      'rechazado', 12),
      ('Municipalidad de Providencia',   'Ya resuelto',                 'resuelto', 20),
      ('Plaza Italia',                   'Sin evidencia visual',        'resuelto', 25),
      ('Av. 11 de Septiembre',           'No corresponde a una incidencia real', 'rechazado', 22)
  ) as r(place_name, reason, status, created_ago)
    on r.place_name = i.place_name
  on conflict (incident_id, reported_by) do nothing;

  raise notice 'Datos de prueba ricos insertados (incidencias + votos + denuncias).';
end $$;
