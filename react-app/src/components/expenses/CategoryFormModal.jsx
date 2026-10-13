import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Tag, Loader2 } from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';

const COLOR_PRESETS = [
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', 
  '#f43f5e', '#f97316', '#f59e0b', '#84cc16', '#14b8a6', 
  '#64748b', '#0f172a'
];

export function CategoryFormModal({ isOpen, onClose, onSaved, initialData = null }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        color: initialData.color || '#3b82f6',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#3b82f6',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.show('El nombre de la categoría es requerido', { type: 'error' });
      return;
    }

    setLoading(true);
    try {
      if (initialData?.id) {
        await api.expenses.updateCategory(initialData.id, formData);
        toast.show('Categoría actualizada con éxito', { type: 'success' });
      } else {
        await api.expenses.createCategory(formData);
        toast.show('Categoría creada con éxito', { type: 'success' });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.show(err.message || 'Error al guardar categoría', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <Tag className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">
                {initialData ? 'Editar Categoría de Gasto' : 'Nueva Categoría de Gasto'}
              </h3>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nombre de la Categoría *
              </label>
              <input
                type="text"
                placeholder="Ej: Mantenimiento de Equipos"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Descripción / Detalle
              </label>
              <textarea
                rows={2}
                placeholder="Para qué tipo de egresos aplica..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Color Identificador
              </label>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c })}
                    style={{ backgroundColor: c }}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      formData.color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-800 shadow-sm' : 'hover:scale-110'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                />
                <span className="text-xs font-mono font-bold text-slate-500">{formData.color}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{initialData ? 'Actualizar' : 'Crear Categoría'}</span>
              </button>
            </div>
          </form>
        </m.div>
      </div>
    </AnimatePresence>
  );
}

export default CategoryFormModal;
