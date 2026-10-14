import { Link } from 'react-router-dom';
import Checkbox from '@/components/ui/Checkbox';
import Icon from '@/components/ui/Icon';
import { TERMS_VERSION } from '@/lib/constants';

export interface TermsConsentState {
  terms: boolean;
  photos: boolean;
}

interface TermsConsentProps {
  value: TermsConsentState;
  onChange: (value: TermsConsentState) => void;
}

const KEY_POINTS = [
  'El uso de la aplicación es gratis para los usuarios.',
  'Los reportes son anónimos: tu identidad y correo no se venden a terceros.',
  'Tu información y las fotografías que subas podrán ser vistas por otros usuarios de forma anónima.',
  'La información de los reportes —incluidas las fotografías— puede ser vendida a terceros (instituciones, municipalidades) como dato anónimo.',
  'Al subir una fotografía cedes a Movimap el derecho a usarla, distribuirla y venderla como parte del producto de datos.',
];

function TermsConsent({ value, onChange }: TermsConsentProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="info" className="text-primary shrink-0" />
          <p className="text-label-md font-semibold text-on-surface">
            Información importante antes de continuar
          </p>
        </div>
        <ul className="space-y-2">
          {KEY_POINTS.map(point => (
            <li key={point} className="flex gap-2 text-label-sm text-on-surface-variant">
              <span className="text-primary mt-0.5">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <Link to="/terms" className="inline-flex items-center gap-1 text-label-sm text-primary font-semibold hover:underline">
          Leer los términos completos <Icon name="chevron-down" size={14} className="-rotate-90" />
        </Link>
      </div>

      <div className="space-y-3">
        <Checkbox
          checked={value.terms}
          onChange={(e) => onChange({ ...value, terms: e.target.checked })}
          label={
            <>
              Acepto los <Link to="/terms" className="text-primary font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>Términos y Condiciones</Link> (versión {TERMS_VERSION}) <span className="text-error">*</span>
            </>
          }
          hint="Entiendo el uso gratuito, el anonimato y la venta del dato a terceros."
        />
        <Checkbox
          checked={value.photos}
          onChange={(e) => onChange({ ...value, photos: e.target.checked })}
          label={
            <>
              Consiento la publicación y cesión de derechos de <Link to="/terms" className="text-primary font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>mis fotografías</Link> <span className="text-error">*</span>
            </>
          }
          hint="Autorizo que las fotos que suba puedan ser usadas, distribuidas y vendidas a terceros como parte del dato anónimo."
        />
      </div>
    </div>
  );
}

export default TermsConsent;
