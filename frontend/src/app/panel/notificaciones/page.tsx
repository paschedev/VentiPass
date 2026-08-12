"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X, Trash2, CheckCircle2, UserPlus, Zap } from 'lucide-react';

type Notification = {
  id: string;
  type: 'REQUEST' | 'INFO' | 'ALERT';
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const mockNotifications: Notification[] = [];

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [showOnlyRequests, setShowOnlyRequests] = useState(false);

  const filteredNotifications = notifications.filter(n => 
    showOnlyRequests ? n.type === 'REQUEST' : true
  );

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleRequest = (id: string, action: 'accept' | 'reject') => {
    // Aquí iría la llamada al backend
    deleteNotification(id);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="font-outfit text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Bell className="w-8 h-8 text-indigo-400" />
            Notificaciones
          </h1>
          <p className="text-neutral-400">Historial completo y solicitudes pendientes.</p>
        </div>

        {/* Toggle Violáceo WePass */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl">
          <span className={`text-sm font-medium ${!showOnlyRequests ? 'text-white' : 'text-neutral-500'}`}>Todas</span>
          <button 
            onClick={() => setShowOnlyRequests(!showOnlyRequests)}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${showOnlyRequests ? 'bg-purple-600' : 'bg-neutral-600'}`}
          >
            <motion.div 
              className="w-4 h-4 bg-white rounded-full shadow-md"
              animate={{ x: showOnlyRequests ? 24 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={`text-sm font-medium ${showOnlyRequests ? 'text-purple-300' : 'text-neutral-500'}`}>Solo Solicitudes</span>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {filteredNotifications.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl"
            >
              <Bell className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <p className="text-neutral-400">No hay notificaciones para mostrar.</p>
            </motion.div>
          ) : (
            filteredNotifications.map((n) => (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                className={`p-5 rounded-2xl border transition-colors relative overflow-hidden group ${
                  n.read ? 'bg-white/[0.02] border-white/5' : 'bg-black/40 border-white/10 shadow-lg'
                }`}
              >
                {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                
                <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-start">
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      n.type === 'REQUEST' ? 'bg-purple-500/20 text-purple-400' : 
                      n.type === 'ALERT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {n.type === 'REQUEST' ? <UserPlus className="w-5 h-5" /> : 
                       n.type === 'ALERT' ? <Zap className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${n.read ? 'text-neutral-300' : 'text-white'}`}>{n.title}</h3>
                      <p className="text-sm text-neutral-400 mt-1">{n.message}</p>
                      <span className="text-xs text-neutral-500 mt-3 block">{n.time}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 sm:flex-col items-end sm:shrink-0 mt-4 sm:mt-0">
                    {n.type === 'REQUEST' ? (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => handleRequest(n.id, 'accept')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                        >
                          <Check className="w-4 h-4" /> Aceptar
                        </button>
                        <button 
                          onClick={() => handleRequest(n.id, 'reject')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 text-neutral-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                        >
                          <X className="w-4 h-4" /> Rechazar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {!n.read && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            title="Marcar como leída"
                            className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-xl transition-colors"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteNotification(n.id)}
                          title="Eliminar"
                          className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors md:opacity-0 md:group-hover:opacity-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
