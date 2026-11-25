/**
 * k6 — Prueba de carga (acotada a MVP) de Movimap (backend Supabase / PostgREST + Nominatim).
 *
 * Enfoque: PRAGMÁTICO, sin metodología formal y acotado a MVP. El objetivo es
 * detectar regresiones evidentes de latencia, NO estresar el sistema ni agotar
 * la cuota gratuita de Supabase/Render.
 *
 * IMPORTANTE — PRUDENCIA (no destructivo):
 *   - El script SOLO ejecuta operaciones de LECTURA (RPCs del mapa, login y
 *     geocoding). No crea reportes, votos ni modifica datos.
 *   - Usar volúmenes MÍNIMOS (VUS bajos, duración <= 30 s).
 *   - Ejecutar contra un entorno de pruebas o local; NO contra producción
 *     con datos sensibles.
 *
 * Qué mide:
 *   - RPC del mapa: get_incidents_in_bounds (viewport) y get_incident_heat_cells.
 *   - Login: POST /auth/v1/token (para obtener un JWT anon/authenticated).
 *   - Geocoding: searchPlaces (Nominatim) — recordar que tiene rate-limit.
 *
 * Cómo ejecutar (desde la raíz del repo):
 *   k6 run testing/performance/k6-load-test.js
 *
 * Para parametrizar (obligatorio para los escenarios que llaman a la API):
 *   k6 run -e SUPABASE_URL=https://TU-PROYECTO.supabase.co \
 *           -e SUPABASE_ANON_KEY=sb_publishable_XXX \
 *           testing/performance/k6-load-test.js
 *
 * Reportes (JSON y resumen):
 *   k6 run --summary-export=docs/evidencias/rendimiento/PRF-06-k6-report.json ...
 *
 * Advertencia: ejecutar con volúmenes moderados — Supabase free tiene cuota de
 * requests y Render free hace sleep. Documenta el límite como observación.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const SUPABASE_URL = __ENV.SUPABASE_URL || ''; // ej. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// Credenciales del escenario de login (PRF-07). Parametrizables por entorno;
// por defecto cae a la cuenta del seed (admin@movimap.cl) por compatibilidad.
const E2E_LOGIN_EMAIL = __ENV.E2E_LOGIN_EMAIL || 'admin@movimap.cl';
const E2E_LOGIN_PASSWORD = __ENV.E2E_LOGIN_PASSWORD || __ENV.E2E_ADMIN_PASSWORD || 'clave-demo';

const restUrl = `${SUPABASE_URL}/rest/v1`;
const authUrl = `${SUPABASE_URL}/auth/v1`;

// Métricas personalizadas.
const errorRate = new Rate('errores');
const durMap = new Trend('dur_rpc_mapa', true);
const durLogin = new Trend('dur_login', true);
const durGeo = new Trend('dur_geocoding', true);

// Se usa como un solo "usuario virtual" que representa la app (anon scope).
const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

// Escenarios (por defecto smoke = 1 VU; para carga usá SCENARIO=load).
const SCENARIO = __ENV.SCENARIO || 'smoke';

export const options = {
  scenarios: {
    // 1 VU, 1 iteración: verifica que todo responde (fumada).
    smoke: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      exec: 'smokeRun',
    },
    // Carga moderada: 10 VUs durante 30 s.
    load: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '30s',
      exec: 'loadRun',
    },
    // Pico: 25 VUs durante 15 s.
    stress: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: Number(__ENV.VUS || 25) },
        { duration: '15s', target: Number(__ENV.VUS || 25) },
        { duration: '10s', target: 0 },
      ],
      exec: 'loadRun',
    },
  },
  thresholds: {
    errores: ['rate<0.01'],        // < 1 % de errores
    dur_rpc_mapa: ['p(95)<1000'],  // p95 < 1 s para los RPC del mapa
    dur_login: ['p(95)<1000'],
    http_req_duration: ['p(95)<1200'],
  },
};

function rpcCall(name, params, metric) {
  const payload = params ? JSON.stringify(params) : '{}';
  const res = http.post(`${restUrl}/rpc/${name}`, payload, {
    headers: HEADERS,
    responseType: 'text',
  });
  const ok = res.status === 200;
  check(res, { [`rpc ${name} status 200`]: (r) => r.status === 200 });
  errorRate.add(!ok);
  metric.add(res.timings.duration);
  return res;
}

function login(email, password) {
  const res = http.post(
    `${authUrl}/token?grant_type=password`,
    JSON.stringify({ email, password }),
    { headers: HEADERS },
  );
  const ok = res.status === 200;
  check(res, { 'login status 200': (r) => r.status === 200 });
  errorRate.add(!ok);
  durLogin.add(res.timings.duration);
  return ok;
}

function geocoding(query) {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=cl&addressdetails=1&accept-language=es`;
  const res = http.get(url, { headers: { 'User-Agent': 'Movimap-k6-test' } });
  const ok = res.status === 200;
  check(res, { 'geocoding status 200': (r) => r.status === 200 });
  errorRate.add(!ok);
  durGeo.add(res.timings.duration);
}

// Bounds de Providencia (área del mapa inicial de Movimap).
const BOUNDS = {
  p_min_lat: -33.47,
  p_max_lat: -33.38,
  p_min_lng: -70.66,
  p_max_lng: -70.58,
  p_category: null,
  p_since: 'epoch',
  p_limit: 500,
};

export function smokeRun() {
  rpcCall('get_incidents_in_bounds', BOUNDS, durMap);
  rpcCall('get_incident_heat_cells', {
    p_min_lat: BOUNDS.p_min_lat,
    p_max_lat: BOUNDS.p_max_lat,
    p_min_lng: BOUNDS.p_min_lng,
    p_max_lng: BOUNDS.p_max_lng,
    p_since: 'epoch',
    p_cell_deg: 0.02,
    p_category: null,
  }, durMap);
  login(E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD);
  geocoding('Providencia');
}

export function loadRun() {
  // Operación principal: viewport del mapa.
  rpcCall('get_incidents_in_bounds', BOUNDS, durMap);
  // Cada 5 iteraciones, también heatmap.
  if (__ITER % 5 === 0) {
    rpcCall('get_incident_heat_cells', {
      p_min_lat: BOUNDS.p_min_lat,
      p_max_lat: BOUNDS.p_max_lat,
      p_min_lng: BOUNDS.p_min_lng,
      p_max_lng: BOUNDS.p_max_lng,
      p_since: 'epoch',
      p_cell_deg: 0.02,
      p_category: null,
    }, durMap);
  }
  // Login ocasional (cada 10 iteraciones) para simular usuarios entrando.
  if (__ITER % 10 === 0) {
    login(E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD);
  }
  sleep(1);
}

// Selección de escenario. IMPORTANTE: el default es 'smoke' y DEBE ejecutar
// SOLO el escenario smoke (1 VU). Antes este bloque dejaba activos los tres
// escenarios (smoke+load+stress), lo que enviaba carga accidental contra
// el entorno. Ahora el default queda acotado al smoke test.
if (SCENARIO === 'load') {
  options.scenarios = { load: options.scenarios.load };
} else if (SCENARIO === 'stress') {
  options.scenarios = { stress: options.scenarios.stress };
} else {
  options.scenarios = { smoke: options.scenarios.smoke };
}
