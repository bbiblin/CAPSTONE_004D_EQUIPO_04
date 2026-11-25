# Diagramas técnicos de Movimap

> Carpeta de diagramas del proyecto. Los diagramas se mantienen **como código**
> (Mermaid / PlantUML) para versionarlos y poder **importarlos y editarlos en
> Drawio** de forma visual.

---

## Contenido

| Archivo | Diagrama | Notación | Nivel |
|---------|----------|----------|-------|
| `mapa-tecnologico-bpmn.md` | Mapa tecnológico de procesos | BPMN (aproximado en Mermaid) | Nivel 0 y 1 |
| `c4-contexto.puml` | Contexto del sistema | C4-PlantUML (C4) | Nivel 0 |
| `c4-contenedores.puml` | Arquitectura de contenedores | C4-PlantUML (C4) | Nivel 1 |
| `flujo-reporte.puml` | Flujo del reporte de incidencia | C4-PlantUML (C4) | Nivel 1 |
| `comunicacion-servicios.drawio` | Comunicación entre servicios | Drawio (nativo) | Nivel 2 |
| `comunicacion-servicios.puml` | Comunicación entre servicios | C4-PlantUML (C4) | Nivel 2 |

### Diagramas nos diremos

- **BPMN (nivel 0/1)** — cómo fluye el negocio: registro/login, exploración
  del mapa, reporte de incidencias, votación/denuncias, panel admin y producto
  de datos BI. Modela carriles por rol (Ciudadano, Admin, Cliente BI, Sistema).
- **C4 (nivel 0/1)** — qué componentes intervienen: el sistema Movimap (frontend,
  Supabase: Auth/DB/Storage/Realtime/PostgREST) y sus dependencias externas
  (Nominatim/OpenStreetMap, Power BI).

---

## Cómo usar los diagramas en Drawio

### BPMN (`mapa-tecnologico-bpmn.md`)
Se entrega como **especificación** (texto estructurado: carriles, tareas,
decisiones) más que como código listo. Para dibujarlo en Drawio:
1. Abrir `app.diagrams.net`.
2. Insertar manualmente las formas según la tabla de notación del documento
   (rectángulos = tareas, rombos = gateways, elipses = eventos, cajas = carriles).

> Nota: la **notación BPMN no es nativa** en Mermaid ni en Drawio; las formas
> se aproximan con los shapes genéricos de Drawio.

### C4 (`c4-contexto.puml` / `c4-contenedores.puml` / `flujo-reporte.puml`)
Son PlantUML con el plugin **C4-PlantUML** mediante `!include <C4/...>`. Esta
sintaxis busca la librería en el *include path* de PlantUML (extensión VS Code
"PlantUML" o una instalación local de C4-PlantUML). Para importarlos en Drawio:
1. Abrir `app.diagrams.net`.
2. `Extras → Insertar → Avanzado → PlantUML` (o `Insertar → PlantUML`).
3. Pegar el contenido del `.puml` y pulsar *Insertar*.
4. El resultado queda **editable** como shapes de Drawio.

> Alternativa: previsualizar con la extensión VS Code *PlantUML* o con
> `plantuml.com/plantuml` si el plugin requiere internet.

### `comunicacion-servicios.drawio` (nativo)
Es un archivo **Drawio nativo** (no código importado), por lo que se abre
directamente en `app.diagrams.net` o en la extensión *Draw.io* de VS Code y se
edita con shapes reales (cilindros = BD, cajas = servicios, grupo punteado =
Supabase). Los nodos, colores y flechas están ya a 1:1 con `comunicacion-servicios.puml`.

---

## Convenciones

- Los diagramas de **proceso** se listan en BPMN (qué hace el negocio).
- Los diagramas de **arquitectura** se listan en C4 (qué sistemas intervienen).
- Se mantienen como **código** (Mermaid/PlantUML) para permitir *diff* y revisión.
