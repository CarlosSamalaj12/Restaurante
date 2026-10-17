// react-app/src/components/common/ImageUploadField.jsx
// Componente de subida de imágenes con diseño limpio, moderno y agradable para el POS

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  ExternalLink,
  Link as LinkIcon,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';

export function ImageUploadField({
  label = 'Imagen',
  value = '',
  onChange,
  type = 'logos', // 'logos' | 'banners' | 'products'
  helperText = 'Formatos recomendados: PNG o WebP con transparencia (máx. 5MB)',
  aspectRatio = 'square', // 'square' | 'banner' | 'auto'
  placeholder = 'https://... o selecciona un archivo',
}) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);

// Helper para convertir cualquier imagen a WebP optimizado con resolución máxima
const convertToOptimizedWebP = (file, maxDimension = 1200, quality = 0.85) => {
  return new Promise((resolve) => {
    // Si es GIF animado, preservar formato original
    if (file.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const webpDataUrl = canvas.toDataURL('image/webp', quality);
          if (webpDataUrl.startsWith('data:image/webp')) {
            resolve(webpDataUrl);
            return;
          }
        } catch {
          // Ignorar y caer a fallback
        }

        resolve(e.target.result);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

  // Procesamiento y subida del archivo
  const handleProcessFile = async (file) => {
    if (!file) return;

    // Validación de tipo
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato no compatible. Por favor sube PNG, JPG, WebP o GIF.');
      return;
    }

    // Validación de tamaño (máx 15MB antes de optimizar a WebP)
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('El archivo excede el tamaño máximo permitido de 15MB.');
      return;
    }

    try {
      setUploading(true);

      // Convertir y comprimir a WebP optimizado
      const base64Data = await convertToOptimizedWebP(file);
      if (!base64Data) {
        throw new Error('No se pudo procesar la imagen seleccionada');
      }

      // Subir mediante endpoint del backend
      const res = await api.digitalMenu.uploadImage(base64Data, type);
      if (res && res.imageUrl) {
        onChange(res.imageUrl);
        toast.success('Imagen optimizada en WebP y subida con éxito');
      } else {
        throw new Error('Respuesta del servidor no válida');
      }
    } catch (err) {
      console.error('Error al subir imagen:', err);
      toast.error(err.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange('');
    toast.success('Imagen removida');
  };

  const hasImage = Boolean(value && String(value).trim());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
          <span>{label}</span>
        </label>
        <button
          type="button"
          onClick={() => setShowManualUrl(!showManualUrl)}
          className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition flex items-center gap-1"
        >
          <LinkIcon className="w-3 h-3" />
          <span>{showManualUrl ? 'Ocultar URL manual' : 'Ingresar URL'}</span>
        </button>
      </div>

      {/* Input oculto para selección de archivos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Zona de Drop o Vista Previa */}
      {hasImage ? (
        <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs">
          {/* Contenedor de la Imagen */}
          <div
            className={`w-full flex items-center justify-center p-3 bg-slate-50 ${
              aspectRatio === 'banner'
                ? 'h-36 sm:h-44'
                : aspectRatio === 'square'
                ? 'h-32'
                : 'h-36'
            }`}
          >
            <img
              src={value}
              alt={label}
              className={`max-w-full max-h-full rounded-xl transition duration-300 group-hover:scale-[1.02] ${
                aspectRatio === 'banner' ? 'w-full h-full object-cover' : 'object-contain'
              }`}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/300x150?text=Error+de+Carga';
              }}
            />
          </div>

          {/* Badge superior con estado */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/95 backdrop-blur-xs text-emerald-700 border border-emerald-200 shadow-xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Imagen Activa</span>
          </div>

          {/* Acciones flotantes en la barra superior derecha */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition">
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs transition"
              title="Abrir imagen completa"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-xl bg-white/90 hover:bg-rose-50 text-rose-600 border border-rose-200 shadow-xs transition"
              title="Quitar imagen"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botón de Cambiar / Reemplazar Imagen al pasar el cursor */}
          <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500 truncate max-w-[220px]">
              {value}
            </span>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-xs shadow-rose-500/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${uploading ? 'animate-spin' : ''}`} />
              <span>{uploading ? 'Subiendo...' : 'Cambiar Imagen'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Zona de Arrastrar y Soltar Vacía */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 transition-all duration-200 flex flex-col items-center justify-center text-center group ${
            isDragging
              ? 'border-rose-500 bg-rose-50/50 scale-[1.01] shadow-md shadow-rose-500/10'
              : 'border-slate-200/90 hover:border-rose-400/80 bg-slate-50/70 hover:bg-rose-50/20'
          }`}
        >
          {uploading ? (
            <div className="py-4 space-y-2 flex flex-col items-center">
              <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
              <p className="text-xs font-bold text-slate-800">Subiendo y procesando imagen...</p>
              <span className="text-[10px] text-slate-500">Guardando en el servidor</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center mb-2.5 group-hover:scale-110 group-hover:bg-rose-100 transition duration-200 shadow-xs">
                <UploadCloud className="w-6 h-6 text-rose-600 group-hover:text-rose-700 transition" />
              </div>
              <p className="text-xs font-bold text-slate-800 group-hover:text-rose-600 transition">
                {isDragging ? 'Suelta tu imagen aquí' : 'Haz clic o arrastra tu imagen aquí'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{helperText}</p>
              <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-xl bg-white text-slate-700 text-[11px] font-semibold border border-slate-200 shadow-2xs group-hover:border-rose-300 group-hover:text-rose-600 transition">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Examinar Archivos
              </span>
            </>
          )}
        </div>
      )}

      {/* Input de URL manual (opcional si el usuario lo despliega) */}
      {showManualUrl && (
        <div className="pt-1 transition-all">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono focus:bg-white focus:outline-none focus:border-rose-500"
          />
        </div>
      )}
    </div>
  );
}

export default ImageUploadField;
