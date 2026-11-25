# HISTORIAS RESUELTAS SESION 4

> **Proyecto:** Movimap · **Fecha:** 2026-11-03
> **Sesión:** Mejoras del panel de administración (filtros colapsables y tabs dinámicos)

---

## Resumen de la sesión

Se corrigieron dos problemas del panel de administración (`AdminPage`):

1. La sección de **filtros** ahora es **colapsable** en desktop y mobile, con una
   animación suave (transición de altura vía grid + opacidad + rotación del chevron).
2. Se corrigió el **bug de las pestañas**: antes "Denuncias" aparecía siempre como
   seleccionada; ahora el estado activo (subrayado coral) cambia dinámicamente según la
   pestaña seleccionada.

Decisiones de alcance acordadas:
- Filtros **cerrados por defecto en mobile** y **abiertos por defecto en desktop**.
- Indicador de **filtros activos** (pill con la cantidad) en la cabecera de filtros.
- Animación **elegante y suave** del colapso.

---

## Historias de usuario / correcciones resueltas

### UH-ADM-01 — Filtros colapsables (desktop y mobile)
- Archivo: `frontend/src/pages/AdminPage.tsx`.
- Se añadió el estado `filtersOpen` (inicial: cerrado si `innerWidth < 768`, abierto si
  desktop) y una cabecera-botón "Filtros" a todo el ancho (≥44px) con `aria-expanded`
  y `aria-controls="admin-filters"`.
- El contenido se anima con el truco de grid (`grid-rows-[0fr]` ↔ `grid-rows-[1fr]`,
  `transition-[grid-template-rows] duration-300 ease-in-out`) + transición de opacidad.
- Accesibilidad: al colapsar se aplica `inert` (vía ref/`useEffect`) y `aria-hidden`
  para que los inputs ocultos no sean tabulables.
- Los valores de filtro se conservan al colapsar.
- Criterio cumplido: la sección de filtros se puede mostrar/ocultar en ambos tamaños,
  con animación suave y sin perder el estado de los filtros.

### UH-ADM-02 — Indicador de filtros activos
- Archivo: `frontend/src/pages/AdminPage.tsx`.
- Se calculó `activeFilterCount` (visibilidad ≠ "Todas", categoría, fecha desde y fecha
  hasta) y se muestra como pill en la cabecera "Filtros" cuando es > 0.
- Criterio cumplido: el botón refleja cuántos filtros están aplicados.

### UH-ADM-03 — Estado activo de pestañas dinámico
- Archivo: `frontend/src/pages/AdminPage.tsx` (componente `Tabs`).
- `Tabs` ahora usa `activeTab` para aplicar el estilo activo
  (`border-secondary-container text-secondary`) e inactivo
  (`border-transparent text-on-surface-variant hover:text-on-surface`).
- Se añadió `aria-current="page"` a la pestaña activa.
- Criterio cumplido: solo la pestaña seleccionada muestra el subrayado coral; "Denuncias"
  deja de aparecer seleccionada de forma permanente.

---

## Archivos modificados
- `frontend/src/pages/AdminPage.tsx`

**Creados:** este documento.

---

## Validación realizada
- `npx vite build`: **OK** (compila sin errores).
- `npm run build`/`npm test`: no ejecutables por la ausencia preexistente de `vitest` en
  `node_modules` (mismo estado de entorno que la sesión anterior).

> **Pendiente recomendado:** validación visual en navegador (desktop y mobile, claro/
> oscuro) del colapso animado y del cambio dinámico de pestañas.
