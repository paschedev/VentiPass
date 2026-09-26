'use client';

import {
  Ticket,
  Activity,
  Calendar as CalendarIcon,
  Link2,
  X,
  Users,
  Settings,
  Plus,
  UserPlus,
  Search,
  Check,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import CustomSelect from '@/components/CustomSelect';
import DashboardTab from '@/components/panel/DashboardTab';
import type { DashboardStats } from '@/components/panel/types';
import { apiFetch } from '@/utils/api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isOrganizer as hasOrganizerRole } from '@/utils/roles';
import { useUserSearch } from '@/hooks/useUserSearch';
import { formatCurrency } from '@/utils/format';

function OrganizerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') || 'dashboard',
  );
  const [showMpModal, setShowMpModal] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    activeEvents: 0,
    chartData: [],
    recentTransactions: [],
  });
  const { user, refresh } = useCurrentUser();
  const isOrganizer = hasOrganizerRole(user);
  const hasLinkedMp = !!user?.hasLinkedMp;

  // --- Invite Staff States ---
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [myStaff, setMyStaff] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [inviteEventId, setInviteEventId] = useState('');
  const [inviteRole, setInviteRole] = useState<'SCANNER' | 'RPP'>('SCANNER');
  const [inviteCommType, setInviteCommType] = useState<'PERCENTAGE' | 'FIXED'>(
    'PERCENTAGE',
  );
  const [inviteCommValue, setInviteCommValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const searchResults = useUserSearch(searchTerm);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);

  useEffect(() => {
    if (!isOrganizer) {
      router.replace('/panel/tickets');
      return;
    }

    const loadStats = async () => {
      try {
        const res = await apiFetch('/events/organizer/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          console.error(
            'Error fetching stats: API returned status',
            res.status,
          );
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };
    loadStats();

    if (searchParams.get('mp_success') === 'true') {
      toast.success('Cuenta de Mercado Pago vinculada con éxito');
      refresh();
      window.history.replaceState(null, '', '/panel');
    } else if (searchParams.get('mp_error') === 'true') {
      toast.error('Hubo un error al vincular la cuenta de Mercado Pago');
      window.history.replaceState(null, '', '/panel');
    }
  }, [isOrganizer, refresh, router, searchParams]);

  const fetchEvents = async () => {
    setLoadingEvents(true);
    setFetchError(false);
    try {
      const res = await apiFetch('/events/organizer/me');
      if (res.ok) {
        setMyEvents(await res.json());
      } else {
        setFetchError(true);
      }
    } catch (e) {
      console.error(e);
      setFetchError(true);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const res = await apiFetch('/events/organizer/staff');
      if (res.ok) setMyStaff(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (isOrganizer) {
      fetchEvents();
      fetchStaff();
    }
  }, [isOrganizer]);

  const handleCommValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    if (inviteCommType === 'PERCENTAGE') {
      if (val === '') {
        setInviteCommValue('');
        return;
      }

      val = val.replace(',', '.');
      if (!/^\d*\.?\d*$/.test(val)) return;

      const parts = val.split('.');
      if (parts.length > 1 && parts[1].length > 1) {
        return;
      }

      const num = parseFloat(val);
      if (!isNaN(num) && num > 100) {
        val = '100.0';
      }

      setInviteCommValue(val);
    } else {
      if (!/^\d*$/.test(val)) return;
      setInviteCommValue(val);
    }
  };

  const handleCommValueBlur = () => {
    if (!inviteCommValue) return;

    if (inviteCommType === 'PERCENTAGE') {
      const num = parseFloat(inviteCommValue);
      if (!isNaN(num)) {
        setInviteCommValue(num.toFixed(1));
      }
    }
  };

  const handleSendInvites = async () => {
    if (!inviteEventId) return toast.error('Selecciona un evento');
    if (selectedUsers.length === 0)
      return toast.error('Selecciona al menos un usuario');
    if (
      inviteRole === 'RPP' &&
      (!inviteCommValue || Number(inviteCommValue) <= 0)
    ) {
      return toast.error('Ingresa una comisión válida');
    }

    if (inviteRole === 'RPP' && inviteCommType === 'PERCENTAGE') {
      const numVal = Number(inviteCommValue);
      if (numVal < 0 || numVal > 100)
        return toast.error('El porcentaje debe estar entre 0 y 100');
    }

    setSendingInvites(true);
    let successCount = 0;

    for (const user of selectedUsers) {
      try {
        const payload = {
          userId: user.id,
          role: inviteRole === 'RPP' ? 'PROMOTER' : inviteRole,
          commissionType: inviteRole === 'RPP' ? inviteCommType : undefined,
          commissionValue:
            inviteRole === 'RPP' ? Number(inviteCommValue) : undefined,
        };
        const res = await apiFetch(`/events/${inviteEventId}/staff`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          successCount++;
        } else {
          const errData = await res.json();
          toast.error(
            getApiErrorMessage(errData, `No se pudo invitar a ${user.name}`),
          );
        }
      } catch (e) {
        console.error(e);
        toast.error(`Error de red al invitar a ${user.name}`);
      }
    }

    setSendingInvites(false);
    if (successCount > 0) {
      toast.success(`Se enviaron ${successCount} invitaciones correctamente`);
      fetchStaff(); // Refetch staff list so the newly added staff appears
    }
    setShowInviteModal(false);
    setSelectedUsers([]);
    setInviteRole('SCANNER');
    setInviteCommValue('');
    setSearchTerm('');
  };

  const handleConnectMp = async () => {
    try {
      const response = await apiFetch('/payments/oauth/link');
      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(
          getApiErrorMessage(data, 'Error al generar link de MercadoPago'),
        );
      }
    } catch (err) {
      toast.error('Error de conexión al servidor');
    }
  };

  const handleCreateEventClick = () => {
    if (!hasLinkedMp) {
      toast.error(
        'Debes vincular tu cuenta de Mercado Pago primero para poder cobrar las entradas.',
      );
      setShowMpModal(true);
      return;
    }
    router.push('/panel/eventos/nuevo');
  };

  if (!isOrganizer) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 pt-8 pb-24 md:pb-8">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="font-outfit text-4xl font-bold text-white mb-2">
            Panel Organizador
          </h1>
          <p className="text-neutral-400">
            Gestiona tus eventos, lotes de entradas y comisiones a RPPs.
          </p>
        </div>
        <button
          onClick={handleCreateEventClick}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5" /> Crear Evento
        </button>
      </div>

      {/* Mercado Pago Alert */}
      <AnimatePresence>
        {!hasLinkedMp && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-3xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-sm relative overflow-hidden"
          >
            <div className="hidden md:block absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[64px] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-1 text-white flex items-center gap-2">
                <Link2 className="w-5 h-5 text-indigo-400" /> Vincular Mercado
                Pago
              </h2>
              <p className="text-sm text-indigo-200/80">
                Requerido para activar el sistema Marketplace y recibir cobros
                directamente en tu cuenta (CBU/CVU).
              </p>
            </div>
            <button
              onClick={() => setShowMpModal(true)}
              className="relative z-10 bg-white text-indigo-950 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              Configurar ahora
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs Navigation */}
      <div className="flex w-full bg-white/[0.02] border border-white/5 p-1 rounded-2xl mb-8">
        {[
          {
            id: 'dashboard',
            label: 'Resumen',
            icon: <Activity className="w-5 h-5 md:w-4 md:h-4 shrink-0" />,
          },
          {
            id: 'events',
            label: 'Mis Eventos',
            icon: <CalendarIcon className="w-5 h-5 md:w-4 md:h-4 shrink-0" />,
          },
          {
            id: 'staff',
            label: 'Staff & RPPs',
            icon: <Users className="w-5 h-5 md:w-4 md:h-4 shrink-0" />,
          },
          {
            id: 'settings',
            label: 'Ajustes',
            icon: <Settings className="w-5 h-5 md:w-4 md:h-4 shrink-0" />,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-1 md:px-6 py-3 rounded-xl flex-1 transition-all ${
              activeTab === tab.id
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-neutral-500 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span
              className={`text-[10px] leading-tight md:text-sm font-medium ${tab.id === 'settings' ? 'hidden md:block' : 'block'}`}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content: Dashboard */}
      {activeTab === 'dashboard' && <DashboardTab stats={stats} />}

      {/* Tab Content: Staff & RPPs (Mock for UI Demo) */}
      {activeTab === 'staff' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-neutral-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="font-outfit text-2xl font-bold">
                  Gestión de Staff y RPPs
                </h2>
                <p className="text-sm text-neutral-400">
                  Invita Scanners y Promotores a tus eventos.
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" /> Enviar Invitación
              </button>
            </div>

            {/* Staff List */}
            <div className="w-full">
              {loadingStaff ? (
                <div className="text-center py-12 text-neutral-500">
                  Cargando staff...
                </div>
              ) : myStaff.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                  <Users className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-neutral-400 mb-2">
                    No tienes staff asignado
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Haz click en "Enviar Invitación" para agregar Scanners o
                    Promotores a tus eventos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myStaff.map((staff: any) => (
                    <div
                      key={staff.id}
                      className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-full shrink-0 bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-sm text-white">
                            {staff.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-white text-sm truncate">
                              {staff.user.name}
                            </h4>
                            <p className="text-xs text-neutral-400 truncate">
                              {staff.user.email}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-bold tracking-wider ${
                            staff.status === 'ACCEPTED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : staff.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {staff.status === 'ACCEPTED'
                            ? 'ACTIVO'
                            : staff.status === 'PENDING'
                              ? 'PENDIENTE'
                              : 'RECHAZADO'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-500">Rol</span>
                          <span className="font-semibold text-indigo-300">
                            {staff.role}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm items-center gap-2">
                          <span className="text-neutral-500">Evento</span>
                          <span className="text-white truncate">
                            {staff.event.title}
                          </span>
                        </div>
                        {staff.role === 'PROMOTER' && (
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-500">Comisión</span>
                            <span className="text-emerald-400 font-medium">
                              {staff.commissionType === 'PERCENTAGE'
                                ? `${staff.commissionValue}%`
                                : `$${staff.commissionValue}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Mercado Pago Modal */}
      <AnimatePresence>
        {showMpModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-neutral-900 border border-white/10 p-8 rounded-3xl w-full max-w-md relative shadow-2xl"
            >
              <button
                onClick={() => setShowMpModal(false)}
                className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                <Link2 className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-bold mb-2">Vincular Mercado Pago</h2>
              <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
                Al conectar tu cuenta de Mercado Pago autorizarás a NeoPass a
                procesar las ventas en tu nombre. El dinero del valor de tus
                entradas irá <strong>directamente a tu cuenta</strong> sin
                descuentos. El cargo por servicio de la plataforma se le cobra
                como un extra directamente al comprador final.
              </p>

              <button
                onClick={handleConnectMp}
                className="w-full bg-[#009EE3] hover:bg-[#0089C7] text-white py-4 rounded-full font-bold transition-all shadow-lg shadow-[#009EE3]/20 flex items-center justify-center gap-2 mb-6"
              >
                Conectar con Mercado Pago
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tab Content: Mis Eventos */}
      {activeTab === 'events' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="font-outfit text-2xl font-bold">Mis Eventos</h2>
              <p className="text-sm text-neutral-400">
                Gestiona y analiza el rendimiento de tus eventos.
              </p>
            </div>
          </div>

          {loadingEvents ? (
            <div className="text-center text-neutral-400 py-10">
              Cargando eventos...
            </div>
          ) : fetchError ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-12 text-center shadow-2xl">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Error al cargar eventos
              </h3>
              <p className="text-neutral-400 mb-6">
                Hubo un problema de conexión. Por favor, intenta nuevamente.
              </p>
              <button
                onClick={fetchEvents}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl transition-colors font-medium"
              >
                Reintentar
              </button>
            </div>
          ) : myEvents.length === 0 ? (
            <div className="bg-neutral-900 border border-white/5 rounded-3xl p-12 text-center shadow-2xl">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Aún no tienes eventos
              </h3>
              <p className="text-neutral-400 mb-6">
                Crea tu primer evento y comienza a vender entradas ahora mismo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {myEvents.map((event) => {
                let totalSold = 0;
                let totalRevenue = 0;

                event.ticketTypes.forEach((tt: any) => {
                  totalSold += tt.sold;
                  totalRevenue += tt.sold * Number(tt.price);
                });

                return (
                  <div
                    key={event.id}
                    className="bg-neutral-900 border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-colors shadow-2xl"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-semibold rounded-md uppercase ${
                              event.status === 'PUBLISHED'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : event.status === 'DRAFT'
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-white/10 text-neutral-400'
                            }`}
                          >
                            {event.status === 'PUBLISHED'
                              ? 'PUBLICADO'
                              : event.status}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {new Date(event.startDate).toLocaleDateString(
                              'es-AR',
                              {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              },
                            )}
                          </span>
                        </div>
                        <h3 className="font-outfit text-xl font-bold text-white mb-2">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-neutral-400 mb-4">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {event.venueName || 'Lugar por definir'}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                          <div className="text-xs text-neutral-500 mb-1">
                            Ingresos
                          </div>
                          <div className="text-lg font-bold text-emerald-400">
                            {formatCurrency(totalRevenue)}
                          </div>
                        </div>
                        <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                          <div className="text-xs text-neutral-500 mb-1">
                            Entradas Vendidas
                          </div>
                          <div className="text-lg font-bold text-white">
                            {totalSold}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/5">
                      <Link
                        href={`/panel/eventos/${event.id}/editar`}
                        className="flex-1 text-center bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
                      >
                        Editar Evento
                      </Link>
                      <Link
                        href={`/eventos/${event.id}`}
                        target="_blank"
                        className="flex-1 text-center bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        Ver Página <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Tab Content: Ajustes */}
      {activeTab === 'settings' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-neutral-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="font-outfit text-2xl font-bold">
                  Ajustes de Organizador
                </h2>
                <p className="text-sm text-neutral-400">
                  Configura tu perfil de organizador y herramientas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Presets Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-start hover:border-white/20 transition-colors">
                <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center text-pink-400 mb-4">
                  <Ticket className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Plantillas de Tickets
                </h3>
                <p className="text-sm text-neutral-400 mb-6 flex-1">
                  Gestiona tus presets rápidos para cargar entradas en segundos
                  al crear nuevos eventos.
                </p>
                <button
                  onClick={() => router.push('/panel/configuracion/presets')}
                  className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  Administrar Plantillas
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Invite Staff Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-neutral-900 border border-white/10 p-6 md:p-8 rounded-3xl w-full max-w-lg relative shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <button
                onClick={() => setShowInviteModal(false)}
                className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-indigo-400" />
                Invitar Staff / RPP
              </h2>

              <div className="space-y-6">
                {/* 1. Selector de Evento */}
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    1. Seleccionar Evento
                  </label>
                  <CustomSelect
                    value={inviteEventId}
                    onChange={setInviteEventId}
                    options={myEvents.map((ev) => ({
                      value: ev.id,
                      label: ev.title,
                    }))}
                    placeholder="Elegir un evento..."
                  />
                </div>

                {/* 2. Configuración del Lote */}
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-4">
                  <label className="block text-sm font-medium text-neutral-400">
                    2. Rol y Configuración (Para todos los invitados)
                  </label>

                  <div className="flex bg-black/40 rounded-lg p-1">
                    <button
                      onClick={() => setInviteRole('SCANNER')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${inviteRole === 'SCANNER' ? 'bg-indigo-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                    >
                      SCANNER
                    </button>
                    <button
                      onClick={() => setInviteRole('RPP')}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${inviteRole === 'RPP' ? 'bg-indigo-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                    >
                      RPP
                    </button>
                  </div>

                  {inviteRole === 'RPP' && (
                    <div className="flex items-center gap-3">
                      <div className="flex bg-black/40 rounded-lg p-1 w-1/3">
                        <button
                          onClick={() => setInviteCommType('PERCENTAGE')}
                          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${inviteCommType === 'PERCENTAGE' ? 'bg-white/10 text-white' : 'text-neutral-500'}`}
                        >
                          %
                        </button>
                        <button
                          onClick={() => setInviteCommType('FIXED')}
                          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${inviteCommType === 'FIXED' ? 'bg-white/10 text-white' : 'text-neutral-500'}`}
                        >
                          $
                        </button>
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={inviteCommValue}
                          onChange={handleCommValueChange}
                          onBlur={handleCommValueBlur}
                          placeholder={
                            inviteCommType === 'PERCENTAGE'
                              ? 'Ej: 15.0'
                              : 'Ej: 1500'
                          }
                          className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Buscador de Usuarios */}
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    3. Buscar y agregar usuarios (Máx 10)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre o email..."
                      disabled={selectedUsers.length >= 10}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                    />

                    {/* Resultados de búsqueda */}
                    {searchResults.length > 0 && (
                      <div className="absolute bottom-full mb-2 left-0 right-0 bg-neutral-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10 max-h-48 overflow-y-auto">
                        {searchResults.map((u) => {
                          const isSelected = selectedUsers.some(
                            (su) => su.id === u.id,
                          );
                          return (
                            <button
                              key={u.id}
                              disabled={isSelected}
                              onClick={() => {
                                setSelectedUsers([...selectedUsers, u]);
                                setSearchTerm('');
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-b border-white/5 last:border-0"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                                  {u.name.charAt(0)}
                                </div>
                                <div className="min-w-0 text-left">
                                  <div className="text-white font-medium text-sm truncate">
                                    {u.name}
                                  </div>
                                  <div className="text-neutral-400 text-xs truncate">
                                    {u.email}
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-emerald-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Lista de Seleccionados */}
                {selectedUsers.length > 0 && (
                  <div className="bg-black/30 rounded-xl border border-white/5 p-2 space-y-1 max-h-48 overflow-y-auto">
                    {selectedUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between bg-white/5 rounded-lg p-2 px-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white leading-tight">
                              {u.name}
                            </div>
                            <div className="text-xs text-neutral-400">
                              {u.email}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setSelectedUsers(
                              selectedUsers.filter((su) => su.id !== u.id),
                            )
                          }
                          className="text-neutral-500 hover:text-red-400 p-1 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-medium text-neutral-400 hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendInvites}
                    disabled={
                      sendingInvites ||
                      selectedUsers.length === 0 ||
                      !inviteEventId
                    }
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50"
                  >
                    {sendingInvites ? 'Enviando...' : `Enviar`}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OrganizerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-white">
          Cargando...
        </div>
      }
    >
      <OrganizerDashboardContent />
    </Suspense>
  );
}
