# Movimap — Guía de onboarding para clientes (acceso BI de solo lectura)

> Documento para que una **institución / municipalidad** consuma el producto de
> datos de Movimap desde **Power BI** u otra herramienta de BI.
> Canal principal: conexión **PostgreSQL de solo lectura** con el rol `bi_reader`
> a través del **session pooler** de Supabase.

---

## 1. Credenciales de conexión

> Canal principal: conexión **PostgreSQL de solo lectura** con el rol `bi_reader`.
> Hay **dos formas** de conectar; elige una (ver comparación abajo).

### Opción A — vía Session Pooler

| Parámetro | Valor |
|-----------|-------|
| Host | `aws-0-us-west-2.pooler.supabase.com` |
| Puerto | `5432` (Session Pooler) |
| Base de datos | `postgres` |
| Usuario | `bi_reader.teqxrkioyfphbezrlcdl` |
| Contraseña | (entregada al cliente por Movimap) |

### Opción B — conexión directa (recomendada)

| Parámetro | Valor |
|-----------|-------|
| Host | `db.teqxrkioyfphbezrlcdl.supabase.co` |
| Puerto | `5432` (direct) |
| Base de datos | `postgres` |
| Usuario | `bi_reader` |
| Contraseña | (entregada al cliente por Movimap) |

> **Diferencia:** el **pooler (A)** es un PgBouncer intermedio que reutiliza
> conexiones entre clientes; la **conexión directa (B)** va a tu instancia de
> PostgreSQL sin intermediarios. **Ambas son equivalentes en seguridad** (usan
> TLS/SSL de Supabase y el mismo rol `bi_reader`), pero la **directa (B) es más
> estable** para Power BI porque el conector mantiene conexiones persistentes:
> en el pooler la sesión puede cerrarse ocasionalmente. Usa el pooler (A) solo si
> tu red/seguridad lo requiere.
>
> Formato de usuario: en el pooler es `rol.project_ref` (igual que
> `postgres.teqxrkioyfphbezrlcdl`); en la conexión directa el usuario es solo
> `bi_reader`.
> Por qué **session (5432)** y no **transaction (6543)**: el session pooler y la
> conexión directa dan una conexión persistente con soporte completo de
> PostgreSQL (prepared statements), que es lo que requiere el conector de Power
> BI. El modo transacción no lo soporta bien y suele fallar.

### Consultas recomendadas

```sql
-- Toda la información (una fila por incidencia)
select * from bi.incident_daily;

-- Últimos 90 días
select * from bi.incident_daily
where report_date >= current_date - 90;

-- Denuncias anonimizadas
select * from bi.incident_reports_daily;
```

> ⚠️ **Cambio de esquema (status → visibility).** La migración
> `21_remover_estados_por_umbrales.sql` eliminó la columna `status` de
> `bi.incident_daily`. Ahora la visibilidad es **`visibility`**
> (`activo` / `inactivo_rechazo` / `inactivo_resuelta` / `oculto_moderacion`).
> Si tu data source fue creado con `status`, **recrea la conexión** y usa
> `visibility` para los filtros de estado, y `has_resolved_by` / `resolved_at`
> para resueltas.

---

## 2. Entender el "certificado CA" (la causa de un error típico)

### ¿Qué es el certificado?
Cuando te conectas por SSL, el servidor (Supabase pooler) te muestra un
**certificado digital**: un documento con su identidad y una clave pública,
firmado por una **autoridad certificadora (CA)**. Tu cliente (Power BI)
verifica que ese certificado esté firmado por una CA **confiable**; si no la
reconoce, rechaza la conexión.

### El error más común
Al conectar Power BI, puede aparecer:

> `the remote certificate is invalid according to the validation procedure`

**Causa:** el conector PostgreSQL nativo de Power BI valida el certificado del
servidor contra el almacén de "Certificados raíz de confianza" de tu máquina,
y ahí **no está** la CA que firma el certificado del pooler de Supabase. Por eso
rechaza la conexión. **No es un problema de usuario ni de contraseña** (ese error
aparecería como "autenticación fallida"); es solo que falta confiar en la CA.

### ¿De dónde saco la CA? (Está en Supabase, no hay que crearla)
La CA **no hay que crearla**: Supabase ya la publica. Se descarga desde el panel:

1. Entra a [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto.
2. **Settings → Database**.
3. En la sección **SSL Configuration** está el botón **"Download Certificate"**
   (Descargar certificado). Ese descarga el certificado raíz (`*.pem` / `.crt`).

> El archivo descargado es la **CA raíz de Supabase** que firma los certificados
> del pooler y de `db.<ref>.supabase.co`. Descargarlo en sí no cambia nada:
> hay que **confiarlo/instalarlo** (paso 3).

### ¿Cómo instalo la CA para que Power BI la acepte?
Depende de dónde corre la conexión:

- **Power BI Desktop (en tu PC):** instala el certificado en el almacén de
  Windows del equipo donde abres Power BI Desktop:
  1. Doble clic en el archivo `.cer/.crt` → **Instalar certificado**.
  2. Elige *Local Machine* → *"Colocar todos los certificados en el siguiente
     almacén"* → **Entidades de certificación raíz de confianza** → Finalizar.
  3. Cierra y vuelve a conectar Power BI.
- **Power BI Service (web):** la conexión corre en un **On-premises data
  gateway**. El certificado CA debe instalarse en el **almacén de credenciales
  de la máquina que ejecuta el gateway** (mismo procedimiento, pero en esa
  máquina). Sin gateway, el conector PostgreSQL no funciona desde el servicio.
- Alternativa sin gateway/certificado: ver §4 (Web/CSV).

---

## 3. Conexión desde Power BI Desktop (conector PostgreSQL)

1. **Obtener datos → PostgreSQL**.
2. Elige una de las dos opciones de §1:
   - **Opción A (pooler):** *Server* `aws-0-us-west-2.pooler.supabase.com`
     · *Database* `postgres` · Usuario `bi_reader.teqxrkioyfphbezrlcdl`.
   - **Opción B (directa, recomendada):** *Server*
     `db.teqxrkioyfphbezrlcdl.supabase.co` · *Database* `postgres` · Usuario
     `bi_reader`.
3. Introduce la contraseña del cliente.
4. En **Advanced options → SQL statement**, pega una consulta de §1.
5. Elige modo **Import** (snapshot) o **DirectQuery** (siempre en vivo).
6. Si aparece el error de certificado, asegúrate de haber instalado la CA (§2).

### Error "no tenant identifier provided" (solo en el pooler)

Si con la Opción A aparece:

> `PostgreSQL: XX000: (ENOIDENTIFIER) no tenant identifier provided (external_id or sni_hostname required)`

es que el pooler no pudo identificar a qué proyecto dirigir la conexión (no es
un problema de permisos). Solución:

1. **Pasa a la Opción B** (conexión directa), más estable.
2. O agrega en **Advanced options → Additional connection parameters**:
   ```
   options=--project=teqxrkioyfphbezrlcdl
   ```

---

## 4. Alternativa sin gateway ni certificado: importar CSV (opcional)

Si el cliente solo quiere un import rápido y no quiere resolver el certificado
ni usar gateway, puede consumir la API con un conector **Web**:

```bash
curl -s -H "Accept: text/csv" \
  -H "Authorization: Bearer <API_KEY_DE_LECTURA>" \
  "https://teqxrkioyfphbezrlcdl.supabase.co/rest/v1/public/analytics_incident_daily?select=*&order=report_date.desc"
```

- En Power BI: conector **Web** con la URL y la cabecera `Authorization`.
- ⚠️ **No usar la `service_role`** en un reporte compartido: ese secreto quedaría
  en el reporte. Para este canal se debe emitir una **API key de solo lectura**
  dedicada por cliente.

---

## 5. Seguridad

- El rol `bi_reader` es **solo lectura**: no puede insertar, actualizar ni borrar
  datos ni modificar el esquema.
- Las vistas BI se ejecutan como su dueño, por lo que `bi_reader` **no accede** a
  tablas base ni a datos personales (denunciantes, emails, etc.).
- No usar el superusuario `postgres` para BI.
- Revisar el alcance comercial en `docs/terms-of-use.md`.
