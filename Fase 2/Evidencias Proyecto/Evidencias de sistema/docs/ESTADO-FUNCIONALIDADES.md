# Movimap — Estado del proyecto y funcionalidades completadas

> Documento vivo que resume **todo lo construido hasta el momento** en Movimap,
> separado por capa (backend / frontend). Sirve como inventario de entregables.

---

## 1. Resumen del proyecto

**Movimap** es una plataforma de **reportes de incidencias de accesibilidad urbana**
(veredas, rampas, iluminación, ascensores, etc.) en la **comuna de Providencia**.
Permite a los ciudadanos reportar, confirmar/rechazar y denunciar incidencias,
y a los administradores moderarlas. Como **producto de datos**, la información
geo-referenciada se exporta a herramientas de BI externas (p. ej. **Power BI**).

### Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Leaflet (`react-leaflet`), Supabase JS, `react-hook-form`/zod, `recharts`, `nsfwjs` + TensorFlow.js, `bad-words`, `lucide-react` |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime + PostgREST) |
| Datos | Esquema normalizado en PostgreSQL, capa BI (`bi` + `public.analytics_*`), rol de solo lectura `bi_reader` |

### Arquitectura y repositorio

```
movimap/
├── backend/migraciones/nuevo/   # scripts SQL del esquema actual normalizado (idempotentes)
├── frontend/                    # app React (Vite + Supabase)
├── docs/                        # documentación (datos, BI, estado)
└── README.md
```

### Orden de aplicación de migraciones (proyecto nuevo desde cero)

Para un proyecto nuevo se aplica, en orden:

1. `nuevo/00_esquema_actual.sql` (esquema **final** completo: tablas, BI
   geo-temporal, deduplicación, RPCs; sin `status`)
2. `nuevo/14_bi_reader_role.sql` (rol `bi_reader`)
3. `nuevo/18_terms_consent.sql` (consentimiento de términos/fotos + RLS endurecida)
4. `nuevo/01_seed_demo.sql` (datos de prueba)

> `00_esquema_actual.sql` ya contiene el estado final. Los scripts `16`/`17`/`19`/
> `20`/`21`/`22` son migraciones **incrementales** para bases existentes (ya
> aplicadas en producción); no se aplican en un proyecto nuevo.
> Los **dos órdenes** (el antiguo usado en producción y el nuevo recomendado)
> están detallados en `backend/migraciones/README.md`.

### Conteo de esfuerzo del proyecto (release 0.1)

- **52 historias de usuario** (`UH-01`…`UH-52`) → **204 puntos**.
- **9 tareas técnicas / configuración** (`TT-01`…`TT-09`, tipo `Task`/`Bug`) →
  **29 puntos**: scaffolding, entorno `VITE_*`, integración Supabase,
  reorganización de migraciones y esquema canónico, seed demo, limpieza de datos,
  deploy/PWA assets, documentación + diagramas y fixes de la capa BI.
- **Total de esfuerzo del release: 233 puntos.**

> Detalle y criterios en `docs/PRODUCT-BACKLOG.md` (sección "Tareas técnicas /
> configuración (con puntos)"). Para GitHub Projects: `UH-*` → tipo `Story`,
> `TT-*` → tipo `Task`/`Bug`.

---

## 2. Backend (Supabase)

### 2.1 Modelo de datos normalizado

- **`profiles`** — extensiones de `auth.users`. Campos: `display_name`, `role`
  (`'user' | 'admin'`), `organization_name`, timestamps.
- **`incidents`** — incidencias reportadas. Campos: categoría, descripción
  (mín. 1 carácter, máx. 500), lat/lng, severidad (1–3), fecha de observación, duración
  estimada (`temporal | permanente`), `image_url`, `resuelto_threshold`
  (umbral configurable, por defecto 3), `downvote_threshold` (por defecto 4),
  `created_by`, `resolved_at`, `resolved_by`, más contextualización geográfica
  (`place_name`, `address`, `country`, `region`, `province`, `comuna`,
  `neighbourhood`, `street`, `house_number`) y **moderación**
  (`hidden_at`, `hidden_by`, `hidden_reason`). **Sin** el campo `status` y
  **sin** columnas denormalizadas `score` / `confirmation_count`: la
  visibilidad del usuario final es **derivada**.
- **`incident_votes`** — votos de la comunidad (3 opciones: `up`, `down`,
  `resuelta`). Restricción `unique(incident_id, user_id)` → **un voto por
  usuario e incidencia**; cambiar de opción es un `UPDATE`, no un `INSERT`.
- **`incident_reports`** — denuncias de incidencias (desacopladas de los votos),
  con `status` (`pendiente | resuelto | rechazado`) y `unique(incident_id, reported_by)`.
- **`audit_log`** — auditoría de eventos (cambios de estado, votos).
- **Índices** en las columnas más consultadas (ubicación, estado, categoría,
  `created_at`, votos, denuncias).

### 2.2 Funciones y triggers automáticos

- **`handle_new_user()`** — crea automáticamente el perfil al registrarse un usuario.
- **`log_status_change()`** — registra en `audit_log` los cambios de estado de incidencia.
- **`log_vote_action()`** — registra en `audit_log` la creación/cambio de votos
  (`incident_upvoted`, `incident_downvoted`, `incident_voted_resolved`).

### 2.3 Visibilidad / score / confirmaciones (vistas)

La visibilidad de una incidencia es **derivada** (sin campo `status`) mediante
`getIncidentVisibility` (regla espejo en backend):

| Visibilidad | Condición |
|---|---|
| `activo` | Votos y moderación por debajo de los umbrales |
| `inactivo_rechazo` | `votes_down >= downvote_threshold` |
| `inactivo_resuelta` | `votes_resuelta >= resuelto_threshold` |
| `oculto_moderacion` | `hidden_at` definido (baja por moderación) |

- **`incidents_with_stats`** — todos los datos de incidencias **más** `votes_up`,
  `votes_down`, `votes_resuelta` y `score` (up − down) calculados en tiempo real
  desde `incident_votes`. Se usa para **admin**.
- **`incidents_public`** — vista para el usuario final: excluye incidencias
  ocultas por umbral (`votes_resuelta >= resuelto_threshold`,
  `votes_down >= downvote_threshold`) y las dadas de baja por moderación
  (`hidden_at`). Se usa en el mapa y lista pública.

### 2.4 RPC

- **`get_heatmap_data(start, end)`** — devuelve puntos (lat/lng/weight) para el
  **mapa de calor**, con margen temporal parametrizado y excluyendo incidencias
  ocultas por umbral y dadas de baja por moderación.
- **`get_incident_heat_cells(minLat, maxLat, minLng, maxLng, since, cell_deg,
  category)`** — devuelve **agregados por celda** (`cell_lat`, `cell_lng`,
  `weight`, `count`) para que el heatmap refleje la **densidad real** aunque
  haya >500 reportes (`nuevo/20_mapa_filtro_temporal.sql`).
- **`get_incidents_in_bounds(minLat, maxLat, minLng, maxLng, category?, since?,
  limit?)`** — devuelve los reportes **del área visible (bbox)** para la carga
  por viewport del mapa, con filtros opcionales de categoría/periodo y tope.
  Respeta el ocultamiento (downvotes/resuelta) y la moderación porque consulta
  la vista `incidents_public` (`nuevo/19_mapa_masivo.sql`).

### 2.5 Seguridad (RLS)

- RLS habilitado en **todas** las tablas (`profiles`, `incidents`,
  `incident_votes`, `incident_reports`, `audit_log`).
- Operaciones de usuario resueltas con **RLS nativo** (sin `security definer`):
  - Ver votos: cualquiera (público).
  - Crear/actualizar/borrar: **solo los propios** votos.
  - Crear/actualizar: **solo propias** denuncias; ver/actualizar/borrar denuncias:
    **solo admin**.
  - Incidencias: cualquiera ve; autenticado crea la propia; admin puede
    actualizar/eliminar cualquier.
  - `audit_log`: solo admin puede leer.
- Vistas con `security_invoker = true` para que respeten el RLS de las tablas base.

### 2.6 Storage

- **Bucket `incident-photos`** (público) para subir evidencia fotográfica.
- Políticas: cualquiera ve fotos; el usuario sube/actualiza/elimina **sus** fotos;
  el admin puede eliminar cualquier foto.

### 2.7 Capa de Business Intelligence (producto de datos)

- **Esquema `bi`** con la vista **`bi.incident_daily`**: una fila por incidencia
  con categoría, severidad, estado, descripción, **`estimated_duration`**,
  **geografía admin (Chile)** `country/region/province/comuna` + **desglose de
  dirección** `neighbourhood/street/house_number`, **dimensión temporal** del
  reporte (`created_at`, `report_date` local, `report_hour`, `report_day_of_week`,
  `report_month`, `report_week`, en `America/Santiago`), fechas
  (`observed_date`, `updated_at`, `resolved_at`), `has_resolved_by`, ubicación,
  `image_url`, `resolution_days`, `resuelto_threshold`, `downvote_threshold`,
  votos por tipo, `score` y conteos de denuncias por estado
  (`reports_total/pending/resolved/rejected`).
- **`bi.incident_reports_daily`** — vista de **denuncias anonimizadas**
  (sin `reported_by`): una fila por denuncia con `reason`, estado y contexto
  geográfico (`category`, `severity`, `estimated_duration`, ubicación,
  `country/region/province/comuna`, dirección desglosada).
- **Tiempo real**: las vistas BI se calculan sobre las tablas base (sin ETL ni
  materialización), por lo que **cada reporte/voto se refleja de inmediato**.
  Para que un consumidor (Power BI) refleje cada cambio debe usar **DirectQuery**.
- **`public.analytics_incident_daily`** y **`public.analytics_incident_reports_daily`**
  — vistas espejo en `public` (PostgREST no refleja el esquema `bi`), para exportación **CSV**.
- **Exportación CSV vía PostgREST** con `Accept: text/csv`.
- **Rol `bi_reader`** de solo lectura para **Power BI** (conector Postgres vía
  **session pooler**), con `SELECT` únicamente sobre las vistas de datos.
- **Seguridad**: el producto de datos se lee **solo** con `service_role` /
  `bi_reader`; `anon` y `authenticated` están revocados. Datos **sin PII**.
- **Onboarding y distribución**: `docs/data-dictionary.md` (diccionario),
  `docs/bi-client-onboarding.md` (conexión + certificado CA) y
  `docs/terms-of-use.md` (licencia del dato).

### 2.8 Limpieza / decisiones de negocio

- **Eliminado el rol `institution`** y reasignados sus perfiles a `'user'`.
- **Eliminadas** la RPC obsoleta `get_dashboard_stats` y la página/web de
  dashboard institucional.
- **Eliminada** la tabla `incident_actions` (sustituida por `incident_votes`).
- **Eliminado el campo `status`** de `incidents` (`21_remover_estados_por_umbrales.sql`):
  la visibilidad del usuario final es derivada (umbrales y moderación), con
  `hidden_at/hidden_by/hidden_reason` para la baja por moderación.

### 2.9 Datos de prueba

- **`01_seed_demo.sql`** — inserta un set **rico** para demo/análisis: 20
  incidencias en todas las categorías (severidades 1–3, con distintas
  **visibilidades derivadas**: activas, ocultas por rechazos, ocultas por
  "resuelta" y dadas de baja por moderación), con fechas
  (`observed_at`/`created_at`/`resolved_at`) distribuidas en ~35 días, votos
  `up`/`down`/`resuelta` de varios usuarios y denuncias con motivo y estado.
  Incluye casos ocultos por umbral (downvotes y votos "resuelta") que **sí**
  aparecen en la capa BI. Requiere el usuario `admin@movimap.cl` con rol admin
  (usa además cualquier otro perfil existente como votante/denunciante).
- **`02_seed_demo_santiago_masivo.sql`** — demo **masiva** (~3.500 reportes por
  el Gran Santiago) para llenar la capa BI con volumen. Crea sus propios
  usuarios demo (`demo.movimap.N@movimap.cl`).

---

## 3. Frontend (React + Vite + Supabase)

### 3.1 Autenticación y perfil

- **Registro** de usuario con email/contraseña + nombre (`signUp`), con pantalla
  de confirmación de email.
- **Inicio de sesión / cierre de sesión** (`signIn` / `signOut`).
- Carga automática del **perfil** (`getProfile`) y reactividad del estado de
  sesión (sesión activa ↔ perfil).
- Rutas protegidas según **rol**: `/report` y `/activity` requieren sesión;
  `/admin` requiere rol `admin`.

### 3.2 Exploración en el mapa (Home)

- **Mapa interactivo** con Leaflet (OpenStreetMap).
- **Carga por viewport (bbox)**: solo se piden los reportes del área visible
  (RPC `get_incidents_in_bounds`, tope 500) con **debounce**; al mover/zoomear
  se re-fetch y se reemplaza el estado. **No** se cargan todos los reportes a la vez.
- **Caché por zona (FIFO)**: hook `useZoneCache` — no re-consulta celdas ya
  visitadas al panear (tope 40 celdas), con invalidación por realtime.
- **Filtro temporal**: chips "Últimos 14 días / Último mes / Últimos 3 meses"
  (defecto 3 meses) que se pasan a la carga por viewport, al heatmap y al realtime.
- **Marcadores por severidad** con colores y **popups** de detalle (severidad,
  confirmaciones, imagen, enlace a detalle completo).
- **Clustering (zoom alto)** y **heatmap (zoom bajo)**: a nivel país/región se
  pinta un **mapa de calor** servido por el backend como **agregados por celda**
  (`get_incident_heat_cells`, densidad real) en vez de miles de markers; al
  acercar se muestran **clústeres + markers** individuales por severidad.
- **Búsqueda de dirección/ubicación** vía **Nominatim** (OpenStreetMap),
  **restringida a Chile** (`countrycodes=cl`), con autocompletado y selección.
- **Reportes cercanos a un destino (Fase 3)**: al seleccionar un resultado de
  búsqueda, muestra un panel "Reportes cercanos" (250 m, todas las categorías)
  con distancia, categoría y score, y centra/zoom el mapa al destino (panel
  lateral en desktop, bottom-sheet en mobile).
- **Filtros** por categoría (chips) en el listado (filtrado en cliente); la
  visibilidad es derivada.
- **Lista lateral** de incidencias (desktop) y **lista tipo bottom-sheet** (móvil),
  **sin contador** ("Reportes recientes").
- Botón flotante (FAB) para **reportar** desde el mapa (móvil).
- **Actualización en tiempo real** (Supabase Realtime, por **WebSocket**) al
  crear/actualizar/borrar incidencias; se refresca desde la vista pública **solo
  si el evento cae dentro del bbox visible y del rango temporal** (los de fuera
  se ignoran). Es push, no polling.
- **Formulario de login inline** (desktop) sobre el mapa.

### 3.3 Geolocalización y zona de reporte

- `useGeolocation` hook: obtener posición actual, seguimiento (watch), stop,
  y manejo de errores (permiso, no disponible, timeout).
- Control GPS en el mapa: **centrar/actualizar ubicación** y **seguir en tiempo
  real**.
- **Cobertura nacional**: los reportes se aceptan en cualquier punto del mapa
  de Chile (no hay límite de zona). `MIN_ZOOM` está ajustada para permitir
  navegar y posicionar a nivel de país.

### 3.4 Reporte de incidencia

- Formulario completo con **validación (zod)**: categoría, descripción
  (mín. 1 carácter, máx. 500), severidad (1–3), fecha de observación, duración,
  ubicación y foto opcional. **Protegido por `TermsGate`** (requiere aceptar
  Términos y consentimiento de fotografías).
- Selección de ubicación por **GPS**, por **punto en el mapa** (con selector
  interactivo y fullscreen en móvil) o por **buscador de dirección/lugar**
  (geocoding Nominatim de todo Chile).
- **Cobertura nacional**: se aceptan reportes en cualquier zona de Chile.
- **Contexto geográfico**: al fijar el punto se hace `reverseGeocode`
  (Nominatim) y se guarda `place_name`, `address` y la jerarquía
  `country/region/province/comuna/neighbourhood/street/house_number`.
- **Subida de evidencia fotográfica** con validación de tipo (JPG/PNG/WebP),
  **compresión** (`processImage`) y **moderación NSFW** (`moderateImage`).
- Guarda la incidencia (sin `status`, visibilidad `activo` implícita) y muestra
  pantalla de éxito.
- **Deduplicación al reportar (Fase 1)**: al fijar ubicación + categoría, el
  sistema consulta incidencias cercanas (RPC `find_nearby_incidents`, 100 m) y, si
  hay, ofrece **Confirmar existente** (voto `up` y navegación al detalle) o
  **Crear de todos modos** (bloqueo suave), con **Ver detalle** del cercano.
### 3.5 Detalle de incidencia (página dedicada)

- Página `/incident/:id` que muestra descripción, imagen, **visibilidad**
  (derivada), severidad, **score y confirmaciones**, ubicación en mapa y enlace a
  Google Maps.
- **Votación** con 3 opciones: **Confirmar** (up), **Rechazar** (down),
  **Marcar resuelta** (resuelta). Resalta el voto activo del usuario.
- **Cambio de voto** (de una opción a otra) sin duplicados.
- **Denunciar incidencia** (reporte), con confirmación y manejo de duplicados
  ("ya denunciada").
- Refresca el **score** desde la vista del servidor tras votar.
- **Advertencias de umbral**: avisa "Se ocultará automáticamente al llegar a N
  rechazos/votos de resuelta" cuando está cerca del límite.
- Requiere sesión y haber aceptado los **Términos y Condiciones** (modal de
  consentimiento en el propio detalle).

### 3.6 Actividad del usuario

- Pestañas **Mis reportes**, **Mis acciones** y **General**.
- **Mis reportes**: incidencias creadas por el usuario (con visibilidad y score).
- **Mis acciones**: votos del usuario (confirmado/rechazado/marcada resuelta).
- **General**: incidencias populares ordenadas por **score**.
- Modal de detalle reutilizable.

### 3.7 Panel de administración

- Listado de **todas** las incidencias (incluidas las ocultas por umbral),
  con filtros por **visibilidad**, categoría y rango de fechas.
- **Detalle** con severidad, duración, fechas, score, confirmaciones, rechazos
  vs. umbral, votos "resuelta", estado de moderación, evidencia y ubicación.
- **Moderación**: botón **Dar de baja** (con motivo) y **Restaurar** para
  ocultar/volver a mostrar una incidencia al usuario final (ya no se cambia un
  `status` manual; la visibilidad es derivada).
- **Gestión de denuncias**: lista de reportes con contador de pendientes,
  datos del denunciante, y acciones **marcar resuelta / rechazar**, con acceso a
  la incidencia implicada.

### 3.8 Diseño y navegación

- **Responsive**: barra de navegación superior (desktop) y **barra inferior**
  (móvil) con iconos (`BottomNavigation`).
- `AppLayout` + `MobileHeader` + `Sidebar` + `PageHeader` + `BackButton`.
- **Enlace Admin** solo visible para usuarios `admin`.
- **Sistema de diseño / UI kit**: `Button`, `Card`, `Chip`, `Icon`, `Alert`,
  `Badge`, `Modal`, `Input`/`Textarea`, `Select`, `IconButton` y componentes de
  reporte (`ReportCard`, `ReportStatus`, `SeveritySelector`, `EvidenceUploader`),
  con tema en Tailwind y utilidad `cn`.
- Componentes compartidos: `MapView`, `LocationControls`, `TermsGate`,
  `TermsConsent`.

### 3.9 Términos y consentimiento / PWA

- **Términos y Política de Privacidad** (`TERMS_VERSION = '1.0'`, documentos
  **separados** en `/terms` y `/privacy`): `TermsGate` bloquea
  reportar/votar/denunciar hasta aceptar; en la UI el usuario marca por separado
  los T/C, la Política de Privacidad y el consentimiento de fotografías, pero en
  la BD se registran con las columnas existentes (`accepted_terms_at` y
  `accepted_photo_consent_at`), ya que se aceptan juntos;
  `accept_terms(p_terms_version, p_accept_terms, p_accept_photo)` persiste el
  consentimiento (incluido el **consentimiento de fotografías**).
- **PWA instalable**: `manifest.json` (display `standalone`, iconos 192/512) y
  service worker `sw.js` registrado en `main.tsx` en producción, con caché de la
  app shell.

### 3.10 Moderación de contenido

> Implementación actual: moderación **local** de imágenes (NSFW) y de la
> descripción (malas palabras). Sin servicios de API externos.

- **Imágenes (capa NSFW, `src/lib/imageModeration.ts`):** al elegir/cargar una
  foto, se clasifica localmente con **nsfwjs** (TensorFlow.js). Si la imagen
  supera los umbrales (`Porn`/`Hentai` > 0.6 o `Sexy` > 0.8) se bloquea
  inmediatamente y el usuario debe reemplazar la evidencia. El modelo se carga
  en `lazy` (primer uso) para no inflar el bundle inicial.
- **Texto (capa local, `src/lib/textFilter.ts` + `src/data/profanity-words.json`):**
  la descripción se sanitiza al enviar con **bad-words** (base en inglés) sumado
  a la lista de `profanity-words.json` (español + modismos chilenos). Cada
  palabra detectada se reemplaza por `***`; **no** se anula la descripción.
  La detección es **obfuscación-robusta**: insensible a tildes, mayúsculas y
  letras repetidas, y admite letras separadas por caracteres no-alfabéticos
  (`m/i/e/r/d/a`, `mi er da`), manteniendo límites de palabra para evitar
  falsos positivos. Para agregar palabras se edita el JSON (una cadena por entry).
- **Registro:** por decisión, el reject NSFW **no** se persiste en la base de
  datos (no hay tabla de auditoría de moderación).

### 3.11 Utilidades y tipos

- **Tipos** compartidos (`Incident`, `Profile`, `VoteAction`, `IncidentReport`,
  `AuditLog`, `HeatmapPoint`, etc.).
- **Constantes** de categorías, severidades, duraciones, colores, límites de zona
  y validaciones.
- **Helpers** de formato de fecha, categoría, severidad, duración, y utilidades
  de zona/categoría.

---

## 4. Pendientes conocidos (backlog futuro)

- [ ] Verificar el ocultamiento por umbral (D3) en el mapa/detalle con una
      incidencia que supere el umbral.
- [ ] Pruebas end-to-end: votar, cambiar voto, denunciar y ocultamiento por umbral.
- [x] Verificar `00_esquema_actual.sql` en Supabase y las vistas BI ampliadas
      (verificadas en producción; ambas vistas devuelven datos).
- [x] Demostrar la capa BI con Power BI: rol `bi_reader` activo (conexión al
      session pooler verificada) + guía de demo en `docs/bi-guia-demo.md`.
- [ ] Emitir credenciales/roles por cliente para la venta formal del dato (multi-cliente).
```
