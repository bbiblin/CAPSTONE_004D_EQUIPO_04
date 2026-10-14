-- ============================================================
-- migraciones/nuevo/02_seed_demo_santiago_masivo.sql
-- Datos de ejemplo MASIVOS para Demo / análisis BI (Santiago RM)
-- ------------------------------------------------------------
-- Objetivo: poblar el esquema con miles de incidencias realistas
-- repartidas por todo el Gran Santiago (comunas de la Región
-- Metropolitana), con votos (up/down/resuelta) y denuncias, para
-- que las vistas BI (bi.incident_daily / bi.incident_reports_daily,
-- consumidas por `bi_reader`) muestren datos con volumen suficiente
-- para construir KPIs, series temporales y mapas en Power BI.
--
-- Características:
--   * Genera ~v_total (por defecto 3500) incidencias + votos + denuncias.
--   * Sin fotografía: `image_url = null` (dato demo sin evidencia).
--   * Geografía admin real (country/region/province/comuna) y superficie
--     de dirección (street/house_number/neighbourhood) pobladas.
--   * `created_at` distribuido en los últimos ~15 meses (dimensión
--     temporal de BI).
--   * IDEMPOTENTE: al re-ejecutarse borra primero su propio set de datos
--     demo y lo vuelve a insertar => nunca duplica.
--   * LIMPIABLE: los datos demo se eliminan junto con todo el dato
--     transaccional al ejecutar `limpieza/limpieza_datos_demo.sql`
--     (los usuarios demo permanecen, por lo que re-ejecutar el seed
--     vuelve a generar el dataset).
--
-- Prerequisitos:
--   Ninguno manual. Este script crea por sí mismo (vía SQL, como el
--   SQL Editor de Supabase) un pool de usuarios de demostración en
--   auth.users (email demo.movimap.N@movimap.cl) que usa como
--   autor/ votante/ denunciante. No depende de admin@movimap.cl.
-- ============================================================

do $$
declare
  -- ---------- configuración ----------
  v_total     int  := 3500;      -- incidencias a generar
  v_demo_n    int  := 60;        -- usuarios demo a crear
  v_window_dy int  := 450;       -- meses hacia atrás (~15) para created_at
  v_th_res    int  := 3;         -- resuelto_threshold por defecto
  v_th_down   int  := 4;         -- downvote_threshold por defecto

  -- ---------- variables de trabajo ----------
  v_i       int;
  v_k       int;
  v_n       int;
  v_ci      int;
  v_pi      int;
  v_inc     uuid;
  v_demo    uuid[];
  v_email   text;
  v_id      uuid;

  v_comuna  text;
  v_lat     numeric;
  v_lng     numeric;
  v_prov    text;
  v_cat     text;
  v_status  text;
  v_sev     int;
  v_dur     text;
  v_desc    text;
  v_tpl     text;
  v_street  text;
  v_num     int;
  v_place   text;
  v_addr    text;
  v_obs     date;
  v_cts     timestamptz;
  v_rts     timestamptz;

  v_up      int;
  v_down    int;
  v_res     int;
  v_vidx    int;
  v_u       uuid;
  v_u2      uuid;
  v_rc      int;
  v_reason  text;
  v_rstatus text;
  v_ridx    int;

  -- ---------- datasets (comunas del Gran Santiago) ----------
  -- arrays paralelos: comuna / lat / lng / provincia / peso relativo
  v_comunas text[] := array[
    'Santiago','Providencia','Las Condes','Vitacura','Ñuñoa','La Reina',
    'Macul','Peñalolén','La Florida','Puente Alto','Maipú','La Cisterna',
    'San Miguel','Pedro Aguirre Cerda','San Joaquín','San Ramón','La Granja',
    'Estación Central','Recoleta','Independencia','Conchalí','Renca',
    'Quinta Normal','Lo Prado','Cerro Navia','Pudahuel','Huechuraba',
    'Quilicura','Lo Espejo','El Bosque','La Pintana','Cerrillos',
    'San Bernardo','Lo Barnechea'
  ];
  v_lats numeric[] := array[
    -33.4378,-33.4267,-33.4130,-33.4050,-33.4540,-33.4580,
    -33.4810,-33.4720,-33.5220,-33.6100,-33.5100,-33.5340,
    -33.5010,-33.4940,-33.4900,-33.5430,-33.5340,
    -33.4550,-33.4150,-33.4230,-33.4050,-33.4090,
    -33.4340,-33.4490,-33.4210,-33.4450,-33.3880,
    -33.3650,-33.5260,-33.5640,-33.5670,-33.4890,
    -33.5930,-33.3540
  ];
  v_lngs numeric[] := array[
    -70.6504,-70.6159,-70.5720,-70.5820,-70.6060,-70.5730,
    -70.6070,-70.5790,-70.5830,-70.5800,-70.7640,-70.6640,
    -70.6490,-70.6770,-70.6290,-70.6490,-70.6490,
    -70.6780,-70.6310,-70.6490,-70.6780,-70.7130,
    -70.6970,-70.7230,-70.7320,-70.7670,-70.6640,
    -70.7250,-70.6640,-70.6630,-70.6300,-70.7190,
    -70.7120,-70.5250
  ];
  v_provs text[] := array[
    'Provincia de Santiago','Provincia de Santiago','Provincia de Santiago','Provincia de Santiago','Provincia de Santiago','Provincia de Santiago',
    'Provincia de Santiago','Provincia de Santiago','Provincia de Cordillera','Provincia de Cordillera','Provincia de Santiago','Provincia de Santiago',
    'Provincia de Santiago','Provincia de Santiago','Provincia de Santiago','Provincia de Santiago','Provincia de Santiago',
    'Provincia de Santiago','Provincia de Santiago','Provincia de Santiago','Provincia de Santiago','Provincia de Santiago',
    'Provincia de Santiago','Provincia de Santiago','Provincia de Santiago','Provincia de Santiago','Provincia de Santiago',
    'Provincia de Santiago','Provincia de Santiago','Provincia de Santiago','Provincia de Santiago','Provincia de Santiago',
    'Provincia de Maipo','Provincia de Santiago'
  ];
  v_w int[] := array[
    9,8,8,5,8,5,
    6,6,8,9,9,5,
    5,4,5,4,4,
    6,6,4,4,4,
    4,4,4,6,4,
    5,4,5,5,4,
    5,2
  ];
  v_pool int[] := '{}';

  -- ---------- datasets (categorías / estados / etc.) ----------
  v_cats text[] := array[
    'vereda_cortada','vereda_deteriorada','rampa_bloqueada',
    'rampa_inexistente','obstaculo_fisico','ascensor_fuera_servicio',
    'falta_iluminacion','otro'
  ];
  v_status_pool text[] := array[
    'nuevo','nuevo','nuevo','nuevo','nuevo',
    'confirmado','confirmado','confirmado','confirmado','confirmado',
    'en_revision','en_revision','en_revision',
    'resuelto','resuelto','resuelto','resuelto',
    'rechazado','expirado'
  ];
  v_sev_pool int[] := array[1,1,2,2,2,3,3];
  v_dur_pool text[] := array['temporal','permanente'];
  v_streets text[] := array[
    'Av. Apoquindo','Av. Providencia','Av. Libertador Bernardo O''Higgins',
    'Av. Andrés Bello','Pedro de Valdivia','Manuel Montt','Nueva Providencia',
    'Los Leones','El Bosque Norte','Santa María','Irarrázaval','Vicuña Mackenna',
    'Almirante Barroso','Tobalaba','Luis Thayer Ojeda','Suecia','Francisco Bilbao',
    'Américo Vespucio','Departamental','Santa Rosa','Gran Avenida','San Pablo',
    'Arica','Costanera','Isidora Goyenechea','Monseñor Nuncio','José Manuel Infante',
    'Antonio Varas','Salvador','Santa Isabel','Grecia','Av. 11 de Septiembre'
  ];
  v_barrios text[] := array[
    'Centro','Barrio Italia','Barrio Lastarria','Providencia Centro','El Golf',
    'Barrio Bellavista','Ñuñoa','Barrio Brasil','Barrio Matta','Plaza Baquedano',
    'Parque Bustamante','Costanera Norte','Barrio Suecia','Crisol','Barrio Pedro de Valdivia'
  ];

  -- plantillas de descripción por categoría ({street},{num},{comuna},{sector})
  v_t_cortada text[] := array[
    'Vereda cortada por obras en {street} {num}. Impide el paso de sillas de ruedas y personas mayores.',
    'Tramo de vereda cortada sin señalización en {street} {num}, {comuna}. Paso casi intransitable.',
    'Vereda cortada a la altura de {street} {num}, en {comuna}. Afecta la accesibilidad peatonal de la zona.',
    'Obras de vereda cortada dejaron el paso bloqueado en {street} {num}. Se requiere reparación urgente.'
  ];
  v_t_deteriorada text[] := array[
    'Vereda con grietas profundas y desniveles en {street} {num}. Dificulta el uso de andadores y bastones.',
    'Vereda levantada por raíces de árboles en {street} {num}, {comuna}. Tropezones frecuentes.',
    'Pavimento muy deteriorado en {street} {num}, especialmente malo para personas con movilidad reducida.',
    'Socavón en la vereda de {street} {num}, {comuna}. Reiterados reclamos de vecinos mayores.'
  ];
  v_t_rampa_bloqueada text[] := array[
    'Rampa bloqueada por un vehículo estacionado en {street} {num}. Impide el acceso para sillas de ruedas.',
    'Rampa de acceso bloqueada por contenedores de basura en {street} {num}, {comuna}.',
    'Obstáculo que impide usar la rampa en {street} {num}. Afecta el acceso accesible al edificio.',
    'Rampa tapada por escombros en {street} {num}, {comuna}. No permite subir con movilidad reducida.'
  ];
  v_t_rampa_inexistente text[] := array[
    'No existe rampa de accesibilidad en la intersección de {street} con {comuna} centro. Solo hay escalones.',
    'Intersección sin rampa en {street} {num}, {comuna}. Personas en silla de ruedas no pueden cruzar.',
    'Falta rampa en el cruce de {street} {num}. Desnivel que impide el paso accesible a la vereda.',
    'Crucero de {street} {num} sin rampa, {comuna}. Se requiere acceso inclusivo urgente.'
  ];
  v_t_obstaculo text[] := array[
    'Árbol caído bloqueando la vereda en {street} {num}, {comuna}. Riesgo para el tránsito peatonal.',
    'Poste de señalización mal instalado en medio de la vereda en {street} {num}. Paso reducido.',
    'Escombros acumulados en {street} {num}, {comuna}. Reducen el ancho útil del paso peatonal.',
    'Vehículo mal estacionado sobre la vereda en {street} {num}, {comuna}. Bloquea la circulación accesible.'
  ];
  v_t_ascensor text[] := array[
    'Ascensor fuera de servicio en {street} {num}. Afecta el acceso de personas con movilidad reducida.',
    'Ascensor del edificio en {street} {num}, {comuna}, fuera de servicio desde hace varios días.',
    'Falla el ascensor de acceso en {street} {num}, {comuna}. Impide llegar a niveles superiores.',
    'Ascensor clausurado en {street} {num}, {comuna}. Sin alternativa de acceso accesible.'
  ];
  v_t_iluminacion text[] := array[
    'Falta iluminación en la vereda de {street} {num} durante la noche. Zona oscura de alto riesgo.',
    'Sector sin iluminación adecuada en {street} {num}, {comuna}. Riesgo para peatones de noche.',
    'Faro apagado en {street} {num}, {comuna}. Tramo muy oscuro para personas con baja visión.',
    'Luminarias dañadas en {street} {num}, {comuna}. El paso peatonal nocturno es inseguro.'
  ];
  v_t_otro text[] := array[
    'Hueco profundo en la acera en {street} {num}, {comuna}. Peligro considerable para peatones.',
    'Señalética táctil despegada en el cruce de {street} {num}, {comuna}. Riesgo para personas con discapacidad visual.',
    'Deterioro de infraestructura peatonal en {street} {num}, {comuna}, sin clasificar.',
    'Obstáculo no identificado en la vereda de {street} {num}, {comuna}. Dificulta el tránsito accesible.'
  ];

  v_reasons text[] := array[
    'Duplicado de otro reporte','Ubicación incorrecta','Información incompleta',
    'Denuncia sin fundamento','Sin evidencia visual','No corresponde a una incidencia real',
    'La incidencia ya fue resuelta','Datos del reporte desactualizados'
  ];
  v_rstatus_pool text[] := array[
    'pendiente','pendiente','pendiente','resuelto','resuelto','rechazado'
  ];
begin
  -- ============================================================
  -- 0) LIMPIEZA PREVIA del set demo anterior (idempotencia)
  --    Borra solo los datos que generó este script (marcados por los
  --    usuarios demo); NO toca reportes/votos de otros orígenes.
  -- ============================================================
  delete from public.audit_log
    where user_id in (
      select p.id from public.profiles p
      where p.email like 'demo.movimap.%@movimap.cl'
    )
    or entity_id in (
      select i.id from public.incidents i
      join public.profiles p on p.id = i.created_by
      where p.email like 'demo.movimap.%@movimap.cl'
    );
  delete from public.incident_votes
    where user_id in (select p.id from public.profiles p
                      where p.email like 'demo.movimap.%@movimap.cl');
  delete from public.incident_reports
    where reported_by in (select p.id from public.profiles p
                          where p.email like 'demo.movimap.%@movimap.cl');
  delete from public.incidents
    where created_by in (select p.id from public.profiles p
                         where p.email like 'demo.movimap.%@movimap.cl');

  -- ============================================================
  -- 1) POOL DE USUARIOS DEMO (autocontenido)
  --    Crea usuarios en auth.users (el trigger handle_new_user crea el
  --    profile). Reusa los ya existentes (no duplica).
  -- ============================================================
  for v_i in 1..v_demo_n loop
    v_email := 'demo.movimap.' || v_i || '@movimap.cl';
    if not exists (select 1 from auth.users where email = v_email) then
      v_id := gen_random_uuid();
      insert into auth.users
        (id, instance_id, aud, role, email, encrypted_password,
         email_confirmed_at, confirmation_token, recovery_token, email_change_token_new,
         raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
         is_super_admin, is_sso_user, is_anonymous)
      values
        (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         v_email, 'demo', now(), '', '', '',
         '{"provider":"email","providers":["email"]}'::jsonb,
         jsonb_build_object('display_name', 'Demo ' || v_i),
         now(), now(), false, false, false);
      insert into auth.identities
        (id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at)
      values
        (gen_random_uuid(), v_id, 'email', v_email,
         jsonb_build_object('sub', v_id::text, 'email', v_email), now(), now(), now());
    end if;
  end loop;

  select array_agg(p.id order by p.id) into v_demo
    from public.profiles p where p.email like 'demo.movimap.%@movimap.cl';
  v_n := coalesce(array_length(v_demo, 1), 0);
  if v_n = 0 then
    raise exception 'ERROR: no se pudo crear ningún usuario demo.';
  end if;

  -- ---------- pool de comunas ponderado (más reportes en zonas densas) ----------
  v_pool := '{}'::int[];
  for v_i in 1..cardinality(v_comunas) loop
    for v_k in 1..v_w[v_i] loop
      v_pool := v_pool || v_i;
    end loop;
  end loop;

  -- ============================================================
  -- 2) GENERACIÓN DE INCIDENCIAS + VOTOS + DENUNCIAS
  -- ============================================================
  for v_i in 1..v_total loop
    -- ---- ubicación: comuna ponderada + jitter (~2-3 km) ----
    v_pi     := 1 + floor(random() * cardinality(v_pool));
    v_ci     := v_pool[v_pi];
    v_comuna := v_comunas[v_ci];
    v_prov   := v_provs[v_ci];
    v_lat    := v_lats[v_ci] + (random() - 0.5) * 0.03;
    v_lng    := v_lngs[v_ci] + (random() - 0.5) * 0.04;

    -- ---- categoría / severidad / duración / estado ----
    v_cat    := v_cats[1 + floor(random() * cardinality(v_cats))];
    v_sev    := v_sev_pool[1 + floor(random() * cardinality(v_sev_pool))];
    v_dur    := v_dur_pool[1 + floor(random() * cardinality(v_dur_pool))];
    v_status := v_status_pool[1 + floor(random() * cardinality(v_status_pool))];

    -- ---- descripción realista por categoría ----
    v_street := v_streets[1 + floor(random() * cardinality(v_streets))];
    v_num    := 1 + floor(random() * 9998);
    v_tpl    := case v_cat
      when 'vereda_cortada' then v_t_cortada[1 + floor(random() * cardinality(v_t_cortada))]
      when 'vereda_deteriorada' then v_t_deteriorada[1 + floor(random() * cardinality(v_t_deteriorada))]
      when 'rampa_bloqueada' then v_t_rampa_bloqueada[1 + floor(random() * cardinality(v_t_rampa_bloqueada))]
      when 'rampa_inexistente' then v_t_rampa_inexistente[1 + floor(random() * cardinality(v_t_rampa_inexistente))]
      when 'obstaculo_fisico' then v_t_obstaculo[1 + floor(random() * cardinality(v_t_obstaculo))]
      when 'ascensor_fuera_servicio' then v_t_ascensor[1 + floor(random() * cardinality(v_t_ascensor))]
      when 'falta_iluminacion' then v_t_iluminacion[1 + floor(random() * cardinality(v_t_iluminacion))]
      else v_t_otro[1 + floor(random() * cardinality(v_t_otro))]
    end;
    v_desc := replace(replace(replace(replace(v_tpl, '{street}', v_street), '{num}', v_num::text), '{comuna}', v_comuna), '{sector}', v_barrios[1 + floor(random() * cardinality(v_barrios))]);

    -- ---- fecha / lugar / dirección ----
    v_cts  := now() - (random() * v_window_dy) * interval '1 day';
    v_obs  := least(current_date, v_cts::date - (random() * 10)::int);
    v_place := v_street || ' ' || v_num;
    v_addr := v_street || ' ' || v_num || ', ' || v_comuna || ', Santiago, Chile';

    -- ---- insert incidente (image_url = null => sin fotografía) ----
    insert into public.incidents
      (category, description, latitude, longitude, severity, observed_at,
       estimated_duration, status, place_name, address,
       country, region, province, comuna, neighbourhood, street, house_number,
       created_by, created_at, updated_at, resolved_at, resolved_by,
       resuelto_threshold, downvote_threshold, image_url)
    values
      (v_cat, v_desc, v_lat, v_lng, v_sev, v_obs,
       v_dur, v_status, v_place, v_addr,
       'Chile', 'Región Metropolitana de Santiago', v_prov, v_comuna,
       v_barrios[1 + floor(random() * cardinality(v_barrios))], v_street, v_num::text,
       v_demo[1 + floor(random() * v_n)], v_cts, v_cts,
       case when v_status = 'resuelto' then least(now(), v_cts + (random() * 30) * interval '1 day') end,
       case when v_status = 'resuelto' then v_demo[1 + floor(random() * v_n)] end,
       v_th_res, v_th_down, null)
    returning id into v_inc;

    -- ---- votos (usable distinct) ----
    v_up   := floor(random() * 7);        -- 0..6 confirmaciones
    v_down := floor(random() * 3);        -- 0..2 rechazos
    if v_status = 'resuelto' then
      v_res := v_th_res + floor(random() * 4);   -- >= resuelto_threshold
    else
      v_res := floor(random() * 2);              -- 0..1
    end if;
    v_vidx := 0;
    v_rts  := now() - (random() * v_window_dy) * interval '1 day';
    for v_k in 1..v_up loop
      v_vidx := v_vidx + 1;
      v_u := v_demo[(v_vidx % v_n) + 1];
      insert into public.incident_votes (incident_id, user_id, vote_type, created_at, updated_at)
      values (v_inc, v_u, 'up', v_rts, v_rts)
      on conflict (incident_id, user_id) do nothing;
    end loop;
    for v_k in 1..v_down loop
      v_vidx := v_vidx + 1;
      v_u := v_demo[(v_vidx % v_n) + 1];
      insert into public.incident_votes (incident_id, user_id, vote_type, created_at, updated_at)
      values (v_inc, v_u, 'down', v_rts, v_rts)
      on conflict (incident_id, user_id) do nothing;
    end loop;
    for v_k in 1..v_res loop
      v_vidx := v_vidx + 1;
      v_u := v_demo[(v_vidx % v_n) + 1];
      insert into public.incident_votes (incident_id, user_id, vote_type, created_at, updated_at)
      values (v_inc, v_u, 'resuelta', v_rts, v_rts)
      on conflict (incident_id, user_id) do nothing;
    end loop;

    -- ---- denuncias (a un subconjunto de incidentes) ----
    if random() < 0.40 then
      v_rc := 1 + floor(random() * 3);      -- 1..3 denuncias
      v_ridx := 0;
      for v_k in 1..v_rc loop
        v_ridx   := v_ridx + 1;
        v_u2     := v_demo[(v_ridx % v_n) + 1];
        v_reason := v_reasons[1 + floor(random() * cardinality(v_reasons))];
        v_rstatus := v_rstatus_pool[1 + floor(random() * cardinality(v_rstatus_pool))];
        v_rts    := now() - (random() * v_window_dy) * interval '1 day';
        insert into public.incident_reports
          (incident_id, reported_by, reason, status, created_at, updated_at)
        values (v_inc, v_u2, v_reason, v_rstatus, v_rts, v_rts)
        on conflict (incident_id, reported_by) do nothing;
      end loop;
    end if;
  end loop;

  raise notice 'Datos demo masivos insertados: % incidencias (+ votos y denuncias) en Santiago, con % usuarios demo.', v_total, v_n;
end $$;

-- ============================================
-- VERIFICACIÓN
-- ============================================
select 'incidents'        as tabla, count(*) as filas from public.incidents
union all select 'incident_votes',    count(*) from public.incident_votes
union all select 'incident_reports',  count(*) from public.incident_reports
union all select 'audit_log',         count(*) from public.audit_log;

select comuna, count(*) as total
from public.incidents
group by comuna
order by total desc
limit 15;
