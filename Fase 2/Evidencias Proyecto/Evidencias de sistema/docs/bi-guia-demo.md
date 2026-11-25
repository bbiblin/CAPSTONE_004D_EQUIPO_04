# Movimap — Guía de demo de la capa BI en Power BI

> Guía práctica para **mostrar en una demo** el producto de datos de Movimap:
> conectar **Power BI Desktop** a las vistas analíticas de Supabase y armar un
> dashboard con gráficos. Es la versión "paso a paso para presentar", complementa
> `docs/bi-powerbi-guia.md` (referencia) y `docs/bi-client-onboarding.md`
> (onboarding de clientes).
>
> Se trabaja con el rol **solo-lectura `bi_reader`** a través del **session
> pooler** de Supabase. Nada de esto escribe en la base.

---

## 1. Qué vas a mostrar

| Vista | Contenido | Demo que habilita |
|-------|-----------|-------------------|
| `bi.incident_daily` | Una fila por incidencia (categoría, severidad, **visibilidad**, ubicación, **geografía admin**: país/región/provincia/comuna, **dirección desglosada**, **duración estimada**, **dimensión temporal** hora/día/mes/semana, fechas, votos, días de resolución, denuncias) | KPIs, gráficos por categoría/visibilidad/severidad/**comuna**, serie temporal + hora del reporte, mapa |
| `bi.incident_reports_daily` | Una fila por **denuncia** anonimizada (sin identidad) con motivo, estado y contexto geográfico | Análisis de denuncias, motivos, tiempo de gestión |

> ⚠️ **Tiempo real:** las vistas se calculan sobre las tablas base, así que cada
> reporte/voto se refleja al instante. Para que la demo/consumidor refleje cada
> cambio, usa el modo **DirectQuery** (siempre en vivo). Con **Import** el dato
> queda congelado hasta el próximo refresh.

---

## 2. Credenciales (definidas por el responsable de datos ✓)

> ⚠️ Por seguridad (ISO 27001 — A.10.1.2), la contraseña del rol BI **no está
> versionada en el repo**. El responsable la define al aplicar las migraciones
> con un GUC de sesión (ver `backend/migraciones/nuevo/14_bi_reader_role.sql` y
> `15_crear_usuarios_bi.sql`):
>
> ```sql
> select set_config('app.bi_password', '<TU-CONTRASEÑA-FUERTE>', false);
> ```
>
> Para crear uno o más usuarios BI (p. ej. para el dashboard demo), configura
> además `app.bi_users` con un JSON `[{"username":"bi_demo","password":"…"}]`.

| Parámetro | Valor (pooler) | Valor (directa) |
|-----------|-------------|-----------------|
| Host | `aws-0-us-west-2.pooler.supabase.com` | `db.teqxrkioyfphbezrlcdl.supabase.co` |
| Puerto | `5432` (**Session Pooler**) | `5432` (direct) |
| Base de datos | `postgres` | `postgres` |
| Usuario | `bi_reader.teqxrkioyfphbezrlcdl` | `bi_reader` |
| Contraseña | *(definida por el responsable — no se publica)* | *(igual)* |

> Hay **dos formas** de conectar; ambas usan el rol `bi_reader` y tienen el mismo
> nivel de seguridad (TLS/SSL de Supabase). La **directa** es más estable para
> Power BI porque no pasa por el pooler; usa el pooler solo si tu red lo exige.
> Para la demo se recomienda la **conexión directa**.
>
> El rol `bi_reader` es **de solo lectura** sobre las vistas BI (sin droits de
> escritura/DDL). No uses el superusuario `postgres`.

---

## 3. Instalar el certificado CA de Supabase (una sola vez)

El conector PostgreSQL de Power BI valida el certificado del servidor. Si no
confías en la CA de Supabase, verás:

> `the remote certificate is invalid according to the validation procedure`

Solución (en la PC donde abres Power BI Desktop):

1. [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto.
2. **Settings → Database** → sección **SSL Configuration** → **Download Certificate**.
3. Doble clic en el `.crt/.cer` descargado → **Instalar certificado**.
4. *Local Machine* → **"Colocar todos los certificados en el siguiente almacén"**
   → **Entidades de certificación raíz de confianza** → Finalizar.
5. Cierra y vuelve a abrir Power BI.

---

## 4. Conectar desde Power BI Desktop

1. **Obtener datos → PostgreSQL**.
2. Elige una de las dos opciones de §2:
   - **Pooler:** *Server* `aws-0-us-west-2.pooler.supabase.com` · *Database*
     `postgres` · Usuario `bi_reader.teqxrkioyfphbezrlcdl`.
   - **Directa (recomendada):** *Server* `db.teqxrkioyfphbezrlcdl.supabase.co`
     · *Database* `postgres` · Usuario `bi_reader`.
3. Introduce la contraseña del `bi_reader`.
4. En **Advanced options → SQL statement**, pega la consulta de la vista que quieras. Se recomienda **Import** (snapshot) para la demo.

**Datos de incidencias:**

```sql
select * from bi.incident_daily;
```

**Datos de denuncias (segunda tabla):**

```sql
select * from bi.incident_reports_daily;
```

> Para series temporales largas y directo, en lugar de `Import` puedes usar
> `DirectQuery` (siempre en vivo), pero para una demo sencilla `Import` es más
> estable.

---

## 5. Visuales sugeridos (dashboard demo)

> Se usa `bi.incident_daily` salvo que se indique lo contrario.

### KPIs (tarjetas)
| Visual | Campo / medida |
|--------|----------------|
| Total incidencias | `Count(incident_id)` |
| % resueltas | Medida DAX (usa `visibility`; la columna `status` ya no existe): `= DIVIDE(CALCULATE(COUNT(incident_daily[incident_id]), incident_daily[visibility]="inactivo_resuelta"), COUNT(incident_daily[incident_id]))` |
| Días promedio de resolución | Medida DAX: `= AVERAGE(incident_daily[resolution_days])` |
| Denuncias totales | `SUM(reports_total)` |

### Gráfico de barras — incidencias por categoría
- **Eje (Axis)**: `category` · **Valores (Values)**: `Count(incident_id)`.

### Donut — distribución por visibilidad
- **Legend**: `visibility` (ya no existe `status`) · **Values**: `Count(incident_id)`.

### Serie temporal — incidencias por mes
- **Eje (Axis)**: `report_date` (agrupar por mes: crea una columna `Mes` =
  `format([report_date], "mmm yyyy")` o usa el *date hierarchy*) · **Valores**:
  `Count(incident_id)`.
- Opcional: segunda línea con `resolution_days` promedio por mes.

### Serie por hora del reporte / fin de semana
- Usa `report_hour` (eje) y **Legend** `report_day_of_week` para analizar en
  qué franjas del día y días de la semana la comunidad reporta más.

### Barras — incidencias por comuna / región
- **Eje (Axis)**: `comuna` (o `region` / `province`) · **Valores**:
  `Count(incident_id)`. Si quieres agrupar por más niveles, usa la jerarquía
  administraiva `country → region → province → comuna`.

### Mapa — ubicación de incidencias
- Visual **Map** o **Azure Map**: `latitude` → Latitude, `longitude` → Longitude,
  y `severity` o `category` → *color*.

### Barras apiladas — denuncias por estado (usar `bi.incident_reports_daily`)
- **Axis**: `report_status` · **Legend**: `reason` · **Values**: `Count(report_id)`.

### Barras — días de resolución por categoría
- **Axis**: `category` · **Values**: `AVERAGE(resolution_days)`.

---

## 6. Puntos a remarcar en la demo

- **Es el mismo dato que la app**, visto desde una capa analítica (producto de
  datos), no una herramienta aparte.
- **Sin PII**: `bi.incident_reports_daily` no trae `reported_by`; `bi.incident_daily`
  solo indica si hubo responsable (`has_resolved_by`), no quién.
- **Solo lectura y seguro**: el rol `bi_reader` no puede escribir; `anon` y
  `authenticated` están revocados de estas vistas.
- Algunas incidencias están **ocultas en la app pública** (por umbral de
  downvotes/resuelta) pero **sí aparecen en BI**: es justamente el valor de la
  capa de datos (ver incidencias 7 y 8 del seed demo).
- Se puede recalcular `score` en Power BI: `= votes_up - votes_down`.

---

## 7. Verificación rápida (opcional)

Puedes chequear que la capa BI tiene datos con una conexión Postgres o con la
API de lectura (usando una clave de servicio/no incrustada):

```bash
curl -s -H "Accept: text/csv" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  "https://teqxrkioyfphbezrlcdl.supabase.co/rest/v1/analytics_incident_daily?select=*&order=report_date.desc"
```

> ⚠️ Si compartes el reporte con un cliente, **no incrustes la `service_role`**;
> para eso emite una clave de solo lectura o usa el conector Postgres con
> `bi_reader` (recomendado).
