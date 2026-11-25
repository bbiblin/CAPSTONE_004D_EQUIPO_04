# Movimap — Mapa tecnológico BPMN (Nivel 0 y 1)

> Especificación del **mapa tecnológico de procesos** de Movimap en notación
> BPMN. Combina el **proceso de negocio** con los **componentes tecnológicos**
> que intervienen. El diagrama se dibuja a nivel **0 (contexto)** y **1
> (arquitectura de procesos)**.

---

## 1. Convenciones de nomenclatura y notación

- **Nombres de tareas**: verbo en infinitivo + objeto medible, minúsculas, sin
  artículos ni abreviaturas. Ej: `Reportar incidencia` (no "ficha de reporte").
- **Tecnología**: como etiqueta `<tech>` bajo la tarea; si es subproceso se usa
  shape de **call activity** (rectángulo con doble borde).
- **Shape mapeo**:

| Shape | Elemento BPMN |
|-------|---------------|
| ○ (círculo) | Evento de inicio/fin |
| ▭ (rectángulo) | Tarea |
| ▭ con doble borde | Subproceso |
| ◇ (rombo) | Gateway (decisión exclusiva `X`) |
| ▭ con división | Actividad de regla / compuerta |

---

## 2. Nivel 0 — Diagrama de contexto

Un **pool del sistema** (`Sistema Movimap`) y los **participantes externos** como
pools independientes que intercambian flujos de mensaje.

### Pools / carriles

| # | Pool / Carril | Rol |
|---|---------------|-----|
| P1 | **Ciudadano** | Registro, login, explora mapa, reporta, vota, denuncia |
| P2 | **Admin / Moderador** | Gestiona incidencias y denuncias, cambia estados |
| P3 | **Cliente BI** (analista/institucional) | Solo lectura del producto de datos (Power BI / CSV) |
| P4 | **Sistema Movimap** (pool interno) | Orquesta todo el negocio |
| L4.1 | — Frontend React | UI, validación (zod), moderación local (nsfwjs / bad-words) |
| L4.2 | — Supabase Auth | Registro/login, sesión, rol |
| L4.3 | — Supabase PostgreSQL | Modelo normalizado, RLS, triggers, vistas |
| L4.4 | — Supabase Storage | Bucket `incident-photos` |
| L4.5 | — Supabase Realtime | Push de eventos al mapa |
| L4.6 | — PostgREST (Data API) | Consultas/escrituras REST + export CSV |
| L4.7 | — **Nominatim / OpenStreetMap** (pool externo) | Geocoding / reverse-geocoding |

### Flujo de contexto (mensajes)

`Ciudadano → reporta/vota → Sistema` · `Sistema → Admin → modera → Sistema` ·
`Sistema → datos BI → Cliente BI (lectura)` · `Sistema → consulta → Nominatim`.

> El **producto de datos** se modela como un flujo de mensaje de salida del
> sistema hacia el Cliente BI (canal `bi_reader` / CSV).

---

## 3. Nivel 1 — Arquitectura de procesos (6 subprocesos)

> Cada subproceso es un **call activity** dentro del pool `Sistema Movimap`,
> desplegado con sus carriles (`[carriles]`).

### CP-1 · Autenticación `[Ciudadano | Sistema Auth]`
- **Tareas**: `Registrar cuenta` · `Validar email/contraseña` (zod) ·
  `Confirmar email` · `Crear perfil automáticamente` (trigger
  `handle_new_user`) · `Iniciar sesión` · `Cerrar sesión` · `Cargar perfil y rol`
- **Decisiones**: ¿Credenciales válidas? → iniciar sesión / mostrar error.
  ¿Cuenta verificada? → continuar / reenviar verificación.

### CP-2 · Exploración en el mapa `[Ciudadano | Frontend | PostgreSQL | Realtime | Nominatim]`
- **Tareas**: `Cargar mapa (Leaflet/OSM)` · `Definir bbox visible` ·
  `Obtener incidencias del viewport` (RPC `get_incidents_in_bounds`) ·
  `Buscar dirección` (Nominatim autocompletado) ·
  `Aplicar filtros categoría/estado/fecha` · `Suscribir canal realtime` ·
  `Renderizar markers / clusters / heatmap` · `Usar GPS (centrar/seguir)`
- **Decisiones**: ¿Zoom alto o bajo? → clusters + markers / heatmap.
  ¿Evento realtime dentro del bbox y rango temporal? → refrescar / ignorar.

### CP-3 · Reportar incidencia `[Ciudadano | Frontend | PostgreSQL | Storage | Nominatim]`
- **Tareas**: `Seleccionar ubicación (GPS / punto en mapa / buscador)` ·
  `Completar formulario (zod)` · `Moderar imagen (nsfwjs)` ·
  `Sanitizar descripción (bad-words)` · `Buscar incidencias cercanas`
  (RPC, 100 m) · `Guardar incidencia (estado nuevo)` · `Subir foto a Storage` ·
  `Registrar geografía y dirección (reverse-geocoding)`
- **Decisiones**: ¿Imagen supera umbral NSFW? → bloquear / aprobar.
  ¿Existe incidencia cercana? → **confirmar existente** (voto up) /
  **crear de todos modos**.

### CP-4 · Votación y denuncias `[Ciudadano | Frontend | PostgreSQL]`
- **Tareas**: `Ver detalle incidencia` · `Consultar mi voto` ·
  `Votar up/down/resuelta` · `Recargar score (conteos)` ·
  `Denunciar incidencia` (tabla `incident_reports`)
- **Decisiones**: ¿Ya voté? ¿Mismo voto? → `INSERT` / `UPDATE` / no-op.
  ¿Supera umbral (`downvote_threshold` / `resuelto_threshold`)? → ocultar de
  vista pública (persiste en admin/BI). ¿Ya denunciada? → "ya denunciada" /
  registrar.

### CP-5 · Panel admin `[Admin | Frontend | PostgreSQL]`
- **Tareas**: `Listar todas las incidencias (incl. ocultas)` ·
  `Cambiar estado incidencia` · `Registrar auditoría` (trigger
  `log_status_change`) · `Gestionar denuncias` · `Resolver o rechazar denuncia`
- **Decisiones**: ¿Cambio de estado válido para el flujo? → aplicar + audit /
  rechazar.

### CP-6 · Producto de datos / BI `[Cliente BI | PostgreSQL | PostgREST]`
- **Tareas**: `Mantener capa BI (vistas sin PII)` · `Exportar CSV
  (Accept: text/csv)` · `Conectar Power BI (bi_reader, session pooler + CA)` ·
  `Onboarding del cliente + términos de uso`
- **Decisiones**: ¿Import o DirectQuery? → snapshot / modelo directo.
  (No es gateway de proceso: es decisión de consumo.)

---

## 4. Complemento: C4 (arquitectura)

BPMN es para **proceso/negocio**; la parte **tecnológica** complementaria se
modela con **C4 nivel 1 (container)**, en `../c4-movimap.puml`:

- **Frontend React (SPA)** → Vite / TS
- **Supabase** → Auth · PostgREST · PostgreSQL (RLS/triggers/vistas) ·
  Storage · Realtime
- **Nominatim / OSM** (externo)
- **Power BI / Cliente** → `bi_reader` (session pooler)

> Resumen: BPMN nivel 0-1 para **cómo fluye el negocio**; C4 para **qué
> componentes intervienen**.
