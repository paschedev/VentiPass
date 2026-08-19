export async function apiFetch(url: string, options: RequestInit = {}) {
  // Solo aplicar prefijo si la ruta empieza con '/' (relativa a nuestra API)
  const isRelativeUrl = url.startsWith('/');
  const finalUrl = isRelativeUrl 
    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${url}`
    : url;

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers = new Headers(options.headers || {});
  
  // Inyectar Token de autorización si existe
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Manejar Content-Type automáticamente si hay body y no es FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(finalUrl, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login?expired=1';
    }
    throw new Error('Unauthorized');
  }

  return response;
}
