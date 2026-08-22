"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Info, Image as ImageIcon, Video, Save, UploadCloud, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import TandasManager from '@/components/TandasManager';
import { apiFetch } from '@/utils/api';

export default function CrearEventoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [batches, setBatches] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');

  const toLocalInputFormat = (isoString: string | null) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate batches
    const invalidBatch = batches.find(b => b.status === 'SCHEDULED' && !b.publishAt);
    if (invalidBatch) {
      toast.error('Las tandas programadas deben tener una fecha de inicio de venta.');
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      imageUrl: imageUrl || null,
      youtubeLink: formData.get('youtubeLink') || null,
      startDate: new Date(formData.get('startDate') as string).toISOString(),
      endDate: new Date(formData.get('endDate') as string).toISOString(),
      venueName: formData.get('venueName'),
      venueAddress: formData.get('venueAddress'),
      status: 'PUBLISHED',
      batches: batches // Send batches to backend
    };

    try {
      const response = await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (response.ok) {
        toast.success('Evento creado exitosamente.');
        router.push(`/panel?tab=events`);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const toastId = toast.loading('Subiendo imagen...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'entrypass_flyers');
      
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'calji3rf';
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      if (response.ok) {
        setImageUrl(data.secure_url);
        toast.success('Imagen subida con éxito', { id: toastId });
      } else {
        throw new Error(data.error?.message || 'Error al subir');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al subir la imagen', { id: toastId });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-0 pt-8 md:pt-12 pb-24">
      <Link href="/panel?tab=events" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-6 font-medium">
        <ArrowLeft className="w-4 h-4" /> Volver a mis eventos
      </Link>
      
      <h1 className="font-outfit text-3xl font-bold mb-8">Crear Nuevo Evento</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Info className="text-indigo-400 w-5 h-5"/> Información General</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Flyer / Portada del Evento</label>
              <div className="relative w-full h-48 bg-white/5 border-2 border-dashed border-white/10 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden group">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  title="Subir imagen"
                />
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt="Flyer" className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-black/70 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 backdrop-blur-sm">
                        <UploadCloud className="w-4 h-4" /> Cambiar imagen
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-neutral-500 mb-2" />
                    <span className="text-sm text-neutral-400">Click o arrastra una imagen aquí</span>
                    <span className="text-xs text-neutral-600 mt-1">Recomendado: 1920x1080px (Máx 5MB)</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Nombre del evento</label>
              <input name="title" required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ej: Tech Meetup 2026" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1 flex items-center gap-2"><Video className="w-4 h-4"/> Link de YouTube (Opcional)</label>
              <input name="youtubeLink" type="url" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ej: https://youtube.com/watch?v=..." />
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
              <input 
                name="startDate" 
                required 
                type="datetime-local" 
                min={toLocalInputFormat(new Date().toISOString())}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Fin</label>
              <input 
                name="endDate" 
                required 
                type="datetime-local" 
                min={startDate || toLocalInputFormat(new Date().toISOString())}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]" 
              />
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

        <div className="mt-12 pt-12 border-t border-white/10">
          <TandasManager batches={batches} setBatches={setBatches} />
        </div>

        <div className="flex justify-end gap-4 mt-12">
          <button type="button" onClick={() => router.back()} className="px-6 py-3 rounded-xl font-medium text-neutral-400 hover:bg-white/5 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 md:px-8 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            <Save className="w-5 h-5" />
            <span className="md:hidden">{loading ? 'Creando...' : 'Publicar'}</span>
            <span className="hidden md:inline">{loading ? 'Creando...' : 'Publicar Evento'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
