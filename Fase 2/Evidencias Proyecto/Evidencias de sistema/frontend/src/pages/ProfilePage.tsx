import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Profile } from '@/types';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Modal from '@/components/ui/Modal';
import Alert from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { formatDate } from '@/lib/constants';
import { deleteAccount, signIn, signOut } from '@/lib/supabase';

interface ProfilePageProps {
  profile: Profile;
}

function ProfilePage({ profile }: ProfilePageProps) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const roleLabel = profile.role === 'admin' ? 'Administrador' : 'Usuario';

  function handleOpenConfirm() {
    setPassword('');
    setError('');
    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    setError('');
    setLoading(true);

    const { error: authError } = await signIn(profile.email || '', password);
    if (authError || !profile.email) {
      setError(authError?.message || 'La contraseña es incorrecta');
      setLoading(false);
      return;
    }

    const { error: deleteError } = await deleteAccount();
    if (deleteError) {
      setError(deleteError.message);
      setLoading(false);
      return;
    }

    // El usuario ya no existe en auth: limpia la sesión local (ignora el error
    // del servidor, ya que el token quedó invalidado).
    try {
      await signOut();
    } catch {
      /* sesión local ya invalidada */
    }

    setLoading(false);
    setConfirmOpen(false);
    setDeleted(true);
    setTimeout(() => navigate('/login'), 1200);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Administrar perfil"
        subtitle="Gestiona tu cuenta y preferencias"
        icon={<Icon name="settings" className="text-primary" />}
        backToHome
      />

      <div className="flex-1 overflow-y-auto px-margin-mobile md:px-margin-desktop py-6 pb-24 md:pb-6">
        <div className="max-w-2xl space-y-4">
          {deleted && (
            <Alert tone="success" title="Cuenta eliminada">
              Tu cuenta fue eliminada y podrás volver a registrarte cuando quieras.
            </Alert>
          )}

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-2xl font-bold shrink-0">
                {profile.display_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <h2 className="text-headline-md font-semibold text-on-surface truncate">{profile.display_name}</h2>
                <p className="text-label-sm text-on-surface-variant truncate">{profile.email || 'Sin correo registrado'}</p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-label-md">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-on-surface-variant">Rol</dt>
                <dd className="font-semibold text-on-surface">{roleLabel}</dd>
              </div>
              {profile.organization_name && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-on-surface-variant">Organización</dt>
                  <dd className="font-semibold text-on-surface text-right">{profile.organization_name}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-on-surface-variant">Miembro desde</dt>
                <dd className="font-semibold text-on-surface">{formatDate(profile.created_at)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-label-md font-semibold text-on-surface mb-3">Preferencias</h2>
            <div className="divide-y divide-outline-variant">
              <div className="flex items-center justify-between gap-3 py-3 first:pt-0">
                <span className="text-label-md text-on-surface">Tema</span>
                <ThemeToggle />
              </div>
              <Link
                to="/terms"
                className="flex items-center justify-between gap-3 py-3 text-label-md text-on-surface hover:text-secondary transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="help" size={18} className="text-on-surface-variant" />
                  Términos y Condiciones
                </span>
                <Icon name="chevron-down" size={18} className="text-on-surface-variant -rotate-90" />
              </Link>
              <Link
                to="/privacy"
                className="flex items-center justify-between gap-3 py-3 text-label-md text-on-surface hover:text-secondary transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="shield" size={18} className="text-on-surface-variant" />
                  Política de Privacidad
                </span>
                <Icon name="chevron-down" size={18} className="text-on-surface-variant -rotate-90" />
              </Link>
            </div>
          </Card>

          <Card className="border-error/30">
            <h2 className="text-label-md font-semibold text-error mb-1">Zona de peligro</h2>
            <p className="text-label-sm text-on-surface-variant mb-4">
              Eliminar tu cuenta borrará tu perfil y tu actividad de forma permanente. Esta acción no se puede deshacer.
            </p>
            <Button variant="destructive" onClick={handleOpenConfirm}>
              <Icon name="trash" size={18} /> Eliminar cuenta
            </Button>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => !loading && setConfirmOpen(false)}
        title="Eliminar cuenta"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={loading}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} loading={loading} disabled={!password}>
              Eliminar cuenta
            </Button>
          </div>
        }
      >
        <p className="text-body-md text-on-surface-variant">
          ¿Seguro que quieres eliminar tu cuenta? Se borrarán tu perfil y tus acciones de forma permanente.
          Tus reportes seguirán activos de forma anónima. Esta acción no se puede deshacer.
        </p>
        <div className="mt-4">
          <Input
            label="Confirma tu contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa tu contraseña"
            autoComplete="current-password"
            autoFocus
            required
          />
        </div>
        {error && <Alert tone="error" className="mt-3">{error}</Alert>}
      </Modal>
    </div>
  );
}

export default ProfilePage;
