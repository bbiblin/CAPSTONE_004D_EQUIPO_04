import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { Profile } from '@/types';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ReportPage from '@/pages/ReportPage';
import ActivityPage from '@/pages/ActivityPage';
import AdminPage from '@/pages/AdminPage';
import IncidentDetailPage from '@/pages/IncidentDetailPage';
import TermsPage from '@/pages/TermsPage';
import AppLayout from '@/components/layout/AppLayout';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Icon from '@/components/ui/Icon';
import TermsConsent, { type TermsConsentState } from '@/components/terms/TermsConsent';
import { supabase, getProfile, signOut, acceptTerms } from '@/lib/supabase';
import { TERMS_VERSION } from '@/lib/constants';

function RequireAuth({ actionLabel }: { actionLabel: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <Card className="max-w-md w-full text-center p-8">
        <div className="mx-auto h-14 w-14 rounded-full bg-secondary-fixed-dim/40 flex items-center justify-center">
          <Icon name="report" className="text-on-surface" size={28} />
        </div>
        <h2 className="mt-4 text-headline-md font-bold text-on-surface">Inicia sesión para {actionLabel}</h2>
        <p className="mt-3 text-body-md text-on-surface-variant">
          Para {actionLabel} en Movimap necesitas tener una cuenta. El mapa y los reportes públicos siempre están disponibles sin registrarte.
        </p>
        <div className="mt-6 space-y-3">
          <Button onClick={() => navigate('/login')} fullWidth>Iniciar sesión</Button>
          <Button variant="ghost" fullWidth onClick={() => navigate('/register')}>Crear cuenta</Button>
        </div>
      </Card>
    </div>
  );
}

function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [consentPromptOpen, setConsentPromptOpen] = useState(false);
  const [consent, setConsent] = useState<TermsConsentState>({ terms: false, photos: false });
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentError, setConsentError] = useState('');

  useEffect(() => {
    loadProfile();
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        getProfile().then(p => setProfile(p));
      } else {
        setProfile(null);
      }
    });
  }, []);

  useEffect(() => {
    if (profile && profile.accepted_terms_at === null) {
      setConsentPromptOpen(true);
    }
  }, [profile]);

  async function loadProfile() {
    const p = await getProfile();
    setProfile(p);
    setLoading(false);
  }

  async function handleLogout() {
    await signOut();
    window.location.reload();
  }

  async function handleAcceptConsent() {
    if (!consent.terms || !consent.photos) return;
    setConsentSaving(true);
    setConsentError('');
    const { error } = await acceptTerms(TERMS_VERSION, consent.terms, consent.photos);
    setConsentSaving(false);
    if (error) {
      setConsentError(error.message);
      return;
    }
    setConsentPromptOpen(false);
    const p = await getProfile();
    setProfile(p);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-on-surface-variant">Cargando...</p>
        </div>
      </div>
    );
  }

  const authed = profile !== null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={authed ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register" element={authed ? <Navigate to="/" /> : <RegisterPage />} />
        <Route path="/terms" element={<TermsPage />} />

        <Route element={<AppLayout profile={profile} onLogout={handleLogout} />}>
          <Route path="/" element={<HomePage profile={profile} />} />
          <Route path="/report" element={authed ? <ReportPage profile={profile!} onConsentAccepted={loadProfile} /> : <RequireAuth actionLabel="reportar" />} />
          <Route path="/activity" element={authed ? <ActivityPage /> : <Navigate to="/login" />} />
          <Route path="/incident/:id" element={<IncidentDetailPage profile={profile} />} />
          <Route path="/admin" element={profile?.role === 'admin' ? <AdminPage /> : <Navigate to="/" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <Modal
        open={consentPromptOpen}
        onClose={() => setConsentPromptOpen(false)}
        title="Aceptar Términos y Condiciones"
        footer={
          <div className="flex flex-col gap-2 w-full">
            {consentError && <p className="text-label-sm text-error text-center">{consentError}</p>}
            <Button fullWidth onClick={handleAcceptConsent} loading={consentSaving} disabled={!consent.terms || !consent.photos}>
              Aceptar y continuar
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setConsentPromptOpen(false)}>
              Continuar sin aceptar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-body-md text-on-surface-variant">
            Para publicar reportes, votar o denunciar necesitas aceptar las condiciones. Puedes seguir navegando sin aceptar,
            pero tu información no podrá aportarse mientras tanto.
          </p>
          <TermsConsent value={consent} onChange={setConsent} />
        </div>
      </Modal>
    </BrowserRouter>
  );
}

export default App;
