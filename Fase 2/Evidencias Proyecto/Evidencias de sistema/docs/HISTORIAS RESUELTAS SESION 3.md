# HISTORIAS RESUELTAS SESION 3

> **Proyecto:** Movimap · **Fecha:** 2026-11-02
> **Sesión:** Fix integral de la vista mobile (accesibilidad, coherencia visual, responsive y modo claro/oscuro)

---

## Resumen de la sesión

En esta sesión se implementó el **fix integral de la experiencia mobile de Movimap**,
priorizando accesibilidad (touch targets ≥ 44px, foco visible, modales accesibles,
zoom reescalable) y coherencia visual (uso de tokens en vez de colores hardcodeados,
unificación del estado "activo" coral), manteniendo intacta la lógica de negocio, las
rutas y el backend (Supabase).

Decisiones de alcance acordadas con el cliente:
1. Adaptar el panel de administración a la vista mobile.
2. Mantener solo zoom por pellizco (no restaurar botones +/− del mapa en móvil).
3. Objetivo de área táctil: mínimo 48px (guideline) / 44px como piso viable.
4. Incluir comportamiento de accesibilidad (gestión de foco, scroll-lock, `role=dialog`).
5. Botones `sm` (36px) del backoffice: subidos a 44px por considerarse viable.

---

## Historias de usuario / correcciones resueltas

### UH-MOB-01 — Zoom y reescalado accesible
- Aplicación: `index.html`.
- Se eliminó `maximum-scale=1.0` y `user-scalable=no` del viewport, permitiendo zoomear
  y reescalar texto (WCAG 1.4.4). Se conserva `viewport-fit=cover`.
- Criterio cumplido: el `meta viewport` permite zoom por pellizco y reescalado.

### UH-MOB-02 — Foco visible con reemplazo correcto
- Aplicación: `components/ui/{Button,Input,Select}.tsx`, `components/map/PlaceSearchInput.tsx`.
- Se eliminó `focus-visible:outline-none`/`focus:outline-none` de botones, inputs y selects
  para que el anillo de foco coral global (`:focus-visible`) se muestre.
- Criterio cumplido: todos los controles muestran estado de foco visible por teclado.

### UH-MOB-03 — Modal accesible (foco, scroll, ARIA)
- Aplicación: `components/ui/Modal.tsx`.
- Se añadió `role="dialog"`, `aria-modal="true"`, `aria-labelledby` con título,
  trampa de foco (Tab/Shift+Tab), foco inicial, bloqueo de scroll del fondo y
  restauración del foco al cerrar. Se amplió el botón de cierre a 44px y el modal a
  `max-h-[90dvh]`.
- Criterio cumplido: modales accesibles vía teclado y lector de pantalla; el fondo no
  desplaza; foco retorna al disparador.

### UH-MOB-04 — Áreas táctiles adecuadas
- Aplicación: `Button.tsx` (sm 36→44px), `Chip.tsx` (chip interactivo min-h-11),
  `ThemeToggle.tsx` (36→44px), `Modal.tsx` (cierre 44px), `LocationControls.tsx`/
  `index.css` (controles GPS mobile 32→44px), `PlaceSearchInput.tsx` (resultados
  >30px), `ReportPage.tsx` (botones "Ver detalle"/"Confirmar" ≥44px),
  `HomePage.tsx` (`ChipRow` de filtros ≥44px), `BottomNavigation.tsx` (items ≥48px).
- Criterio cumplido: los controles interactivos móviles tienen área táctil ≥44px
  (objetivo 48px) en los casos viables.

### UH-MOB-05 — Alturas dinámicas (dvh) para evitar desbordamiento móvil
- Aplicación: `index.css` (`#root`), `AppLayout.tsx` (`h-[100dvh]`), `Modal.tsx`
  (`max-h-[90dvh]`), `HomePage.tsx` (bottom-sheets `max-h-[85dvh]`),
  `App.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`, `TermsPage.tsx`, `ReportPage.tsx`
  (`min-h-[100dvh]`).
- Criterio cumplido: se reduce el desbordamiento con la barra del navegador móvil
  (nota: requiere validación visual en dispositivo real).

### UH-MOB-06 — Navegación mobile (admin y logout)
- Aplicación: `BottomNavigation.tsx`, `MobileHeader.tsx`, `AppLayout.tsx`.
- El botón **Admin** aparece en la navegación inferior para usuarios `admin`.
- Se añadió botón de **Cerrar sesión** en el header mobile.
- Criterio cumplido: en móvil un admin accede a Admin y cualquier usuario autenticado
  puede cerrar sesión (antes solo posible en el sidebar de escritorio).

### UH-MOB-07 — Adaptación mobile del panel de administración
- Aplicación: `pages/AdminPage.tsx`.
- El layout de incidencias (antes `w-96` fijo + detalle) ahora se apila en móvil: la
  lista ocupa el ancho completo y, al seleccionar, se muestra el detalle con un botón
  "Volver a la lista". En desktop se mantiene la composición en dos paneles.
- Criterio cumplido: el panel de administración no desborda ni queda inutilizable en
  pantallas pequeñas (requiere revisión visual en resoluciones de teléfono).

### UH-MOB-08 — Unificación de tokens de color
- Aplicación: `tailwind.config.js`, `index.css`, `Alert.tsx`, `MapView.tsx`,
  `LocationControls.tsx`, `index.css` (estados GPS), `Button.tsx`, `Chip.tsx`,
  `HomePage.tsx`, `BottomNavigation.tsx`, `Sidebar.tsx`, `AdminPage.tsx`.
- Se añadieron tokens semánticos `success`/`teal` (tema claro y oscuro) y se reemplazaron
  colores hardcodeados: tonos success/teal de `Alert`, botón "Ver detalle completo" del
  popup (antes azul `bg-blue-500` → primario), marcadores de ubicación (`#3b82f6`/`#10b981`
  → teal/coral de marca), estado GPS, y el estilo "activo" coral ahora usa
  `on-secondary-container`.
- Criterio cumplido: los componentes representan la misma función con los mismos tokens
  y conservan la identidad de Movimap (verde petróleo + coral).

### UH-MOB-09 — Dependencia únicamente de hover evitada + popups visibles
- Aplicación: `MapView.tsx`.
- El popup de incidencia ahora autopanifica (`autoPan` por defecto) para no quedar fuera
  de pantalla al tocarlo; el botón del popup usa la paleta primaria.
- Criterio cumplido: las acciones del popup son alcanzables sin hover y visibles en móvil.

### UH-MOB-10 — Limpieza de estilos duplicados
- Aplicación: `index.css`.
- Se consolidaron `.gps-action-btn` y `.gps-follow-btn` (estilos casi idénticos) en una
  única regla. El fondo Leaflet en oscuro usa ahora un token de superficie.
- Criterio cumplido: sin reglas CSS duplicadas para los controles GPS.

---

## Archivos creados / modificados

**Creados:** ninguno nuevo (solo este documento).

**Modificados:**
- `frontend/index.html`
- `frontend/tailwind.config.js`
- `frontend/src/index.css`
- `frontend/src/components/ui/{Modal,Button,Chip,Input,Select,Alert,ThemeToggle}.tsx`
- `frontend/src/components/layout/{AppLayout,BottomNavigation,MobileHeader,Sidebar}.tsx`
- `frontend/src/components/map/{MapView,LocationControls,PlaceSearchInput}.tsx`
- `frontend/src/pages/{HomePage,ReportPage,AdminPage,LoginPage,RegisterPage,TermsPage}.tsx`
- `frontend/src/App.tsx`

---

## Validación realizada

- `npx vite build` (producción): **OK** (2897 módulos transformados, build exitoso).
- `npm run build` (`tsc && vite build`): el paso `tsc` señala errores **preexistentes**
  únicamente en `src/**/*.test.ts` ("Cannot find module 'vitest'"), porque la dependencia
  **`vitest` no está instalada** en `node_modules` (estado del entorno, ajeno a esta
  sesión). El bundling de `vite build` compila sin errores todo el código de la app.
- `npm test`: no ejecutable por la ausencia de `vitest` en `node_modules`.

> **Nota:** queda pendiente la validación visual en navegador (device toolbar en
> 360/390/414/768px, en modo claro y oscuro) y la confirmación en dispositivo real del
> comportamiento `dvh`. Las correcciones son funcionales y compilan, pero la revisión
> visual fina está recomendada antes de considerar cerrada la iteración.

---

## Pendientes / observaciones

- La adaptación del panel de administración (UH-MOB-07) quedó **implementada y
  compilada**; la revisión visual del flujo lista→detalle en móvil está recomendada.
- Los colores de marcadores/visibilidad por severidad (`constants.ts`) se conservaron
  como colores de datos (no se tematizaron), ya que llevan icono + texto junto al badge
  y no dependen solo del color.
- Se recomienda, en una iteración futura, revisar el foco/gestión de los bottom-sheets
  de `HomePage` (no usan el componente `Modal`): hoy se cierran con backdrop y botón.
