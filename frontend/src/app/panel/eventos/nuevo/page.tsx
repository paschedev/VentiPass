"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CrearEventoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      startDate: new Date(formData.get('startDate') as string).toISOString(),
      endDate: new Date(formData.get('endDate') as string).toISOString(),
      venueName: formData.get('venueName'),
      venueAddress: formData.get('venueAddress'),
      status: 'PUBLISHED',
      ticketTypes: {
        create: [
          {
            name: 'Entrada General',
            price: Number(formData.get('price')),
            stock: Number(formData.get('stock')),
            saleStart: new Date().toISOString(),
            saleEnd: new Date(formData.get('startDate') as string).toISOString(),
          }
        ]
      }
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (response.ok) {
        toast.success('Evento creado exitosamente');
        router.push('/organizar');
      } else {
        toast.error(responseData.message || 'Error al crear el evento');
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de conexión');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-outfit text-3xl font-bold mb-8">Crear Nuevo Evento</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Info className="text-indigo-400 w-5 h-5"/> Información General</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Nombre del evento</label>
              <input name="title" required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ej: Tech Meetup 2026" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Descripción</label>
              <textarea name="description" required rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Contá de qué trata el evento..." />
            </div>
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Calendar className="text-purple-400 w-5 h-5"/> Fecha y Hora</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Inicio</label>
              <input name="startDate" required type="datetime-local" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Fin</label>
              <input name="endDate" required type="datetime-local" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]" />
            </div>
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><MapPin className="text-emerald-400 w-5 h-5"/> Ubicación</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Nombre del lugar</label>
              <input name="venueName" required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ej: Centro de Convenciones" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Dirección</label>
              <input name="venueAddress" required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ej: Av. Principal 1234, CABA" />
            </div>
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Info className="text-orange-400 w-5 h-5"/> Entradas (General)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Precio ($ ARS)</label>
              <input name="price" required type="number" min="0" step="100" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ej: 5000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Capacidad Total (Stock)</label>
              <input name="stock" required type="number" min="1" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ej: 500" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => router.back()} className="px-6 py-3 rounded-xl font-medium text-neutral-400 hover:bg-white/5 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center gap-2">
            {loading ? 'Creando...' : 'Publicar Evento'}
          </button>
        </div>
      </form>
    </div>
  );
}
