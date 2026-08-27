"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { apiFetch } from '@/utils/api';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [captchaError, setCaptchaError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (window.location.search.includes('expired=1')) {
      setError('Acceso denegado (401). Verifica redirecciones.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email')?.toString() || '';
    const password = formData.get('password')?.toString() || '';

    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, captchaToken }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        const urlParams = new URLSearchParams(window.location.search);
        const callbackUrl = urlParams.get('callbackUrl');

        if (callbackUrl) {
          window.location.replace(callbackUrl);
        } else if (data.user.role === 'ORGANIZER' || data.user.role === 'ADMIN') {
          window.location.replace('/panel');
        } else if (data.user.role === 'SCANNER') {
          window.location.replace('/panel/escanear');
        } else {
          window.location.replace('/panel/tickets');
        }
      } else {
        setError(data.message || 'Credenciales inválidas');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4 relative overflow-hidden">
      <div className="w-full max-w-md bg-neutral-900 border border-white/5 p-8 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="font-outfit text-3xl font-bold tracking-tighter inline-block mb-2">
            Venti<span className="text-indigo-500">Pass</span>
          </Link>
          <p className="text-neutral-400">Ingresá a tu cuenta</p>
        </div>

        {error && <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Email</label>
            <input name="email" type="email" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="tucorreo@ejemplo.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Contraseña</label>
            <input name="password" type="password" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="••••••••" />
          </div>

          {mounted && process.env.NODE_ENV === 'production' && (
            <div className="flex flex-col items-center justify-center mt-6">
              {!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
                <div className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center w-full">Falta configurar la clave de seguridad (Turnstile).</div>
              ) : (
                <Turnstile 
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} 
                  onSuccess={(token) => { setCaptchaToken(token); setCaptchaError(false); }}
                  onError={() => setCaptchaError(true)}
                  options={{ theme: 'dark' }}
                />
              )}
              {captchaError && <div className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center w-full mt-2">Error de seguridad. Desactivá el AdBlocker o recargá la página.</div>}
            </div>
          )}

          <button type="submit" disabled={!mounted || loading || captchaError || (!captchaToken && process.env.NODE_ENV === 'production')} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50">
            {!mounted ? 'Conectando...' : loading ? 'Ingresando...' : <><LogIn className="w-5 h-5" /> Entrar</>}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-neutral-500">
          ¿No tenés cuenta? <Link href="/registro" className="text-indigo-400 hover:text-indigo-300">Registrate gratis</Link>
        </div>
      </div>
    </div>
  );
}
