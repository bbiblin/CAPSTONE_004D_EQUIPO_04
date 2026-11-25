# Movimap — Diccionario de datos (producto de datos)

> Documento de referencia del **producto de datos** que Movimap entrega a
> instituciones / municipalidades. Complementa `docs/bi-powerbi-guia.md`
> (cómo conectar) y `docs/terms-of-use.md` (términos de uso).
> Vistas definidas en `backend/migraciones/nuevo/00_esquema_actual.sql`.

---

## 1. Vista `bi.incident_daily` — una fila por incidencia

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `incident_id` | `uuid` | Identificador único de la incidencia. |
| `category` | `text` | Categoría (`vereda_cortada`, `vereda_deteriorada`, `rampa_bloqueada`, `rampa_inexistente`, `obstaculo_fisico`, `ascensor_fuera_servicio`, `falta_iluminacion`, `otro`). |
| `severity` | `int` | Prioridad 1–3 (1 informativo, 2 moderado, 3 grave). |
| `visibility` | `text` | Visibilidad derivada: `activo`, `inactivo_rechazo` (superó umbral de rechazos), `inactivo_resuelta` (superó umbral de votos "resuelta"), `oculto_moderacion` (dado de baja por un moderador). |
| `description` | `text` | Descripción del reporte (hasta 500 caracteres, sin mínimo). |
| `estimated_duration` | `text` | Duración estimada (`temporal`, `permanente`). |
| `observed_date` | `date` | Fecha en que el usuario observó la incidencia. |
| `created_at` | `timestamptz` | **Timestamp completo** de creación del reporte (utc). |
| `report_date` | `date` | Fecha del reporte en zona horaria **America/Santiago** (a partir de `created_at`). |
| `report_hour` | `int` | Hora del reporte (0–23) en America/Santiago. |
| `report_day_of_week` | `text` | Día de la semana abreviado (`Mon`, `Tue`, …) en America/Santiago. |
| `report_month` | `int` | Mes del reporte (1–12) en America/Santiago. |
| `report_week` | `int` | Semana (ISO) del reporte en America/Santiago. |
| `updated_at` | `timestamptz` | Última actualización de la incidencia. |
| `resolved_at` | `timestamptz` | Fecha en que se marcó como resuelta (`null` si no). |
| `has_resolved_by` | `boolean` | Indica si se registró quién la resolvió (sin exponer la identidad). |
| `latitude` | `numeric` | Latitud (ubicación GPS). |
| `longitude` | `numeric` | Longitud (ubicación GPS). |
| `country` | `text` | País del reporte (p. ej. Chile). |
| `region` | `text` | Región de Chile (p. ej. Región Metropolitana de Santiago). |
| `province` | `text` | Provincia de Chile nivel intermedio (p. ej. Provincia de Santiago). |
| `comuna` | `text` | Comuna administrada por un alcalde/municipio (p. ej. Providencia, Quilicura, Puente Alto). |
| `neighbourhood` | `text` | Barrio / localidad / suburbio. |
| `street` | `text` | Calle del reporte (dirección desglosada). |
| `house_number` | `text` | Número de la calle (dirección desglosada). |
| `resuelto_threshold` | `int` | Umbral de votos "resuelta" configurado para la incidencia. |
| `downvote_threshold` | `int` | Umbral de votos "rechazo" configurado para la incidencia (ocultamiento automático al superarlo). |
| `hidden_at` | `timestamptz` | Fecha en que un moderador dio de baja (ocultó) el reporte (`null` si no está oculto). |
| `image_url` | `text` | URL pública de la evidencia fotográfica (`null` si no hay). |
| `place_name` | `text` | Nombre del lugar/POI asociado al punto del reporte (reverse-geocoding, `null` si no resuelto). |
| `address` | `text` | Dirección/display-name del punto del reporte (reverse-geocoding Nominatim, `null` si no resuelto). |
| `resolution_days` | `numeric` | Días entre creación y resolución (`null` si no resuelta). |
| `votes_up` | `int` | Confirmaciones ("existe"). |
| `votes_down` | `int` | Rechazos ("falsa"). |
| `votes_resuelta` | `int` | Votos "resuelta" (ocultan la incidencia al superar el umbral). |
| `reports_total` | `int` | Total de denuncias asociadas a la incidencia. |
| `reports_pending` | `int` | Denuncias en estado `pendiente`. |
| `reports_resolved` | `int` | Denuncias en estado `resuelto`. |
| `reports_rejected` | `int` | Denuncias en estado `rechazado`. |

---

## 2. Vista `bi.incident_reports_daily` — una fila por denuncia (anonimizada)

> ❗ **Sin PII**: no expone la identidad del denunciante (`reported_by`).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `report_id` | `uuid` | Identificador único de la denuncia. |
| `incident_id` | `uuid` | Incidencia a la que se refiere la denuncia. |
| `category` | `text` | Categoría de la incidencia denunciada. |
| `severity` | `int` | Severidad de la incidencia denunciada. |
| `estimated_duration` | `text` | Duración estimada de la incidencia denunciada. |
| `incident_visibility` | `text` | Visibilidad de la incidencia denunciada (`activo`, `inactivo_rechazo`, `inactivo_resuelta`, `oculto_moderacion`). |
| `latitude` | `numeric` | Latitud de la incidencia denunciada. |
| `longitude` | `numeric` | Longitud de la incidencia denunciada. |
| `country` | `text` | País del reporte (contexto de la incidencia). |
| `region` | `text` | Región de Chile (contexto de la incidencia). |
| `province` | `text` | Provincia de Chile (contexto de la incidencia). |
| `comuna` | `text` | Comuna de la incidencia denunciada. |
| `neighbourhood` | `text` | Barrio / localidad / suburbio. |
| `street` | `text` | Calle (dirección desglosada). |
| `house_number` | `text` | Número de la calle (dirección desglosada). |
| `report_status` | `text` | Estado de la denuncia (`pendiente`, `resuelto`, `rechazado`). |
| `reason` | `text` | Motivo de la denuncia (`null` si no se informó). |
| `report_date` | `date` | Fecha de la denuncia (`created_at`). |
| `updated_at` | `timestamptz` | Última actualización de la denuncia. |

---

## 3. Vistas espejo accesibles vía API (export CSV)

| Vista | De dónde proviene | Uso |
|-------|-------------------|-----|
| `public.analytics_incident_daily` | `bi.incident_daily` | Exportación CSV/JSON vía PostgREST. |
| `public.analytics_incident_reports_daily` | `bi.incident_reports_daily` | Exportación CSV/JSON vía PostgREST. |

> Ambas son **solo lectura** para `service_role` / `bi_reader`; `anon` y
> `authenticated` están revocados.
>
> **Nota:** las vistas BI exponen **conteos** (`votes_up/down/resuelta`) y
> **umbrales**, pero **no** incluyen el campo `score`. El score
> (`votes_up − votes_down`) y las confirmaciones (`votes_up`) se calculan en el
> frontend, para que la capa BI quede como fuente de conteos puros y cada
> consumidor pueda calcular sus métricas.

---

## 4. Geografía administrativa (Chile)

La GEOGRAFÍA del producto usa la jerarquía administrativa **local de Chile** y no
una convención global ("city"). Por eso el nivel de comuna es la unidad de base
y **no** se usa `city`/`ciudad` como columna (una "ciudad" como Santiago es un
continuo urbano que abarca varias provincias).

| Nivel | Ejemplo | Fuente |
|-------|---------|--------|
| `country` | Chile | Nominatim |
| `region` | Región Metropolitana de Santiago | Nominatim (`state`) |
| `province` | Provincia de Santiago | Nominatim (`county`) |
| `comuna` | Quilicura, Nuñoa, Puente Alto, Providencia | Nominatim (`city/town/village/municipality`) |

Se capturan al **momento de reportar** (reverse-geocoding `addressdetails=1`).
Los reportes existentes/previos quedan con estos campos en `null` (la vista lo
tolera); opcionalmente se pueden re-geocodificar para backfill.

## 5. Notas de privacidad

- El producto **no** incluye datos personales de los denunciantes ni usuarios.
- No se expone `reported_by`, `created_by`, `resolved_by` ni `email`/`display_name`.
- La columna `has_resolved_by` indica *si* hay responsable registrado, sin revelarlo.
- Antes de distribuir a un cliente, revisar el alcance según `docs/terms-of-use.md`.
