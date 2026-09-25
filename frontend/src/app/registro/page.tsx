'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, ChevronDown } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { apiFetch } from '@/utils/api';
import { AsYouType, CountryCode } from 'libphonenumber-js';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const prefixes = [
  { code: '+54', country: 'ar', label: 'AR' },
  { code: '+598', country: 'uy', label: 'UY' },
  { code: '+56', country: 'cl', label: 'CL' },
  { code: '+55', country: 'br', label: 'BR' },
  { code: '+51', country: 'pe', label: 'PE' },
  { code: '+52', country: 'mx', label: 'MX' },
  { code: '+57', country: 'co', label: 'CO' },
  { code: '+34', country: 'es', label: 'ES' },
  { code: '+1', country: 'us', label: 'US' },
];

const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(2, 'Mínimo 2 caracteres')
      .max(16, 'Máximo 16 caracteres'),
    lastName: z
      .string()
      .min(2, 'Mínimo 2 caracteres')
      .max(16, 'Máximo 16 caracteres'),
    email: z
      .string()
      .email('Correo electrónico inválido')
      .max(38, 'Máximo 38 caracteres'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .max(32, 'Máximo 32 caracteres'),
    confirmPassword: z.string(),
    isOrganizer: z.boolean(),
    phonePrefix: z.string(),
    phoneNumber: z.string().optional(),
    companyName: z.string().max(50, 'Máximo 50 caracteres').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Las contraseñas no coinciden',
        path: ['confirmPassword'],
      });
    }
    if (data.isOrganizer) {
      if (!data.phoneNumber || data.phoneNumber.length < 8) {
        ctx.addIssue({
          code: 'custom',
          message: 'El número de teléfono es obligatorio',
          path: ['phoneNumber'],
        });
      }
    }
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [captchaError, setCaptchaError] = useState(false);
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const phoneDropdownRef = useRef<HTMLDivElement>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      isOrganizer: false,
      phonePrefix: '+54',
      phoneNumber: '',
      companyName: '',
    },
  });

  const isOrganizer = watch('isOrganizer');
  const phonePrefix = watch('phonePrefix');
  const selectedPrefix =
    prefixes.find((p) => p.code === phonePrefix) || prefixes[0];

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (event: MouseEvent) => {
      if (
        phoneDropdownRef.current &&
        !phoneDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPhoneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = e.target.selectionStart;
    const formatted = e.target.value
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    e.target.value = formatted;
    e.target.setSelectionRange(start, start);
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    setError('');

    const payload: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      captchaToken,
      role: data.isOrganizer ? 'ORGANIZER' : 'CUSTOMER',
    };

    if (data.isOrganizer) {
      payload.phone = `${data.phonePrefix}${data.phoneNumber}`;
      if (data.companyName?.trim()) {
        payload.companyName = data.companyName.trim();
      }
    }

    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(responseData.message || 'Error al registrar el usuario');
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
    <div className="min-h-screen bg-neutral-950 relative overflow-x-hidden flex flex-col px-4">
      <div className="flex-1 min-h-[6rem] md:min-h-[8rem]" />
      <div className="w-full max-w-md bg-neutral-900 border border-white/5 p-8 rounded-3xl shadow-2xl z-10 mx-auto shrink-0">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="font-outfit text-3xl font-bold tracking-tighter inline-block mb-2"
          >
            Neo<span className="text-indigo-500">Pass</span>
          </Link>
          <p className="text-neutral-400">Creá tu cuenta gratis</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">
                Nombre
              </label>
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    maxLength={16}
                    spellCheck="false"
                    className={`w-full bg-white/5 border ${errors.firstName ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors`}
                    placeholder="Juan"
                    onChange={(e) => {
                      handleNameChange(e);
                      field.onChange(e.target.value);
                    }}
                  />
                )}
              />
              {errors.firstName && (
                <span className="text-red-400 text-xs mt-1 block">
                  {errors.firstName.message}
                </span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">
                Apellido
              </label>
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    maxLength={16}
                    spellCheck="false"
                    className={`w-full bg-white/5 border ${errors.lastName ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors`}
                    placeholder="Pérez"
                    onChange={(e) => {
                      handleNameChange(e);
                      field.onChange(e.target.value);
                    }}
                  />
                )}
              />
              {errors.lastName && (
                <span className="text-red-400 text-xs mt-1 block">
                  {errors.lastName.message}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">
              Email
            </label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="email"
                  maxLength={38}
                  className={`w-full bg-white/5 border ${errors.email ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors`}
                  placeholder="tucorreo@ejemplo.com"
                />
              )}
            />
            {errors.email && (
              <span className="text-red-400 text-xs mt-1 block">
                {errors.email.message}
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">
              Contraseña
            </label>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="password"
                  maxLength={32}
                  className={`w-full bg-white/5 border ${errors.password ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors`}
                  placeholder="••••••••"
                />
              )}
            />
            {errors.password && (
              <span className="text-red-400 text-xs mt-1 block">
                {errors.password.message}
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">
              Confirmar Contraseña
            </label>
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="password"
                  maxLength={32}
                  className={`w-full bg-white/5 border ${errors.confirmPassword ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors`}
                  placeholder="••••••••"
                />
              )}
            />
            {errors.confirmPassword && (
              <span className="text-red-400 text-xs mt-1 block">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-xl mt-4">
            <Controller
              name="isOrganizer"
              control={control}
              render={({ field: { value, onChange, ...field } }) => (
                <input
                  {...field}
                  type="checkbox"
                  id="isOrganizer"
                  checked={value}
                  onChange={(e) => onChange(e.target.checked)}
                  className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
                />
              )}
            />
            <label
              htmlFor="isOrganizer"
              className="text-sm font-medium text-white cursor-pointer select-none"
            >
              Soy productor / organizador
            </label>
          </div>

          {isOrganizer && (
            <div className="space-y-4 pt-4 border-t border-white/10 mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    Teléfono Móvil / WhatsApp
                  </label>
                  <div
                    className={`flex bg-white/5 border ${errors.phoneNumber ? 'border-red-500' : 'border-white/10'} rounded-xl focus-within:border-indigo-500 focus-within:bg-white/10 transition-all shadow-inner relative`}
                  >
                    <div
                      className="w-[120px] border-r border-white/10 flex-shrink-0 bg-transparent relative"
                      ref={phoneDropdownRef}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setIsPhoneDropdownOpen(!isPhoneDropdownOpen)
                        }
                        className="w-full h-full min-h-[48px] flex items-center justify-between px-3 py-3 bg-transparent text-sm text-white focus:outline-none cursor-pointer hover:bg-white/5 rounded-l-xl"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={`https://flagcdn.com/w20/${selectedPrefix.country}.png`}
                            alt={selectedPrefix.label}
                            className="w-5 h-auto rounded-[2px]"
                          />
                          <span>{selectedPrefix.code}</span>
                        </div>
                        <ChevronDown
                          className={`w-3 h-3 text-neutral-400 transition-transform ${isPhoneDropdownOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {isPhoneDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl z-50 py-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {prefixes.map((pref) => (
                            <button
                              key={pref.code}
                              type="button"
                              onClick={() => {
                                setValue('phonePrefix', pref.code, {
                                  shouldValidate: true,
                                });
                                setIsPhoneDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors ${
                                phonePrefix === pref.code
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <img
                                src={`https://flagcdn.com/w20/${pref.country}.png`}
                                alt={pref.label}
                                className="w-5 h-auto rounded-[2px]"
                              />
                              <span className="w-8 text-neutral-400">
                                {pref.label}
                              </span>
                              <span className="font-medium">{pref.code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Controller
                      name="phoneNumber"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="tel"
                          maxLength={18}
                          onChange={(e) => {
                            if (!e.target.value) {
                              field.onChange('');
                              return;
                            }
                            const formatter = new AsYouType(
                              selectedPrefix.country.toUpperCase() as CountryCode,
                            );
                            const formatted = formatter.input(e.target.value);
                            field.onChange(formatted);
                          }}
                          className="w-full bg-transparent px-4 py-3 text-white focus:outline-none placeholder-neutral-500 rounded-r-xl"
                          placeholder="11 2345 6789"
                        />
                      )}
                    />
                  </div>
                  {errors.phoneNumber && (
                    <span className="text-red-400 text-xs mt-1 block">
                      {errors.phoneNumber.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    Nombre de la Productora / Marca (Opcional)
                  </label>
                  <Controller
                    name="companyName"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        maxLength={50}
                        spellCheck="false"
                        className={`w-full bg-white/5 border ${errors.companyName ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors`}
                        placeholder="Ej: Producciones Norte, Studio 54"
                      />
                    )}
                  />
                  {errors.companyName && (
                    <span className="text-red-400 text-xs mt-1 block">
                      {errors.companyName.message}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {mounted && process.env.NODE_ENV === 'production' && (
            <div className="flex flex-col items-center justify-center mt-6">
              {!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
                <div className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center w-full">
                  Falta configurar la clave de seguridad (Turnstile).
                </div>
              ) : (
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  onSuccess={(token) => {
                    setCaptchaToken(token);
                    setCaptchaError(false);
                  }}
                  onError={() => setCaptchaError(true)}
                  options={{ theme: 'dark' }}
                />
              )}
              {captchaError && (
                <div className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center w-full mt-2">
                  Error de seguridad. Desactivá el AdBlocker o recargá la
                  página.
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={
              !mounted ||
              loading ||
              captchaError ||
              (!captchaToken && process.env.NODE_ENV === 'production')
            }
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
          >
            {!mounted ? (
              'Conectando...'
            ) : loading ? (
              'Registrando...'
            ) : (
              <>
                <UserPlus className="w-5 h-5" /> Crear cuenta
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-neutral-500">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
            Ingresá acá
          </Link>
        </div>
      </div>
      <div className="flex-1 min-h-[4rem]" />
    </div>
  );
}
