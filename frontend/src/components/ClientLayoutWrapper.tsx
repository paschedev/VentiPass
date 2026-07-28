"use client";

import { usePathname } from 'next/navigation';
import GlobalSidebar from './GlobalSidebar';
import toast from 'react-hot-toast';

// Evitar múltiples popups iguales o spam de popups aplicando un ID global
if (typeof window !== 'undefined') {
  const originalError = toast.error;
  toast.error = (msg: any, opts?: any) => originalError(msg, { id: typeof msg === 'string' ? msg : 'global-error', ...opts });
  
  const originalSuccess = toast.success;
  toast.success = (msg: any, opts?: any) => originalSuccess(msg, { id: typeof msg === 'string' ? msg : 'global-success', ...opts });
}

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hiddenRoutes = ['/', '/login', '/registro'];
  
  if (hiddenRoutes.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen pt-16 bg-neutral-950 text-neutral-50 overflow-hidden relative">
      <GlobalSidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <main className="flex-1 overflow-y-auto relative">
           {children}
        </main>
      </div>
    </div>
  );
}
