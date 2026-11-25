# Movimap — Product Backlog (release 0.1)

> **Entregable:** inventario de **historias de usuario completadas** en el
> **release 0.1** de Movimap, listo para migrar a **GitHub Projects**
> (board con columnas **Todo / Backlog / Done**).
>
> **Convención de puntos:** Fibonacci (1, 2, 3, 5, 8).
>
> **Estados usados:**
> - ✅ **Done** — historia implementada y verificada.
> - 🟡 **Todo** / 🔵 **Backlog** — pendientes/ideas próximas (sección final).
>
> El **modelo de datos actual** no usa el campo `status` en las incidencias:
> la visibilidad para el usuario final es **derivada** (ver
> `docs/ESTADO-FUNCIONALIDADES.md` y
> `backend/migraciones/nuevo/21_remover_estados_por_umbrales.sql`). Las
> historias de este documento reflejan ese estado final.

---

## Tabla resumen (historias completadas)

| ID | Historia | Épica | Puntos | Estado |
|----|----------|-------|--------|--------|
| UH-01 | Registro de usuarios | Autenticación | 3 | ✅ Done |
| UH-02 | Inicio de sesión / cierre | Autenticación | 2 | ✅ Done |
| UH-03 | Perfil automático al registrarse | Autenticación | 2 | ✅ Done |
| UH-04 | Mapa interactivo de incidencias | Exploración | 5 | ✅ Done |
| UH-05 | Búsqueda de dirección (restringida a Chile) | Exploración | 3 | ✅ Done |
| UH-06 | Filtros por categoría y visibilidad | Exploración | 3 | ✅ Done |
| UH-07 | Actualización en tiempo real | Exploración | 3 | ✅ Done |
| UH-08 | Geolocalización y seguimiento | Geolocalización | 3 | ✅ Done |
| UH-09 | Reportes a nivel nacional | Geolocalización | 2 | ✅ Done |
| UH-10 | Reportar incidencia | Reportes | 5 | ✅ Done |
| UH-11 | Subir evidencia fotográfica | Reportes | 3 | ✅ Done |
| UH-12 | Ver detalle de incidencia (página dedicada) | Incidentes / detalle | 2 | ✅ Done |
| UH-13 | Votar (confirmar / rechazar / resuelta) | Incidentes / detalle | 5 | ✅ Done |
| UH-14 | Cambiar de voto sin duplicados | Incidentes / detalle | 3 | ✅ Done |
| UH-15 | Score / confirmaciones dinámicos | Incidentes / detalle | 5 | ✅ Done |
| UH-16 | Ocultar por umbral ("resuelta" y negativos) | Incidentes / detalle | 5 | ✅ Done |
| UH-17 | Denunciar incidencia | Incidentes / detalle | 3 | ✅ Done |
| UH-18 | Actividad del usuario | Actividad | 3 | ✅ Done |
| UH-19 | Panel admin: gestión de incidencias | Administración | 5 | ✅ Done |
| UH-20 | Panel admin: gestión de denuncias | Administración | 3 | ✅ Done |
| UH-21 | Auditoría de cambios | Administración | 3 | ✅ Done |
| UH-22 | Capa de datos BI (`bi.incident_daily`) | BI / Datos | 5 | ✅ Done |
| UH-23 | Exportación CSV vía PostgREST | BI / Datos | 3 | ✅ Done |
| UH-24 | Rol de solo lectura para Power BI | BI / Datos | 3 | ✅ Done |
| UH-25 | Eliminación del rol "institution" | Refactor | 3 | ✅ Done |
| UH-26 | Normalización del modelo de datos | Refactor | 8 | ✅ Done |
| UH-27 | Diseño responsive (nav superior/inferior) | UI/UX | 3 | ✅ Done |
| UH-28 | Ampliación de la capa BI (atributos de negocio) | BI / Datos | 5 | ✅ Done |
| UH-29 | Vista de denuncias anonimizadas | BI / Datos | 5 | ✅ Done |
| UH-30 | Onboarding de cliente + términos de uso del dato | BI / Datos | 3 | ✅ Done |
| UH-31 | Términos y Condiciones 1.0 + consentimiento | Términos y consentimiento | 5 | ✅ Done |
| UH-32 | Carga del mapa por viewport (bbox) | Rendimiento del mapa | 5 | ✅ Done |
| UH-33 | Clustering + heatmap por zoom | Rendimiento del mapa | 5 | ✅ Done |
| UH-34 | Caché por zona (FIFO) del mapa | Rendimiento del mapa | 5 | ✅ Done |
| UH-35 | Filtro temporal del mapa | Rendimiento del mapa | 3 | ✅ Done |
| UH-36 | Agregados por celda para el heatmap | Rendimiento del mapa | 5 | ✅ Done |
| UH-37 | Geocoding Chile + geografía administrativa | Reportes | 5 | ✅ Done |
| UH-38 | Deduplicación al reportar | Reportes | 5 | ✅ Done |
| UH-39 | Reportes cercanos a un destino | Reportes | 3 | ✅ Done |
| UH-40 | Moderación de imágenes (NSFW) | Moderación de contenido | 5 | ✅ Done |
| UH-41 | Moderación de texto (malas palabras) | Moderación de contenido | 5 | ✅ Done |
| UH-42 | Compresión de imágenes | Moderación de contenido | 3 | ✅ Done |
| UH-43 | Moderación: ocultar / restaurar incidencia | Administración | 3 | ✅ Done |
| UH-44 | Ver detalle de incidencia en admin | Administración | 2 | ✅ Done |
| UH-45 | Capa BI geo-temporal (geografía + tiempo) | BI / Datos | 8 | ✅ Done |
| UH-46 | Guía de demo de Power BI | BI / Datos | 2 | ✅ Done |
| UH-47 | Sistema de diseño / UI kit | UI/UX | 5 | ✅ Done |
| UH-48 | Botón "volver" / PageHeader | UI/UX | 2 | ✅ Done |
| UH-49 | PWA instalable y soporte offline | UI/UX | 5 | ✅ Done |
| UH-50 | Ajustes visuales, assets de marca y fix de popup | UI/UX | 3 | ✅ Done |
| UH-51 | Visibilidad derivada (eliminación del campo `status`) | Refactor | 8 | ✅ Done |
| UH-52 | Cache busting del frontend (PWA) para actualizar dispositivos | UI/UX | 3 | ✅ Done |

**Total de historias completadas: 52**
**Total de puntos (historias): 204**

**Total de tareas técnicas (Task/Bug): 9**
**Total de puntos (tareas técnicas): 29**
**Esfuerzo total del release: 233 puntos**

### Subtotal por épica

| Épica | Historias | Puntos |
|-------|-----------|--------|
| Autenticación | 3 | 7 |
| Términos y consentimiento | 1 | 5 |
| Exploración | 4 | 14 |
| Rendimiento del mapa | 5 | 23 |
| Geolocalización | 2 | 5 |
| Reportes | 5 | 21 |
| Moderación de contenido | 3 | 13 |
| Incidentes / detalle | 6 | 23 |
| Actividad | 1 | 3 |
| Administración | 5 | 16 |
| BI / Datos | 8 | 34 |
| UI/UX | 6 | 21 |
| Refactor | 3 | 19 |
| **Total** | **52** | **204** |

---

## Épica: Autenticación

### UH-01 — Registro de usuarios  ✅ `⏱ 3`

**Como** ciudadano,
**quiero** crear una cuenta con email, contraseña y nombre,
**para que** pueda participar en la plataforma y reportar incidencias.

**Criterios de aceptación:**
- Formulario de registro con email, contraseña (mín. 6 caracteres) y nombre.
- Validación de email y contraseña mediante zod.
- La cuenta se registra con `display_name` y estado de consentimiento (ver UH-31).
- Pantalla de confirmación de email al registrarse.
- Manejo y visualización de errores de registro.

### UH-02 — Inicio de sesión / cierre de sesión  ✅ `⏱ 2`

**Como** usuario,
**quiero** iniciar y cerrar sesión,
**para que** mi estado quede autenticado en la aplicación.

**Criterios de aceptación:**
- Pantalla de login con email y contraseña.
- Botón para cerrar sesión en el menú/actividad.
- Redirección al inicio tras el login y al salir.

### UH-03 — Perfil automático al registrarse  ✅ `⏱ 2`

**Como** usuario,
**quiero** que mi perfil de usuario se cree automáticamente,
**para que** no tenga que completar datos de forma manual.

**Criterios de aceptación:**
- Trigger `handle_new_user` crea el registro en `profiles` al registrarse.
- El rol por defecto es `user`.

---

## Épica: Términos y consentimiento

### UH-31 — Términos y Condiciones 1.0 + consentimiento  ✅ `⏱ 5`

**Como** usuario,
**quiero** aceptar los Términos y Condiciones y el consentimiento de
fotografías,
**para que** pueda contribuir (reportar, votar, denunciar) de forma informada.

**Criterios de aceptación:**
- Páginas `/terms` y `/privacy` con el texto completo de los Términos y
  Condiciones y de la Política de Privacidad 1.0 (`TERMS_VERSION` /
  `PRIVACY_VERSION`), como documentos **separados**.
- Al registrarse se capturan `terms_accepted`, `photo_consent` y
  `terms_version` (el consentimiento de la Política de Privacidad se muestra por
  separado en la UI pero se acepta junto con los términos, sin columna propia en
  la BD).
- `TermsGate` bloquea las acciones que requieren consentimiento (reportar,
  votar, denunciar) hasta aceptarlo.
- `accept_terms(p_terms_version, p_accept_terms, p_accept_photo)` actualiza el
  consentimiento en `profiles` y registra la trazabilidad.
- Consentimiento de **fotografías** tratado por separado: sin él no se puede
  subir evidencia fotográfica.
- Al intentar votar/denunciar sin haber aceptado, se ofrece el modal de
  consentimiento en `IncidentDetailPage`.

---

## Épica: Exploración

### UH-04 — Mapa interactivo de incidencias  ✅ `⏱ 5`

**Como** visitante,
**quiero** ver las incidencias en un mapa interactivo,
**para que** pueda ubicarlas geográficamente de forma visual.

**Criterios de aceptación:**
- Mapa Leaflet/OpenStreetMap con panel de filtros (desktop) y buscador.
- Marcadores coloreados por **severidad** con popups (severidad, confirmaciones,
  imagen, enlace a detalle completo).
- Enlace a detalle completo desde el popup y desde el listado.
- Lista lateral de incidencias (desktop) y bottom-sheet (móvil), titulada
  "Reportes recientes" **sin contador**.
- Los marcadores excluyen incidencias ocultas por umbral, con rechazos altos o
  dadas de baja por moderación (visibilidad derivada).

### UH-05 — Búsqueda de dirección (restringida a Chile)  ✅ `⏱ 3`

**Como** visitante,
**quiero** buscar una dirección o lugar,
**para que** pueda navegar rápido a una zona de interés.

**Criterios de aceptación:**
- Búsqueda con autocompletado vía Nominatim (OpenStreetMap).
- Restringida a Chile: se filtra por `countrycodes=cl` y se refuerza con el
  `country_code` de cada resultado (`PlaceSearchInput`/`searchPlaces`).
- Selección de un resultado y visualización/centrado en el mapa.
- En el detalle, la ubicación muestra un enlace "Abrir en Google Maps".

### UH-06 — Filtros por categoría y visibilidad  ✅ `⏱ 3`

**Como** visitante,
**quiero** filtrar las incidencias por categoría,
**para que** pueda enfocarme en lo que me interesa.

**Criterios de aceptación:**
- Selector de categoría (chips: "Todas" + las 8 categorías).
- El listado y el mapa se actualizan según el filtro.
- El filtro de **estado** se reemplaza por la **visibilidad derivada**:
  `activo`, `inactivo_rechazo`, `inactivo_resuelta`, `oculto_moderacion`.

### UH-07 — Actualización en tiempo real  ✅ `⏱ 3`

**Como** usuario,
**quiero** ver las incidencias nuevas o actualizadas al instante,
**para que** el mapa se mantenga actualizado sin recargar.

**Criterios de aceptación:**
- Suscripción a cambios (INSERT/UPDATE/DELETE) vía Supabase Realtime (WebSocket).
- Solo se actualizan incidencias **dentro del bbox visible** y **dentro del
  rango temporal** seleccionado; las de fuera se ignoran.
- Al llegar un INSERT/UPDATE se invalida la celda de caché y se refresca desde
  la vista pública; al DELETE se elimina del estado.
- Es push (sin polling) y con tope de estado (`VIEWPORT_MAX_INCIDENTS`).

---

## Épica: Rendimiento del mapa

### UH-32 — Carga del mapa por viewport (bbox)  ✅ `⏱ 5`

**Como** usuario,
**quiero** que el mapa cargue solo los reportes del área visible,
**para que** funcione fluido aunque haya miles de reportes.

**Criterios de aceptación:**
- RPC `get_incidents_in_bounds(minLat, maxLat, minLng, maxLng, category, since,
  limit)` sobre la vista pública y con grants a `anon`/`authenticated`.
- Detección del viewport vía `moveend`/`zoomend` (no `move`, para no disparar
  por cada píxel) con debounce (`VIEWPORT_DEBOUNCE_MS = 250`).
- Al cambiar el bbox se re-fetchea y se reemplaza el estado; los que salen del
  viewport se descartan.
- Tope de estado (500) para no acumular reportes fuera de pantalla.

### UH-33 — Clustering + heatmap por zoom  ✅ `⏱ 5`

**Como** usuario,
**quiero** que el mapa agrupe los puntos según el zoom,
**para que** no se rendericen miles de marcadores a la vez.

**Criterios de aceptación:**
- **A zoom bajo** (`zoom <= HEATMAP_MAX_ZOOM = 13`) se pinta un **heatmap** de
  densidad real (agregados por celda del backend, ver UH-36), no marcadores.
- **A zoom alto** se muestran **clústeres** (`MarkerClusterGroup`,
  `maxClusterRadius = 60`) y marcadores individuales por severidad.
- Transición entre modos según zoom sin romper la UX.

### UH-34 — Caché por zona (FIFO) del mapa  ✅ `⏱ 5`

**Como** usuario,
**quiero** que el mapa no re-consulte las zonas ya visitadas,
**para que** el pan/zoom sea fluido y con pocas consultas al backend.

**Criterios de aceptación:**
- Hook `useZoneCache`: grilla de celdas (derivadas de `zoom` + bbox) con caché
  en memoria; al panear se piden **solo las celdas que faltan**.
- Tope FIFO/LRU (`maxCells = 40`); al superarlo se descarta la celda más antigua.
- Invalidación por realtime: `invalidatePoint` (INSERT) y `invalidate`
  (UPDATE/DELETE) para marcar celdas a re-consultar.
- Al cambiar el rango temporal o la categoría se descarta todo el caché.

### UH-35 — Filtro temporal del mapa  ✅ `⏱ 3`

**Como** usuario,
**quiero** elegir el periodo de reportes a mostrar,
**para que** el mapa no intente mostrar todo el histórico a la vez.

**Criterios de aceptación:**
- Selector de rango temporal: "Últimos 14 días / Último mes / Últimos 3 meses"
  (`DATE_RANGE_OPTIONS`); el valor por defecto es "Últimos 3 meses".
- El `since` se pasa al RPC `get_incidents_in_bounds`, a los agregados del
  heatmap y al filtro de realtime.
- No existe la opción "Todo": siempre hay un tope de 3 meses (decisión de
  producto).

### UH-36 — Agregados por celda para el heatmap  ✅ `⏱ 5`

**Como** usuario,
**quiero** que el mapa de calor refleje la densidad real de la zona,
**para que** el total sea fiel aunque haya más de 500 reportes.

**Criterios de aceptación:**
- RPC `get_incident_heat_cells(bounds, since, cell_deg, category)` que devuelve
  **una fila por celda** (`cell_lat`, `cell_lng`, `weight`, `count`).
- El tamaño de celda (`cellDegForZoom`) se ajusta para que se vean similares a
  distintos zooms.
- El heatmap usa `leaflet.heat` con peso por conteo (escala logarítmica),
  degradado suave sin rojo fuerte y margen (padding) para no ver círculos
  transitorios al zoomear.

---

## Épica: Geolocalización

### UH-08 — Geolocalización y seguimiento  ✅ `⏱ 3`

**Como** usuario,
**quiero** usar mi ubicación GPS en el mapa,
**para que** pueda centrar el mapa y ver mi posición.

**Criterios de aceptación:**
- Hook `useGeolocation`: obtener posición actual, seguimiento (`watch`), stop y
  manejo de errores (permiso, no disponible, timeout).
- Controles GPS en el mapa (`LocationControls`): centrar/actualizar y seguir en
  tiempo real.

### UH-09 — Reportes a nivel nacional  ✅ `⏱ 2`

**Como** usuario,
**quiero** reportar incidencias en cualquier punto del país,
**para que** pueda registrar problemas en toda Chile y no solo en Providencia.

**Criterios de aceptación:**
- Sin bloqueo geográfico: se aceptan reportes en todo Chile.
- Buscador de dirección/lugar (geocoding Nominatim) para posicionar el punto.
- El mapa permite navegar/posicionar a nivel nacional (`MIN_ZOOM = 6`) y el
  heatmap cubre esa escala.

---

## Épica: Reportes

### UH-10 — Reportar incidencia  ✅ `⏱ 5`

**Como** ciudadano,
**quiero** reportar una incidencia con su ubicación,
**para que** quede registrada para su revisión por la comunidad y la autoridad.

**Criterios de aceptación:**
- Formulario con categoría, descripción (mín. **1 carácter**, máx. 500),
  severidad (1–3), fecha de observación, duración (`temporal`/`permanente`) y
  ubicación.
- Validación completa con zod.
- Selección de ubicación por **GPS**, por **punto en el mapa** (con selector
  fullscreen en móvil) o por **buscador de dirección/lugar**.
- Guardado de la incidencia con desplazamiento/teléfono... no: guarda con
  visibilidad `activo` (implícita) y muestra pantalla de éxito.
- El reporte queda **protegido por `TermsGate`** (requiere consentimiento) y
  solo si el usuario ha aceptado las condiciones.

### UH-11 — Subir evidencia fotográfica  ✅ `⏱ 3`

**Como** ciudadano,
**quiero** adjuntar una foto a mi reporte,
**para que** la evidencia respalde la incidencia.

**Criterios de aceptación:**
- Subida opcional de imagen (JPG/PNG/WebP) con validación de tipo.
- La imagen se **comprime** antes de subir (ver UH-42) y se pasa por
  **moderación NSFW** (ver UH-40).
- Requiere haber aceptado el consentimiento de fotografías.
- Persistencia en el bucket `incident-photos` y almacenamiento de la URL.

### UH-37 — Geocoding Chile + geografía administrativa  ✅ `⏱ 5`

**Como** usuario/reportador,
**quiero** que al fijar la ubicación se capture el lugar y la geografía
administrativa,
**para que** el producto de datos tenga contexto geográfico fiable.

**Criterios de aceptación:**
- `reverseGeocode(lat, lng)` (Nominatim, `addressdetails=1`) obtiene `place_name`
  y `address` y la jerarquía `country/region/province/comuna`,
  `neighbourhood/street/house_number`.
- La búsqueda en el reporte usa `searchPlaces` restringida a Chile
  (`countrycodes=cl`).
- `createIncident` guarda todos esos campos en `incidents`.
- La capa BI los expone en las vistas analíticas.

### UH-38 — Deduplicación al reportar  ✅ `⏱ 5`

**Como** ciudadano,
**quiero** que se me avise si la incidencia ya fue reportada cerca,
**para que** no cree duplicados.

**Criterios de aceptación:**
- Al fijar ubicación + categoría, se consulta `find_nearby_incidents(lat, lng,
  categoría, 100 m)` (caché debounced 350 ms).
- Si hay reportes cercanos se muestra el bloque "Esto ya fue reportado cerca"
  con opciones **Confirmar** (vota `up` y navega al detalle) o **Crear de todos
  modos** (bloqueo suave), con botón **Ver detalle**.
- `22_detalle_reporte_cercano.sql` hace que el RPC devuelva además `image_url` y
  `created_at` para ver foto/fecha/descripción del cercano.

### UH-39 — Reportes cercanos a un destino  ✅ `⏱ 3`

**Como** visitante,
**quiero** ver los reportes cercanos a una dirección buscada,
**para que** pueda evaluar el entorno de un lugar antes de ir.

**Criterios de aceptación:**
- Al seleccionar un resultado del buscador, se muestra el panel "Reportes
  cercanos" (`find_nearby_incidents` a 250 m, todas las categorías) con
  distancia, categoría y score.
- Centra/zoom el mapa al destino y muestra panel lateral (desktop) / bottom-sheet
  (móvil).
- Se puede cerrar el panel y liberar la búsqueda (quitar el pin).

---

## Épica: Moderación de contenido

### UH-40 — Moderación de imágenes (NSFW)  ✅ `⏱ 5`

**Como** plataforma,
**quiero** detectar imágenes inapropiadas antes de publicarlas,
**para que** la evidencia subida cumpla con los términos de uso.

**Criterios de aceptación:**
- Clasificación **local** con `nsfwjs` (TensorFlow.js) en `imageModeration.ts`,
  sin APIs externas.
- Se bloquea si supera umbrales (`Porn`/`Hentai` > 0.6 o `Sexy` > 0.8).
- Modelo cargado en `lazy` (primer uso) para no inflar el bundle inicial.
- Al bloquear, se pide reemplazar la foto y no se envía.

### UH-41 — Moderación de texto (malas palabras)  ✅ `⏱ 5`

**Como** plataforma,
**quiero** censurar lenguaje ofensivo en las descripciones,
**para que** la comunidad mantenga un ambiente respetuoso.

**Criterios de aceptación:**
- Sanitización al enviar con `bad-words` + `profanity-words.json`
  (español + modismos chilenos) en `textFilter.ts`.
- Cada palabra detectada se reemplaza por `***` (no se anula la descripción).
- Detección **obfuscación-robusta**: insensible a tildes/mayúsculas/letras
  repetidas y admite separadores no-alfabéticos (`m/i/e/r/d/a`), manteniendo
  límites de palabra para evitar falsos positivos.
- Lista editable en `frontend/src/data/profanity-words.json`.

### UH-42 — Compresión de imágenes  ✅ `⏱ 3`

**Como** ciudadano,
**quiero** que mis fotos se compriman antes de subir,
**para que** suba rápido y no exceda los límites.

**Criterios de aceptación:**
- `processImage(file)` en `imageCompression.ts` normaliza y comprime la imagen
  (dimensión/calidad) a un tamaño razonable.
- Valida el tamaño de entrada (tope 30 MB) y el tamaño final (2 MB).
- Integrado en el flujo de `EvidenceUploader`/`ReportPage` previo a moderación.

---

## Épica: Incidentes / detalle

### UH-12 — Ver detalle de incidencia (página dedicada)  ✅ `⏱ 2`

**Como** visitante,
**quiero** ver el detalle completo de una incidencia en una página dedicada,
**para que** pueda entender su estado, severidad y evidencia.

**Criterios de aceptación:**
- Ruta `/incident/:id` (`IncidentDetailPage`) con descripción, imagen, estado
  (visibilidad), severidad, score, votos y ubicación en mapa.
- Acceso desde el mapa (popup → "Ver detalle completo"), el listado, la
  actividad y los reportes cercanos.
- Estados de carga, "no encontrada" y botón "Volver al mapa".

### UH-13 — Votar (confirmar / rechazar / resuelta)  ✅ `⏱ 5`

**Como** usuario,
**quiero** confirmar, rechazar o marcar una incidencia como resuelta,
**para que** la comunidad valide la incidencia.

**Criterios de aceptación:**
- Tres botones de voto: Confirmar (up), Rechazar (down), Marcar resuelta.
- Resaltado del voto activo del usuario.
- Un solo voto por usuario e incidencia (`unique(incident_id, user_id)`).
- Requiere sesión y haber aceptado los Términos y Condiciones (con modal de
  consentimiento).
- Manejo de estados de carga, resultados y errores.

### UH-14 — Cambiar de voto sin duplicados  ✅ `⏱ 3`

**Como** usuario,
**quiero** cambiar mi voto en una incidencia,
**para que** pueda corregir mi opinión sin errores.

**Criterios de aceptación:**
- Detección del voto previo y `UPDATE` (no `INSERT`) al cambiar de opción.
- Sin violaciones de RLS ni filas duplicadas.

### UH-15 — Score / confirmaciones dinámicos  ✅ `⏱ 5`

**Como** usuario,
**quiero** ver score = confirmaciones − rechazos calculados dinámicamente,
**para que** la métrica siempre sea correcta sin datos inconsistentes.

**Criterios de aceptación:**
- Las vistas calculan `score` (up − down) en tiempo real desde `incident_votes`.
- Para el **usuario final** el score se calcula en el **frontend**
  (`computeScore`); para el **admin** la vista `incidents_with_stats` lo expone.
- El frontend refresca el score desde el servidor tras votar.

### UH-16 — Ocultar por umbral ("resuelta" y negativos)  ✅ `⏱ 5`

**Como** usuario,
**quiero** que las incidencias con muchos votos de "resuelta" o muchos rechazos
dejen de mostrarse,
**para que** el mapa muestre solo incidencias vigentes.

**Criterios de aceptación:**
- Umbrales configurable por incidencia: `resuelto_threshold` (por defecto 3) y
  `downvote_threshold` (por defecto 4).
- La vista pública y los RPCs (`get_incidents_in_bounds`, `get_heatmap_data`,
  `get_incident_heat_cells`) excluyen incidencias superadas.
- En el detalle se avisa "Se ocultará automáticamente al llegar a N...".
- Los casos ocultos sí aparecen en la capa BI (con su visibilidad derivada).

### UH-17 — Denunciar incidencia  ✅ `⏱ 3`

**Como** usuario,
**quiero** denunciar una incidencia,
**para que** el administrador la revise por separado de los votos.

**Criterios de aceptación:**
- Botón "Denunciar incidencia" en el detalle.
- Registro en `incident_reports` con estado `pendiente`.
- Manejo de duplicados ("ya denunciada", código `23505`) y confirmación al
  usuario.
- Denuncias visibles solo para admin (RLS).
- Requiere sesión y consentimiento.

---

## Épica: Actividad

### UH-18 — Actividad del usuario  ✅ `⏱ 3`

**Como** usuario,
**quiero** ver mis reportes y mis acciones,
**para que** tenga visibilidad sobre mi participación.

**Criterios de aceptación:**
- Pestañas **Mis reportes**, **Mis acciones** y **General**.
- **Mis reportes:** incidencias creadas por el usuario (con estado/visibilidad
  y score).
- **Mis acciones:** votos del usuario (confirmado/rechazado/marcada resuelta).
- **General:** incidencias populares ordenadas por score.
- Navegación al detalle desde cada tarjeta.

---

## Épica: Administración

### UH-19 — Panel admin: gestión de incidencias  ✅ `⏱ 5`

**Como** administrador,
**quiero** ver y gestionar todas las incidencias,
**para que** pueda moderar y revisar su visibilidad.

**Criterios de aceptación:**
- Listado de todas las incidencias (incluidas las ocultas por umbral) con
  filtros por **visibilidad**, **categoría** y **rango de fechas**.
- Detalle con severidad, duración, score, confirmaciones/rechazos y evidencia.
- Ya no se "cambia estado" manualmente: la visibilidad es derivada de los
  votos/umbrales y de la **moderación** (ocultar/restaurar, ver UH-43).
- Acceso restringido a rol `admin`.

### UH-20 — Panel admin: gestión de denuncias  ✅ `⏱ 3`

**Como** administrador,
**quiero** revisar y gestionar las denuncias de incidencias,
**para que** pueda resolverlas o rechazarlas.

**Criterios de aceptación:**
- Pestaña "Denuncias" con contador de pendientes.
- Datos del denunciante y motivo.
- Acciones "Marcar resuelta" y "Rechazar denuncia".
- Acceso a "Dar de baja"/"Restaurar" la incidencia denunciada y "Ver detalle".

### UH-21 — Auditoría de cambios  ✅ `⏱ 3`

**Como** administrador,
**quiero** registrar los cambios de estado (visibilidad) y los votos,
**para que** exista trazabilidad de las acciones.

**Criterios de aceptación:**
- Trigger `log_status_change` para cambios de visibilidad/estado.
- Trigger `log_vote_action` para votos
  (`incident_upvoted`, `incident_downvoted`, `incident_voted_resolved`).
- Tabla `audit_log` con RLS solo-admin.

### UH-43 — Moderación: ocultar / restaurar incidencia  ✅ `⏱ 3`

**Como** administrador,
**quiero** dar de baja (ocultar) o restaurar una incidencia,
**para que** pueda moderar contenido sin depender solo de los votos.

**Criterios de aceptación:**
- `hideIncident(id, moderatorId, reason)` setea `hidden_at`/`hidden_by`/
  `hidden_reason`; `restoreIncident(id)` los limpia.
- Botón "Dar de baja" (con motivo opcional) y "Restaurar" en el detalle y en
  las denuncias.
- Las incidencias dadas de baja no aparecen para el usuario final
  (`oculto_moderacion`).

### UH-44 — Ver detalle de incidencia en admin  ✅ `⏱ 2`

**Como** administrador,
**quiero** ver el detalle completo de una incidencia desde el panel,
**para que** pueda analizarla antes de moderarla.

**Criterios de aceptación:**
- Panel de detalle al seleccionar una incidencia del listado.
- Muestra severidad, duración, fechas, score, confirmaciones, rechazos/umbral,
  votos "resuelta", estado de moderación (motivo de baja), evidencia y ubicación
  en mapa.
- Acceso directo a la pestaña de denuncias de esa incidencia.

---

## Épica: BI / Datos

### UH-22 — Capa de datos para BI (`bi.incident_daily`)  ✅ `⏱ 5`

**Como** equipo de datos/cliente,
**quiero** una vista analítica agregada por incidencia,
**para que** pueda consumir el producto de datos.

**Criterios de aceptación:**
- Esquema `bi` con la vista `bi.incident_daily` (una fila por incidencia).
- Columnas: categoría, severidad, estado/visibilidad, fecha, ubicación, umbrales,
  votos y score.
- Acceso restringido a `service_role` / `bi_reader` (no anon/authenticated).

### UH-23 — Exportación CSV vía PostgREST  ✅ `⏱ 3`

**Como** integración,
**quiero** exportar la vista analítica a CSV,
**para que** pueda ingestar los datos en herramientas externas.

**Criterios de aceptación:**
- Vistas espejo `public.analytics_incident_daily` y
  `public.analytics_incident_reports_daily` (PostgREST no refleja el esquema `bi`).
- Soporte de cabecera `Accept: text/csv` y filtros por fecha/estado.

### UH-24 — Rol de solo lectura para Power BI  ✅ `⏱ 3`

**Como** analista de BI,
**quiero** conectar Power BI con un usuario de solo lectura,
**para que** pueda consultar datos sin privilegios de escritura.

**Criterios de aceptación:**
- Rol `bi_reader` con `LOGIN` y sin DDL/DML.
- `SELECT` solo sobre las vistas de datos (conector Postgres vía session pooler).
- No usar el usuario superusuario `postgres`.

### UH-28 — Ampliación de la capa BI (atributos de negocio)  ✅ `⏱ 5`

**Como** cliente/institucional,
**quiero** una vista analítica más completa por incidencia,
**para que** pueda analizar la gestión y resolución de incidencias.

**Criterios de aceptación:**
- `bi.incident_daily` ampliada con `description`, `observed_date`, `updated_at`,
  `resolved_at`, `has_resolved_by`, `image_url`, `resolution_days` y conteos de
  denuncias por estado.
- Vistas espejo en `public` actualizadas y acceso restringido a
  `service_role` / `bi_reader`.

### UH-29 — Vista de denuncias anonimizadas  ✅ `⏱ 5`

**Como** cliente/institucional,
**quiero** una vista de denuncias sin datos personales,
**para que** pueda analizar motivos y estados sin PII.

**Criterios de aceptación:**
- Vista `bi.incident_reports_daily` **sin** `reported_by`.
- Columnas: incidencia, categoría, severidad, estado, motivo, fechas y ubicación
  (+ geografía).
- `public.analytics_incident_reports_daily` para export CSV.

### UH-30 — Onboarding de cliente + términos de uso del dato  ✅ `⏱ 3`

**Como** equipo comercial,
**quiero** una guía de conexión y términos de uso,
**para que** cada cliente pueda incorporar el dato de forma segura y normalizada.

**Criterios de aceptación:**
- `docs/bi-client-onboarding.md` (credenciales, session pooler, certificado CA).
- `docs/data-dictionary.md` (diccionario de columnas).
- `docs/terms-of-use.md` (plantilla de licencia del dato).

### UH-45 — Capa BI geo-temporal (geografía + tiempo)  ✅ `⏱ 8`

**Como** cliente/institucional,
**quiero** analizar los datos por geografía administrativa y por dimensiones
temporales,
**para que** pueda ver ubicación y estacionalidad del reporte.

**Criterios de aceptación:**
- Geografía admin (Chile): `country/region/province/comuna` +
  `neighbourhood/street/house_number` y `estimated_duration`.
- Dimensión temporal del reporte en `America/Santiago`: `created_at`,
  `report_date` (local), `report_hour`, `report_day_of_week`, `report_month`,
  `report_week`.
- Recrea las vistas BI y re-aplica grants a `bi_reader`/`service_role`
  (`17_bi_geo_temporal.sql`).
- Las vistas se calculan sobre las tablas base (sin ETL): se reflejan de
  inmediato (Power BI mediante **DirectQuery**).

### UH-46 — Guía de demo de Power BI  ✅ `⏱ 2`

**Como** equipo de datos,
**quiero** una guía paso a paso para demostrar la capa BI,
**para que** el cliente vea el valor del producto de datos.

**Criterios de aceptación:**
- `docs/bi-powerbi-guia.md` (conexión, modelo, consumo CSV/PostgreREST).
- `docs/bi-guia-demo.md` (paso a paso de visuales e indicaciones).
- Verificación del rol `bi_reader` activo y de las dos vistas analíticas
  devolviendo datos.

---

## Épica: UI/UX

### UH-27 — Diseño responsive (nav superior/inferior)  ✅ `⏱ 3`

**Como** usuario,
**quiero** una navegación adaptable a móvil y escritorio,
**para que** la experiencia sea cómoda en cualquier dispositivo.

**Criterios de aceptación:**
- Barra de navegación superior en desktop y **barra inferior** con iconos en
  móvil (`BottomNavigation`).
- `AppLayout` + `MobileHeader` + `Sidebar`.
- Enlace Admin solo para admin; regiones del mapa/listado responsivas.

### UH-47 — Sistema de diseño / UI kit  ✅ `⏱ 5`

**Como** equipo de producto,
**quiero** un kit de componentes UI consistente,
**para que** la interfaz sea uniforme y mantenible.

**Criterios de aceptación:**
- Componentes base: `Button`, `Card`, `Chip`, `Icon`, `Alert`, `Badge`, `Modal`,
  `Input`/`Textarea`, `Select`, `IconButton`.
- Componentes de reporte: `ReportCard`, `ReportStatus`, `SeveritySelector`,
  `EvidenceUploader`.
- Estilos de tema en `Tailwind` (coolores `on-surface`, `secondary-container`,
  etc.) y utilidad `cn`.
- Refactor de las páginas para usar el kit.

### UH-48 — Botón "volver" / PageHeader  ✅ `⏱ 2`

**Como** usuario,
**quiero** poder regresar fácilmente en las vistas,
**para que** no pierda el contexto al explorar.

**Criterios de aceptación:**
- `PageHeader` con título/subtítulo/icono y `backToHome`.
- Botón `BackButton` (flecha atrás) en reporte, detalle, login y registro.

### UH-49 — PWA instalable y soporte offline  ✅ `⏱ 5`

**Como** visitante,
**quiero** instalar la app y que cargue los estilos/estructura sin conexión,
**para que** acceda rápido y sin depender de la red.

**Criterios de aceptación:**
- `manifest.json` (display `standalone`, `theme_color`, iconos 192/512) y
  `sw.js`.
- Service worker registrado en `main.tsx` en producción (y desregistrado en
  desarrollo).
- Caché de la app shell (`/`, `/index.html`, `/manifest.json`) y estrategia
  cache-first.

### UH-50 — Ajustes visuales, assets de marca y fix de popup  ✅ `⏱ 3`

**Como** usuario,
**quiero** una experiencia visual pulida y estable,
**para que** la marca sea consistente y el mapa no parpadee.

**Criterios de aceptación:**
- Assets de marca (favicon, iconos y `design/*.png`) y `index.html` con metadatos.
- Ajuste del tamaño del heatmap para que sea más discreto.
- Corregido el **parpadeo del popup** de la burbuja del reporte
  (memoización del contenido del popup).

### UH-52 — Cache busting del frontend (PWA) para actualizar dispositivos  ✅ `⏱ 3`

**Como** usuario/operador,
**quiero** que el dispositivo que ya abrió Movimap reciba la versión nueva de la
app sin quedarse con una versión antigua del caché,
**para que** las mejoras y correcciones se vean de inmediato en el móvil.

**Criterios de aceptación:**
- El service worker usa estrategias **network-first** para la navegación (el
  HTML nuevo, que apunta a los assets con hash nuevos, se obtiene si hay red; en
  offline cae a caché) y **stale-while-revalidate** para los assets (JS/CSS
  same-origin).
- La versión del caché es **dinámica** (`CACHE_NAME = 'movimap-' + <buildId>`):
  un plugin de build (`inject-sw-version`, `vite.config.ts`) inyecta un id único
  en `dist/sw.js`, de modo que el archivo cambia de bytes en cada deploy y el
  navegador reinstala el SW y **purga los cachés viejos**.
- En `main.tsx` (producción) se hace `registration.update()` al cargar y una
  **recarga automática** en `controllerchange`, solo si ya había un SW controlando
  la página (para no recargar en la primera visita).
- Las peticiones cross-origin a Supabase no se cachean (solo GET same-origin).
- Al publicar `frontend/dist` en Netlify, el teléfono que ya tenía la app se
  actualiza en la primera visita.

---

## Épica: Refactor

### UH-25 — Eliminación del rol "institution"  ✅ `⏱ 3`

**Como** equipo de producto,
**quiero** eliminar el rol institucional,
**para que** no existan roles obsoletos (negocio: reventa de datos).

**Criterios de aceptación:**
- Rol `profiles.role` limitado a `('user', 'admin')`.
- Perfiles `institution` reasignados a `user`.
- Eliminadas RPC `get_dashboard_stats` y la página/dashboard del frontend.

### UH-26 — Normalización del modelo de datos  ✅ `⏱ 8`

**Como** equipo de datos,
**quiero** normalizar votos y denuncias en tablas dedicadas,
**para que** el modelo sea consistente y aditivo.

**Criterios de aceptación:**
- Tablas `incident_votes` y `incident_reports` dedicadas.
- Migración de `incident_actions` → `incident_votes` (mapeo de opciones) y
  eliminación de `incident_actions`.
- Vistas de score dinámicas y RLS sin `security definer` (`security_invoker`).
- Índices en las columnas más consultadas (ubicación, estado, categoría,
  `created_at`, votos, denuncias).

### UH-51 — Visibilidad derivada (eliminación del campo `status`)  ✅ `⏱ 8`

**Como** equipo de producto,
**quiero** eliminar el campo `status` de las incidencias y derivar la
visibilidad,
**para que** la moderación y el ocultamiento sean automáticos y consistentes.

**Criterios de aceptación:**
- `21_remover_estados_por_umbrales.sql` elimina `incidents.status` y agrega
  `hidden_at/hidden_by/hidden_reason` (baja por moderación).
- La visibilidad del usuario final se deriva de `votes_down`/`votes_resuelta`
  vs. umbrales y del flag de moderación
  (`activo` / `inactivo_rechazo` / `inactivo_resuelta` / `oculto_moderacion`).
- Las vistas BI exponen una columna derivada `visibility`.
- Se eliminaron los estados manuales (`nuevo`, `confirmado`, `en_revision`,
  `resuelto`, `rechazado`, `expirado`) del producto; el aviso de ocultamiento
  en el detalle informa de los umbrales.

---

## Tareas técnicas / configuración (con puntos)

> Estas tareas **no** son historias de usuario (no entregan valor directo al
> usuario), pero fueron parte del esfuerzo del release y **sí suman puntos** al
> total del proyecto. En GitHub Projects se migran como tipo
> **`Task` / `Bug`** (en lugar de `Story`), conservando sus puntos.

| ID | Tarea técnica | Tipo | Puntos | Nota / evidencia |
|----|---------------|------|--------|------------------|
| TT-01 | Configuración inicial del proyecto (scaffolding) | Task | 5 | Vite + React + TS + Tailwind, `vite.config.ts`, `tsconfig`, `postcss`, dependencias (`5ecd64f`). |
| TT-02 | Configuración de entorno y variables frontend + fix `VITE_*` | Task | 2 | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, `frontend/.env`, `vite-env.d.ts` (`5ecd64f`, `37a1be8`). |
| TT-03 | Integración y configuración base de Supabase | Task | 3 | Cliente (`supabase.ts`), Auth, Storage, Realtime, tipos/constantes base. |
| TT-04 | Reorganización de migraciones SQL y esquema canónico | Task | 5 | `backend/migraciones/` con `legacy/`, `nuevo/` (idempotente) y `limpieza/`; `00_esquema_actual.sql`; orden en `README.md`. |
| TT-05 | Datos de prueba / seed demo | Task | 3 | `01_seed_demo.sql` (~20 incidencias / ~35 días) y `02_seed_demo_santiago_masivo.sql` (~3.500 reportes). |
| TT-06 | Limpieza de datos demo + scripts de utilidad | Task | 3 | `limpieza_datos_demo.sql` y `frontend/scripts/limpiar_photos.mjs`. |
| TT-07 | Deploy y assets PWA | Task | 3 | `public/_redirects`, `manifest.json`, `sw.js`, favicon/iconos. El `sw.js` con **cache busting** (network-first + stale-while-revalidate y versión dinámica via plugin `inject-sw-version`) ya se refleja en **UH-52**. |
| TT-08 | Documentación técnica y diagramas de arquitectura | Task | 3 | `docs/diagramas/c4-contexto.puml`, `c4-contenedores.puml`, `flujo-reporte.puml`; `docs/arquitectura-datos-decisiones.md`, `data-dictionary.md`, guías BI y `terms-of-use.md`. |
| TT-09 | Fixes y estabilización de la capa BI | Bug | 2 | `fixes BI`, `fix img / bi` (`487629c`, `ebe25e8`). |

**Subtotal tareas técnicas: 9 · 29 puntos.**

<details>
<summary>Nota sobre lo que ya está contado como historia (no se duplica)</summary>

- **Cache busting / actualización del service worker** → cubierto en **UH-52**.
- **Fix parpadeo del popup + ajuste del heatmap + assets de marca** → cubierto en **UH-50**.
- **QoA selección de mapa en el reporte (selector fullscreen)** → cubierto en **UH-10**.
- **PWA instalable / soporte offline** (manifest + `sw.js` + app shell) → cubierto en **UH-49**.
</details>

---

## Backlog / Próximas

> Pendientes/ideas **no** completadas en el release 0.1, para el siguiente ciclo.

- 🟡 **Venta formal multi-cliente del dato:** emitir credenciales/roles (y
  permisos de lectura) por cliente y plan de suscripción.
- 🟡 **Pruebas end-to-end:** votar, cambiar voto, denunciar, ocultamiento por
  umbral y dedup.
- 🔵 **Verificación automatizada del ocultamiento por umbral** en el mapa/detalle.
- 🔵 **Notificaciones y flujo de seguimiento** para el usuario.
- 🔵 **Revisión de la agregación por celda/H3** para volúmenes muy extremos.

---

*Documento generado a partir del historial de git y del estado actual del
código (backend + frontend). Se propone migrar cada historia (UH-*) a un issue
en GitHub Projects como tipo `Story` con la columna `Done`, y cada tarea técnica
(TT-*) como tipo `Task` / `Bug` con la columna `Done`, conservando los puntos de
cada una.*
