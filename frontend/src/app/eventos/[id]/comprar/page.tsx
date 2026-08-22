"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Ticket, AlertCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '@/utils/api';
import toast from 'react-hot-toast';

const ENTRYPASS_FEE_PERCENTAGE = 0.15; // 15% recargo

export default function CheckoutPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ticketSelections, setTicketSelections] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await apiFetch(`/events/${id}`);
        if (res.ok) {
          const data = await res.json();
          setEvent(data);
          
          // Inicializar conteos
          const initialSelections: Record<string, number> = {};
          data.ticketTypes.forEach((tt: any) => {
            initialSelections[tt.id] = 0;
          });
          setTicketSelections(initialSelections);
        } else {
          toast.error('Evento no encontrado');
          router.push('/eventos');
        }
      } catch (e) {
        toast.error('Error al cargar el evento');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvent();
  }, [id, router]);

  const handleIncrement = (ttId: string, limit: number) => {
    setTicketSelections(prev => {
      const current = prev[ttId] || 0;
      if (current >= Math.min(10, limit)) return prev; // Max 10 per order or stock limit
      return { ...prev, [ttId]: current + 1 };
    });
  };

  const handleDecrement = (ttId: string) => {
    setTicketSelections(prev => {
      const current = prev[ttId] || 0;
      if (current <= 0) return prev;
      return { ...prev, [ttId]: current - 1 };
    });
  };

  const calculateTotals = () => {
    if (!event) return { subtotal: 0, serviceFee: 0, total: 0, ticketsCount: 0 };
    
    let subtotal = 0;
    let ticketsCount = 0;
    
    event.ticketTypes.forEach((tt: any) => {
      const count = ticketSelections[tt.id] || 0;
      subtotal += count * Number(tt.price);
      ticketsCount += count;
    });
    
    const serviceFee = subtotal * ENTRYPASS_FEE_PERCENTAGE;
    return { 
      subtotal, 
      serviceFee, 
      total: subtotal + serviceFee,
      ticketsCount 
    };
  };

  const handleCheckout = async () => {
    const { ticketsCount } = calculateTotals();
    if (ticketsCount === 0) return toast.error('Selecciona al menos una entrada');
    
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Debes iniciar sesión para comprar');
      router.push('/login');
      return;
    }

    setIsProcessing(true);
    try {
      const orderItems = Object.entries(ticketSelections)
        .filter(([_, qty]) => qty > 0)
        .map(([ttId, qty]) => ({ ticketTypeId: ttId, quantity: qty }));

      // Phase 2: Llamada al backend POST /orders
      toast.success('Orden creada (MVP Mock)');
      setTimeout(() => router.push('/panel/tickets'), 1500);
      
    } catch (e) {
      toast.error('Ocurrió un error al procesar tu orden');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
        <p>Cargando checkout...</p>
      </div>
    );
  }

  if (!event) return null;

  const { subtotal, serviceFee, total, ticketsCount } = calculateTotals();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 pb-32">
      <button 
        onClick={() => router.back()} 
        className="mb-8 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors w-fit group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Volver al evento
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Selección de Entradas */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="font-outfit text-3xl font-bold text-white mb-2">Comprar Entradas</h1>
            <p className="text-neutral-400">{event.title}</p>
          </div>

          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
            {event.ticketTypes.map((tt: any) => {
              const count = ticketSelections[tt.id] || 0;
              const isSoldOut = tt.capacity - tt.sold <= 0;
              
              return (
                <div key={tt.id} className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border ${isSoldOut ? 'bg-black/50 border-red-500/10' : 'bg-white/5 border-white/10 hover:border-indigo-500/30 transition-colors'}`}>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {tt.name}
                      {isSoldOut && <span className="bg-red-500/10 text-red-400 text-[10px] uppercase px-2 py-0.5 rounded font-bold">Agotado</span>}
                    </h3>
                    <p className="text-sm text-neutral-400 mb-2">{tt.description || 'Sin descripción'}</p>
                    <div className="text-xl font-bold text-emerald-400">${Number(tt.price).toLocaleString('es-AR')}</div>
                  </div>
                  
                  <div className="flex items-center bg-black/50 rounded-xl border border-white/10 p-1 w-fit self-end md:self-auto">
                    <button 
                      onClick={() => handleDecrement(tt.id)}
                      disabled={count === 0 || isSoldOut}
                      className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
                    >-</button>
                    <span className="w-12 text-center font-bold text-lg">{count}</span>
                    <button 
                      onClick={() => handleIncrement(tt.id, tt.capacity - tt.sold)}
                      disabled={count >= 10 || isSoldOut}
                      className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen de Compra */}
        <div className="lg:col-span-1">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 md:p-8 sticky top-8">
            <h3 className="font-outfit text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-indigo-400" /> Resumen
            </h3>

            {ticketsCount === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-sm">
                Selecciona entradas para ver el resumen
              </div>
            ) : (
              <div className="space-y-4 text-sm animate-in fade-in">
                {event.ticketTypes.map((tt: any) => {
                  const count = ticketSelections[tt.id] || 0;
                  if (count === 0) return null;
                  return (
                    <div key={tt.id} className="flex justify-between text-neutral-300">
                      <span>{count}x {tt.name}</span>
                      <span>${(count * Number(tt.price)).toLocaleString('es-AR')}</span>
                    </div>
                  );
                })}
                
                <div className="border-t border-white/10 pt-4 flex justify-between text-neutral-400">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString('es-AR')}</span>
                </div>
                
                <div className="flex justify-between text-neutral-400">
                  <span className="flex items-center gap-1">Cargo por servicio <AlertCircle className="w-3 h-3" /></span>
                  <span>${serviceFee.toLocaleString('es-AR')}</span>
                </div>

                <div className="border-t border-white/10 pt-4 mt-4">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-lg text-white font-medium">Total</span>
                    <span className="text-2xl font-bold text-emerald-400">${total.toLocaleString('es-AR')}</span>
                  </div>

                  <button 
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold text-lg transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continuar al pago'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
