import { Link } from 'react-router-dom';
import BackButton from '@/components/ui/BackButton';
import Icon from '@/components/ui/Icon';
import { TERMS_VERSION } from '@/lib/constants';

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-surface-container-lowest border-b border-outline-variant px-margin-mobile md:px-margin-desktop h-14 flex items-center gap-3">
        <BackButton />
        <h1 className="text-headline-md font-bold text-on-surface">Términos y Condiciones</h1>
      </header>

      <article className="max-w-3xl mx-auto px-margin-mobile md:px-6 py-8 space-y-6 text-body-md text-on-surface">
        <div className="flex items-center gap-2 bg-surface-container rounded-lg p-3">
          <Icon name="info" className="text-primary shrink-0" />
          <p className="text-label-sm text-on-surface-variant">
            Versión {TERMS_VERSION} · Al usar la aplicación aceptas estos términos conforme al consentimiento que diste al registrarte.
          </p>
        </div>

        <Section title="1. Aceptación">
          <p>
            Al crear una cuenta y marcar los dos consentimientos obligatorios (términos generales y fotografías),
            declaras que has leído, entendido y aceptado estos Términos y Condiciones y la Política de Privacidad,
            y que aceptas ceder los derechos detallados en la <strong>Sección 6</strong> respecto de la información
            y las <strong>fotografías</strong> que publiques.
          </p>
        </Section>

        <Section title="2. Gratuidad y anonimato">
          <ul className="list-disc pl-6 space-y-2">
            <li>El uso de Movimap es <strong>completamente gratuito</strong> para los usuarios.</li>
            <li>Movimap es una plataforma de reportes colaborativos y <strong>anónimos</strong>: la información que publiques
              (ubicación, categoría, descripción y fotografías) es visible para otros usuarios de manera anónima,
              sin asociar tu identidad personal a los reportes públicos ni a los entregados a terceros.</li>
            <li>Creamos una cuenta con tu correo para que puedas ver tu perfil, tus reportes y estos términos.
              <strong> Tu correo y tu identidad no se venden ni se entregan a terceros</strong>; solo el dato anonimizado
              (reportes y fotografías) forma parte del producto de datos.</li>
            <li>Sin cuenta puedes navegar por el mapa y ver los reportes públicos. Para publicar, votar o denunciar
              necesitas registrarte e iniciar sesión.</li>
          </ul>
        </Section>

        <Section title="3. Qué información se recopila">
          <ul className="list-disc pl-6 space-y-2">
            <li>La ubicación (coordenadas) y la categoría / severidad del reporte.</li>
            <li>La descripción que escribas y la fecha de observación.</li>
            <li>Las <strong>fotografías</strong> que subas como evidencia.</li>
            <li>Las votaciones y denuncias que realices sobre reportes de otros usuarios.</li>
          </ul>
        </Section>

        <Section title="4. Visibilidad de la información">
          <p>
            Los reportes (incluidas las fotografías) son visibles para otros usuarios y para el público en general.
            Pueden ser confirmados, rechazados o marcados como resueltos por la comunidad. Movimap puede moderar,
            ocultar o eliminar reportes que vulneren las normas de convivencia o la ley.
          </p>
        </Section>

        <Section title="5. Comercialización del dato (producto de datos)" highlight>
          <p>
            La información de los reportes —<strong>incluidas las fotografías</strong> subidas— podrá ser
            <strong> entregada y/o vendida a terceros</strong> (instituciones, municipalidades, organismos o empresas)
            en formato anónimo y agregado. La entrega a terceros se realiza de forma anónima:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>No se incluye tu nombre, correo electrónico ni ningún dato que te identifique personalmente.</li>
            <li>No se expone la identidad de denunciantes, votantes ni responsables.</li>
          </ul>
        </Section>

        <Section title="6. Cesión de derechos sobre las fotografías" highlight>
          <p>
            Al subir una fotografía, cedes a Movimap y a los terceros autorizados el derecho a usar, reproducir,
            almacenar, distribuir y publicar la fotografía como parte del producto de datos y de la plataforma,
            de forma <strong>no exclusiva, mundial y sin límite de territorio ni de duración</strong>, y el derecho a
            cederla o sublicenciarla a terceros conforme a la Sección 5, sin que ello genere contraprestación económica.
          </p>
          <p>
            La cesión es sobre la fotografía y su uso dentro del producto de datos, y no genera derechos sobre otros
            derechos que puedas tener sobre lo fotografiado más allá de lo necesario.
          </p>
          <div className="rounded-lg border border-secondary-container bg-secondary-container/10 p-3">
            <p className="text-label-sm text-on-surface">
              <strong>No publiques</strong> fotografías con datos personales de terceros (rostros identificables,
              patentes, documentos) ni contenido inapropiado. Movimap modera automáticamente el contenido inapropiado
              y puede rechazar la fotografía.
            </p>
          </div>
        </Section>

        <Section title="7. Tu cuenta, perfil y reportes">
          <p>
            Puedes consultar en cualquier momento tu perfil, tus reportes, tus acciones y estos términos dentro de la
            aplicación. Puedes retirar tu consentimiento o solicitar la eliminación de tus datos personales y reportes
            por el correo de contacto de la Sección 9. Las fotografías ya integradas en el producto anonimizado podrán
            conservarse con fines de trazabilidad del dato, sin revelar tu identidad.
          </p>
        </Section>

        <Section title="8. Responsabilidad y limitaciones">
          <p>
            Los datos se proporcionan "tal cual", con el grado de exactitud alcanzado por los reportes colaborativos.
            Movimap no garantiza exactitud absoluta ni ausencia de errores, ni es responsable de las decisiones de
            terceros en base al dato. Está prohibido publicar contenido ilegal, ofensivo, falso o que vulnere derechos
            de terceros.
          </p>
        </Section>

        <Section title="9. Contacto y modificaciones">
          <ul className="list-disc pl-6 space-y-2">
            <li>Contacto: <strong>[correo de contacto de Movimap]</strong>.</li>
            <li>Movimap podrá actualizar estos términos; ante cambios sustanciales se te notificará y se re-pedirá tu
              aceptación. La versión que aceptaste queda registrada en tu cuenta.</li>
          </ul>
        </Section>

        <div className="pt-4 flex justify-end">
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

export default TermsPage;
