import { useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  ChefHat,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Check,
  Loader2,
  Sparkles,
  Tag,
  ArrowUpDown,
  SlidersHorizontal,
  Info
} from 'lucide-react';

const PRESET_CATEGORIES = [
  'Ingredientes',
  'Cocción',
  'Servicio',
  'Empaque',
  'Bebidas',
  'General'
];

export function KitchenNotesSection({ notes = [], onReload }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [form, setForm] = useState({
    label: '',
    category: 'General',
    sortOrder: 0,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  // Categorías únicas existentes
  const availableCategories = useMemo(() => {
    const set = new Set(PRESET_CATEGORIES);
    notes.forEach(n => {
      if (n.category) set.add(n.category);
    });
    return Array.from(set);
  }, [notes]);

  // Filtrado de notas
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchSearch =
        (n.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory =
        selectedCategoryFilter === 'ALL' || n.category === selectedCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [notes, searchTerm, selectedCategoryFilter]);

  const handleOpenForm = (note = null) => {
    if (note) {
      setEditingNote(note);
      setForm({
        label: note.label || '',
        category: note.category || 'General',
        sortOrder: note.sort_order ?? 0,
        isActive: note.is_active !== 0,
      });
    } else {
      setEditingNote(null);
      // Sugerir el siguiente número de orden
      const maxSort = notes.reduce((max, n) => Math.max(max, Number(n.sort_order || 0)), 0);
      setForm({
        label: '',
        category: 'General',
        sortOrder: maxSort + 1,
        isActive: true,
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingNote(null);
    setForm({ label: '', category: 'General', sortOrder: 0, isActive: true });
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!form.label.trim()) {
      toast.error('El nombre de la observación es obligatorio');
      return;
    }

    setSaving(true);
    try {
      if (editingNote) {
        await api.settings.updateKitchenNote(editingNote.id, {
          label: form.label.trim(),
          category: form.category.trim() || 'General',
          sortOrder: Number(form.sortOrder) || 0,
          isActive: form.isActive ? 1 : 0,
        });
        toast.success('Observación actualizada correctamente');
      } else {
        await api.settings.createKitchenNote({
          label: form.label.trim(),
          category: form.category.trim() || 'General',
          sortOrder: Number(form.sortOrder) || 0,
          isActive: form.isActive ? 1 : 0,
        });
        toast.success('Nueva observación agregada');
      }
      handleCloseForm();
      if (onReload) onReload();
    } catch (error) {
      console.error('Error al guardar nota de cocina:', error);
      toast.error(error.message || 'Error al guardar la observación');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (note) => {
    try {
      const newStatus = note.is_active ? 0 : 1;
      await api.settings.updateKitchenNote(note.id, { isActive: newStatus });
      toast.success(newStatus ? 'Observación activada' : 'Observación desactivada');
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'No se pudo cambiar el estado');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.settings.deleteKitchenNote(confirmDelete.id);
      toast.success('Observación eliminada');
      setConfirmDelete(null);
      if (onReload) onReload();
    } catch (error) {
      console.error('Error al eliminar nota:', error);
      toast.error(error.message || 'No se pudo eliminar');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 leading-tight">
                Observaciones y Atajos de Cocina
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {notes.length} disponibles
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Configura los botones de atajo rápido que aparecen en el modal de modificadores y en la toma de pedidos (ej. <em>"Sin cebolla"</em>, <em>"Término medio"</em>, <em>"Para llevar"</em>) para que el personal los aplique con un solo toque.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleOpenForm()}
          className="group bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98] cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
          <span>Nueva Observación</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por texto o categoría..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros por Categoría */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
              selectedCategoryFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
                selectedCategoryFilter === cat
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Observaciones */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">
            {searchTerm || selectedCategoryFilter !== 'ALL'
              ? 'No se encontraron observaciones'
              : 'No hay observaciones registradas'}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
            {searchTerm || selectedCategoryFilter !== 'ALL'
              ? 'Prueba cambiando los términos de búsqueda o el filtro de categoría.'
              : 'Crea tu primer atajo rápido para que los meseros puedan agregarlo con un solo toque.'}
          </p>
          <button
            type="button"
            onClick={() => handleOpenForm()}
            className="group bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
            <span>Crear Observación</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredNotes.map((note) => {
            const isActive = note.is_active !== 0;
            return (
              <div
                key={note.id}
                className={`bg-white rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between shadow-2xs hover:shadow-md ${
                  isActive
                    ? 'border-gray-200 hover:border-indigo-300'
                    : 'border-gray-200/60 bg-gray-50/50 opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md flex items-center gap-1 border border-gray-200/60">
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      #{note.sort_order}
                    </span>

                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                        note.category === 'Cocción'
                          ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                          : note.category === 'Servicio'
                          ? 'bg-blue-50 text-blue-800 border-blue-200/80'
                          : note.category === 'Empaque'
                          ? 'bg-purple-50 text-purple-800 border-purple-200/80'
                          : note.category === 'Ingredientes'
                          ? 'bg-rose-50 text-rose-800 border-rose-200/80'
                          : 'bg-slate-50 text-slate-800 border-slate-200/80'
                      }`}
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {note.category || 'General'}
                    </span>
                  </div>

                  {/* Vista Previa del Botón de la Orden */}
                  <div className="my-2 p-2.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Vista previa en la toma de pedidos:
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                      + {note.label}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(note)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border shadow-2xs hover:scale-105 active:scale-95 ${
                      isActive
                        ? 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 border-emerald-200/60'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-500 border-gray-200'
                    }`}
                    title={isActive ? 'Desactivar opción' : 'Activar opción'}
                  >
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span>{isActive ? 'Activo' : 'Inactivo'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenForm(note)}
                      className="p-2 rounded-xl transition-all duration-200 bg-blue-50/70 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200/60 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                      title="Editar observación"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(note)}
                      className="p-2 rounded-xl transition-all duration-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200/60 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                      title="Eliminar observación"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Formulario Crear / Editar */}
      <AnimatePresence>
        {showForm && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={handleCloseForm}
          >
            <m.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base leading-tight">
                      {editingNote ? 'Editar Observación' : 'Nueva Observación para Cocina'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {editingNote ? 'Modifica el texto o categoría' : 'Crea un atajo rápido para comandas'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                {/* Nombre de la Observación */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    Texto de la Observación *
                  </label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="Ej: Sin cebolla, Bien cocido, Salsa aparte..."
                    autoFocus
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-medium text-gray-900"
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Este es el texto exacto que aparecerá en el botón y se imprimirá en cocina.
                  </span>
                </div>

                {/* Categoría */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    Categoría / Grupo
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Ej: Cocción, Ingredientes, Empaque, etc."
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all mb-2"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_CATEGORIES.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setForm({ ...form, category: preset })}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                          form.category === preset
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orden de Visualización */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    Orden de Visualización
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Los números más bajos aparecen primero a la izquierda de la lista.
                  </span>
                </div>

                {/* Switch Estado Activo */}
                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-800 block">
                        Opción Activa
                      </span>
                      <span className="text-xs text-gray-500 block">
                        Si está inactiva no se mostrará a los meseros en la comanda.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Vista previa viva */}
                {form.label.trim() && (
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                      Previsualización del botón:
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white shadow-2xs">
                      + {form.label.trim()}
                    </span>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2.5 rounded-xl font-semibold text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingNote ? 'Guardar Cambios' : 'Crear Observación'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmar Eliminación */}
      <AnimatePresence>
        {confirmDelete && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <m.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center border border-gray-100"
            >
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                ¿Eliminar observación?
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Estás por eliminar el atajo <strong>"{confirmDelete.label}"</strong>. Ya no aparecerá en las opciones rápidas de cocina.
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <span>Sí, eliminar</span>
                  )}
                </button>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default KitchenNotesSection;
