"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);

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
      role: isOrganizer ? 'ORGANIZER' : 'CUSTOMER'
    };

    if (isOrganizer) {
      payload.cuil = formData.get('cuil');
      payload.cbuOrAlias = formData.get('cbuOrAlias');
      payload.country = formData.get('country');
      payload.province = formData.get('province');
      payload.city = formData.get('city');
      payload.street = formData.get('street');
      payload.number = formData.get('number');
      payload.zipCode = formData.get('zipCode');
      payload.phone = formData.get('phone');
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px] -z-10 pointer-events-none" />

      <div className="w-full max-w-md bg-black/50 border border-white/10 p-8 rounded-3xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <Link href="/" className="font-outfit text-3xl font-bold tracking-tighter inline-block mb-2">
            We<span className="text-indigo-500">Pass</span>
          </Link>
          <p className="text-neutral-400">Creá tu cuenta gratis</p>
        </div>

        {error && <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Nombre</label>
              <input name="firstName" type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Juan" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Apellido</label>
              <input name="lastName" type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Pérez" />
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
                  <input name="cuil" type="text" pattern="\d{2}-\d{8}-\d{1}" title="El formato debe ser XX-XXXXXXXX-X" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="20-12345678-9" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Teléfono</label>
                  <input name="phone" type="text" pattern="^\+?[0-9\s\-]{8,20}$" title="Debe contener entre 8 y 20 números, permitiendo espacios, guiones y un + al inicio" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="+54 9 11..." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">CBU o Alias</label>
                <input name="cbuOrAlias" type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="tu.alias.mp" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">País</label>
                  <select name="country" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors [&>option]:bg-neutral-900 appearance-none">
                    <option value="" disabled selected>País</option>
                    <option value="Argentina">Argentina</option>
                    <option value="Uruguay">Uruguay</option>
                    <option value="Chile">Chile</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Provincia</label>
                  <select name="province" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors [&>option]:bg-neutral-900 appearance-none">
                    <option value="" disabled selected>Provincia</option>
                    <option value="Buenos Aires">Buenos Aires</option>
                    <option value="Ciudad Autónoma de Buenos Aires">CABA</option>
                    <option value="Catamarca">Catamarca</option>
                    <option value="Chaco">Chaco</option>
                    <option value="Chubut">Chubut</option>
                    <option value="Córdoba">Córdoba</option>
                    <option value="Corrientes">Corrientes</option>
                    <option value="Entre Ríos">Entre Ríos</option>
                    <option value="Formosa">Formosa</option>
                    <option value="Jujuy">Jujuy</option>
                    <option value="La Pampa">La Pampa</option>
                    <option value="La Rioja">La Rioja</option>
                    <option value="Mendoza">Mendoza</option>
                    <option value="Misiones">Misiones</option>
                    <option value="Neuquén">Neuquén</option>
                    <option value="Río Negro">Río Negro</option>
                    <option value="Salta">Salta</option>
                    <option value="San Juan">San Juan</option>
                    <option value="San Luis">San Luis</option>
                    <option value="Santa Cruz">Santa Cruz</option>
                    <option value="Santa Fe">Santa Fe</option>
                    <option value="Santiago del Estero">Santiago del Estero</option>
                    <option value="Tierra del Fuego">Tierra del Fuego</option>
                    <option value="Tucumán">Tucumán</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Localidad</label>
                  <input name="city" type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ej: Rosario" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Calle</label>
                  <input name="street" type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ej: San Martín" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Altura</label>
                  <input name="number" type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="1234" />
                </div>
              </div>
              <div className="w-1/2 pr-2">
                <label className="block text-sm font-medium text-neutral-400 mb-1">Cód. Postal</label>
                <input name="zipCode" type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ej: 2000" />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50">
            {loading ? 'Registrando...' : <><UserPlus className="w-5 h-5"/> Crear cuenta</>}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-neutral-500">
          ¿Ya tenés cuenta? <Link href="/login" className="text-indigo-400 hover:text-indigo-300">Ingresá acá</Link>
        </div>
      </div>
    </div>
  );
}
