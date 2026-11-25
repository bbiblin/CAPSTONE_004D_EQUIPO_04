# Movimap — Guía de uso de datos para Power BI (capa BI)

> Documento de soporte para consumir el producto de datos de Movimap
> en Power BI. Complementa `docs/arquitectura-datos-decisiones.md` (D5/D8),
> `docs/data-dictionary.md` (diccionario) y `docs/bi-client-onboarding.md`
> (guía de onboarding para clientes + resolución del certificado CA).
> Para una **demo lista para presentar**, ver `docs/bi-guia-demo.md`
> (conexión paso a paso + visuales sugeridos).

---

## 1. Fuentes de datos disponibles

| Objeto | Descripción | Acceso |
|--------|-------------|--------|
| `bi.incident_daily` | Vista analítica (una fila por incidencia) con métricas agregadas | Solo lectura `service_role` / `bi_reader` |
| `bi.incident_reports_daily` | Vista de **denuncias anonimizadas** (una fila por denuncia, sin identidad) | Solo lectura `service_role` / `bi_reader` |
| `public.analytics_incident_daily` | Espejo de `bi.incident_daily` expuesto vía PostgREST (export CSV) | Solo `service_role` |
| `public.analytics_incident_reports_daily` | Espejo de `bi.incident_reports_daily` vía PostgREST (export CSV) | Solo `service_role` |

> Definiciones canónicas en `backend/migraciones/nuevo/00_esquema_actual.sql`.

> ⚠️ **Cambio de esquema (importante).** Desde la migración
> `21_remover_estados_por_umbrales.sql` se **eliminó la columna `status`** de las
> incidencias y de la vista `bi.incident_daily`. Ahora la visibilidad es una
> columna derivada **`visibility`** con los valores:
> `activo` · `inactivo_rechazo` · `inactivo_resuelta` · `oculto_moderacion`.
> Si tu conexión / data source (Power BI o Looker Studio) fue creado sobre la
> columna `status`, **está rota**: hay que reconstruir los campos y filtros
> usando `visibility`. Puedes usar también `has_resolved_by` y `resolved_at`
> para "resueltas", y `reports_*` para el detalle de denuncias.

### Columnas de `bi.incident_daily`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `incident_id` | uuid | Id de la incidencia |
| `category` | text | Categoría (vereda_cortada, rampa_bloqueada, …) |
| `severity` | int | Prioridad 1–3 |
| `visibility` | text | Derivada: activo / inactivo_rechazo / inactivo_resuelta / oculto_moderacion |
| `description` | text | Descripción del reporte |
| `estimated_duration` | text | Duración estimada (temporal / permanente) |
| `observed_date` | date | Fecha de observación |
| `created_at` | timestamptz | Timestamp completo de creación (utc) |
| `report_date` | date | Fecha del reporte en America/Santiago (series temporales) |
| `report_hour` | int | Hora del reporte (0–23, America/Santiago) |
| `report_day_of_week` | text | Día de la semana abreviado (America/Santiago) |
| `report_month` / `report_week` | int | Mes / semana (ISO) del reporte |
| `updated_at` / `resolved_at` | timestamptz | Última actualización / resolución |
| `has_resolved_by` | boolean | Si hay responsable registrado (sin revelar identidad) |
| `latitude` / `longitude` | numeric | Ubicación para mapas |
| `country` / `region` / `province` / `comuna` | text | Geografía administrativa de Chile (ver jerarquía local) |
| `neighbourhood` / `street` / `house_number` | text | Desglose de la dirección |
| `resuelto_threshold` / `downvote_threshold` | int | Umbrales de ocultamiento |
| `image_url` | text | Evidencia fotográfica |
| `resolution_days` | numeric | Días hasta la resolución |
| `votes_up` / `votes_down` / `votes_resuelta` | int | Conteos por tipo de voto |
| `score` | int | `votes_up - votes_down` |
| `reports_total` / `reports_pending` / `reports_resolved` / `reports_rejected` | int | Conteos de denuncias por estado |

### Columnas de `bi.incident_reports_daily`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `report_id` / `incident_id` | uuid | Ids de la denuncia e incidencia |
| `category` / `severity` | — | Contexto de la incidencia denunciada |
| `estimated_duration` | text | Duración estimada de la incidencia |
| `incident_visibility` | text | Visibilidad de la incidencia denunciada |
| `latitude` / `longitude` | numeric | Ubicación |
| `country` / `region` / `province` / `comuna` | text | Geografía administrativa (contexto de la incidencia) |
| `neighbourhood` / `street` / `house_number` | text | Desglose de la dirección |
| `report_status` | text | pendiente / resuelto / rechazado |
| `reason` | text | Motivo de la denuncia (sin autor) |
| `report_date` / `updated_at` | date/timestamptz | Fechas |

> `bi.incident_reports_daily` **no** incluye `reported_by` (anonimizado).

### Tiempo real

Las vistas BI **no son un snapshot**: se calculan sobre las tablas base
(`incidents`, `incident_votes`, `incident_reports`), de modo que **cada reporte
o voto se refleja de inmediato** en las vistas. No hay ETL ni materialización.
Para que Power BI lo vea en vivo se usa el conector Postgres con `bi_reader`
(sección siguiente) y el modo **DirectQuery**. Con **Import** el dato queda
congelado hasta el próximo refresh (manual o programado).

---

## 2. Conexión desde Power BI (conector Postgres)

**NO** uses el usuario `postgres` (superusuario). Usa el rol de solo lectura
`bi_reader` (`backend/migraciones/nuevo/14_bi_reader_role.sql`).

Existen **dos formas** de conectar. Ambas son equivalentes en seguridad (usan
TLS/SSL de Supabase) y usan el mismo rol `bi_reader`; la diferencia es la ruta
hasta la base:

| | **A. Session Pooler** | **B. Conexión directa** |
|--|----------------------|--------------------------|
| Host | `aws-0-us-west-2.pooler.supabase.com` | `db.teqxrkioyfphbezrlcdl.supabase.co` |
| Puerto | `5432` | `5432` |
| Usuario | `bi_reader.teqxrkioyfphbezrlcdl` | `bi_reader` |
| Qué es | PgBouncer intermedio que reutiliza conexiones | Conexión a tu instancia de PostgreSQL |
| Estabilidad en BI | Buena; a veces el pool puede cerrar la sesión | Más estable, sin intermediarios |

> **Recomendado:** la **conexión directa (B)** es la más confiable para Power BI,
> porque el conector mantiene conexiones persistentes y no hay intermediario que
> pueda desconectarlas. Usa el **pooler (A)** si tu red/seguridad lo exige.

### Opción A — vía Session Pooler

1. **Obtener datos → PostgreSQL**.
2. Parámetros (de Supabase → Settings → Database → **Session pooler**):
   - *Host*: `aws-0-us-west-2.pooler.supabase.com` — puerto `5432`.
   - *Database*: `postgres`
   - *Username*: `bi_reader.teqxrkioyfphbezrlcdl`
   - *Password*: la del rol `bi_reader`.

### Opción B — conexión directa (recomendada)

1. **Obtener datos → PostgreSQL**.
2. Parámetros (de Supabase → Settings → Database → **Connection string (direct)**):
   - *Host*: `db.teqxrkioyfphbezrlcdl.supabase.co` — puerto `5432`.
   - *Database*: `postgres`
   - *Username*: `bi_reader`
   - *Password*: la del rol `bi_reader`.

### Pasos comunes (cualquiera de las dos opciones)

3. En **Advanced options → SQL statement** (recomendado):
   ```sql
   select * from bi.incident_daily;
   ```
4. *Import* (default) para snapshots, o *DirectQuery* para siempre en vivo.

> **Por qué session (5432) y no transaction (6543):** el session pooler y la
> conexión directa soportan prepared statements y sesiones persistentes, que es
> lo que exige el conector de Power BI. El modo transacción (6543) no lo soporta
> y suele fallar.

### Error "no tenant identifier provided" (pooler)

Si al usar el pooler aparece:

> `PostgreSQL: XX000: (ENOIDENTIFIER) no tenant identifier provided (external_id or sni_hostname required)`

es que el pooler no pudo determinar a qué proyecto redirigir la conexión. Es un
problema **de la conexión, no de los permisos** de `bi_reader`. Soluciones:

1. **Usar la conexión directa (Opción B)** — la más recomendada y evita el pooler.
2. O, si necesitas el pooler, agrega en **Advanced options → Additional
   connection parameters**:
   ```
   options=--project=teqxrkioyfphbezrlcdl
   ```

### Error "remote certificate is invalid"

Ver `docs/bi-client-onboarding.md` §2. Resumen: instalar la **CA de Supabase**
(Settings → Database → **SSL Configuration → Download Certificate**) en el
almacén **Entidades de certificación raíz de confianza** de la máquina que corre
la conexión (tu PC para Desktop, o la máquina del **gateway** para Power BI
Service).

---

## 3. Exportación CSV (alternativa / orquestación)

Con `service_role` (o clave de lectura dedicada) vía PostgREST:

```bash
curl -s -H "Accept: text/csv" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  "https://teqxrkioyfphbezrlcdl.supabase.co/rest/v1/public/analytics_incident_daily?select=*&order=report_date.desc"
```

Variantes útiles:

```bash
# Por rango de fechas
...?report_date=gte.2026-01-01&report_date=lte.2026-12-31

# Solo activas
...?visibility=eq.activo

# Ocultas por moderación
...?visibility=eq.oculto_moderacion

# Todos los registros
...?select=*
```

> ⚠️ Si se comparte el reporte con un cliente, **no** incrustar la `service_role`
> en el reporte. Emitir una clave de solo lectura o usar el conector Postgres con
> `bi_reader` (recomendado).

---

## 4. Seguridad del producto de datos

- No exponer `bi.*` ni `public.analytics_*` a roles `anon` / `authenticated`.
  Solo `service_role` (exportación programática) y `bi_reader` (solo lectura,
  Power BI) tienen `SELECT`.
- `public.analytics_*` delegan en `bi.*`; `anon` no puede leerlas.
- `bi_reader` solo lee las vistas BI; las vistas corren como su dueño, por lo
  que **no accede** a tablas base ni a datos de denunciantes.
- Datos **anonimizados**: sin identidad de denunciantes/usuarios (ver
  `docs/data-dictionary.md`).

---

## 5. Migraciones de la capa BI

En Supabase, la capa BI la proveen:
- `00_esquema_actual.sql` (esquema completo + vistas BI ampliadas + grants `service_role` + deduplicación)
- `14_bi_reader_role.sql` (rol `bi_reader`)
