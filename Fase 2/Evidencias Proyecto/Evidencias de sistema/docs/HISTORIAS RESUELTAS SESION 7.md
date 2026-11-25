# HISTORIAS RESUELTAS SESION 7

> **Proyecto:** Movimap · **Fecha:** 2026-11-04
> **Sesión:** Ajuste de color del marcador de ubicación actual

---

## Resumen de la sesión

Se cambió el color del marcador de **ubicación actual** del usuario en el mapa para que
no se confunda con un indicador (severidad/estado) de la app. Se utilizó un azul ajeno a
la paleta de Movimap.

---

## Historias de usuario / correcciones resueltas

### UH-MAP-01 — Marcador de ubicación con color fuera de la paleta
- Archivo: `frontend/src/components/map/LocationControls.tsx`.
- En `locationIcon` y `locationIconFollowing`:
  - Círculo con relleno **blanco** y borde azul `#2563EB`.
  - Glifo de persona relleno azul `#2563EB`.
- Mismo tono para los estados normal y seguimiento; el estado "siguiendo" se sigue
  indicando mediante el texto del botón.
- Tamaño y `popupAnchor` sin cambios (48×48, `[0, -24]`).
- Criterio cumplido: el marcador de ubicación actual usa un color (`#2563EB`) que no
  pertenece a la paleta, evitando confundirlo con un indicador.

---

## Archivos modificados
- `frontend/src/components/map/LocationControls.tsx`

**Creados:** este documento.

---

## Validación realizada
- `npx vite build`: **OK** (compila sin errores).

> **Pendiente recomendado:** revisión visual del marcador sobre el mapa (claro/oscuro y
> en distintos zooms).
