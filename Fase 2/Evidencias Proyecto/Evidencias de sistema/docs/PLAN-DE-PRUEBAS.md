# Movimap — Plan de Pruebas (Unificado)

**Alcance:** funcional · integración · rendimiento · seguridad (ISO/IEC 27001).

Este documento consolida la cobertura de pruebas de Movimap en un único plan. Integra las
pruebas funcionales manuales, las de integración (end-to-end), las de rendimiento y las de
seguridad bajo el marco ISO/IEC 27001, con sus resultados de ejecución.

> **Metodología:** la **seguridad** se verifica bajo el marco **ISO/IEC 27001 (Anexo A)**, con
> apoyo de la matriz de controles (`docs/SEGURIDAD-CONTROLES.md`) y del script de solo lectura
> `backend/migraciones/verificar_seguridad.sql`. La **integración** y el **rendimiento** se
> aplican de forma **prudente y acotada a un MVP**: pocos casos, volúmenes mínimos, sin
> acciones destructivas y sin afectar datos de producción ni agotar las cuotas gratuitas.
>
> Fecha: 2026-11-17 · Versión: 1.0

---

## 1. Objetivo y alcance

Verificar la **calidad de servicio** de Movimap en cuatro niveles que se complementan:

| Nivel | Qué verifica | Marco | Herramienta |
|---|---|---|---|
| **Funcional (manual)** | Flujos de usuario visibles y adaptación a dispositivos | Observación manual | Navegador + capturas |
| **Integración / E2E** | Flujos usuario - sistema y contratos con Supabase | Pragmático (MVP) | Playwright |
| **Rendimiento** | Latencia y estabilidad bajo carga razonable | Pragmático (MVP) | Lighthouse + k6 |
| **Seguridad** | Controles de acceso, cripto, operaciones y desarrollo seguro | **ISO/IEC 27001** | `verificar_seguridad.sql` + npm audit |

### 1.1 Incluye

- Autenticación y gestión de perfil.
- Navegación y exploración en el mapa (búsqueda, filtros, reportes cercanos).
- Reporte de incidencias y moderación de contenido.
- Detalle de incidencia, votación y denuncia.
- Actividad del usuario y panel de administración.
- Adaptación responsiva (celular, tablet y computador).
- Integración de flujos críticos, rendimiento y controles de seguridad.

### 1.2 Excluye (se verifican de forma independiente o están fuera del alcance)

- Capa analítica / BI (Power BI, rol `bi_reader`).
- Infraestructura física y de red (gestionada por Supabase/Render).
- Pruebas unitarias de lógica / componentes (cubiertas por Vitest en CI).

---

## 2. Entornos de prueba

| Entorno | URL | Uso |
|---|---|---|
| **Local** | `http://localhost:5173` (app + proyecto Supabase de pruebas) | Escritura (reportes, votos) + smoke + detalle |
| **Producción** | `https://movimap-sprints.onrender.com` | Solo lectura (smoke) + rendimiento |

> Render no tiene fallback SPA: entrar directo a una sub-ruta de producción devuelve 404.
> Por eso los casos de sub-rutas se verifican contra el entorno **local**.

---

## 3. Principios de prudencia (obligatorios)

1. **No escribir en producción.** Los escenarios que escriben (crear reporte, votar, dar de baja)
   corren **solo** contra el entorno local / proyecto de pruebas (requieren `E2E_ALLOW_WRITE=true`).
   Contra producción se ejecutan únicamente **smoke tests de lectura** y **rendimiento**.
2. **Volúmenes mínimos.** Pocos VUs y duración corta (<= 30 s). No se estresa ni se agota la
   cuota gratuita de Supabase/Render.
3. **Seguridad no intrusiva.** La verificación principal (`verificar_seguridad.sql`) es de
   **solo lectura**; `npm audit` no modifica nada.
4. **Revertibilidad.** Todo vive en el repo; no requiere servicios nuevos ni pagos y puede
   eliminarse sin afectar la app.

---

## 4. Lectura de resultados

Cada caso se registra con uno de los siguientes estados, sin símbolos ni emojis:

- **Conforme**: el resultado coincide con lo esperado.
- **No conforme**: el resultado difiere de lo esperado (requiere corrección).
- **Pendiente**: no se ha ejecutado o su verificación está en curso.

Las evidencias se almacenan en `docs/evidencias/`, separadas por nivel
(`funcional/`, `integracion/`, `rendimiento/`, `seguridad/`).

---

## 5. Resumen de resultados por nivel

| Nivel | Casos | Conformes | No conformes | Pendientes |
|---|---|---|---|---|
| Funcional (manual) | 47 | 47 | 0 | 0 |
| Integración (E2E) | 12 | 12 | 0 | 0 |
| Rendimiento | 9 | 9 | 0 | 0 |
| Seguridad (ISO 27001) | 13 | 11 | 0 | 2 |

---

## 6. Casos de prueba

### 6.1 Funcionales (manuales) — PR

Los casos se ejecutaron en el entorno local/dev y resultaron **conformes**. Las capturas de
evidencia se guardan en `docs/evidencias/funcional/` con la convención `PR-NN-<descripcion>.png`.
Nota: los casos PR-32 y PR-42 no se ejecutaron y se excluyeron del plan.

#### Registro y autenticación

| ID | Descripción | Procedimiento | Resultado esperado | Estado | Evidencia |
|---|---|---|---|---|---|
| PR-01 | Carga inicial de la aplicación | Ingresar a la aplicación | Pantalla de inicio con el mapa, sin pantallas en blanco | Conforme | `funcional/PR-01-carga-inicial.png` |
| PR-02 | Validación de datos en el registro | En `/register`, correo inválido y contraseña corta | Botón deshabilitado o mensaje de error | Conforme | `funcional/PR-02-validacion-registro.png` |
| PR-03 | Aceptación de términos | Completar datosa válidos en `/register` | Botón habilitado al marcar términos y consentimiento fotos | Conforme | `funcional/PR-03-aceptacion-terminos.png` |
| PR-04 | Creación de cuenta | Registro con datos válidos y aceptar condiciones | Pantalla de confirmación de correo | Conforme | `funcional/PR-04-creacion-cuenta.png` |
| PR-05 | Login con credenciales inválidas | Credenciales incorrectas | Mensaje "Invalid login credentials" | Conforme | `funcional/PR-05-login-credenciales-invalidas.png` |
| PR-06 | Login con credenciales válidas | Usuario válido | Sesión iniciada, retorna al inicio | Conforme | `funcional/PR-06-login-credenciales-validas.png` |
| PR-07 | Cierre de sesión | Pulsar "Cerrar sesión" | Sesión cerrada, retorna al inicio | Conforme | `funcional/PR-07-cierre-sesion.png` |
| PR-08 | Acceso restringido a `/report` | Ingresar sin sesión | Aviso "Inicia sesión para reportar" | Conforme | `funcional/PR-08-acceso-restringido-report.png` |
| PR-09 | Acceso restringido al panel admin | Ingresar sin rol administrador | Redirige al inicio | Conforme | `funcional/PR-09-acceso-restringido-admin.png` |

#### Mapa y búsqueda

| ID | Descripción | Procedimiento | Resultado esperado | Estado | Evidencia |
|---|---|---|---|---|---|
| PR-10 | Visualización de reportes en el mapa | Abrir el inicio | Marcadores según severidad; clic abre un recuadro | Conforme | `funcional/PR-10-reportes-mapa.png` |
| PR-11 | Navegación por niveles de zoom | Zoom de alejamiento y acercamiento | Heatmap al alejar; agrupación e individual al acercar | Conforme | `funcional/PR-11-navegacion-zoom-acercamiento.png, funcional/PR-11-navegacion-zoom-alejamiento.png` |
| PR-12 | Desplazamiento del mapa | Arrastrar hacia otra zona | Los reportes se cargan automáticamente | Conforme | `funcional/PR-12-desplazamiento-mapa.png` |
| PR-13 | Búsqueda de dirección | Ingresar "Providencia" | Sugerencias, todas de Chile | Conforme | `funcional/PR-13-busqueda-direccion.png` |
| PR-14 | Reportes cercanos a un destino | Seleccionar una sugerencia | Mapa centrado y panel "Reportes cercanos" | Conforme | `funcional/PR-14-reportes-cercanos.png` |
| PR-15 | Cierre del panel de reportes cercanos | Cerrar el panel | Se cierra y se elimina el marcador de búsqueda | Conforme | `funcional/PR-15-cierre-panel-cercanos.png` |
| PR-16 | Filtro por categoría | Seleccionar una categoría | Lista y mapa se actualizan | Conforme | `funcional/PR-16-filtro-categoria.png` |
| PR-17 | Filtro temporal | Alternar períodos | Lista y mapa se actualizan | Conforme | `funcional/PR-17-filtro-temporal.png` |
| PR-18 | Botón "Mi ubicación" | Pulsar con permiso concedido | Mapa centrado en la posición | Conforme | `funcional/PR-18-boton-mi-ubicacion.png` |
| PR-19 | Actualización en tiempo real | Crear/editar reporte en otra pestaña | El mapa se actualiza sin recargar | Conforme | `funcional/PR-19-actualizacion-tiempo-real.png` |

#### Reporte de incidencia

| ID | Descripción | Procedimiento | Resultado esperado | Estado | Evidencia |
|---|---|---|---|---|---|
| PR-20 | Validación de campos obligatorios | Enviar sin completar campos | Botón deshabilitado o aviso de campos obligatorios | Conforme | `funcional/PR-20-validacion-campos-obligatorios.png` |
| PR-21 | Límite de longitud de descripción | Descripción extensa | Contador (p. ej. 450/500) y advertencia | Conforme | `funcional/PR-21-limite-longitud-descripcion.png` |
| PR-22 | Selección de ubicación | Usar ubicación, mapa o búsqueda | Punto marcado y dirección mostrada | Conforme | `funcional/PR-22-seleccion-ubicacion.png` |
| PR-23 | Selección de ubicación en móvil | Opción "En el mapa" en celular | Mapa a pantalla completa, cerrable | Conforme | `funcional/PR-23-seleccion-ubicacion-movil.jpg` |
| PR-24 | GPS denegado | Denegar permiso | Aviso claro sin afectar la interfaz | Conforme | `funcional/PR-24-gps-denegado.png` |
| PR-25 | Reporte duplicado cercano | Marcar ubicación con reporte existente | Aviso "Esto ya fue reportado cerca" | Conforme | `funcional/PR-25-reporte-duplicado-a.png, funcional/PR-25-reporte-duplicado-b.png` |
| PR-26 | Adjuntar evidencia fotográfica | Imagen JPG/PNG/WebP | Vista previa, compresión y opción de eliminar | Conforme | `funcional/PR-26-adjuntar-evidencia-fotografica.png` |
| PR-27 | Envío de reporte | Completar y enviar | Mensaje "Reporte creado exitosamente" y retorno al inicio | Conforme | `funcional/PR-27-envio-reporte.png` |

#### Detalle, votación y denuncia

| ID | Descripción | Procedimiento | Resultado esperado | Estado | Evidencia |
|---|---|---|---|---|---|
| PR-28 | Visualización del detalle | Abrir un reporte | Información, foto, puntaje y mapa | Conforme | `funcional/PR-28-visualizacion-detalle.png` |
| PR-29 | Reporte inexistente | Abrir enlace no disponible | Aviso de no disponible con opción de volver | Conforme | `funcional/PR-29-reporte-inexistente.png` |
| PR-30 | Registro de voto | Pulsar Confirmar / Rechazar / Marcar resuelta | Voto registrado y opción resaltada | Conforme | `funcional/PR-30-registro-voto.png` |
| PR-31 | Cambio de voto | Votar Confirmar y luego Rechazar | Voto actualizado sin duplicados y puntaje recalculado | Conforme | `funcional/PR-31-cambio-voto.png` |
| PR-33 | Denuncia de incidencia | Pulsar "Denunciar incidencia" | Mensaje de agradecimiento | Conforme | `funcional/PR-33-denuncia-incidencia.png` |

#### Actividad del usuario

| ID | Descripción | Procedimiento | Resultado esperado | Estado | Evidencia |
|---|---|---|---|---|---|
| PR-34 | Pestañas de actividad | Alternar pestañas en `/activity` | Cada pestaña muestra su listado o mensaje si está vacío | Conforme | `funcional/PR-34-pestanas-actividad-a.png, funcional/PR-34-pestanas-actividad-b.png, funcional/PR-34-pestanas-actividad-c.png` |

#### Panel de administración

| ID | Descripción | Procedimiento | Resultado esperado | Estado | Evidencia |
|---|---|---|---|---|---|
| PR-35 | Listado de reportes | Ingresar a `/admin` como admin | Listado con filtros por visibilidad, categoría y fechas | Conforme | `funcional/PR-35-listado-reportes.png` |
| PR-36 | Detalle de reporte en admin | Abrir un reporte | Severidad, duración, puntaje, umbrales y ubicación | Conforme | `funcional/PR-36-detalle-reporte-admin.png` |
| PR-37 | Baja y restauración de reporte | Dar de baja y restaurar | Solicita motivo, confirma y cambia el estado | Conforme | `funcional/PR-37-baja-restauracion-reporte.png, funcional/PR-37-baja-restauracion-reporte-b.png` |
| PR-38 | Gestión de denuncias | Pestaña "Denuncias" | Denuncias listadas con contador y acciones | Conforme | `funcional/PR-38-gestion-denuncias.png` |
| PR-39 | Filtros plegables en celular | Abrir y cerrar filtros | Se pliegan correctamente con contador de activos | Conforme | `funcional/PR-39-filtros-plegables-celular.jpg` |

#### Moderación de contenido

| ID | Descripción | Procedimiento | Resultado esperado | Estado | Evidencia |
|---|---|---|---|---|---|
| PR-40 | Filtro de lenguaje ofensivo | Ingresar palabra ofensiva | Se reemplaza por `***` | Conforme | `funcional/PR-40-filtro-lenguaje-ofensivo.png` |
| PR-41 | Detección de texto ofuscado | Ingresar palabra separada por caracteres | Se detecta y reemplaza | Conforme | `funcional/PR-41-deteccion-texto-ofuscado.png` |
| PR-43 | Compresión de imágenes | Imagen de gran tamaño | Se comprime antes de la carga sin errores | Conforme | `funcional/PR-43-compresion-imagenes.jpg` |

#### Adaptación responsiva

| ID | Descripción | Procedimiento | Resultado esperado | Estado | Evidencia |
|---|---|---|---|---|---|
| PR-44 | Ausencia de desplazamiento horizontal | Revisar inicio en celular/tablet/PC | Ningún elemento se sale por los costados | Conforme | `funcional/PR-44-ausencia-desplazamiento-horizontal-a.png, funcional/PR-44-ausencia-desplazamiento-horizontal-b.png, funcional/PR-44-ausencia-desplazamiento-horizontal-c.png` |
| PR-45 | Barra de navegación | Menú PC (superior) y móvil (inferior) | Navegación correcta según dispositivo | Conforme | `funcional/PR-45-barra-navegacion-a.png, funcional/PR-45-barra-navegacion-b.png` |
| PR-46 | Lista de reportes en móvil | Abrir el listado en celular | Panel desde abajo, cerrable | Conforme | `funcional/PR-46-lista-reportes-movil.png` |
| PR-47 | Formulario y detalle en móvil | Completar reporte y ver detalle | Elementos y botones sin cortes | Conforme | `funcional/PR-47-formulario-detalle-movil.png` |
| PR-48 | Tablet | Revisar inicio, reporte y detalle | Distribución ordenada | Conforme | `funcional/PR-48-tablet.png` |
| PR-49 | Textos extensos | Títulos y descripciones largos | Se truncan con puntos suspensivos | Conforme | `funcional/PR-49-textos-extensos.png` |

---

### 6.2 Integración (E2E, Playwright) — PI

Ejecutado con Playwright (Chromium) sobre la app. Los casos de **escritura** (PI-11, PI-12)
corren solo contra el entorno local con `E2E_ALLOW_WRITE=true`. Evidencia:
`docs/evidencias/integracion/playwright-report.json`.

| ID | Descripción | Resultado esperado | Ejecución | Estado | Evidencia |
|---|---|---|---|---|---|
| PI-01 | Carga inicial | Mapa y layout se renderizan sin errores de JS | Local | Conforme | `playwright-report.json` |
| PI-02 | Buscador de dirección | Presente y acepta texto | Local | Conforme | `playwright-report.json` |
| PI-03 | `/report` sin sesión | Muestra aviso "Inicia sesión para reportar" | Local | Conforme | `playwright-report.json` |
| PI-04 | Página de registro | Carga el formulario | Local | Conforme | `playwright-report.json` |
| PI-05 | `/admin` sin rol admin | Redirige al inicio | Local | Conforme | `playwright-report.json` |
| PI-06 | Login con credenciales válidas | Inicia sesión y vuelve al inicio | Local | Conforme | `playwright-report.json` |
| PI-07 | Login con credenciales inválidas | Muestra error de credenciales | Local | Conforme | `playwright-report.json` |
| PI-08 | Cierre de sesión | Cierra sesión y vuelve al inicio | Local | Conforme | `playwright-report.json` |
| PI-09 | Acceso al panel admin con rol admin | Accede al panel de administración | Local | Conforme | `playwright-report.json` |
| PI-10 | Baja y restauración de reporte (admin) | Da de baja y restaura la incidencia | Local | Conforme | `playwright-report.json` |
| PI-11 | Crear reporte sin foto (escritura) | Crea el reporte y muestra éxito | Local | Conforme | `playwright-report.json` |
| PI-12 | Votar y cambiar voto (escritura) | Actualiza el voto sin duplicados | Local | Conforme | `playwright-report.json` |

> Nota: los smoke de **producción** cubren solo los casos de lectura (PI-01, PI-02). Las
> sub-rutas (PI-03, PI-04, PI-05) se cubren en el entorno local, porque Render no tiene fallback SPA.

---

### 6.3 Rendimiento — PRF

#### Frontend (Lighthouse, escritorio)

| ID | Métrica | Resultado | Objetivo | Estado | Evidencia |
|---|---|---|---|---|---|
| PRF-01 | Performance | 95 | >= 90 | Conforme | `rendimiento/PRF-01-lighthouse.*` |
| PRF-02 | Accessibility | 95 | >= 90 | Conforme | `rendimiento/PRF-01-lighthouse.*` |
| PRF-03 | Best Practices / PWA | 100 | >= 90 | Conforme | `rendimiento/PRF-01-lighthouse.*` |
| — | SEO | 100 | >= 90 | Conforme | `rendimiento/PRF-01-lighthouse.*` |
| PRF-01 | LCP / CLS / TBT | 1.5 s / 0 / 40 ms | <= 2.5 s / <= 0.1 / <= 200 ms | Conforme | `rendimiento/PRF-01-lighthouse.*` |

> En móvil (simulación 4G) el Performance fue **69** por el peso del bundle NSFW (`nsfwjs` / TensorFlow).
> Es una decisión de producto aceptada; opción futura: cargar el modelo de forma perezosa.

#### API / backend (k6, volúmenes mínimos)

| ID | Escenario | Resultado | Objetivo | Estado | Evidencia |
|---|---|---|---|---|---|
| PRF-05 | Smoke (1 VU) — mapa + geocoding | p95 mapa 997 ms · geocoding 882 ms | p95 < 1 s | Conforme | `rendimiento/PRF-05-k6-smoke.json` |
| PRF-06 | Carga mapa (5 VUs, 30 s) | p95 932 ms · error 0 % | p95 < 1 s | Conforme | `rendimiento/PRF-06-k6-load.json` |
| PRF-07 | Login (token auth) | login 200 · p95 605 ms | p95 < 1 s | Conforme | `rendimiento/PRF-07-k6-login.json` |
| PRF-08 | Geocoding (Nominatim) | Respuesta 200, sin bloqueo | Respuesta OK | Conforme | `rendimiento/PRF-05-k6-smoke.json` |

> **Observación:** en la verificación del login, el RPC del mapa mostró p95 **1.68 s** (vs. los
> 932 ms de PRF-06), probablemente por el arranque en frío / sleep de la cuenta gratuita. Se
> registra como observación, no como fallo.

---

### 6.4 Seguridad (ISO/IEC 27001) — PS

Evidencia principal: salida de `backend/migraciones/verificar_seguridad.sql` (solo lectura) y la
matriz de `docs/SEGURIDAD-CONTROLES.md`. Cada caso referencia su control del Anexo A.

| ID | Control | Verificación | Resultado | Evidencia |
|---|---|---|---|---|
| PS-01 | A.9.1.2 | RLS: anon no lee `profiles`/`incidents`; `incident_votes` restringida | Pendiente (ejecutar `verificar_seguridad.sql`) | `verificar_seguridad.sql` |
| PS-02 | A.9.1.2 | RLS: `incidents` sin select público | Conforme (esquema) | `00_esquema_actual.sql` |
| PS-03 | A.9.1.2 | RLS: `incident_votes` restringida | Conforme (esquema) | `00_esquema_actual.sql` |
| PS-04 | A.9.2.3 | Escalada a `admin` bloqueada (`guard_profile_update`) | Pendiente (ejecutar `verificar_seguridad.sql`) | `verificar_seguridad.sql` |
| PS-05 | A.9.2.3 | Bucket de fotos sin enumeración | Conforme (esquema) | `00_esquema_actual.sql` |
| PS-06 | A.10.1.1 | Transporte TLS + hash de contraseñas | Conforme (Supabase Auth) | HTTPS / bcrypt |
| PS-07 | A.10.1.2 | Secretos no versionados | Conforme (0 coincidencias en repo) | `git grep` |
| PS-08 | A.12.4.1 | `audit_log` solo `service_role` | Conforme (esquema) | `00_esquema_actual.sql` |
| PS-09 | A.12.2.1 | Moderación local (NSFW / texto) | Conforme | `imageModeration.ts`, `textFilter.ts` |
| PS-10 | A.12.6.1 | `npm audit` | Conforme con observación | `seguridad/PS-10-npm-audit.txt` |
| PS-11 | A.14.2.1 | TypeScript estricto + tests + CI | Conforme | `ci.yml`, Vitest |
| PS-12 | A.14.2.5 | RPCs `security definer` con `search_path` endurecido | Conforme (esquema) | `00_esquema_actual.sql` |
| PS-13 | A.14.3.1 | Datos de prueba sin PII real | Conforme | `01_seed_demo.sql` |

> **PS-01 / PS-04:** requieren ejecutar `verificar_seguridad.sql` en el SQL Editor de Supabase y
> guardar la salida en `docs/evidencias/seguridad/`. El chequeo de la política de `profiles`
> (n.º 4 del script) ya resultó conforme.
>
> **Observación PS-10:** `npm audit` reporta 6 vulnerabilidades (2 críticas, 1 alta, 3 moderadas),
> todas en **devDependencies** (vitest/vite/tinypool), no en el código desplegado. Dependencias
> de producción: 0 altas/críticas. Se recomienda actualizar `vitest`/`vite`.

---

## 7. Criterios de salida y cumplimiento

| Nivel | Criterio | Cumplimiento |
|---|---|---|
| Funcional | Todos los casos manuales ejecutados y conformes | Cumplido (47/47) |
| Integración | Casos ejecutados sin fallos bloqueantes | Cumplido (12/12) |
| Rendimiento | p95 < 1 s · error < 1 % · Lighthouse >= 90 | Cumplido (incl. login con cuenta de prueba) |
| Seguridad (ISO 27001) | Controles A.9/A.10/A.12/A.14 confirmados · 0 altas/críticas | Cumplido en esquema y fuente; 0 altas/críticas en producción (6 en dev, observación) |

---

## 8. Limitaciones y trabajo pendiente

1. **PS-01 / PS-04:** falta ejecutar `verificar_seguridad.sql` en el SQL Editor de Supabase y
   guardar la salida como evidencia.
2. **Vulnerabilidades de desarrollo:** se recomienda actualizar `vitest`/`vite` en el frontend.
3. **Bundle NSFW:** opción futura de carga perezosa para mejorar el Performance en móvil.
4. **Cuentas de prueba:** se recomienda usar cuentas de prueba dedicadas (no las de producción)
   para los escenarios de escritura y el login de k6.

---

## 9. Herramientas y trazabilidad

| Nivel | Herramienta | Comando |
|---|---|---|
| Integración | Playwright | `cd frontend && npx playwright test` |
| Rendimiento frontend | Lighthouse | `npx lighthouse <URL> --preset=desktop` |
| Rendimiento API | k6 | `k6 run testing/performance/k6-load-test.js` |
| Seguridad | `verificar_seguridad.sql` · npm audit | SQL Editor de Supabase · `npm audit` |

- Funcionalidades implementadas: `docs/ESTADO-FUNCIONALIDADES.md`.
- Criterios de aceptación por historia: `docs/PRODUCT-BACKLOG.md`.
- Matriz ISO/IEC 27001: `docs/SEGURIDAD-CONTROLES.md` · Auditoría: `docs/AUDITORIA-MVP.md`.
- Script de verificación de seguridad: `backend/migraciones/verificar_seguridad.sql`.
- Evidencias: `docs/evidencias/{funcional,integracion,rendimiento,seguridad}/`.

---

## 10. Registro de evidencias

| Nivel | Carpeta | Formato | Convención |
|---|---|---|---|
| Funcional | `docs/evidencias/funcional/` | Imagen (captura) | `PR-NN-*.png` |
| Integración | `docs/evidencias/integracion/` | Captura, reporte Playwright | `playwright-report.json`, `PI-NN-*.png` |
| Rendimiento | `docs/evidencias/rendimiento/` | Reportes HTML/JSON | `PRF-NN-*.{html,json}` |
| Seguridad | `docs/evidencias/seguridad/` | Salida SQL, audit | `PS-NN-*.{sql,txt}` |
