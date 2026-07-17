"use client";

import { DollarSign, Ticket, Activity, TrendingUp, Calendar as CalendarIcon, Link2, X, Users, Settings, Plus, UserPlus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function OrganizerDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMpModal, setShowMpModal] = useState(false);
  const [mpToken, setMpToken] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [hasLinkedMp, setHasLinkedMp] = useState(true);
  const [stats, setStats] = useState({ totalEvents: 0, totalTicketsSold: 0, totalRevenue: 0, activeEvents: 0 });
  const [isOrganizer, setIsOrganizer] = useState<boolean | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.replace('/login');
      return;
    }

    const parsedUser = JSON.parse(userStr);
    if (parsedUser.role !== 'ORGANIZER' && parsedUser.role !== 'ADMIN') {
      router.replace('/panel/tickets');
      return;
    }
    
    setIsOrganizer(true);
    setHasLinkedMp(parsedUser.hasLinkedMp || false);
    
    // Simulate real fetching
    setStats({ totalEvents: 3, totalTicketsSold: 1250, totalRevenue: 8500000, activeEvents: 1 });
  }, [router]);

  const handleSaveToken = async () => {
    if (!mpToken) return;
    setLoading(true);
    setTimeout(() => {
      toast.success('Cuenta vinculada con éxito!');
      setHasLinkedMp(true);
      setShowMpModal(false);
      setLoading(false);
    }, 1000);
  };

  if (!isOrganizer) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="font-outfit text-4xl font-bold text-white mb-2">Panel Organizador</h1>
          <p className="text-neutral-400">Gestiona tus eventos, lotes de entradas y comisiones a RPPs.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95">
          <Plus className="w-5 h-5" /> Crear Evento
        </button>
      </div>

      {/* Mercado Pago Alert */}
      <AnimatePresence>
        {!hasLinkedMp && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-3xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[64px] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-1 text-white flex items-center gap-2">
                <Link2 className="w-5 h-5 text-indigo-400" /> Vincular Mercado Pago
              </h2>
              <p className="text-sm text-indigo-200/80">
                Requerido para activar el sistema Marketplace y recibir cobros directamente en tu cuenta (CBU/CVU).
              </p>
            </div>
            <button onClick={() => setShowMpModal(true)} className="relative z-10 bg-white text-indigo-950 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105 active:scale-95 whitespace-nowrap">
              Configurar ahora
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs Navigation */}
      <div className="flex w-full bg-white/[0.02] border border-white/5 p-1 rounded-2xl mb-8">
        {[
          { id: 'dashboard', label: 'Resumen', icon: <Activity className="w-5 h-5 md:w-4 md:h-4 shrink-0" /> },
          { id: 'events', label: 'Mis Eventos', icon: <CalendarIcon className="w-5 h-5 md:w-4 md:h-4 shrink-0" /> },
          { id: 'staff', label: 'Staff & RPPs', icon: <Users className="w-5 h-5 md:w-4 md:h-4 shrink-0" /> },
          { id: 'settings', label: 'Ajustes', icon: <Settings className="w-5 h-5 md:w-4 md:h-4 shrink-0" /> },
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
            <span className={`text-[10px] leading-tight md:text-sm font-medium ${tab.id === 'settings' ? 'hidden md:block' : 'block'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content: Dashboard */}
      {activeTab === 'dashboard' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <MetricCard title="Ingresos Totales" value={`$${stats.totalRevenue.toLocaleString('es-AR')}`} trend="+12%" icon={<DollarSign className="text-emerald-400 w-6 h-6" />} color="emerald" />
            <MetricCard title="Entradas Vendidas" value={stats.totalTicketsSold.toString()} trend="+5%" icon={<Ticket className="text-indigo-400 w-6 h-6" />} color="indigo" />
            <MetricCard title="Eventos Activos" value={stats.activeEvents.toString()} trend="0%" icon={<Activity className="text-purple-400 w-6 h-6" />} color="purple" />
            <MetricCard title="Total Eventos" value={stats.totalEvents.toString()} trend="Real" icon={<CalendarIcon className="text-blue-400 w-6 h-6" />} color="blue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart Area */}
            <div className="lg:col-span-2 bg-neutral-900 border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h2 className="font-outfit text-xl font-bold">Ventas Semanales</h2>
                <select className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none text-white [&>option]:bg-neutral-900 cursor-pointer hover:bg-white/10 transition-colors">
                  <option>Esta semana</option>
                  <option>Este mes</option>
                </select>
              </div>
              
              {/* Fake Bar Chart */}
              <div className="h-64 flex items-end justify-between gap-3 relative z-10">
                {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                  <div key={i} className="w-full bg-white/5 rounded-t-lg group relative flex items-end transition-all hover:bg-white/10 cursor-crosshair">
                    <motion.div 
                      initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                      className="w-full bg-gradient-to-t from-indigo-600 to-purple-400 rounded-t-lg opacity-80 group-hover:opacity-100 transition-opacity relative"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {h}
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-xs font-medium text-neutral-500 relative z-10">
                <span>Lun</span><span>Mar</span><span>Mie</span><span>Jue</span><span>Vie</span><span>Sab</span><span>Dom</span>
              </div>
            </div>

            {/* Recent Sales List */}
            <div className="bg-neutral-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
              <h2 className="font-outfit text-xl font-bold mb-6">Últimas Ventas</h2>
              <div className="space-y-2">
                {[
                  { name: 'Martina Rossi', event: 'Fiesta Bresh', amount: '$15,000', time: '5 min' },
                  { name: 'Lucas Silva', event: 'Sunset Party', amount: '$5,000', time: '12 min' },
                  { name: 'Sofía Gomez', event: 'Fiesta Bresh', amount: '$30,000', time: '1 hr' },
                  { name: 'Juan Perez', event: 'Teatro Central', amount: '$8,500', time: '2 hrs' },
                ].map((sale, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-default border border-transparent hover:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-700 border border-white/10 flex items-center justify-center font-bold text-sm text-neutral-300">
                        {sale.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-white">{sale.name}</div>
                        <div className="text-xs text-neutral-500">{sale.event}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-emerald-400">{sale.amount}</div>
                      <div className="text-xs text-neutral-500">{sale.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-3 text-sm font-medium text-neutral-400 hover:text-white bg-white/[0.02] hover:bg-white/5 rounded-xl transition-colors">
                Ver todas las transacciones
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab Content: Staff & RPPs (Mock for UI Demo) */}
      {activeTab === 'staff' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="bg-neutral-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="font-outfit text-2xl font-bold">Gestión de Staff y RPPs</h2>
                <p className="text-sm text-neutral-400">Invita Scanners y Promotores a tus eventos.</p>
              </div>
              <button className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Enviar Invitación
              </button>
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-300">
                <thead className="bg-white/5 text-neutral-400 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-xl font-medium">Nombre / Email</th>
                    <th className="px-6 py-4 font-medium">Rol</th>
                    <th className="px-6 py-4 font-medium">Evento</th>
                    <th className="px-6 py-4 font-medium">Comisión</th>
                    <th className="px-6 py-4 font-medium">Deuda Pendiente</th>
                    <th className="px-6 py-4 rounded-tr-xl font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-medium text-white">Pedro Alvarez<br/><span className="text-xs text-neutral-500 font-normal">pedro@mail.com</span></td>
                    <td className="px-6 py-4"><span className="bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-md text-xs font-semibold">RPP</span></td>
                    <td className="px-6 py-4">Fiesta Bresh</td>
                    <td className="px-6 py-4">15%</td>
                    <td className="px-6 py-4 font-bold text-red-400">$45,000</td>
                    <td className="px-6 py-4"><span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-500/20">Activo</span></td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-medium text-white">Lucia Gomez<br/><span className="text-xs text-neutral-500 font-normal">lucia@mail.com</span></td>
                    <td className="px-6 py-4"><span className="bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-md text-xs font-semibold">SCANNER</span></td>
                    <td className="px-6 py-4">Sunset Party</td>
                    <td className="px-6 py-4 text-neutral-500">-</td>
                    <td className="px-6 py-4 text-neutral-500">-</td>
                    <td className="px-6 py-4"><span className="bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-500/20">Pendiente Inv.</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mercado Pago Modal */}
      <AnimatePresence>
        {showMpModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-neutral-900 border border-white/10 p-8 rounded-3xl w-full max-w-md relative shadow-2xl"
            >
              <button onClick={() => setShowMpModal(false)} className="absolute top-6 right-6 text-neutral-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                <Link2 className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-bold mb-2">Vincular Mercado Pago</h2>
              <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
                Pega aquí tu <strong>Access Token (Producción)</strong> de Mercado Pago Developers. El dinero de las entradas irá directamente a tu cuenta.
              </p>
              
              <input 
                type="text" 
                value={mpToken}
                onChange={(e) => setMpToken(e.target.value)}
                placeholder="APP_USR-..." 
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white mb-6 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
              />
              
              <button 
                onClick={handleSaveToken} 
                disabled={loading || !mpToken}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white py-4 rounded-2xl font-semibold transition-all active:scale-95"
              >
                {loading ? 'Verificando y Guardando...' : 'Guardar Token Seguro'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function MetricCard({ title, value, trend, icon, color }: { title: string, value: string, trend: string, icon: React.ReactNode, color: string }) {
  const isPositive = trend.startsWith('+');
  return (
    <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-all hover:-translate-y-1 shadow-xl">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-${color}-500/20 transition-colors`} />
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="p-3 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
          {icon}
        </div>
        <div className={`text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm ${isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-neutral-400 border border-white/10'}`}>
          {isPositive && <TrendingUp className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div className="relative z-10">
        <div className="text-sm font-medium text-neutral-400 mb-1">{title}</div>
        <div className="font-outfit text-4xl font-bold tracking-tight text-white">{value}</div>
      </div>
    </div>
  );
}
