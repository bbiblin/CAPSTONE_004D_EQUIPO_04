# HISTORIAS RESUELTAS SESION 8

> **Proyecto:** Movimap · **Fecha:** 2026-11-06
> **Sesión:** Reportes recientes en mobile y administración de perfil

---

## Resumen de la sesión

Se agregó una sección propia de **Reportes recientes** para mobile, accesible desde una
nueva pestaña en la navegación inferior, con filtros por período y tipo de incidencia y
listado de reportes reutilizando las tarjetas existentes. Además se creó la pantalla
**Administrar perfil**, accesible desde el Sidebar (desktop) y desde el avatar del
encabezado (mobile), que incluye datos de la cuenta, preferencias y un flujo visual de
**eliminación de cuenta** (confirmación + aviso de "próximamente"), sin implementación de
backend.

---

## Historias de usuario / correcciones resueltas

### UH-MOBILE-01 — Ver reportes recientes en mobile
- Se creó `frontend/src/pages/ReportsPage.tsx` con:
  - Encabezado "Reportes recientes" y subtítulo.
  - Filtros por período (`DATE_RANGE_OPTIONS`) y por tipo de incidencia
    (`INCIDENT_CATEGORIES`), equivalentes al panel de desktop.
  - Carga con `getIncidents({ limit: 200 })`, filtrado por categoría y fecha en cliente.
  - Listado con `ReportCard` (navega al detalle `/incident/:id`), estados de carga y vacío.
  - Layout responsive: una columna en mobile y grilla en desktop.
- Se añadió el ítem **Reportes** (`/reports`) a `BottomNavigation`, quedando la navegación
  mobile con: Explorar, Reportes, Reportar y Actividad.
- Se registró la ruta pública `/reports` dentro de `AppLayout` en `App.tsx`.
- Se agregó el icono `list` a `Icon.tsx`.
- Criterio cumplido: en mobile existe un apartado dedicado para consultar los reportes
  recientes, con los mismos filtros disponibles en desktop.

### UH-PROFILE-01 — Administrar perfil
- Se creó `frontend/src/pages/ProfilePage.tsx` con:
  - Datos de la cuenta: avatar, nombre, correo, rol, organización (si existe) y fecha de
    registro.
  - Sección de preferencias con selector de tema y enlace a Términos y Condiciones.
  - Ruta protegida `/profile` en `App.tsx` (redirige a `/login` si no hay sesión).
- Accesos añadidos:
  - Desktop: el botón "Ajustes" del `Sidebar` ahora es un enlace "Administrar perfil".
  - Mobile: el avatar del `MobileHeader` es un enlace a `/profile`.
- Criterio cumplido: existe un menú/apartado de configuración visible desde desktop y
  mobile.

### UH-PROFILE-02 — Eliminar cuenta (solo visual)
- Se añadió la sección "Zona de peligro" en `ProfilePage` con botón destructivo
  **Eliminar cuenta**.
- Al pulsar se abre un `Modal` de confirmación con advertencia de acción permanente y
  opciones Cancelar / Eliminar cuenta.
- Al confirmar, solo se muestra un `Alert` informando que la funcionalidad estará
  disponible próximamente. No se realizan llamadas al backend ni se eliminan datos.
- Criterio cumplido: el flujo visual de eliminación de cuenta existe y queda listo para
  conectarse al backend en una sesión posterior.

---

## Archivos modificados
- `frontend/src/App.tsx`
- `frontend/src/components/layout/BottomNavigation.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/MobileHeader.tsx`
- `frontend/src/components/ui/Icon.tsx`

## Archivos creados
- `frontend/src/pages/ReportsPage.tsx`
- `frontend/src/pages/ProfilePage.tsx`
- Este documento (`docs/HISTORIAS RESUELTAS SESION 8.md`).

---

## Validación realizada
- `npx vite build`: **OK** (compila y genera el bundle sin errores).
- `npm test`: no ejecutable en este entorno porque `vitest` no está instalado en
  `node_modules` (dependencia declarada, pero ausente localmente).
- `npm run build`: `tsc` solo reporta errores preexistentes por la ausencia del módulo
  `vitest` en los archivos de test (`*.test.ts`); no hay errores de tipos en el código
  nuevo.

> **Pendiente recomendado:** revisión visual en mobile real de la nueva pestaña Reportes
> y del flujo de eliminar cuenta, y conectar `ProfilePage` con el endpoint real de
> eliminación cuando el backend esté disponible.
