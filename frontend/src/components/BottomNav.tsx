"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Ticket, Settings, Globe, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const hiddenRoutes = ['/', '/login', '/registro'];
  if (hiddenRoutes.includes(pathname)) return null;

  if (!user) return null;
  const isOrganizer = user.role === 'ORGANIZER' || user.role === 'ADMIN';

  const navItems = [
    { href: '/eventos', icon: Globe, label: 'Eventos' },
    ...(isOrganizer ? [{ href: '/panel', icon: LayoutDashboard, label: 'Métricas' }] : []),
    { href: '/panel/rpp', icon: Users, label: 'Panel RPP' },
    { href: '/panel/tickets', icon: Ticket, label: 'Tickets' },
    { href: '/panel/configuracion', icon: Settings, label: 'Ajustes' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[90] bg-black/90 backdrop-blur-xl border-t border-white/10 pb-safe">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/panel' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive ? 'text-indigo-400' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]' : ''} transition-all`} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
