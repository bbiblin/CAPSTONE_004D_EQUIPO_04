# Evidencias de pruebas

Esta carpeta almacena las **evidencias** de los distintos niveles de prueba,
separadas por tipo. (Referencia única: `docs/PLAN-DE-PRUEBAS.md`.)

## Estructura

```
docs/evidencias/
├── funcional/     # capturas de pruebas funcionales manuales (PNG)
├── integracion/   # capturas E2E (PNG), traces y reportes HTML/JSON de Playwright
├── rendimiento/   # reportes HTML/JSON de Lighthouse y k6
└── seguridad/     # salida de npm audit, SQL verificado (RLS), matriz ISO
```

## Convención de nombres

`<ID-caso>-<descripcion>.<ext>`.

Ejemplos:
- `PR-01-carga-inicial.png` (funcional)
- `PI-01-carga-inicial.png` (integración)
- `PRF-01-lighthouse.html` (rendimiento)
- `PS-01-rls.sql` (seguridad)

## Herramientas que generan las evidencias

| Nivel | Herramienta | Carpeta |
|---|---|---|
| Funcional | Capturas manuales del navegador | `funcional/` |
| Integración | **Playwright** (`frontend/e2e`) | `integracion/` |
| Rendimiento | **k6** + **Lighthouse** | `rendimiento/` |
| Seguridad | **npm audit** + `verificar_seguridad.sql` | `seguridad/` |

> Si las capturas o reportes superan unos pocos MB, comprímelos o súbelos a un
> almacenamiento compartido (Git LFS / GitHub Release / Drive) y referencia el
> enlace en el documento de resultados. Las imágenes no se incrustan en los
> archivos Markdown: se guardan como archivos y se referencian por ruta.
