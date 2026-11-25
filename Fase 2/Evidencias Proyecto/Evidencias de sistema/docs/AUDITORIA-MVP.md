# Movimap — Auditoría y diagnóstico MVP

> Fecha de auditoría: 2026-10-22
> Objetivo: evaluar si el proyecto es factible como MVP, identificar qué falta
> y documentar el trabajo pendiente (drift de esquema, tests, seguridad).

---

## 1. Veredicto

**Sí, Movimap es factible como MVP funcional para una demo / release interno.**
El flujo completo (registro → reportar → confirmar/rechazar/resolver → denunciar
→ moderar → capa BI) está implementado y el frontend **type-checkea sin errores**
(`tsc --noEmit` → exit 0). La capa de datos/BI (esquema `bi`, rol `bi_reader`,
export CSV, documentación) es un diferenciador fuerte.

Para un **lanzamiento público real** quedan brechas: no hay tests automatizados
ni CI, el geocoding depende de la API pública Nominatim (límites de uso) y hay un
drift entre el "esquema canónico" documentado y el realmente aplicado en
producción.

---

## 2. Lo que está OK

- **Cobertura funcional amplia**: 52 historias de usuario (UH-01…UH-52)
  implementadas y documentadas en `docs/PRODUCT-BACKLOG.md`.
- **Frontend coherente y tipado**: tipos de dominio en `src/types/index.ts`,
  constantes de umbrales en `src/lib/constants.ts`
  (`DEFAULT_DOWNVOTE_THRESHOLD = 4`, `DEFAULT_RESUELTO_THRESHOLD = 3`).
- **Visibilidad derivada** (sin campo `status`): `computeScore` en
  `src/lib/utils.ts` y ocultamiento por umbrales/moderación consistente entre
  frontend y backend.
- **RPCs alineados con el cliente**: `get_incidents_in_bounds`,
  `get_incident_heat_cells`, `find_nearby_incidents`, `get_heatmap_data` coinciden
  con las llamadas de `src/lib/supabase.ts`.
- **RLS endurecida**: en `18_terms_consent.sql` es imposible reportar/votar/
  denunciar sin aceptar términos (ni subir fotos sin consentimiento fotográfico),
  no se puede eludir por API.
- **PWA + cache-busting**, moderación local NSFW/texto, caché por zona del mapa,
  clustering + heatmap por zoom.
- **Capa BI**: vistas `bi.incident_daily` / `bi.incident_reports_daily`,
  vistas espejo en `public` para export CSV, rol `bi_reader` y diccionario de
  datos.

---

## 3. Riesgos / inconsistencias detectadas

### 🔴 3.1 Drift del esquema en `00_esquema_actual.sql` (crítico)
El archivo "canónico" (`backend/migraciones/nuevo/00_esquema_actual.sql`) **no
representa el estado final** del modelo. Aún define:

- Columna `status` de `incidents` (+ `idx_incidents_status`).
- Trigger/función `log_status_change` (auditoría por `status`).
- Vistas `incidents_with_stats` con `score`/`confirmation_count` y
  `incidents_public` filtrando por `status`.
- RPCs con firmas viejas:
  `find_nearby_incidents` (devuelve `status` y `score`),
  `get_heatmap_data` (filtra por `status`).
- **No** incluye `hidden_at/hidden_by/hidden_reason`,
  `downvote_threshold` ni la visibilidad derivada (`visibility` en BI).

El estado real de producción (tras `16`, `21`) **eliminó** `status`, agregó
moderación + `downvote_threshold` y cambió las firmas de todos los RPCs. Por
tanto `00` solo produce el esquema correcto si se aplican `16 → 17 → 21` después.
**Riesgo alto de reproducir un esquema distinto al de producción** si se usa
como fuente única.

> Acción tomada: se regeneró `00_esquema_actual.sql` al estado final y se
> actualizó `README.md` con el orden de aplicación real.

### 🔴 3.2 Sin tests automatizados ni CI
No hay runner de tests en `package.json` ni flujo de CI. El propio backlog lo
marca pendiente ("Pruebas end-to-end"). La lógica crítica (votos, deduplicación,
umbrales de visibilidad, moderación de texto) **no está cubierta**.

> Acción tomada: se agregó **vitest** con pruebas unitarias
> (`utils`, `textFilter`, `imageCompression`) y un workflow de GitHub Actions
> (typecheck + tests).

### 🟡 3.3 Geocoding vía Nominatim (OpenStreetMap) sin API key
La búsqueda y el reverse-geocoding usan la API pública de Nominatim
(`searchPlaces`, `reverseGeocode` en `src/lib/supabase.ts` y `constants.ts`).
Tiene límites de uso (rate-limit y `User-Agent` requerido) y puede ser
inestable/bloqueado para volumen real. No es de "crítico" para una demo, pero sí
para producción.

> Recomendación para el futuro: evaluar un proveedor de pago (Google/Mapbox,
> con cuota gratuita) o self-hosted (Nominatim + pgRouting) con caché local.

### 🟡 3.4 Secretos y variables de entorno
- Existía un `.env` en la raíz con `VITE_SUPABASE_SERVICE_KEY=sb_secret_...`
  (clave de rol de servicio) con un nombre de variable `VITE_` (que se expone en
  el cliente). La clave **no estaba en git** (`.gitignore`) y **no** es usada por
  la build (el frontend lee `frontend/.env`), pero representaba riesgo si se
  usaba por error.
- `frontend/.env` solo contiene la clave **publishable/anon** (correcto).

> Acción tomada: se eliminó el `.env` raíz (y su clave de servicio) y se crearon
> `.env.example` (raíz y frontend) documentando qué variables son seguras.

### 🟡 3.5 Orden de bootstrap incompleto en README
El orden documentado para un proyecto nuevo **omitía** `18_terms_consent`
(esencial: RPC `accept_terms`, columnas de consentimiento y RLS endurecida) y
`19`, `20`, `22` (mapa masivo, filtro temporal, detalle de reporte cercano).

> Acción tomada: se corrigió el orden en `README.md`.

---

## 4. Checklist de trabajo pendiente (priorizado)

### Hecho en esta iteración
- [x] `.gitignore`: permitir trackear `docs/*.md`.
- [x] Seguridad: eliminar clave `service_role` del `.env` raíz y crear
      `.env.example`.
- [x] Corregir drift: regenerar `00_esquema_actual.sql` al estado final.
- [x] `README.md`: orden de migración correcto + descripción de `00`.
- [x] Tests unitarios (vitest) + CI (GitHub Actions).

### Pendiente recomendado para el MVP real (post-auditoría)
- [ ] **Pruebas end-to-end** del flujo: votar, cambiar voto, denunciar,
      ocultamiento por umbral (marcado en backlog).
- [ ] **Verificación automatizada del ocultamiento por umbral** en mapa/detalle.
- [ ] **Geocoder robusto** (pago / self-hosted) o rate-limiting + retry.
- [ ] CI con también un **migrator/verificador de esquema** (opcional).
- [ ] **Multi-cliente del dato BI**: credenciales/roles por cliente y plan de
      suscripción (post-MVP, ya en backlog).

### Fuera del alcance del MVP (no agregar ahora)
- Notificaciones y flujo de seguimiento al usuario.
- Agregación por celda/H3 para volúmenes extremos.
- Venta formal multi-cliente del dato.

---

## 5. Próximos pasos de verificación (con el equipo de datos)
Se entrega un **script SQL de solo lectura** para correr en el SQL Editor de
Supabase y confirmar que el esquema producido coincide con el estado final
documentado (ver sección de comandos de verificación adjunta a esta auditoría).

---

## 6. Fase de seguridad de la información (ISO/IEC 27001)

> Iteración posterior a la auditoría inicial. Objetivo: aprobar un **control de
> seguridad de la información** (marco ISO/IEC 27001, Anexo A). Se documenta todo
> en `docs/SEGURIDAD-CONTROLES.md` (matriz de controles) y `docs/PRIVACIDAD.md`.

### 6.1 Hallazgos remediados

| ID | Riesgo | Remedio | Evidencia |
|----|--------|---------|-----------|
| CV-1 | Enumeración del bucket: la política `select` pública sobre `storage.objects` permitía **listar todo el catálogo** de fotos | Se eliminó la política `select`; el bucket sigue público para ver cada foto con su URL, pero **no se puede enumerar** (`/object/list` bloqueado) | `00_esquema_actual.sql` (bloque STORAGE) |
| CV-2 | Correlación **foto → usuario/email**: rutas `{userId}/…`, `incidents_with_stats`/`incident_votes` con `created_by`/`user_id`, y `profiles` con `email` | Rutas opacas `reports/<uuid>…` + columna `storage_path`; `incidents_public` **sin PII**; `incident_votes` restringida a autor/admin; `profiles` sin `select` público | `00`, `frontend/src/lib/supabase.ts`, `types/index.ts` |
| CV-3 | Escalada de privilegios: un usuario podía cambiar su `role` a `admin` vía UPDATE de su perfil | Trigger `guard_profile_update` + RLS impiden cambiar `role`/`email` | `00_esquema_actual.sql` |
| CV-4 | Contraseña del rol BI hardcodeada en el repo (`bimovimap2026`) | Se eliminó; la contraseña se define vía GUC `app.bi_password` (y `app.bi_users` para N usuarios) | `14_bi_reader_role.sql`, `15_crear_usuarios_bi.sql` |
| CV-5 | Abuso de funciones `security definer` (riesgo de `search_path` hijacking) | Todas las funciones `security definer` con `set search_path = ''` | `00`, `18_terms_consent.sql` |
| CV-6 | Insert abierto en `audit_log` (cualquier autenticado) | Solo `service_role` puede insertar auditoría | `00_esquema_actual.sql` |

### 6.2 Cambios que afectan al cliente (frontend)
- `src/lib/supabase.ts`: subida de fotos a ruta opaca y guarda `storage_path`;
  `voteOnIncident` ahora lee `incidents_public`.
- `src/types/index.ts`: campo `storage_path?`.
- **Sin cambios en la UI de fotos**: se sigue mostrando `image_url` (URL pública).

### 6.3 Orden de aplicación registrado
Ver `backend/migraciones/README.md` (sección "Orden NUEVO"): la secuencia de
referencia es `00 → 14 → 18 → 15 → 01` (o `02`).

### 6.4 Verificación
Ejecutar `backend/migraciones/verificar_seguridad.sql` (solo lectura) para
confirmar cada punto en el proyecto Supabase.

