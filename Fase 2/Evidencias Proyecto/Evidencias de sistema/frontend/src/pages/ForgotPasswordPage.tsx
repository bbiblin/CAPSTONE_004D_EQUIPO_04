import { useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import BackButton from '@/components/ui/BackButton';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center bg-background px-4 py-10">
      <BackButton className="absolute top-4 left-4" />
      <Card className="w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/icon-192.png?v=2" alt="Movimap" className="w-14 h-14 rounded-xl object-cover" />
          <h1 className="mt-3 text-headline-md font-bold text-on-surface">Recuperar contraseña</h1>
          <p className="text-body-md text-on-surface-variant">Te enviaremos un enlace para restablecerla</p>
        </div>

        {sent ? (
          <>
            <Alert tone="success" className="mb-4">
              Te enviamos un enlace de recuperación. Revisa tu bandeja de entrada
              (y la carpeta de spam) para restablecer tu contraseña.
            </Alert>
            <Button fullWidth onClick={() => setSent(false)}>Reenviar a otro correo</Button>
            <p className="text-center text-body-md text-on-surface-variant mt-4">
              <Link to="/login" className="text-primary font-semibold hover:underline">Volver al inicio de sesión</Link>
            </p>
          </>
        ) : (
          <>
            {error && <Alert tone="error" className="mb-4">{error}</Alert>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <Button type="submit" size="lg" fullWidth loading={loading}>
                Enviar enlace de recuperación
              </Button>
            </form>

            <p className="text-center text-body-md text-on-surface-variant mt-4">
              <Link to="/login" className="text-primary font-semibold hover:underline">Volver al inicio de sesión</Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}

export default ForgotPasswordPage;
