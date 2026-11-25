# Movimap — Controles de seguridad de la información (ISO/IEC 27001)

> Documento de referencia para la auditoría académica. Mapea los controles del
> **Anexo A de ISO/IEC 27001** a lo implementado en Movimap, con la evidencia
> (archivo / script) que respalda cada control.
>
> Alcance: plataforma web de reportes de incidencias de accesibilidad urbana,
> frontend React (Vite) + backend en **Supabase** (PostgreSQL, Auth, Storage),
> capa BI (Power BI / Postgres) con rol read-only `bi_reader`.
>
> Fecha: 2026-10-22 · Estado: aplicado en el esquema canónico
> (`backend/migraciones/nuevo/00_esquema_actual.sql`).

---

## Modelo de amenaza (resumen)

| # | Activo | Categoría | Riesgo objetivo |
|---|--------|-----------|-----------------|
| 1 | Base de datos (incidentes, votos, denuncias) | C | Lectura no autorizada, escalada de privilegios |
| 2 | Fotografías (bucket `incident-photos`) | C / I | **Enumeración** del bucket y **correlación foto→usuario/email** |
| 3 | Datos personales (email, nombre, perfil) | C | Exposición de PII al público |
| 4 | Rol BI (`bi_reader`) | C | Credenciales hardcodeadas / acceso de escritura |
| 5 | Funciones / RPCs | I | Abuso de `security definer` (hijacking de `search_path`) |

C: confidencialidad · I: integridad

---

## Matriz de controles (Anexo A)

> Nota de alcance: en un MVP académico se priorizan los controles **A.9 (acceso)**,
> **A.10 (criptografía)**, **A.12 (operaciones)** y **A.14 (desarrollo seguro)**.
> Los controles organizacionales (A.6, A.7, A.15) se documentan como **marco de
> gobierno** del proyecto/institución.

### A.5 — Políticas de seguridad de la información

| Control | Implementado | Evidencia |
|---------|--------------|-----------|
| A.5.1.1 Política de seguridad | Documento de política y matriz de controles | `docs/SEGURIDAD-CONTROLES.md`, `docs/PRIVACIDAD.md` |

### A.6 — Organización de la seguridad

| Control | Implementado | Evidencia |
|---------|--------------|-----------|
| A.6.1.1 Roles y responsabilidades | Rol `admin` (moderación) y rol `user`; rol BD `bi_reader` sin privilegios | `00_esquema_actual.sql`, `14_bi_reader_role.sql` |
| A.6.1.2 Separación de funciones | Moderación (admin) separada de reporte (usuario); BI con rol read-only | políticas RLS de `incidents`/`incident_reports` |

### A.7 — Recursos humanos (marco)

Consentimiento informado de usuarios (términos + fotografías) al registrarse y en
`profiles`/`terms_acceptance_log`. Ver `docs/terms-and-conditions.md` y
`18_terms_consent.sql`.

### A.8 — Gestión de activos

| Control | Implementado | Evidencia |
|---------|--------------|-----------|
| A.8.1.1 Inventario de activos | Documentado en diccionario de datos y arquitectura | `docs/data-dictionary.md`, `docs/arquitectura-datos-decisiones.md` |
| A.8.2.1 Clasificación de la información | PII (email/perfil), datos públicos (incidencias), datos BI agregados | vistas: `incidents_public` (sin PII) vs `incidents_with_stats` (solo admin) |

### A.9 — Control de acceso (remediado)

| Control | Implementado | Evidencia |
|---------|--------------|-----------|
| A.9.1.2 Acceso solo por autorización | RLS en todas las tablas | `00_esquema_actual.sql` (bloque RLS), `18` |
| A.9.2.3 Gestión de derechos de acceso privilegiado | Solo admin puede moderar/ocultar; **escalada a admin bloqueada** por trigger `guard_profile_update` + RLS | `00` (trigger + políticas de `profiles`) |
| A.9.3.1 Uso de contraseñas seguras | Auth de Supabase (contraseña) + confirmación de email | Supabase Auth, `18` |
| A.9.4.2/5/6/7 Registro e integridad | Tabla `audit_log` + triggers de auditoría (votos, moderación, consentimiento) | `00` (triggers), `18` |
| A.9.4.5 Revisión de derechos de acceso | `bi_reader` revisado y restringido a lectura de vistas | `14`, `15` |

**Detalle de la remediación de acceso**
- `profiles`: ya **no** hay `select` para `public` (anon). El email/organización
  venían expuestos; ahora solo el propio usuario o un admin lee una fila.
- `incidents` (tabla base): ya no hay `select` público. La lectura pública pasa
  siempre por `incidents_public` o por los RPCs (`security definer`).
- `incident_votes`: `select` restringido a autor/admin (se oculta `user_id`).
- `incident_reports` y `audit_log`: solo admin; `audit_log` ahora inserta solo
  el sistema (`service_role`), no cualquier usuario autenticado.

### A.10 — Criptografía

| Control | Implementado | Evidencia |
|---------|--------------|-----------|
| A.10.1.1 Política de uso de criptografía | Transporte HTTPS/TLS (Supabase) + hash de contraseñas de Auth | Supabase (TLS, `bcrypt`) |
| A.10.1.2 Gestión de claves y secretos | **No** se versionan claves `service_role` ni contraseñas BD. Las contraseñas de BI se definen vía GUC `app.bi_password` (no hardcodeadas) | `.env.example`, `.gitignore`, `14`, `14a`, `15` |

### Nota sobre las vistas BI marcadas como "unrestricted" en Supabase
En el editor de tablas/vistas de Supabase, las vistas `bi.incident_daily` y
`bi.incident_reports_daily` aparecen como **"unrestricted"**. Esto es **correcto
y no es un fallo**:
- Significa que corren con `security_invoker = false` (se ejecutan como su
  **dueño**, `postgres`, y omiten el RLS de las tablas base). Es **intencional**:
  así el rol `bi_reader` (solo-lectura) puede leer la vista **agregada** sin
  necesitar permisos sobre `incidents`, `profiles`, `incident_reports`, etc.
- El acceso **sí está controlado por GRANTS** (no por RLS): en `00` se hace
  `revoke all` a `public`/`anon`/`authenticated` y solo se `grant select` a
  `service_role` y a `bi_reader`. Por eso, aunque la vista sea definer, **solo**
  los roles BI/service pueden leerla; los usuarios anónimos/autenticados de la
  app no pueden.
- Verificación de respaldo:
  ```sql
  select has_table_privilege('bi_reader','bi.incident_daily','SELECT') as bi_lectura,
         has_table_privilege('anon','bi.incident_daily','SELECT')     as anon_lectura;
  ```
- Las vistas espejo `public.analytics_*` sí están en modo **invoker**
  (`security_invoker = true`), por lo que pueden mostrarse con otro label.

### A.11 — Seguridad física (marco/cloud)

Los datos residen en la nube de Supabase (infra gestionada con cifrado en reposo y
en tránsito). No se gestionan servidores propios.

### A.12 — Seguridad de las operaciones

| Control | Implementado | Evidencia |
|---------|--------------|-----------|
| A.12.4.1 Registro de eventos | `audit_log` + logs de Supabase | `00`, `18` |
| A.12.2.1 Controles anti-malware | Moderación **local** NSFW (`nsfwjs`) y texto (`bad-words`) | `frontend/src/lib/imageModeration.ts`, `textFilter.ts` |
| A.12.1.1 Documentación de procedimientos | Orden de migraciones y verificación | `backend/migraciones/README.md`, `verificar_*` |
| A.12.6.1 Gestión de vulnerabilidades | Auditoría MVP + verificación de seguridad | `docs/AUDITORIA-MVP.md`, `verificar_seguridad.sql` |

### A.13 — Seguridad de las comunicaciones

| Control | Implementado | Evidencia |
|---------|--------------|-----------|
| A.13.1.1 Controles de red | Acceso por HTTPS; la API pública de Nominatim se usa sin credenciales (limitada a Chile) | `frontend/src/lib/supabase.ts` |
| A.13.2.3 Mensajería/acceso a datos | `bi_reader` conecta por Postgres sobre TLS, solo lecturas | `14`, `15` |

### A.14 — Desarrollo seguro / adquisición de sistemas (remediado)

| Control | Implementado | Evidencia |
|---------|--------------|-----------|
| A.14.1.1 Requisitos de seguridad | Auth + términos + consentimiento obligatorio para votar/reportar/denunciar/subir fotos | `18_terms_consent.sql` |
| A.14.2.1 Política de desarrollo seguro | TypeScript estricto, `zod`, tests (vitest), CI | `frontend/package.json`, `.github/workflows/ci.yml` |
| A.14.2.5 Revisión de código de aplicaciones | Auditoría y revisión manual del esquema/RPCs | `docs/AUDITORIA-MVP.md` |
| A.14.2.4/5 | **RPCs `security definer` endurecidos** con `set search_path = ''` (mitiga hijacking) | `00_esquema_actual.sql` |
| A.14.3.1 Protección de datos de prueba | Datos demo sintéticos; el seed no incluye PII real | `01_seed_demo.sql`, `02…` |

### A.15 — Relaciones con proveedores (marco)

Supabase (base de datos/Auth/Storage) actúa como proveedor de servicios cloud. La
documentación de términos y uso de datos está en `docs/terms-of-use.md` y
`docs/terms-and-conditions.md`.

### A.16 — Gestión de incidentes de seguridad (marco)

Política de reporte de incidentes y de respuesta documentada como procedimiento;
la denuncia/reporte de incidencias dentro de la app y el role de moderación (admin)
cumplen la operativa. El monitoreo usa `audit_log`.

### A.17 — Continuidad de los servicios (marco)

La infraestructura la provee Supabase (alta disponibilidad/backups gestionados).
El repositorio de migraciones permite reconstruir el esquema (ver `README.md`).

### A.18 — Cumplimiento

| Control | Implementado | Evidencia |
|---------|--------------|-----------|
| A.18.1.1 Identificación de requisitos legales | Tratamiento de datos personales (Ley 19.628 / RGPD), consentimiento fotográfico | `docs/PRIVACIDAD.md`, `docs/terms-and-conditions.md` |
| A.18.1.3 Protección de registros/auditoría | `audit_log` retiene eventos de moderación y consentimiento | `00`, `18` |

---

## Resumen de remediaciones (para el informe)

### C.1 — Enumeración del bucket de fotos
- **Antes:** política `select` pública sobre `storage.objects` permitía listar todo.
- **Después:** bucket `public` se mantiene para ver cada foto (URL individual), pero
  se elimina la política `select` → **bloqueo de `/object/list`** (sin enumeración).

### C.2 — Correlación foto → usuario/email
- **Antes:** rutas `{userId}/…`, `incidents_with_stats` y `incident_votes`
  expuestas con `created_by`/`user_id`, y `profiles` con `email`.
- **Después:**
  - Rutas opacas `reports/{uuid}…` + nueva columna `storage_path`.
  - `incidents_public` sin PII; `incidents_with_stats` restringida a autor/admin.
  - `incident_votes` restringida a autor/admin; `profiles` sin `select` público.

### C.3 — Escalada de privilegios a `admin`
- Trigger `guard_profile_update` + RLS impiden que un usuario cambie `role`/`email`.

### C.4 — Credenciales hardcodeadas
- `14`/`15` ya no versionan contraseñas; se definen vía GUC `app.bi_password`
  (y `app.bi_users` para uno o más usuarios BI).

### C.5 — Abuso de `security definer`
- Todas las funciones `security definer` con `set search_path = ''`.

### Verificación
- Ejecutar `backend/migraciones/verificar_seguridad.sql` (solo lectura) para
  confirmar cada punto en el proyecto Supabase.
