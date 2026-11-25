import { Link } from 'react-router-dom';
import BackButton from '@/components/ui/BackButton';
import Icon from '@/components/ui/Icon';
import { PRIVACY_VERSION } from '@/lib/constants';

function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 bg-surface-container-lowest border-b border-outline-variant px-margin-mobile md:px-margin-desktop h-14 flex items-center gap-3">
        <BackButton />
        <h1 className="text-headline-md font-bold text-on-surface">Política de Privacidad</h1>
      </header>

      <article className="max-w-3xl mx-auto px-margin-mobile md:px-6 py-8 space-y-6 text-body-md text-on-surface">
        <div className="flex items-center gap-2 bg-surface-container rounded-lg p-3">
          <Icon name="info" className="text-primary shrink-0" />
          <p className="text-label-sm text-on-surface-variant">
            Versión {PRIVACY_VERSION} · Documento independiente de los Términos y Condiciones. Regula el tratamiento de tus datos personales.
          </p>
        </div>

        <Section title="1. Responsable del tratamiento">
          <p>
            Movimap (proyecto académico de titulación). El contacto y los datos del responsable se completan en la
            instancia de despliegue. Puedes ejercer tus derechos escribiendo al correo de contacto indicado en los
            <Link to="/terms" className="text-primary font-semibold hover:underline"> Términos y Condiciones</Link>.
          </p>
        </Section>

        <Section title="2. Qué información se recopila y datos personales tratados">
          <p>Al usar Movimap se recopila la siguiente información:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Tu <strong>email</strong>, <strong>nombre de usuario</strong> y, opcionalmente, tu organización.</li>
            <li>La <strong>ubicación</strong> (coordenadas y dirección), la <strong>categoría/severidad</strong> y la
              <strong> descripción</strong> con la <strong>fecha de observación</strong> de cada reporte.</li>
            <li>Las <strong>fotografías</strong> que subas como evidencia.</li>
            <li>Las <strong>votaciones y denuncias</strong> que realices sobre reportes de otros usuarios.</li>
            <li>Los <strong>datos de consentimiento</strong> (términos, privacidad y fotografías) que registramos al darte de alta.</li>
          </ul>
        </Section>

        <Section title="3. Base jurídica y consentimiento">
          <ul className="list-disc pl-6 space-y-2">
            <li>El registro exige aceptar de forma <strong>separada e independiente</strong> los
              <strong> Términos y Condiciones</strong>, la <strong>Política de Privacidad</strong> y un
              <strong> consentimiento específico para el uso/publicación de fotografías</strong>.</li>
            <li>No se puede reportar, votar, denunciar ni subir fotos sin haber aceptado los términos y la política de privacidad.</li>
            <li>Las credenciales (email/contraseña) se gestionan en Supabase Auth con cifrado de contraseñas.</li>
          </ul>
        </Section>

        <Section title="4. Minimización y prevención de correlación de identidad">
          <ul className="list-disc pl-6 space-y-2">
            <li>Las <strong>fotos de evidencia</strong> se almacenan con rutas <strong>opacas</strong>, sin tu identificador en la URL.</li>
            <li>El <strong>bucket de fotos no permite enumeración</strong>; solo se accede a una foto individual si se conoce su URL.</li>
            <li>Los datos <strong>públicos</strong> (incidencias del mapa) <strong>no exponen</strong> al autor, su nombre ni su email.</li>
            <li>Los <strong>votos/denuncias</strong> solo son visibles para el propio autor y el administrador.</li>
            <li>La capa <strong>BI</strong> publica vistas <strong>agregadas/anonimizadas</strong> para clientes con rol de solo lectura.</li>
          </ul>
        </Section>

        <Section title="5. Retención">
          <p>
            Los datos se conservan mientras exista tu cuenta; los reportes públicos permanecen visibles mientras no se
            oculten por moderación o por los umbrales de la comunidad.
          </p>
        </Section>

        <Section title="6. Derechos del titular (Ley 19.628)">
          <p>
            Tienes derechos de acceso, rectificación, cancelación y oposición. Puedes solicitar su ejercicio al
            responsable; la corrección de los datos de perfil está disponible en la aplicación.
          </p>
          <div className="rounded-lg border border-secondary-container bg-secondary-container/10 p-3">
            <p className="text-label-sm text-on-surface">
              <strong>Eliminación de cuenta:</strong> desde <strong>Administrar perfil</strong> puedes eliminar tu cuenta
              con confirmación. Se eliminan tus datos personales (perfil, identidad, sesiones, historial de
              consentimiento y auditoría) y tus votos/denuncias. Los <strong>reportes</strong> que creaste se conservan
              activos, pero se <strong>anonimiza</strong> su autoría y se permite volver a registrarte con el mismo email.
            </p>
          </div>
        </Section>

        <Section title="7. Menores">
          <p>La plataforma está orientada a mayores de edad; no se recopilan datos de menores de forma deliberada.</p>
        </Section>

        <Section title="8. Terceros">
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Supabase</strong>: base de datos, autenticación y almacenamiento (infraestructura gestionada con cifrado).</li>
            <li><strong>Nominatim (OpenStreetMap)</strong>: geocoding de direcciones/ubicaciones, limitado a Chile. Se envía el texto de búsqueda o coordenadas, sin credenciales.</li>
          </ul>
        </Section>

        <Section title="9. Seguridad técnica">
          <ul className="list-disc pl-6 space-y-2">
            <li>Transporte cifrado (HTTPS/TLS de Supabase).</li>
            <li>Control de acceso por políticas de seguridad a nivel de base de datos (RLS).</li>
            <li>Auditoría de eventos de moderación, votos y consentimiento.</li>
            <li>Moderación de contenido (imágenes y texto) local.</li>
          </ul>
        </Section>

        <div className="pt-4 flex justify-end gap-3">
          <Link to="/terms" className="px-5 py-2.5 rounded border border-outline-variant text-on-surface text-label-md font-semibold hover:bg-surface-container-low transition-colors">
            Ver Términos y Condiciones
          </Link>
          <Link to="/register" className="px-5 py-2.5 rounded bg-primary text-on-primary text-label-md font-semibold hover:opacity-90 transition-colors">
            Volver al registro
          </Link>
        </div>
      </article>
    </div>
  );
}

function Section({ title, highlight, children }: { title: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-label-md font-bold text-on-surface">{title}</h2>
      <div className={highlight ? 'rounded-lg border border-secondary-container bg-surface-container/60 p-4 space-y-3' : 'space-y-2'}>
        {children}
      </div>
    </section>
  );
}

export default PrivacyPage;
