# Movimap — Lighthouse (evidencia de rendimiento)

> Fuente: prueba de Lighthouse sobre el despliegue `https://movimap-sprints.onrender.com/`
> (realizada con la herramienta Lighthouse / PageSpeed Insights).
> Fecha: 2026-11-16.

## Resultados

| Caso (plan) | Métrica | Puntaje | Estado |
|---|---|---|---|
| PRF-01 | **Performance** | **69** | ⚠️ Por debajo del objetivo (≥ 90) |
| PRF-02 | **Accessibility** | **96** | ✅ Conforme |
| PRF-03 | **Best Practices / PWA** | **96** | ✅ Conforme |
| — | **SEO** | **100** | ✅ Conforme |

## Observación (Performance = 69)

El puntaje de rendimiento está por debajo del umbral principalmente por el
**peso del bundle JS**. El build genera varios chunks grandes (los mayores de
~5,5 MB gzip ~3,5 MB) asociados al **modelo NSFW de moderación de imágenes**
(`nsfwjs` / TensorFlow). Esto aumenta el tiempo de carga inicial (LCP) y el
tamaño total transferido.

> Nota para el MVP: es una decisión de producto (moderación local de fotos) que
> tiene un costo de rendimiento aceptado. Opciones futuras: cargar el modelo de
> forma **perezosa** (solo al adjuntar una foto) o reducir su peso. No es un
> defecto funcional, sino una oportunidad de optimización.

## Cómo reproducir

- Opción online (sin instalar): <https://web.dev/measure/> (PageSpeed Insights).
  - Genera el reporte y **guardá la salida como evidencia** en
    `docs/evidencias/rendimiento/PRF-01-lighthouse.html` (y `PRF-01-lighthouse.json`
    si está disponible). La convención de nombre es `<ID-caso>-<descripcion>.<ext>`.
- Opción local (sin admin, requiere Lighthouse instalado):
  `npx lighthouse <URL> --preset=desktop --output=html --output-path=PRF-01-lighthouse.html`

> ⚠️ En esta máquina `npx`/npm no pudo descargar Lighthouse por el **certificado TLS
> del registro** (`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, típico de proxy corporativo).
> Por eso se recomienda la **opción online** (web.dev/measure) y pegar el archivo aquí.
> Si se instala Lighthouse, usar `cmd /c "npx lighthouse ..."` o
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
