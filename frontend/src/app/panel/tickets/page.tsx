"use client";

import { useEffect, useState } from 'react';
import { Ticket as TicketIcon, Calendar, MapPin, X, ArrowRightLeft, Eye, EyeOff } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

export default function MisEntradasPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [qrRevealed, setQrRevealed] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const fetchTickets = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/tickets/my-tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // TODO: REMOVE FAKE TICKETS BEFORE PROD
        if (data.length === 0) {
          data.push({
            id: 'fake-tkt-1234-abcd',
            qrCode: 'we-pass-valid-qr-123',
            status: 'VALID',
            ticketType: {
              name: 'General VIP',
              event: {
                title: 'Fiesta Sunset Bresh',
                startDate: new Date(Date.now() + 86400000).toISOString(), // Mañana
                venueName: 'Complejo Art Media'
              }
            }
          });
        }
        setTickets(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const openTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setQrRevealed(false);
    setShowTransfer(false);
    setSearchTerm('');
    setSelectedUser(null);
  };

  const closeTicket = () => {
    setSelectedTicket(null);
  };

  useEffect(() => {
    if (searchTerm.length >= 3) {
      const delayFn = setTimeout(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/users/search?q=${searchTerm}`)
          .then(res => res.ok ? res.json() : [])
          .then(data => setSearchResults(data))
          .catch(() => {});
      }, 300);
      return () => clearTimeout(delayFn);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const handleTransfer = async () => {
    if (!selectedUser) return;
    setTransferring(true);
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/tickets/${selectedTicket.id}/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ targetEmail: selectedUser.email })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Entrada transferida con éxito');
        closeTicket();
        fetchTickets(); // Refresh list
      } else {
        toast.error(data.message || 'Error al transferir');
      }
    } catch (e) {
      toast.error('Error de conexión');
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-400">Cargando tus entradas...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pt-24">
      <h1 className="font-outfit text-4xl font-bold text-white mb-2">Mis Entradas</h1>
      <p className="text-neutral-400 mb-10">Tus accesos a los mejores eventos.</p>

      {tickets.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <TicketIcon className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No tienes entradas</h3>
          <p className="text-neutral-400">Aún no has comprado entradas para ningún evento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tickets.map((ticket) => (
            <div 
              key={ticket.id} 
              onClick={() => openTicket(ticket)}
              className="group bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden cursor-pointer hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-white tracking-wide">
                    {ticket.ticketType.name}
                  </div>
                  {ticket.status === 'VALID' ? (
                    <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
                      VÁLIDA
                    </div>
                  ) : (
                    <div className="bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-500/20">
                      UTILIZADA
                    </div>
                  )}
                </div>

                <h3 className="font-outfit text-2xl font-bold text-white mb-4 line-clamp-2">
                  {ticket.ticketType.event.title}
                </h3>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-neutral-400">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    {new Date(ticket.ticketType.event.startDate).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-neutral-400">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    {ticket.ticketType.event.venueName || 'Lugar por definir'}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 border-dashed flex items-center justify-between">
                  <div className="text-xs text-neutral-500 font-mono">ID: {ticket.id.slice(-8).toUpperCase()}</div>
                  <div className="text-sm font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors flex items-center gap-1">
                    Ver Entrada <ArrowRightLeft className="w-3 h-3 opacity-0 group-hover:opacity-100 -ml-4 group-hover:ml-1 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal del Ticket */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-[2rem] w-full max-w-md relative overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header del Ticket Modal */}
            <div className="p-6 pb-0 flex justify-between items-start shrink-0">
              <div className="bg-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-xs font-bold border border-indigo-500/30">
                {selectedTicket.ticketType.name.toUpperCase()}
              </div>
              <button onClick={closeTicket} className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-8 overflow-y-auto">
              <div className="text-center mb-8">
                <h2 className="font-outfit text-2xl font-bold text-white mb-2">{selectedTicket.ticketType.event.title}</h2>
                <p className="text-neutral-400 text-sm">
                  {new Date(selectedTicket.ticketType.event.startDate).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Zona del QR */}
              <div className="bg-white rounded-[2rem] p-6 mb-8 mx-auto w-64 relative group">
                <div className={`transition-all duration-500 ${!qrRevealed ? 'blur-md brightness-50' : ''}`}>
                  <QRCodeSVG 
                    value={selectedTicket.qrCode} 
                    size={208} 
                    level="H"
                    includeMargin={false}
                    className="w-full h-auto"
                  />
                </div>
                
                {!qrRevealed && (
                  <div 
                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer text-neutral-900 hover:scale-105 transition-transform"
                    onClick={() => setQrRevealed(true)}
                  >
                    <Eye className="w-10 h-10 mb-2 drop-shadow-md" />
                    <span className="font-bold text-sm drop-shadow-md bg-white/80 px-3 py-1 rounded-full">Toca para revelar</span>
                  </div>
                )}
                
                {qrRevealed && (
                  <button 
                    onClick={() => setQrRevealed(false)}
                    className="absolute -bottom-4 -right-4 bg-neutral-900 text-white p-3 rounded-full border border-white/10 shadow-xl hover:bg-neutral-800 transition-colors"
                  >
                    <EyeOff className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="text-center font-mono text-neutral-500 text-sm tracking-widest mb-8">
                {selectedTicket.qrCode.split('-')[0].toUpperCase()}
              </div>

              {/* Acciones */}
              {selectedTicket.status === 'VALID' && (
                <div className="border-t border-white/10 pt-6">
                  {!showTransfer ? (
                    <button 
                      onClick={() => setShowTransfer(true)}
                      className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-medium bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                      <ArrowRightLeft className="w-5 h-5" />
                      Transferir Entrada
                    </button>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                      <p className="text-sm text-neutral-400">Ingresa el email o usuario al que deseas transferir esta entrada.</p>
                      
                      {!selectedUser ? (
                        <div className="relative">
                          <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar usuario o email..."
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-colors"
                          />
                          {searchResults.length > 0 && (
                            <div className="absolute top-full mt-2 left-0 right-0 bg-neutral-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10 max-h-48 overflow-y-auto">
                              {searchResults.map(u => (
                                <button
                                  key={u.id}
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setSearchTerm('');
                                    setSearchResults([]);
                                  }}
                                  className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center justify-between transition-colors border-b border-white/5 last:border-0"
                                >
                                  <div>
                                    <div className="text-white font-medium text-sm">{u.name}</div>
                                    <div className="text-neutral-400 text-xs">{u.email}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 px-4">
                          <div>
                            <div className="text-white font-medium text-sm">{selectedUser.name}</div>
                            <div className="text-neutral-400 text-xs">{selectedUser.email}</div>
                          </div>
                          <button 
                            onClick={() => setSelectedUser(null)}
                            className="text-neutral-500 hover:text-red-400 p-2 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button 
                          onClick={() => {
                            setShowTransfer(false);
                            setSelectedUser(null);
                          }}
                          className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={handleTransfer}
                          disabled={!selectedUser || transferring}
                          className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all active:scale-95 disabled:opacity-50"
                        >
                          {transferring ? 'Transfiriendo...' : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
