"use client";

import { useEffect, useState } from 'react';
import { Ticket, Users, TrendingUp, Calendar as CalendarIcon, MapPin, ExternalLink, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MisEventosPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      if (parsedUser.role !== 'ORGANIZER' && parsedUser.role !== 'ADMIN') {
        router.push('/panel/tickets');
        return;
      }
    }

    const fetchEvents = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events/organizer/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setEvents(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) {
    return <div className="text-center text-neutral-400 py-10">Cargando eventos...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-outfit text-3xl font-bold text-white mb-2">Mis Eventos</h1>
          <p className="text-neutral-400">Gestiona y analiza el rendimiento de tus eventos</p>
        </div>
        <Link href="/panel/eventos/nuevo" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95">
          <Plus className="w-5 h-5" /> Crear Evento
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Aún no tienes eventos</h3>
          <p className="text-neutral-400 mb-6">Crea tu primer evento y comienza a vender entradas ahora mismo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {events.map((event) => {
            let totalSold = 0;
            let totalCapacity = 0;
            let totalRevenue = 0;

            event.ticketTypes.forEach((tt: any) => {
              totalSold += tt.sold;
              totalCapacity += tt.stock;
              totalRevenue += tt.sold * Number(tt.price);
            });

            const percentSold = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;

            return (
              <div key={event.id} className="bg-black/40 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  {/* Info del evento */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                        event.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-400' :
                        event.status === 'DRAFT' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-white/10 text-neutral-400'
                      }`}>
                        {event.status === 'PUBLISHED' ? 'PUBLICADO' : event.status}
                      </span>
                      <span className="text-sm text-neutral-400">
                        {new Date(event.startDate).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className="font-outfit text-2xl font-bold text-white mb-2">{event.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-neutral-400 mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.venueName || 'Lugar por definir'}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Link href={`/organizar/eventos/${event.id}`} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Administrar
                      </Link>
                      <Link href={`/eventos/${event.id}`} target="_blank" className="flex items-center gap-2 bg-transparent border border-white/10 hover:bg-white/5 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Ver Página <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Estadísticas */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:w-1/2">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-neutral-400 mb-1 flex items-center gap-1"><Ticket className="w-3 h-3"/> Vendidas</div>
                      <div className="text-xl font-bold text-white">{totalSold} <span className="text-sm font-normal text-neutral-500">/ {totalCapacity}</span></div>
                      <div className="w-full bg-black/50 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${percentSold}%` }} />
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-xs text-neutral-400 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Ingresos</div>
                      <div className="text-xl font-bold text-emerald-400">${totalRevenue.toLocaleString('es-AR')}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 col-span-2 md:col-span-1">
                      <div className="text-xs text-neutral-400 mb-1 flex items-center gap-1"><Users className="w-3 h-3"/> Tipos de Entrada</div>
                      <div className="text-xl font-bold text-white">{event.ticketTypes.length}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
