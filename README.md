# Movimap

Plataforma web de **reportes ciudadanos de incidencias de accesibilidad urbana** (veredas en mal estado, rampas, iluminación, ascensores, etc.), con validación comunitaria y explotación de los datos como producto de Business Intelligence.

🔗 **Aplicación desplegada:** https://movimap-duoc.netlify.app/

---

## Descripción

Movimap permite a los ciudadanos **reportar incidencias georreferenciadas** en el espacio público, adjuntar evidencia fotográfica y validarlas mediante votos de la comunidad (confirmar, rechazar o marcar como resuelta). Los administradores moderan las incidencias y las denuncias, y la información recopilada se expone como **producto de datos** para herramientas de BI (por ejemplo, Power BI).

**¿A quién va dirigido?**
- **Ciudadanía:** personas que quieren visibilizar y priorizar problemas de accesibilidad en su entorno.
- **Autoridades / municipios:** equipos que necesitan información georreferenciada y validada para focalizar recursos.
- **Clientes institucionales:** organizaciones interesadas en consumir el producto de datos para análisis urbano.

**¿Qué problema resuelve?**
Centraliza el reporte de incidencias que hoy se realiza por vías informales (teléfono, correo o redes sociales), sin ubicación precisa, sin trazabilidad y sin forma de validar ni priorizar los casos. Movimap elimina los reportes duplicados, agiliza la gestión y transforma datos dispersos en información estructurada y analizable.

---

## Tecnologías utilizadas

| Capa | Tecnologías |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, React Router, React Hook Form + Zod, Leaflet (`react-leaflet`, `react-leaflet-cluster`, `leaflet.heat`), Recharts, `lucide-react` |
| **Moderación** | `nsfwjs` + TensorFlow.js (imágenes), `bad-words` (texto) |
| **Backend / Base de datos** | Supabase (PostgreSQL + Auth + Storage + Realtime + PostgREST) |
| **Datos / BI** | Esquema `public` normalizado + esquema `bi` (vistas `bi.incident_daily`, `bi.incident_reports_daily`), rol de solo lectura `bi_reader` |
| **Cloud / Despliegue** | Netlify (frontend), Supabase (backend gestionado) |

---

## Ejecución local

**Requisitos:** Node.js 18 o superior y npm.

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd movimap-sprints/frontend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (ver abajo)

# 4. Levantar el entorno de desarrollo
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

**Variables de entorno** — crear `frontend/.env`:

```env
VITE_SUPABASE_URL=https://<PROYECTO>.supabase.co
VITE_SUPABASE_ANON_KEY=<PUBLISHABLE_ANON_KEY>
```

> Las claves se obtienen en **Supabase → Project Settings → API**. La clave `anon`/publishable es pública por diseño; **nunca** incluir la clave `service_role` en el frontend.

**Compilar para producción:**

```bash
npm run build      # tsc + vite build -> genera frontend/dist
npm run preview    # sirve localmente la build de producción
```

---

## Integrantes del equipo y roles

| Integrante | Rol |
|---|---|
| Carlos Espinoza | Scrum Owner |
| Belén Díaz | Frontend Developer |
| Juan Candia | QA |

---

## Metodología de trabajo

- **Marco de trabajo:** Scrum (iteraciones tipo Sprint con planificación, desarrollo y revisión).
- **Gestión del backlog:** GitHub Projects (Product Backlog y Sprint Backlog priorizados).
- **Asignatura:** Capstone.
- **Prácticas de calidad:** Definition of Done, plan de pruebas basado en criterios de aceptación y verificación de compilación (`tsc` + `vite build`).
- **Control de versiones:** Git, con ramas de trabajo por feature y pull requests para revisión de pares.

---

## Arquitectura de la solución

Movimap sigue una arquitectura cliente-servidor serverless sobre Supabase:

```
┌─────────────────────────────┐
│        Frontend (SPA)        │
│  React + TypeScript + Vite   │
│  Leaflet · Recharts · Zod    │
└───────────────┬─────────────┘
                │  HTTPS (PostgREST) + WebSocket (Realtime)
                ▼
┌─────────────────────────────┐        ┌──────────────────────┐
│          Supabase            │        │   Producto de datos  │
│  PostgreSQL · Auth · Storage │──────▶ │  bi.incident_daily   │
│  Realtime · PostgREST · RLS  │        │  analytics_* (CSV)   │
└───────────────┬─────────────┘        │  rol bi_reader       │
                │                       └──────────┬───────────┘
                │ (bucket incident-photos)          │
                ▼                                    ▼
        Evidencia fotográfica              Power BI / BI externa
```

**Capas:**

1. **Presentación (Frontend):** aplicación SPA en React + TypeScript. El mapa carga los reportes del área visible (viewport), con clustering y heatmap según el zoom, actualización en tiempo real (WebSocket) y formularios validados con Zod.
2. **Datos y lógica (Backend Supabase):** PostgreSQL con **RLS** en todas las tablas; Auth; Storage (bucket `incident-photos`); vistas dinámicas (`incidents_with_stats`, `incidents_public`); funciones y triggers (perfil automático, auditoría, umbrales de ocultamiento automático).
3. **Producto de datos (BI):** esquema `bi` con vistas analíticas (`bi.incident_daily`, `bi.incident_reports_daily` anonimizada) y vistas espejo en `public` para exportación CSV vía PostgREST; rol de solo lectura `bi_reader` para consumo externo (Power BI).

---
