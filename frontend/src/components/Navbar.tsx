"use client";

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, LogOut, LayoutDashboard, User as UserIcon, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();

  // Mocks de notificaciones para UI/UX visual (se conectará al backend luego)
  const notifications = [
    { id: 1, type: 'INVITE', text: 'El organizador "Bresh" te ofrece 15% de comisión.', time: 'Hace 5 min' },
    { id: 2, type: 'ALERT', text: 'Tu lote "Preventa" se activará mañana a las 10:00.', time: 'Hace 2 horas' },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    } else {
      setUser(null);
    }
    // Cerrar modales al cambiar de ruta
    setShowProfile(false);
    setShowNotifications(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.replace('/');
  };

  return (
    <header className="fixed top-0 z-[100] w-full border-b border-white/5 bg-black/40 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="hidden md:block font-outfit text-2xl font-black tracking-tighter text-white hover:opacity-80 transition-opacity">
            We<span className="text-indigo-500">Pass</span>
          </Link>
          <div className="md:hidden font-outfit text-2xl font-black tracking-tighter text-white select-none">
            We<span className="text-indigo-500">Pass</span>
          </div>
        </div>
        
        <nav className="flex gap-4 items-center">
          <Link href="/eventos" className="hidden md:block text-sm font-medium text-neutral-400 hover:text-white transition-colors">
            Descubrir Eventos
          </Link>
          {isMounted && user && (
            <Link href="/panel" className="hidden md:block text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">
              Mi Panel
            </Link>
          )}
          <div className="hidden md:block w-px h-4 bg-white/10 mx-2" />
          
          {isMounted && user ? (
              <div className="flex items-center gap-4 md:gap-6">
                
                {/* Notifications Bell */}
                <div className="relative" ref={notifRef}>
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                  </button>
                  
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute -right-12 sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden origin-top-right z-50"
                      >
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                          <h3 className="font-semibold text-sm">Notificaciones</h3>
                          <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">2 nuevas</span>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                          {notifications.map(n => (
                            <div key={n.id} className="p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group">
                              <p className="text-sm text-neutral-300 group-hover:text-white transition-colors">{n.text}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-neutral-500">{n.time}</span>
                                {n.type === 'INVITE' && (
                                  <div className="flex gap-2">
                                    <button className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500 hover:text-white transition-colors">Aceptar</button>
                                    <button className="text-xs bg-white/5 text-neutral-400 px-2 py-1 rounded hover:bg-white/10 transition-colors">Rechazar</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Link href="/panel/notificaciones" className="block w-full p-3 text-center text-xs text-neutral-400 hover:text-white hover:bg-white/5 transition-colors">
                          Ver todas
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button 
                    onClick={() => setShowProfile(!showProfile)}
                    className="flex items-center gap-3 pl-1 pr-1 md:pl-2 py-1 rounded-full hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                  >
                    <span className="hidden md:block text-sm font-medium text-neutral-200">{user.name.split(' ')[0]}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs shadow-inner border border-white/20">
                      {user.name.charAt(0)}
                    </div>
                  </button>

                  <AnimatePresence>
                    {showProfile && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-44 md:w-56 bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden origin-top-right p-1 z-50"
                      >
                        <div className="px-3 py-2 md:py-3 border-b border-white/5 mb-1">
                          <p className="text-sm font-medium text-white">{user.name}</p>
                          <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                        </div>
                        
                        <Link href="/panel" className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                          <LayoutDashboard className="w-4 h-4" /> Mi Panel
                        </Link>
                        <Link href="/panel/perfil" className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                          <UserIcon className="w-4 h-4" /> Perfil
                        </Link>
                        
                        <div className="h-px w-full bg-white/5 my-1" />

                        <a href="mailto:paschedev@gmail.com" className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors w-full text-left">
                          <HelpCircle className="w-4 h-4" /> Soporte
                        </a>
                        
                        <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors w-full text-left">
                          <LogOut className="w-4 h-4" /> Cerrar sesión
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
          ) : (
              <div className="flex items-center gap-2 md:gap-4">
                <Link href="/login" className="text-sm font-medium text-neutral-300 hover:text-white px-2 py-2 transition-colors">Ingresar</Link>
                <Link href="/registro" className="text-sm font-medium bg-white text-black px-4 md:px-5 py-2 rounded-full hover:bg-neutral-200 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10">
                  <span className="md:hidden">Registro</span>
                  <span className="hidden md:inline">Crear cuenta</span>
                </Link>
              </div>
          )}
        </nav>
      </div>
    </header>
  );
}
