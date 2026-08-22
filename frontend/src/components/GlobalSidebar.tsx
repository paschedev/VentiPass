"use client";

import { LayoutDashboard, Ticket, Settings, LogOut, Menu, ChevronLeft, CalendarRange, Globe, Users, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function GlobalSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, [pathname]);

  if (!mounted) return null;

  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
  const canScan = isOrganizer || user?.role === 'SCANNER';
  const isLoggedIn = !!user;

  const NavItem = ({ href, icon: Icon, label, show }: { href: string, icon: any, label: string, show: boolean }) => {
    if (!show) return null;
    const isActive = pathname === href;
    return (
      <Link 
        href={href} 
        title={!isSidebarOpen ? label : undefined}
        className={`flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-colors overflow-hidden whitespace-nowrap ${
          isActive 
            ? 'bg-indigo-500/10 text-indigo-400' 
            : 'text-neutral-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Icon className="w-6 h-6 shrink-0" />
        <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
          {label}
        </span>
      </Link>
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <>
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className={`md:hidden absolute top-4 left-4 z-40 bg-black/80 backdrop-blur border border-white/10 p-2 rounded-xl text-white ${isSidebarOpen ? 'hidden' : 'block'}`}
      >
        <Menu className="w-5 h-5" />
      </button>

      <aside 
        className={`border-r border-white/10 bg-black/50 backdrop-blur-xl transition-all duration-300 ease-in-out relative z-50 h-[calc(100vh-4rem)] sticky top-16 hidden md:flex flex-col ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-4 top-6 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center z-50 text-white hover:bg-indigo-500 hover:scale-110 transition-all cursor-pointer shadow-lg shadow-black/50 hidden md:flex"
        >
          <ChevronLeft className={`w-5 h-5 transition-transform ${!isSidebarOpen && 'rotate-180'}`} />
        </button>

        <div className="h-16 md:hidden flex items-center px-6 border-b border-white/10 shrink-0">
          <span className="font-outfit text-xl font-bold">Menú</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          <div className={`text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4 mt-2 px-2 transition-opacity whitespace-nowrap overflow-hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 select-none'}`}>
            Navegación
          </div>
          
          <NavItem href="/eventos" icon={Globe} label="Eventos Públicos" show={true} />
          
          {isLoggedIn ? (
            <>
              <NavItem href="/panel" icon={CalendarRange} label="Organización" show={isOrganizer} />
              <NavItem href="/panel/rpp" icon={Users} label="Panel RPP" show={true} />
              <NavItem href="/panel/tickets" icon={Ticket} label="Tickets" show={true} />
              <NavItem href="/panel/escanear" icon={ScanLine} label="Escanear Entradas" show={canScan} />
              <NavItem href="/panel/configuracion" icon={Settings} label="Configuración" show={true} />
            </>
          ) : (
            <>
              <div className={`mt-8 mb-4 border-t border-white/10 pt-4 px-2 transition-opacity whitespace-nowrap overflow-hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 select-none'}`}>
                 <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Cuenta</span>
              </div>
              <NavItem href="/login" icon={LogOut} label="Iniciar Sesión" show={true} />
              <NavItem href="/registro" icon={Users} label="Registrarse" show={true} />
            </>
          )}
        </nav>

        {isLoggedIn && (
          <div className="p-4 border-t border-white/10">
            <button 
              onClick={() => setShowLogoutConfirm(true)} 
              title={!isSidebarOpen ? 'Cerrar sesión' : undefined}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 font-medium transition-colors overflow-hidden whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-6 h-6 shrink-0" />
              <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 select-none'}`}>
                Cerrar sesión
              </span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
