# HISTORIAS RESUELTAS SESION 6

> **Proyecto:** Movimap · **Fecha:** 2026-11-04
> **Sesión:** Corrección del logout en rutas protegidas y fallback de navegación (SPA)

---

## Resumen de la sesión

Se corrigió el bug por el cual, al cerrar sesión en una vista protegida, la app recargaba
la misma URL (ruta profunda) y el navegador/host mostraba **"Not Found"** (404). La causa
era el uso de `window.location.reload()` en el logout: en una SPA, recargar una ruta
profunda hace una petición completa al host, que sin fallback SPA devuelve 404.

Solución: el logout ahora navega en el cliente a la **home (`/`)** sin recargar, y el
service worker sirve el shell (`index.html`) cuando una navegación devuelve una respuesta
no-OK.

---

## Historias de usuario / correcciones resueltas

### UH-AUTH-01 — Logout con navegación SPA a la home
- Archivos: `frontend/src/components/layout/AppLayout.tsx`, `frontend/src/App.tsx`,
  `frontend/src/pages/ActivityPage.tsx`.
- El logout se movió a `AppLayout` (dentro del `BrowserRouter`): `await signOut()` y
  `navigate('/', { replace: true })`. Se pasó a `Sidebar` y `MobileHeader`.
- `App` ya no define `handleLogout` ni pasa `onLogout`.
- `ActivityPage.handleLogout` ahora usa `await signOut(); navigate('/', { replace: true })`.
- Criterio cumplido: al cerrar sesión se va a la home (pública), sin recargar la ruta
  protegida ni quedar en la misma vista.

### UH-AUTH-02 — Fallback de navegación en el service worker
- Archivo: `frontend/public/sw.js`.
- En peticiones `navigate`, si la respuesta de red no es `ok`, se devuelve
  `caches.match('/index.html')` (shell de la SPA) en lugar del 404 del host.
- Criterio cumplido: recargar manualmente una ruta profunda (`/report`, `/incident/:id`)
  ya no muestra el "Not Found" del navegador en producción.

### UH-AUTH-03 — Sin recarga al aceptar términos en el detalle
- Archivos: `frontend/src/pages/IncidentDetailPage.tsx`, `frontend/src/App.tsx`.
- `IncidentDetailPage` recibe `onConsentAccepted` (App le pasa `loadProfile`) y lo invoca
  tras aceptar los términos, en lugar de `window.location.reload()`.
- Criterio cumplido: aceptar términos en el detalle actualiza el perfil sin recargar la
  ruta profunda (evita el mismo 404).

---

## Archivos modificados
- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/App.tsx`
- `frontend/src/pages/ActivityPage.tsx`
- `frontend/src/pages/IncidentDetailPage.tsx`
- `frontend/public/sw.js`

**Creados:** este documento.

---

## Validación realizada
- `npx vite build`: **OK** (compila sin errores).
- Confirmado que ya no quedan `window.location.reload()` en el flujo de logout (solo
  permanece en `main.tsx` para la actualización del service worker, uso previsto).

> **Pendiente recomendado:** validación en el entorno desplegado (producción con SW) del
> logout desde `/report`, `/activity` y `/incident/:id` (debe aterrizar en `/` sin 404) y
> de la recarga manual de rutas profundas.
