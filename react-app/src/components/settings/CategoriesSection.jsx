import { useState } from 'react';
import { m } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  X
} from 'lucide-react';

export function CategoriesSection({ categories, onReload, centers }) {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({ name: '', color: '#6366f1', centerId: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const handleOpenForm = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setForm({
        name: category.name || '',
        color: category.color || '#6366f1',
        centerId: category.operation_center_id || '',
        isActive: category.is_active !== false
      });
    } else {
      setEditingCategory(null);
      setForm({ name: '', color: '#6366f1', centerId: '', isActive: true });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error('Nombre es requerido');
      return;
    }
    setSaving(true);
    try {
      if (editingCategory) {
        await api.settings.updateCategory(editingCategory.id, { 
          name: form.name, 
          color: form.color, 
          centerId: form.centerId || null,
          isActive: form.isActive ? 1 : 0 
        });
        toast.success('Categoría actualizada');
      } else {
        await api.settings.createCategory({ name: form.name, color: form.color, centerId: form.centerId || null });
        toast.success('Categoría creada');
      }
      setShowForm(false);
      setEditingCategory(null);
      setForm({ name: '', color: '#6366f1', centerId: '', isActive: true });
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.settings.deleteCategory(confirmDelete.id);
      toast.success('Categoría eliminada');
      setConfirmDelete(null);
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'No se pudo eliminar');
      setConfirmDelete(null);
    }
  };

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6'];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {categories.length} categorías
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva
        </button>
      </div>

      <div className="space-y-3">
        {categories.map(cat => {
          const catCenter = centers?.find(c => c.id === cat.operation_center_id);
          return (
            <div
              key={cat.id}
              className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm"
            >
              <div
                className="w-5 h-12 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color || '#6366f1' }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{cat.name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {cat.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                  {catCenter && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      {catCenter.name}
                    </span>
                  )}
                  {!catCenter && cat.operation_center_id && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      Centro #{cat.operation_center_id}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleOpenForm(cat)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setConfirmDelete({ id: cat.id, name: cat.name })}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar categoría?</h3>
              <p className="text-gray-500 mb-6">
                Estás por eliminar <strong>"{confirmDelete.name}"</strong>. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </m.div>
        </div>
      )}

      {/* Category Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              <button onClick={() => { setShowForm(false); setEditingCategory(null); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la categoría
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="Ej: Bebidas"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Centro (opcional)
                </label>
                <select
                  value={form.centerId}
                  onChange={(e) => setForm({ ...form, centerId: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors bg-white"
                >
                  <option value="">Todos los centros</option>
                  {centers && centers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Deja vacío para que esté disponible en todos los centros</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color de identificación
                </label>
                <div className="flex gap-3">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, color })}
                      className={`
                        w-10 h-10 rounded-full transition-all
                        ${form.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}
                      `}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              {editingCategory && (
                <div>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Categoría activa</span>
                  </label>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => { setShowForm(false); setEditingCategory(null); }}
                className="flex-1 py-3.5 text-gray-600 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingCategory ? 'Actualizar' : 'Crear Categoría'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Centers Section
