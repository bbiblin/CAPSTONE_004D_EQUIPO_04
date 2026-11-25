import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, updatePassword, signOut } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import BackButton from '@/components/ui/BackButton';

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Al abrir el enlace de recuperación, supabase-js detecta el token (evento
    // PASSWORD_RECOVERY) y establece una sesión de recuperación. Esperamos esa
    // sesión para habilitar el formulario; si no llega, mostramos un error.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      // Caso: el token ya fue procesado (p. ej. recarga) y quedó sesión activa.
      if (data.session) setReady(true);
      setChecking(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center bg-background px-4 py-10">
      <BackButton className="absolute top-4 left-4" />
      <Card className="w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/icon-192.png?v=2" alt="Movimap" className="w-14 h-14 rounded-xl object-cover" />
          <h1 className="mt-3 text-headline-md font-bold text-on-surface">Nueva contraseña</h1>
          <p className="text-body-md text-on-surface-variant">Crea una nueva contraseña para tu cuenta</p>
        </div>

        {checking ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : !ready ? (
          <>
            <Alert tone="error" className="mb-4">
              El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.
            </Alert>
            <Button fullWidth onClick={() => navigate('/forgot-password')}>
              Solicitar nuevo enlace
            </Button>
            <p className="text-center text-body-md text-on-surface-variant mt-4">
              <Link to="/login" className="text-primary font-semibold hover:underline">Ir al inicio de sesión</Link>
            </p>
          </>
        ) : (
          <>
            {error && <Alert tone="error" className="mb-4">{error}</Alert>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nueva contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <Input
                label="Confirmar contraseña"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
              <Button type="submit" size="lg" fullWidth loading={loading}>
                Restablecer contraseña
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}

export default ResetPasswordPage;
