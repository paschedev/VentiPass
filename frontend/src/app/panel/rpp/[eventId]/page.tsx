"use client";

import { useParams, useRouter } from 'next/navigation';
import { DollarSign, Ticket, ArrowLeft, Users, Check, Link2, Download, Activity, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function RppEventDetailsPage() {
  const { eventId } = useParams();
  const router = useRouter();
  
  const [stats, setStats] = useState({ totalEarned: 0, totalTicketsSold: 0, conversionRate: 0, clicks: 0 });
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock Sales Data
  const recentSales = [
    { id: 1, buyer: 'Martina Rossi', ticket: 'Entrada General', price: 15000, commission: 2250, date: 'Hace 5 min' },
    { id: 2, buyer: 'Pedro Alvarez', ticket: 'VIP', price: 25000, commission: 3750, date: 'Hace 2 horas' },
    { id: 3, buyer: 'Lucia Gomez', ticket: 'Entrada General', price: 15000, commission: 2250, date: 'Ayer' },
    { id: 4, buyer: 'Carlos Diaz', ticket: 'Entrada General', price: 15000, commission: 2250, date: 'Hace 2 dias' },
    { id: 5, buyer: 'Maria Silva', ticket: 'VIP', price: 25000, commission: 3750, date: 'Hace 3 dias' },
    { id: 6, buyer: 'Juan Perez', ticket: 'Entrada General', price: 15000, commission: 2250, date: 'Hace 4 dias' },
  ];

  const filteredSales = recentSales.filter(sale => 
    sale.buyer.toLowerCase().includes(searchTerm.toLowerCase()) || 
    sale.ticket.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    // Simular fetch de metricas por evento
    setTimeout(() => {
      setStats({ totalEarned: 45000, totalTicketsSold: 150, conversionRate: 12.5, clicks: 1200 });
      setLoading(false);
    }, 500);
  }, [eventId]);

  const handleCopy = () => {
    const link = `https://entrypass.com.ar/e/${eventId}?rpp=mi_usuario_id`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('¡Enlace copiado!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) return <div className="text-center py-20 text-neutral-400">Cargando métricas...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 pt-8 pb-28 md:pb-8 flex flex-col md:h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-outfit text-3xl font-bold text-white mb-1">Métricas del Evento</h1>
            <p className="text-sm text-neutral-400">Fiesta Bresh - Edición Invierno</p>
          </div>
        </div>
        <button 
          onClick={handleCopy}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2"
        >
          {copiedLink ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          Copiar Link
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-emerald-400 text-sm font-medium">Dinero Generado</h3>
            <DollarSign className="w-5 h-5 text-emerald-400/50" />
          </div>
          <div className="text-3xl font-outfit font-bold text-emerald-400">${stats.totalEarned.toLocaleString('es-AR')}</div>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-indigo-400 text-sm font-medium">Tickets Vendidos</h3>
            <Ticket className="w-5 h-5 text-indigo-400/50" />
          </div>
          <div className="text-3xl font-outfit font-bold text-indigo-400">{stats.totalTicketsSold}</div>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-purple-400 text-sm font-medium">Visitas a tu link</h3>
            <Users className="w-5 h-5 text-purple-400/50" />
          </div>
          <div className="text-3xl font-outfit font-bold text-purple-400">{stats.clicks.toLocaleString('es-AR')}</div>
        </div>
        <div className="bg-pink-500/10 border border-pink-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-pink-400 text-sm font-medium">Tasa de Conversión</h3>
            <Activity className="w-5 h-5 text-pink-400/50" />
          </div>
          <div className="text-3xl font-outfit font-bold text-pink-400">{stats.conversionRate}%</div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col h-[550px] md:h-auto md:flex-1 md:min-h-0">
        <div className="shrink-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <h2 className="font-outfit text-xl font-bold">Registro de Ventas</h2>
            <button className="text-xs font-medium text-neutral-400 hover:text-white flex items-center gap-1 transition-colors">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>
          
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por comprador o ticket..." 
              className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors text-sm"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto overscroll-contain pr-2">
          {/* Desktop Table */}
          <table className="hidden md:table w-full text-left text-sm text-neutral-300 relative">
            <thead className="text-xs text-neutral-500 uppercase sticky top-0 bg-neutral-900 z-10 before:absolute before:inset-x-0 before:bottom-0 before:border-b before:border-white/5">
              <tr>
                <th className="py-4 font-medium bg-neutral-900">Comprador</th>
                <th className="py-4 font-medium bg-neutral-900">Ticket</th>
                <th className="py-4 font-medium text-right bg-neutral-900">Precio</th>
                <th className="py-4 font-medium text-right text-emerald-400 bg-neutral-900">Tu Comisión</th>
                <th className="py-4 font-medium text-right bg-neutral-900">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 font-medium text-white">{sale.buyer}</td>
                  <td className="py-4">{sale.ticket}</td>
                  <td className="py-4 text-right">${sale.price.toLocaleString('es-AR')}</td>
                  <td className="py-4 text-right font-bold text-emerald-400">+${sale.commission.toLocaleString('es-AR')}</td>
                  <td className="py-4 text-right text-neutral-500">{sale.date}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile List */}
          <div className="md:hidden flex flex-col gap-3">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-white">{sale.buyer}</span>
                  <span className="text-xs text-neutral-400 bg-black/40 px-2 py-1 rounded-full">{sale.date}</span>
                </div>
                <div className="flex justify-between items-end mt-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-neutral-500 uppercase font-medium">Ticket</span>
                    <span className="text-sm text-neutral-300">{sale.ticket}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-neutral-500">Total: ${sale.price.toLocaleString('es-AR')}</span>
                    <span className="text-sm font-bold text-emerald-400 mt-0.5">
                      Comisión: +${sale.commission.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredSales.length === 0 && (
            <div className="text-center py-10 text-neutral-500">No se encontraron ventas.</div>
          )}
        </div>
      </div>

    </div>
  );
}
