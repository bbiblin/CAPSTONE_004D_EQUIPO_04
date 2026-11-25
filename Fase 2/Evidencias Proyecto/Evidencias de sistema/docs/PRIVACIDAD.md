# Movimap — Política de privacidad y protección de datos

> Documento de tratamiento de datos personales para la plataforma Movimap.
> Referencia normativa: Ley 19.628 (Chile) sobre protección de la vida privada y
> principios generales del RGPD. Complementa de forma **separada** a
> `docs/terms-and-conditions.md` (los Términos y Condiciones se consultan de
> forma independiente).
>
> Fecha: 2026-10-22 · Fase de implementación en el MVP.

---

## 1. Responsable del tratamiento
Movimap (proyecto académico de titulación). Contacto y datos del responsable se
completan en la instancia de despliegue.

## 2. Qué información se recopila y datos personales tratados

Al usar Movimap se recopila la siguiente información:

| Dato | Categoría | Fuente | Finalidad |
|------|-----------|--------|-----------|
| Email | Identificación | Registro (Supabase Auth) | Autenticación, recuperación de cuenta |
| Nombre de usuario (`display_name`) | Identificación | Registro | Identificación pública del autor |
| Organización (opcional) | Identificación | Perfil | Personalización/BI |
| Ubicación (lat/lng, comuna, dirección) | Ubicación | Reporte de incidencia | Publicación del reporte en el mapa |
| Categoría / severidad | Ubicación | Reporte de incidencia | Clasificación del reporte |
| Descripción y fecha de observación | Contenido | Reporte de incidencia | Documentar la incidencia |
| Fotografías de evidencia | Imagen | Reporte | Documentar la incidencia |
| Votaciones y denuncias | Actividad | Votos / denuncias | Validación comunitaria |
| Datos de consentimiento (términos, privacidad, fotos) | Legales | Registro | Cumplimiento de consentimiento informado |

## 3. Base jurídica y consentimiento
- El registro exige aceptar de forma **separada e independiente** los
  **Términos y Condiciones**, la **Política de Privacidad** y un **consentimiento
  específico para el uso/publicación de fotografías** (`terms_version`).
- No se puede reportar/votar/denunciar ni subir fotos sin haber aceptado los
  términos y la política de privacidad (se refuerza en la base de datos, no solo
  en el frontend).
- Credenciales (email/password) se gestionan en Supabase Auth con cifrado de
  contraseñas.

## 4. Minimización y prevención de correlación de identidad
- **Fotos de evidencia** se almacenan con rutas **opacas** (`reports/<uuid>…`),
  sin el identificador del usuario en la URL.
- El **bucket de fotos no permite enumeración** (no se puede listar el catálogo);
  solo se accede a una foto individual si se conoce su URL.
- Los datos **públicos** (incidencias del mapa) **no exponen** `created_by`,
  nombre de autor, ni `email`; la vista pública no incorpora PII del autor.
- Los **votos/denuncias** exponen solo al autor/admin sus propios datos.
- La capa **BI** publica vistas **agregadas/anonimizadas** (sin `reported_by`,
  sin email) para clientes con rol read-only `bi_reader`.

## 5. Retención
- Los datos se conservan mientras exista la cuenta; los reportes públicos
  permanecen visibles mientras no se oculten por moderación/umbrales.
- La limpieza de datos de prueba se hace con `limpieza_datos_demo.sql` y el
  vaciado del bucket con `frontend/scripts/limpiar_photos.mjs`.

## 6. Derechos del titular (Ley 19.628)
Derechos de acceso, rectificación, cancelación y oposición. Los usuarios pueden
solicitarlos al responsable; la corrección de datos de perfil está disponible en
la aplicación.

### 6.1 Cancelación de cuenta (derecho a supresión) — autoservicio
Desde **Administrar perfil** el usuario puede eliminar su cuenta con
confirmación (reingreso de contraseña) mediante la función backend
`public.delete_my_account()`. El proceso:

- **Elimina** los datos personales del titular: perfil (`profiles`), identidad y
  sesiones (`auth.users` / `auth.identities` / `auth.sessions`, vía `ON DELETE
  CASCADE`), historial de consentimiento (`terms_acceptance_log`) y auditoría
  (`audit_log`). También elimina sus **votos y denuncias** (opinión personal).
- **Conserva** los **reportes** (incidencias) que creó: la app es anónima y la
  vista pública no expone el autor, por lo que el contenido comunitario se
  mantiene activo anonimizando la autoría (`created_by` pasa a `NULL`).
- **Permite el re-registro** con el mismo correo: al eliminar la fila de
  `auth.users` se liberan la identidad y el email, y un nuevo `signUp` vuelve a
  enviar el email de confirmación (el trigger `handle_new_user` recrea el
  perfil).

## 7. Menores
La plataforma está orientada a mayores de edad; no se recopilan datos de menores
de forma deliberada.

## 8. Terceros
- **Supabase**: base de datos, autenticación y almacenamiento (infraestructura
  gestionada con cifrado).
- **Nominatim (OpenStreetMap)**: geocoding de direcciones/ubicaciones, limitado
  a Chile. Se envía el texto de búsqueda o coordenadas (sin credenciales).

## 9. Seguridad técnica
- Transporte cifrado (HTTPS/TLS de Supabase).
- Control de acceso por **RLS** (ver `docs/SEGURIDAD-CONTROLES.md`).
- Auditoría de eventos de moderación, votos y consentimiento en `audit_log` y
  `terms_acceptance_log`.
- Moderación de contenido (imágenes NSFW y texto) local.
