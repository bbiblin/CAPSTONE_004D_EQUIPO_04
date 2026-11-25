# HISTORIAS RESUELTAS SESION 5

> **Proyecto:** Movimap · **Fecha:** 2026-11-04
> **Sesión:** Ajustes de UI mobile y corrección del scroll del mapa

---

## Resumen de la sesión

Se implementaron cuatro ajustes de interfaz, con foco en la vista mobile:

1. El header mobile ahora oculta el avatar y el botón de cerrar sesión cuando no hay
   sesión iniciada, y muestra un botón **"Iniciar sesión"** en su lugar.
2. Se eliminó el botón **"Compartir"** del detalle de un reporte.
3. El icono de **ubicación actual** en el mapa se cambió por un **icono de persona**
   (manteniendo el color de marca normal/seguimiento).
4. Se eliminó el **scroll invisible** de la vista mobile del mapa que hacía que los
   botones de buscar y ubicación actual se ocultaran al desplazar la pantalla.

No se modificó lógica de negocio, rutas ni backend.

---

## Historias de usuario / correcciones resueltas

### UH-MOB-11 — Header mobile sin sesión (avatar/logout) + botón de login
- Archivo: `frontend/src/components/layout/MobileHeader.tsx`.
- Con sesión (`profile`): se muestran `ThemeToggle` + botón **logout** + avatar.
- Sin sesión: se muestran `ThemeToggle` + botón **"Iniciar sesión"** (`<Link to="/login">`,
  44px de alto).
- Criterio cumplido: no aparecen avatar ni logout sin sesión; el acceso a login queda
  visible en el header.

### UH-MOB-12 — Quitar botón "Compartir" del detalle
- Archivo: `frontend/src/pages/IncidentDetailPage.tsx`.
- Se eliminó el bloque del `IconButton` "Compartir". Se mantiene "Volver" y el resto de
  la pantalla sin cambios.
- Criterio cumplido: el detalle ya no muestra el botón de compartir.

### UH-MOB-13 — Icono de ubicación actual = persona
- Archivo: `frontend/src/components/map/LocationControls.tsx`.
- Los marcadores de ubicación (`locationIcon` y `locationIconFollowing`) ahora usan un
  glifo de persona blanco (cabeza + torso) sobre el círculo de color: teal `#30666d`
  (normal) y coral `#ff6b6b` (seguimiento), tamaño 48×48 con borde blanco.
- Criterio cumplido: la ubicación del usuario se representa con una persona.

### UH-MOB-14 — Eliminar scroll invisible del mapa en mobile
- Archivos: `frontend/src/components/layout/AppLayout.tsx`, `frontend/src/index.css`.
- **Causa raíz:** el shell usaba `h-screen h-[100dvh]`; en el CSS compilado `.h-screen`
  (100vh) se emitía después de `.h-[100dvh]`, por lo que ganaba y el layout excedía el
  alto visible en móvil, generando scroll de página y ocultando los overlays del mapa.
- **Solución:** el shell ahora usa `h-full overflow-hidden overscroll-none` (toma los
  `100dvh` de `#root`), y `.leaflet-container` incorpora `overscroll-behavior: contain`.
- Criterio cumplido: sin scroll de página en la vista del mapa; los botones de buscar y
  ubicación permanecen visibles al panear el mapa (validación visual recomendada).

---

## Archivos modificados
- `frontend/src/components/layout/MobileHeader.tsx`
- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/components/map/LocationControls.tsx`
- `frontend/src/pages/IncidentDetailPage.tsx`
- `frontend/src/index.css`

**Creados:** este documento.

---

## Validación realizada
- `npx vite build`: **OK** (compila sin errores).
- `npm run build`/`npm test`: no ejecutables por la ausencia preexistente de `vitest` en
  `node_modules` (estado del entorno, ajeno a esta sesión).

> **Pendiente recomendado:** validación visual en navegador (mobile y desktop, claro/
> oscuro) del header sin sesión, del icono de persona y de la ausencia de scroll en el mapa.
