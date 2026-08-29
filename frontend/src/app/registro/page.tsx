"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, ChevronDown } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import { Turnstile } from '@marsidev/react-turnstile';
import { apiFetch } from '@/utils/api';
import { AsYouType, CountryCode } from 'libphonenumber-js';

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [captchaError, setCaptchaError] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [phonePrefix, setPhonePrefix] = useState('+54');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [mounted, setMounted] = useState(false);
  
  const phoneDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(event.target as Node)) {
        setIsPhoneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const prefixes = [
    { code: "+54", country: "ar", label: "AR" },
    { code: "+598", country: "uy", label: "UY" },
    { code: "+56", country: "cl", label: "CL" },
    { code: "+55", country: "br", label: "BR" },
    { code: "+51", country: "pe", label: "PE" },
    { code: "+52", country: "mx", label: "MX" },
    { code: "+57", country: "co", label: "CO" },
    { code: "+34", country: "es", label: "ES" },
    { code: "+1", country: "us", label: "US" }
  ];
  const selectedPrefix = prefixes.find(p => p.code === phonePrefix) || prefixes[0];

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Si borró todo, limpiar
    if (!e.target.value) {
      setPhoneNumber('');
      return;
    }
    // Formatear al vuelo según el país seleccionado
    const formatter = new AsYouType(selectedPrefix.country.toUpperCase() as CountryCode);
    const formatted = formatter.input(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = e.target.selectionStart;
    const formatted = e.target.value
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    e.target.value = formatted;
    // Restaurar cursor para no arruinar la UX si edita en el medio
    e.target.setSelectionRange(start, start);
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
      payload.phone = `${phonePrefix}${phoneNumber}`;
      if (companyName.trim()) {
        payload.companyName = companyName.trim();
      }
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
            Venti<span className="text-indigo-500">Pass</span>
          </Link>
          <p className="text-neutral-400">Creá tu cuenta gratis</p>
        </div>

        {error && <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Nombre</label>
              <input name="firstName" type="text" maxLength={16} onChange={handleNameChange} spellCheck="false" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Juan" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Apellido</label>
              <input name="lastName" type="text" maxLength={16} onChange={handleNameChange} spellCheck="false" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Pérez" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Email</label>
            <input name="email" type="email" maxLength={38} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="tucorreo@ejemplo.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Contraseña</label>
            <input name="password" type="password" maxLength={32} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="••••••••" />
          </div>

          <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-xl mt-4">
            <input type="checkbox" id="isOrganizer" name="isOrganizer" checked={isOrganizer} onChange={(e) => setIsOrganizer(e.target.checked)} className="w-5 h-5 accent-indigo-500 rounded cursor-pointer" />
            <label htmlFor="isOrganizer" className="text-sm font-medium text-white cursor-pointer select-none">
              Soy productor / organizador
            </label>
          </div>

          {isOrganizer && (
            <div className="space-y-4 pt-4 border-t border-white/10 mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Teléfono Móvil / WhatsApp</label>
                  <div className="flex bg-white/5 border border-white/10 rounded-xl focus-within:border-indigo-500 focus-within:bg-white/10 transition-all shadow-inner relative">
                    <div className="w-[120px] border-r border-white/10 flex-shrink-0 bg-transparent relative" ref={phoneDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsPhoneDropdownOpen(!isPhoneDropdownOpen)}
                        className="w-full h-full min-h-[48px] flex items-center justify-between px-3 py-3 bg-transparent text-sm text-white focus:outline-none cursor-pointer hover:bg-white/5 rounded-l-xl"
                      >
                        <div className="flex items-center gap-2">
                          <img src={`https://flagcdn.com/w20/${selectedPrefix.country}.png`} alt={selectedPrefix.label} className="w-5 h-auto rounded-[2px]" />
                          <span>{selectedPrefix.code}</span>
                        </div>
                        <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${isPhoneDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isPhoneDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl z-50 py-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {prefixes.map((pref) => (
                            <button
                              key={pref.code}
                              type="button"
                              onClick={() => {
                                setPhonePrefix(pref.code);
                                setIsPhoneDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors ${
                                phonePrefix === pref.code ? 'bg-indigo-600 text-white' : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <img src={`https://flagcdn.com/w20/${pref.country}.png`} alt={pref.label} className="w-5 h-auto rounded-[2px]" />
                              <span className="w-8 text-neutral-400">{pref.label}</span>
                              <span className="font-medium">{pref.code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input 
                      name="phoneNumber" 
                      type="tel" 
                      maxLength={18}
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      required 
                      className="w-full bg-transparent px-4 py-3 text-white focus:outline-none placeholder-neutral-500 rounded-r-xl" 
                      placeholder="11 2345 6789" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Nombre de la Productora / Marca (Opcional)</label>
                  <input 
                    name="companyName" 
                    type="text" 
                    maxLength={50}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    spellCheck="false" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" 
                    placeholder="Ej: Producciones Norte, Studio 54" 
                  />
                </div>
              </div>
            </div>
          )}

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

          <button type="submit" disabled={!mounted || loading || captchaError || (!captchaToken && process.env.NODE_ENV === 'production')} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50">
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
