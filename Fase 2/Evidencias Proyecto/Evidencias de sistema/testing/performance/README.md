# Movimap — Pruebas de rendimiento (acotadas a MVP)

> **Enfoque**: pragmático, **sin metodología formal**, acotado a un MVP. Se
> miden solo las operaciones críticas, con **volúmenes mínimos** y **sin**
> acciones destructivas. El objetivo es detectar regresiones evidentes, no
> estresar el sistema ni agotar la cuota gratuita.

Guía para ejecutar las pruebas de rendimiento del plan unificado
(`docs/PLAN-DE-PRUEBAS.md`, sección 6.3), con herramientas **gratuitas**:

| Herramienta | Qué mide | Cuándo usarla |
|---|---|---|
| **Lighthouse** | Rendimiento frontend, Core Web Vitals, accesibilidad | Carga de la UI / PWA |
| **k6** | Latencia/throughput de la API (RPCs, auth, geocoding) | Carga y estrés del backend |

---

## 1. Frontend con Lighthouse

Instalar (una vez):

```powershell
npm install -g lighthouse
```

Ejecutar contra el despliegue o contra local (si `npm run preview` está activo):

```powershell
# Rendimiento de escritorio
npx lighthouse https://movimap-sprints.onrender.com/ --preset=desktop --output=html `
  --output-path=docs/evidencias/rendimiento/PRF-01-lighthouse.html

# Móvil (slow 4G) — PRF-04
npx lighthouse https://movimap-sprints.onrender.com/ --preset=mobile --output=html `
  --output-path=docs/evidencias/rendimiento/PRF-04-lighthouse-mobile.html
```

Métricas objetivo:
- **Performance** ≥ 90, **LCP** ≤ 2.5 s, **CLS** ≤ 0.1, **INP** ≤ 200 ms.
- **Accessibility** ≥ 90 (PRF-02).
- **Best Practices / SEO / PWA** ≥ 90 (PRF-03).

---

## 2. API / backend con k6

Instalar **k6** (Grafana, OSS): <https://grafana.com/docs/k6/latest/installation/>

Ejecutar (desde la raíz del repo):

```powershell
# Smoke (1 VU, 1 iteración) — PRF-05
k6 run testing/performance/k6-load-test.js

# Carga moderada (5–10 VUs, 30 s) — PRF-06 / PRF-07 / PRF-08
k6 run -e SCENARIO=load -e VUS=10 testing/performance/k6-load-test.js

# Exportar resumen a JSON como evidencia — PRF-06
k6 run -e SCENARIO=load `
  --summary-export=docs/evidencias/rendimiento/PRF-06-k6-report.json `
  testing/performance/k6-load-test.js
```

**Requerido** para que el script llame a la API de Supabase (el frontend no se
usa aquí, se llama a los RPCs directamente):

```powershell
k6 run -e SUPABASE_URL=https://TU-PROYECTO.supabase.co `
        -e SUPABASE_ANON_KEY=sb_publishable_XXX `
        -e SCENARIO=load `
  --summary-export=docs/evidencias/rendimiento/PRF-06-k6-report.json `
  testing/performance/k6-load-test.js
```

Umbrales configurados en el script (fallan si se superan):
- Tasa de error **< 1 %**.
- **p95 < 1 s** para los RPC del mapa y el login.

> ⚠️ **Límites gratuitos**: Supabase free tiene cuota de requests y Render free
> hace sleep. Prueba con volúmenes **moderados**. Documenta el límite alcanzado
> como **observación**, no como fallo de la app.

### Qué se mide

| Caso | RPC / endpoint | Métrica |
|---|---|---|
| PRF-06 | `get_incidents_in_bounds` / `get_incident_heat_cells` | p95, errores |
| PRF-07 | `POST /auth/v1/token` (login) | p95, errores |
| PRF-08 | `searchPlaces` (Nominatim) | p95, errores, rate-limit |

> El script es de **solo lectura** (no crea reportes ni vota). La validación de
> **creación de reporte (PRF-09)** se omite en rendimiento por prudencia y
> porque requiere escribir datos; se cubre en las pruebas de integración.
