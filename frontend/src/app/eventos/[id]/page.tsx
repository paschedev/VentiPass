"use client";

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Calendar, MapPin, Ticket, CreditCard, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/CustomSelect';

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?playsinline=1&rel=0` : null;
};

function EventContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rppFromUrl = searchParams.get('rpp');

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [selectedRpp, setSelectedRpp] = useState<string>(rppFromUrl || '');
  const [cart, setCart] = useState<Record<string, number>>({});

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

  const handleQuantityChange = (ticketTypeId: string, delta: number, maxStock: number) => {
    setCart(prev => {
      const current = prev[ticketTypeId] || 0;
      const next = current + delta;
      if (next < 0) return prev;
      if (next > maxStock) return prev;
      const newCart = { ...prev };
      if (next === 0) delete newCart[ticketTypeId];
      else newCart[ticketTypeId] = next;
      return newCart;
    });
  };

  const getTotalItems = () => Object.values(cart).reduce((a, b) => a + b, 0);

  const initiateCheckout = async (email?: string) => {
    const items = Object.entries(cart).map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
    if (items.length === 0) return toast.error('Selecciona al menos una entrada');
    
    setBuying(true);
    try {
      const userStr = localStorage.getItem('user');
      const payload: any = { items };

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
      
      if (response.ok && data.checkoutUrl) {
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

  const handleBuy = () => {
    const items = Object.entries(cart).map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
    if (items.length === 0) return toast.error('Selecciona al menos una entrada');

    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push(`/login?callbackUrl=/eventos/${id}`);
    } else {
      initiateCheckout();
    }
  };

  if (loading) return <div className="text-center py-20">Cargando...</div>;
  if (!event) return <div className="text-center py-20">Evento no encontrado</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="bg-black/40 border border-white/10 rounded-3xl overflow-hidden">
        <div className="h-64 md:h-96 bg-gradient-to-br from-indigo-900/60 to-purple-900/60 relative flex items-end p-8 md:p-12 overflow-hidden">
          {event.imageUrl && (
            <img src={event.imageUrl} alt={event.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
          )}
          <div className="absolute inset-0 bg-black/30 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="relative z-10 w-full">
            <div className="inline-block bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-white/20">
              {event.status === 'PUBLISHED' ? '🎫 Entradas a la venta' : 'Próximamente'}
            </div>
            <h1 className="font-outfit text-4xl md:text-6xl font-bold mb-4">{event.title}</h1>
          </div>
        </div>

        <div className="flex flex-col gap-12 p-8 md:p-12">
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold mb-4">Acerca del evento</h2>
              <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>
            
            {event.youtubeLink && getYouTubeEmbedUrl(event.youtubeLink) && (
              <div className="w-full aspect-video shadow-2xl shadow-indigo-500/10 relative z-20">
                <iframe
                  src={getYouTubeEmbedUrl(event.youtubeLink)!}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full rounded-2xl border border-white/5"
                ></iframe>
              </div>
            )}
            
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

          <div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
              <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><Ticket className="w-6 h-6 text-indigo-400"/> Comprar Entradas</h3>
              
              {/* RPP Selector */}
              <div className="mb-6 bg-black/40 p-4 rounded-xl border border-white/5">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  RPP (Opcional)
                </label>
                <CustomSelect 
                  value={selectedRpp} 
                  onChange={setSelectedRpp}
                  disabled={!!rppFromUrl}
                  placeholder="Seleccione un RPP..."
                  options={[
                    ...(rppFromUrl && !promoters.find(p => p.id === rppFromUrl) ? [{ value: rppFromUrl, label: 'Promotor Referido (Bloqueado)' }] : []),
                    ...promoters.map(p => ({ value: p.id, label: p.name }))
                  ]}
                />
                {rppFromUrl && (
                  <p className="text-[11px] text-emerald-400 mt-2 font-medium flex items-center gap-1">
                    ✓ Promotor fijado por link de invitación
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {(() => {
                  const activeBatches = (event.ticketBatches || []).filter((b: any) => {
                    if (b.status === 'PUBLISHED') {
                      if (b.publishAt && new Date(b.publishAt) > new Date()) return false;
                      if (b.closeAt && new Date(b.closeAt) < new Date()) return false;
                      return true;
                    }
                    if (b.status === 'SCHEDULED' && b.publishAt && new Date(b.publishAt) <= new Date()) return true;
                    return false;
                  });

                  if (activeBatches.length === 0) {
                    return <div className="text-center text-neutral-500 py-4">No hay entradas a la venta actualmente</div>;
                  }

                  return activeBatches.map((batch: any) => (
                    <div key={batch.id} className="mb-6 last:mb-0">
                      <h4 className="text-white font-bold mb-3 uppercase tracking-wide text-xs">{batch.name}</h4>
                      <div className="bg-black/40 border border-white/10 rounded-xl flex flex-col divide-y divide-white/5">
                        {batch.ticketTypes?.map((ticket: any) => {
                          const available = ticket.stock - ticket.sold;
                          const qty = cart[ticket.id] || 0;
                          return (
                            <div key={ticket.id} className="p-4 flex flex-col gap-3 hover:bg-white/[0.02] transition-colors first:rounded-t-xl last:rounded-b-xl">
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-white break-words">{ticket.name}</div>
                                  <div className="text-xs text-neutral-500">Disponibles: {available}</div>
                                </div>
                                <div className="font-bold text-lg text-emerald-400 shrink-0">${ticket.price}</div>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <div className="text-sm font-medium text-neutral-400">Cantidad</div>
                                <div className="flex items-center gap-3 bg-white/5 rounded-lg p-1">
                                  <button onClick={() => handleQuantityChange(ticket.id, -1, available)} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-md transition-colors disabled:opacity-50" disabled={qty <= 0}>-</button>
                                  <span className="w-6 text-center text-white font-bold">{qty}</span>
                                  <button onClick={() => handleQuantityChange(ticket.id, 1, available)} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-md transition-colors disabled:opacity-50" disabled={qty >= available}>+</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Checkout Button Global */}
              <div className="pt-4 mt-6 border-t border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-neutral-400">Total</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    ${(event.ticketBatches || []).flatMap((b: any) => b.ticketTypes || []).reduce((sum: number, t: any) => sum + (cart[t.id] || 0) * t.price, 0).toLocaleString('es-AR')}
                  </span>
                </div>
                <button 
                  onClick={handleBuy}
                  disabled={buying || getTotalItems() === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {buying ? 'Procesando...' : <><CreditCard className="w-5 h-5"/> Comprar {getTotalItems() > 0 ? `(${getTotalItems()})` : ''}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
