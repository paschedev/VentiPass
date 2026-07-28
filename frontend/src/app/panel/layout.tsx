"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    setMounted(true);
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      setAuthorized(false);
      if (pathname && pathname.startsWith('/panel')) {
        router.replace('/login');
      }
    } else {
      setAuthorized(true);
    }
  }, [pathname, router]);

  if (!mounted) {
    return <div className="h-full bg-neutral-950 flex items-center justify-center text-white">Verificando accesos...</div>;
  }

  if (!authorized) {
    if (pathname && !pathname.startsWith('/panel')) {
      return <>{children}</>;
    }
    return <div className="h-full bg-neutral-950 flex items-center justify-center text-white">Verificando accesos...</div>;
  }

  return <>{children}</>;
}
