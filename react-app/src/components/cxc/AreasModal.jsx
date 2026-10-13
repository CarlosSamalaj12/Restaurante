import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  X,
  Plus,
  Building2,
  Edit2,
  Check,
  Power,
  Loader2
} from 'lucide-react';

export function AreasModal({ areas, onClose, onRefresh }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleCreate = async (e) => {
    e?.preventDefault();
    if (!newAreaName.trim()) {
      toast.error('Ingresa un nombre para el área');
      return;
    }
    setSaving(true);
    try {
      await api.cxc.createArea({ name: newAreaName.trim() });
      toast.success('Área creada exitosamente');
      setNewAreaName('');
      setShowAddForm(false);
      onRefresh();
    } catch (error) {
      toast.error(error.message || 'Error al crear área');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (areaId) => {
    if (!editingName.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    setSaving(true);
    try {
      await api.cxc.updateArea(areaId, { name: editingName.trim() });
      toast.success('Área actualizada');
      setEditingId(null);
      setEditingName('');
      onRefresh();
    } catch (error) {
      toast.error(error.message || 'Error al actualizar área');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (area) => {
    setSaving(true);
    try {
      await api.cxc.updateArea(area.id, { is_active: area.is_active ? 0 : 1 });
      toast.success(area.is_active ? 'Área desactivada' : 'Área activada');
      onRefresh();
    } catch (error) {
      toast.error(error.message || 'Error al cambiar estado');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Building2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Áreas e Instituciones
              </h3>
              <p className="text-xs text-slate-500">
                Departamentos o entidades para clasificar clientes CXC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Add Button or Form */}
          {!showAddForm ? (
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingId(null);
              }}
              className="w-full py-3 px-4 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 font-bold rounded-2xl border border-indigo-200/80 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Nueva Área / Institución</span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nombre de la Nueva Área
              </label>
              <input
                type="text"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="Ej. Gerencia General, Hospital Militar, Municipalidad..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                autoFocus
              />
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewAreaName('');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !newAreaName.trim()}
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Guardar Área
                </button>
              </div>
            </form>
          )}

          {/* Area List */}
          <div className="space-y-2">
            {areas.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No hay áreas registradas todavía
              </div>
            ) : (
              areas.map((area) => (
                <div
                  key={area.id}
                  className="p-3.5 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                >
                  {editingId === area.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-indigo-300 rounded-xl text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(area.id)}
                        disabled={saving}
                        className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 cursor-pointer"
                        title="Guardar cambios"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                          {area.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{area.name}</p>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              area.is_active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {area.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingId(area.id);
                            setEditingName(area.name);
                            setShowAddForm(false);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                          title="Editar nombre"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(area)}
                          className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                            area.is_active
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={area.is_active ? 'Desactivar área' : 'Activar área'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Listo / Cerrar
          </button>
        </div>
      </m.div>
    </div>
  );
}
