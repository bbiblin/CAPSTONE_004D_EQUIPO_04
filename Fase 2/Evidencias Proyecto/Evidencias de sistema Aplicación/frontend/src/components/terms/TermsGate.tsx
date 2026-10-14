import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Icon from '@/components/ui/Icon';
import TermsConsent, { type TermsConsentState } from '@/components/terms/TermsConsent';
import { acceptTerms } from '@/lib/supabase';
import { TERMS_VERSION } from '@/lib/constants';
import { hasAcceptedTerms, hasPhotoConsent } from '@/lib/utils';
import type { Profile } from '@/types';

interface TermsGateProps {
  profile?: Profile | null;
  requirePhoto?: boolean;
  title?: string;
  children: ReactNode;
  onAccepted?: () => void;
}

function TermsGate({ profile, requirePhoto, title, children, onAccepted }: TermsGateProps) {
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState<TermsConsentState>({ terms: false, photos: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const termsOk = hasAcceptedTerms(profile);
  const photoOk = !requirePhoto || hasPhotoConsent(profile);

  if (termsOk && photoOk) {
    return <>{children}</>;
  }

  const blockTitle = title || (photoOk || !requirePhoto
    ? 'Debes aceptar los Términos y Condiciones'
    : 'Debes aceptar las condiciones y el consentimiento de fotografías');

  const blockMessage = photoOk || !requirePhoto
    ? 'Para contribuir en Movimap necesitas aceptar los Términos y Condiciones. Tu identidad no se vende: solo el dato anónimo (reportes y fotografías) se entrega a terceros.'
    : 'Para subir fotografías como evidencia necesitas aceptar también el consentimiento de fotografías, ya que estas se venden a terceros de forma anónima.';

  async function handleAccept() {
    if (!consent.terms || !consent.photos) return;
    setSaving(true);
    setError('');
    const { error: rpcError } = await acceptTerms(TERMS_VERSION, consent.terms, consent.photos);
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setOpen(false);
    onAccepted?.();
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <Card className="max-w-md w-full text-center p-8">
        <div className="mx-auto h-14 w-14 rounded-full bg-secondary-fixed-dim/40 flex items-center justify-center">
          <Icon name="check-circle" className="text-on-surface" size={28} />
        </div>
        <h2 className="mt-4 text-headline-md font-bold text-on-surface">{blockTitle}</h2>
        <p className="mt-3 text-body-md text-on-surface-variant">{blockMessage}</p>
        <div className="mt-6 space-y-3">
          <Button onClick={() => setOpen(true)} fullWidth>Aceptar ahora</Button>
          <Link to="/terms" className="block text-center text-label-md text-primary font-semibold hover:underline">
            Leer términos completos
          </Link>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Aceptar Términos y Condiciones"
        footer={
          <div className="flex flex-col gap-2 w-full">
            {error && <p className="text-label-sm text-error text-center">{error}</p>}
            <Button fullWidth onClick={handleAccept} loading={saving} disabled={!consent.terms || !consent.photos}>
              Aceptar y continuar
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        }
      >
        <p className="text-body-md text-on-surface-variant mb-4">
          Revisa y acepta las condiciones para poder contribuir en Movimap.
        </p>
        <TermsConsent value={consent} onChange={setConsent} />
      </Modal>
    </div>
  );
}

export default TermsGate;
