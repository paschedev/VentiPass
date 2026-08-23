"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import { Turnstile } from '@marsidev/react-turnstile';
import { apiFetch } from '@/utils/api';

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [cuil, setCuil] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCuilChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    let formatted = val;
    if (val.length > 2) {
      formatted = val.slice(0, 2) + '-' + val.slice(2);
    }
    if (val.length > 10) {
      formatted = formatted.slice(0, 11) + '-' + val.slice(10, 11);
    }
    setCuil(formatted);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName');
    const lastName = formData.get('lastName');
    const email = formData.get('email');
    const password = formData.get('password') as string;
    const isOrganizer = formData.get('isOrganizer') === 'on';

    const payload: any = {
      firstName,
      lastName,
      email,
      password,
      captchaToken,
      role: isOrganizer ? 'ORGANIZER' : 'CUSTOMER'
    };

    if (isOrganizer) {
      payload.cuil = formData.get('cuil');
      payload.country = formData.get('country');
      payload.province = formData.get('province');
      payload.city = formData.get('city');
      payload.street = formData.get('street');
      payload.number = formData.get('number');
      payload.zipCode = formData.get('zipCode');
      payload.phone = formData.get('phone');
    }

    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.message || 'Error al registrar el usuario');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-8 rounded-3xl text-center">
          <h2 className="text-2xl font-bold mb-2">¡Registro exitoso!</h2>
          <p>Te estamos redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-neutral-950 p-4 py-12 relative overflow-x-hidden">
      <div className="w-full max-w-md bg-neutral-900 border border-white/5 p-8 rounded-3xl m-auto shadow-2xl z-10">
        <div className="text-center mb-8">
          <Link href="/" className="font-outfit text-3xl font-bold tracking-tighter inline-block mb-2">
            Entry<span className="text-indigo-500">Pass</span>
          </Link>
          <p className="text-neutral-400">Creá tu cuenta gratis</p>
        </div>

        {error && <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Nombre</label>
              <input name="firstName" type="text" spellCheck="false" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Juan" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Apellido</label>
              <input name="lastName" type="text" spellCheck="false" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Pérez" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Email</label>
            <input name="email" type="email" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="tucorreo@ejemplo.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Contraseña</label>
            <input name="password" type="password" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="••••••••" />
          </div>

          <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-xl mt-4">
            <input type="checkbox" id="isOrganizer" name="isOrganizer" checked={isOrganizer} onChange={(e) => setIsOrganizer(e.target.checked)} className="w-5 h-5 accent-indigo-500 rounded cursor-pointer" />
            <label htmlFor="isOrganizer" className="text-sm font-medium text-white cursor-pointer select-none">
              Quiero organizar eventos (Perfil Creador)
            </label>
          </div>

          {isOrganizer && (
            <div className="space-y-4 pt-4 border-t border-white/10 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">CUIL</label>
                  <input name="cuil" type="text" value={cuil} onChange={handleCuilChange} maxLength={13} pattern="\d{2}-\d{8}-\d{1}" title="El formato debe ser XX-XXXXXXXX-X" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="20-12345678-9" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Teléfono</label>
                  <input name="phone" type="text" pattern="^\+?[0-9\s\-]{8,20}$" title="Debe contener entre 8 y 20 números, permitiendo espacios, guiones y un + al inicio" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="+54 9 11..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">País</label>
                  <CustomSelect
                    name="country"
                    value={country}
                    onChange={setCountry}
                    placeholder="País"
                    options={[
                      { value: "Argentina", label: "Argentina" },
                      { value: "Uruguay", label: "Uruguay" },
                      { value: "Chile", label: "Chile" }
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Provincia</label>
                  <CustomSelect
                    name="province"
                    value={province}
                    onChange={setProvince}
                    placeholder="Provincia"
                    options={[
                      { value: "Buenos Aires", label: "Buenos Aires" },
                      { value: "Ciudad Autónoma de Buenos Aires", label: "CABA" },
                      { value: "Catamarca", label: "Catamarca" },
                      { value: "Chaco", label: "Chaco" },
                      { value: "Chubut", label: "Chubut" },
                      { value: "Córdoba", label: "Córdoba" },
                      { value: "Corrientes", label: "Corrientes" },
                      { value: "Entre Ríos", label: "Entre Ríos" },
                      { value: "Formosa", label: "Formosa" },
                      { value: "Jujuy", label: "Jujuy" },
                      { value: "La Pampa", label: "La Pampa" },
                      { value: "La Rioja", label: "La Rioja" },
                      { value: "Mendoza", label: "Mendoza" },
                      { value: "Misiones", label: "Misiones" },
                      { value: "Neuquén", label: "Neuquén" },
                      { value: "Río Negro", label: "Río Negro" },
                      { value: "Salta", label: "Salta" },
                      { value: "San Juan", label: "San Juan" },
                      { value: "San Luis", label: "San Luis" },
                      { value: "Santa Cruz", label: "Santa Cruz" },
                      { value: "Santa Fe", label: "Santa Fe" },
                      { value: "Santiago del Estero", label: "Santiago del Estero" },
                      { value: "Tierra del Fuego", label: "Tierra del Fuego" },
                      { value: "Tucumán", label: "Tucumán" }
                    ]}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Localidad</label>
                  <input name="city" type="text" spellCheck="false" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ej: Rosario" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Cód. Postal</label>
                  <input name="zipCode" type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ej: 2000" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Calle</label>
                  <input name="street" type="text" spellCheck="false" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ej: San Martín" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Altura</label>
                  <input name="number" type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="1234" />
                </div>
              </div>
            </div>
          )}

          {mounted && process.env.NODE_ENV === 'production' && (
            <div className="flex justify-center mt-6">
              <Turnstile 
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} 
                onSuccess={(token) => setCaptchaToken(token)}
                onError={() => setCaptchaToken('')}
                options={{ theme: 'dark' }}
              />
            </div>
          )}

          <button type="submit" disabled={!mounted || loading || (!captchaToken && process.env.NODE_ENV === 'production')} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50">
            {!mounted ? 'Conectando...' : loading ? 'Registrando...' : <><UserPlus className="w-5 h-5" /> Crear cuenta</>}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-neutral-500">
          ¿Ya tenés cuenta? <Link href="/login" className="text-indigo-400 hover:text-indigo-300">Ingresá acá</Link>
        </div>
      </div>
    </div>
  );
}
