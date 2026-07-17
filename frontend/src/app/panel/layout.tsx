"use client";

import { LayoutDashboard, Ticket, Settings, LogOut, Plus, Menu, ChevronLeft, CalendarRange, Globe, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [authorized, setAuthorized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Abrir sidebar por defecto en desktop
  useEffect(() => {
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }
  }, []);

  // Cerrar sidebar en mobile al cambiar de ruta
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.replace('/login');
      return;
    }
    const parsedUser = JSON.parse(userStr);
    setUser(parsedUser);
    setAuthorized(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  if (!authorized || !user) return <div className="h-screen bg-neutral-950 flex items-center justify-center text-white">Verificando accesos...</div>;

  const isOrganizer = user.role === 'ORGANIZER' || user.role === 'ADMIN';

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

  return (
    <div className="flex h-screen pt-16 bg-neutral-950 text-neutral-50 overflow-hidden relative">
      {/* Botón flotante para abrir sidebar en mobile (ya que no hay header) */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className={`md:hidden absolute top-4 left-4 z-40 bg-black/80 backdrop-blur border border-white/10 p-2 rounded-xl text-white ${isSidebarOpen ? 'hidden' : 'block'}`}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar (Oculto en Mobile) */}
      <aside 
        className={`border-r border-white/10 bg-black/50 backdrop-blur-xl transition-all duration-300 ease-in-out relative z-50 h-full hidden md:flex flex-col ${
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
          <div className={`text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4 mt-2 px-2 transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
            Navegación
          </div>
          
          <NavItem href="/eventos" icon={Globe} label="Eventos Públicos" show={true} />
          <NavItem href="/panel" icon={LayoutDashboard} label="Métricas" show={isOrganizer} />
          <NavItem href="/panel/eventos" icon={CalendarRange} label="Mis Eventos" show={isOrganizer} />
          <NavItem href="/panel/rpp" icon={Users} label="Panel RPP" show={true} />
          <NavItem href="/panel/tickets" icon={Ticket} label="Tickets" show={true} />
          <NavItem href="/panel/configuracion" icon={Settings} label="Configuración" show={true} />
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={() => setShowLogoutConfirm(true)} 
            title={!isSidebarOpen ? 'Cerrar sesión' : undefined}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 font-medium transition-colors overflow-hidden whitespace-nowrap cursor-pointer"
          >
            <LogOut className="w-6 h-6 shrink-0" />
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 pb-24 md:p-8 relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px] -z-10 pointer-events-none" />
          {children}
        </main>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
          <div className="bg-neutral-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm relative shadow-2xl">
            <h2 className="text-xl font-bold mb-2">Cerrar Sesión</h2>
            <p className="text-sm text-neutral-400 mb-6">
              ¿Estás seguro que deseas cerrar sesión y salir del panel?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowLogoutConfirm(false)} 
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={handleLogout} 
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-medium transition-colors cursor-pointer"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
