"use client";

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Calendar, MapPin, Ticket, CreditCard, Users } from 'lucide-react';
import toast from 'react-hot-toast';

function EventContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rppFromUrl = searchParams.get('rpp');

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedRpp, setSelectedRpp] = useState<string>(rppFromUrl || '');

  // Mock promoters para la UI de Phase 6
  const promoters = [
    { id: 'usr_1', name: 'Martina Rossi' },
    { id: 'usr_2', name: 'Pedro Alvarez' }
  ];

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events/${id}`)
      .then(res => res.json())
      .then(data => {
        setEvent(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const initiateCheckout = async (ticketTypeId: string, email?: string) => {
    setBuying(true);
    try {
      const userStr = localStorage.getItem('user');
      const payload: any = {
        items: [{ ticketTypeId, quantity: 1 }]
      };

      if (userStr) {
        payload.userId = JSON.parse(userStr).id;
      } else if (email) {
        payload.guestEmail = email;
      } else {
        throw new Error("No user or email provided");
      }

      if (selectedRpp) {
        payload.promoterId = selectedRpp;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/orders/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userStr && { 'Authorization': `Bearer ${localStorage.getItem('token')}` })
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok && data.checkoutUrl) { // checkoutUrl is returned by backend now
        window.location.href = data.checkoutUrl;
      } else {
        toast.error(data.message || 'Error al iniciar el pago');
        setBuying(false);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de conexión');
      setBuying(false);
    }
  };

  const handleBuy = (ticketTypeId: string) => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      setSelectedTicketId(ticketTypeId);
      setShowGuestModal(true);
    } else {
      initiateCheckout(ticketTypeId);
    }
  };

  const handleGuestConfirm = () => {
    if (!guestEmail || !guestEmail.includes('@')) {
      toast.error('Por favor ingresa un correo válido');
      return;
    }
    setShowGuestModal(false);
    if (selectedTicketId) {
      initiateCheckout(selectedTicketId, guestEmail);
    }
  };

  if (loading) return <div className="text-center py-20">Cargando...</div>;
  if (!event) return <div className="text-center py-20">Evento no encontrado</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="bg-black/40 border border-white/10 rounded-3xl overflow-hidden">
        <div className="h-64 md:h-96 bg-gradient-to-br from-indigo-900/60 to-purple-900/60 relative flex items-end p-8 md:p-12">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 w-full">
            <div className="inline-block bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-white/20">
              {event.status === 'PUBLISHED' ? '🎫 Entradas a la venta' : 'Próximamente'}
            </div>
            <h1 className="font-outfit text-4xl md:text-6xl font-bold mb-4">{event.title}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 md:p-12">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-xl font-bold mb-4">Acerca del evento</h2>
              <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 rounded-2xl p-6 border border-white/5">
              <div>
                <div className="flex items-center gap-3 text-indigo-400 mb-2 font-medium">
                  <Calendar className="w-5 h-5" /> Fecha y Hora
                </div>
                <div className="text-white">
                  {new Date(event.startDate).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="text-neutral-400 text-sm mt-1">
                  {new Date(event.startDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 text-emerald-400 mb-2 font-medium">
                  <MapPin className="w-5 h-5" /> Ubicación
                </div>
                <div className="text-white">{event.venueName}</div>
                <div className="text-neutral-400 text-sm mt-1">{event.venueAddress}</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sticky top-24 shadow-2xl">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Ticket className="w-5 h-5 text-indigo-400"/> Comprar Entradas</h3>
              
              {/* RPP Selector */}
              <div className="mb-6 bg-black/40 p-4 rounded-xl border border-white/5">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  RPP (Opcional)
                </label>
                <select 
                  value={selectedRpp} 
                  onChange={(e) => setSelectedRpp(e.target.value)}
                  disabled={!!rppFromUrl}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed appearance-none [&>option]:bg-neutral-900"
                >
                  <option value="">Seleccione un RPP...</option>
                  {rppFromUrl && !promoters.find(p => p.id === rppFromUrl) && (
                    <option value={rppFromUrl}>Promotor Referido (Bloqueado)</option>
                  )}
                  {promoters.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {rppFromUrl && (
                  <p className="text-[11px] text-emerald-400 mt-2 font-medium flex items-center gap-1">
                    ✓ Promotor fijado por link de invitación
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {event.ticketTypes && event.ticketTypes.length > 0 ? (
                  event.ticketTypes.map((ticket: any) => (
                    <div key={ticket.id} className="bg-black/40 border border-white/10 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-white">{ticket.name}</div>
                        <div className="font-bold text-lg text-emerald-400">${ticket.price}</div>
                      </div>
                      <div className="text-xs text-neutral-500 mb-4">
                        Disponibles: {ticket.stock - ticket.sold}
                      </div>
                      <button 
                        onClick={() => handleBuy(ticket.id)}
                        disabled={buying || ticket.stock - ticket.sold <= 0}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {buying ? 'Procesando...' : <><CreditCard className="w-4 h-4"/> Comprar ahora</>}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-neutral-500 py-4">No hay entradas configuradas</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showGuestModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-white/10 p-6 rounded-2xl w-full max-w-md relative">
            <h2 className="text-xl font-bold mb-4">Comprar como invitado</h2>
            <p className="text-sm text-neutral-400 mb-6">
              Ingresa tu correo electrónico para recibir las entradas. <br/>
              <span className="text-amber-400 font-medium">⚠️ Asegúrate de escribirlo correctamente, ya que los tickets se enviarán allí. Si lo escribes mal, podrías perder tu compra.</span>
            </p>
            <input 
              type="email" 
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="tu@correo.com" 
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white mb-6 focus:border-indigo-500 outline-none"
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setShowGuestModal(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleGuestConfirm} 
                disabled={!guestEmail}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Continuar al Pago
              </button>
            </div>
            <div className="mt-4 text-center">
              <p className="text-xs text-neutral-500">
                ¿Prefieres crear una cuenta para gestionar tus entradas más fácil? 
                <button onClick={() => router.push(`/registro?callbackUrl=/eventos/${id}`)} className="text-indigo-400 hover:text-indigo-300 ml-1">Regístrate</button>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EventoDetallePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-white">Cargando evento...</div>}>
      <EventContent />
    </Suspense>
  );
}
