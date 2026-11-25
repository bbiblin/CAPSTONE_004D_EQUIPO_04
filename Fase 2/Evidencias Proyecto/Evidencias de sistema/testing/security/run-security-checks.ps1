<#
.SYNOPSIS
  Ejecuta los checks de seguridad gratuitos de Movimap y guarda las evidencias
  en `docs/evidencias/seguridad/`.

.DESCRIPTION
  - npm audit (dependencias) -> PS-12-npm-audit.txt
  - OWASP ZAP baseline (si zap-cli está disponible) -> PS-01-zap-report.html

  La verificación de RLS se hace aparte ejecutando
  `backend/migraciones/verificar_seguridad.sql` en el SQL Editor de Supabase.

.EXAMPLE
  .\testing\security\run-security-checks.ps1 -BaseUrl https://movimap-sprints.onrender.com
#>

param(
  [string]$BaseUrl = 'https://movimap-sprints.onrender.com'
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot   # repo root
$outDir = Join-Path $root 'docs\evidencias\seguridad'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host "==> Evidencias de seguridad en: $outDir" -ForegroundColor Cyan

# ---------- 1. npm audit ----------
Write-Host '`n[1/2] npm audit (frontend)...' -ForegroundColor Yellow
Push-Location (Join-Path $root 'frontend')
try {
  npm audit --audit-level=high *> (Join-Path $outDir 'PS-12-npm-audit.txt')
  Write-Host '   Guardado: PS-12-npm-audit.txt' -ForegroundColor Green
} catch {
  Write-Host '   npm audit falló (¿ejecutaste npm install?).' -ForegroundColor Red
} finally {
  Pop-Location
}

# ---------- 2. OWASP ZAP baseline (si zap-cli está disponible) ----------
Write-Host "`n[2/2] OWASP ZAP baseline contra $BaseUrl ..." -ForegroundColor Yellow
$zap = Get-Command zap-cli -ErrorAction SilentlyContinue
if ($zap) {
  try {
    zap-cli start
    zap-cli quick-scan --scanners=passive $BaseUrl
    zap-cli report -f html -o (Join-Path $outDir 'PS-01-zap-report.html')
    zap-cli shutdown
    Write-Host '   Guardado: PS-01-zap-report.html' -ForegroundColor Green
  } catch {
    Write-Host '   ZAP falló. Revisa la instalación (Java + ZAP).' -ForegroundColor Red
  }
} else {
  Write-Host '   zap-cli no está instalado. Instálalo con: pip install zapcli' -ForegroundColor Magenta
}

Write-Host "`nListo. Revisa: $outDir" -ForegroundColor Green
