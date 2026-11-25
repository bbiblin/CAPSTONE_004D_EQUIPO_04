# Movimap — Verificación de seguridad (ISO/IEC 27001)

La seguridad se verifica bajo el marco **ISO/IEC 27001 (Anexo A)**, reutilizando
la matriz de controles ya documentada en `docs/SEGURIDAD-CONTROLES.md` y el
script de verificación **de solo lectura**
`backend/migraciones/verificar_seguridad.sql`.

> La verificación **principal** es la del esquema y sus controles de acceso.
> Las herramientas de escaneo (ZAP, npm audit) son **complementarias**: ayudan a
> respaldar algunos controles, pero **no** sustituyen la verificación de RLS.
> Se recomienda ejecutarlas de forma **no intrusiva** (baseline pasivo) y **no**
> contra producción con datos reales.

## 1. Verificación principal (solo lectura) — ISO/IEC 27001

Ejecutar `backend/migraciones/verificar_seguridad.sql` en el **SQL Editor de
Supabase**. Confirma los controles del Anexo A:

| Control | Qué confirma |
|---|---|
| **A.9.1.2** | `profiles` sin `select` público (anon no lee PII); `incidents` sin select público (solo `incidents_public`); `incident_votes` restringida a autor/admin |
| **A.9.2.3** | Escalada a `admin` bloqueada (`guard_profile_update`); bucket de fotos sin enumeración |
| **A.12.4.1** | `audit_log` con insert solo para `service_role` |
| **A.14.2.5** | RPCs `security definer` con `set search_path = ''` |
| **A.9.4.5** | Vistas BI accesibles solo por `bi_reader`/`service_role` (GRANTs) |

Guardar la salida como evidencia en `docs/evidencias/seguridad/`
(ej. `PS-01-rls.sql`, `PS-04-escalada.sql`, `PS-08-audit_log.sql`).

## 2. Controles A.10 (criptografía) y A.14 (desarrollo seguro)

- **A.10.1.1** — Transporte TLS (Supabase) y hash de contraseñas (bcrypt).
  Verificable revisando HTTPS y la configuración de Auth.
- **A.10.1.2** — Secretos no versionados. Confirmar con una búsqueda en el repo:
  ```powershell
  git grep -nE "sb_secret_|service_role|bi_password" -- .
  ```
  Resultado esperado: **sin coincidencias** (solo en `.env.local`/GUC, no en git).
- **A.14.2.1** — TypeScript estricto + tests + CI (el job `frontend` de
  `ci.yml`). Verificable con `npm run test` y `npm run build`.

## 3. Verificación complementaria — dependencias (A.12.6.1)

Desde `frontend/`:

```powershell
cd frontend
npm audit --audit-level=high
```

Salida esperada: **0 vulnerabilidades** de severidad alta/crítica.

```powershell
npm audit --audit-level=high *> ..\docs\evidencias\seguridad\PS-10-npm-audit.txt
```

## 4. Verificación complementaria — DAST (OWASP ZAP, opcional)

Únicamente como soporte y con un **baseline pasivo** sobre un entorno de
**pruebas/staging** (no sobre producción).

### Instalación
- CLI: `pip install zapcli` (requiere Java + ZAP)
- Alternativa con Docker:

### Baseline pasivo (recomendado)

```powershell
zap-cli start
zap-cli quick-scan --scanners=passive <URL-de-TEST>
zap-cli report -f html -o ..\docs\evidencias\seguridad\PS-zap-report.html
zap-cli shutdown
```

> ⚠️ **Prudencia**: no ejecutar escaneo **activo** contra producción. Si se
> hace, hacerlo solo contra el entorno de pruebas.

## 5. Ejecutar todos los checks (Windows)

```powershell
.\testing\security\run-security-checks.ps1
```

Incluye `npm audit` y, si `zap-cli` está disponible, el baseline pasivo.
Los archivos se guardan en `docs/evidencias/seguridad/`.
