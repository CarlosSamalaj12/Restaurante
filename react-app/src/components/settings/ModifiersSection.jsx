import { useState } from 'react';
import { m } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Sparkles
} from 'lucide-react';
import { ModifierGroupIconBadge } from '../../utils/productIcons';

export function ModifiersSection({ groups, options, onReload }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const handleCreated = () => {
    setShowWizard(false);
    setEditingGroup(null);
    if (onReload) onReload();
  };

  const handleDeleteGroup = async () => {
    if (!confirmDelete) return;
    try {
      await api.settings.deleteModifierGroup(confirmDelete.id);
      toast.success('Grupo eliminado');
      setConfirmDelete(null);
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'Error al eliminar');
      setConfirmDelete(null);
    }
  };

  const getGroupOptions = (groupId) => options.filter(o => o.group_id === groupId);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {groups.length} grupos de modificadores
        </h2>
        <button
          onClick={() => setShowWizard(true)}
          className="group bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
          Nuevo Grupo
        </button>
      </div>

      {/* Modern Info Banner */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white border border-blue-200/60 rounded-2xl p-4 mb-4 flex items-center gap-3 shadow-2xs">
        <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/50">
          <Sparkles className="w-4 h-4" />
        </div>
        <p className="text-xs text-blue-900/90 font-medium">
          Los modificadores permiten personalizar productos según las preferencias del comensal. Ej: <strong>"Guarniciones"</strong>, <strong>"Salsas"</strong>, <strong>"Término de carne"</strong> o <strong>"Tipo de Leche"</strong>.
        </p>
      </div>

      <div className="space-y-3">
        {groups.map(group => {
          const groupOptions = getGroupOptions(group.id);

          return (
            <m.div
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs hover:shadow-xs transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <ModifierGroupIconBadge name={group.name} size="md" className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm leading-snug">{group.name}</h3>
                    
                    {/* Modern Metadata Badges */}
                    <div className="flex items-center gap-2 flex-wrap mt-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        group.is_mandatory
                          ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                      }`}>
                        {group.is_mandatory ? 'Obligatorio' : 'Opcional'}
                      </span>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                        {group.group_type === 'single' ? 'Selección Única' : `Múltiple (Min: ${group.min_select} • Max: ${group.max_select})`}
                      </span>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-500 border border-gray-200">
                        {groupOptions.length} {groupOptions.length === 1 ? 'opción' : 'opciones'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setEditingGroup(group);
                      setShowWizard(true);
                    }}
                    className="p-2.5 rounded-xl transition-all duration-200 bg-blue-50/70 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200/60 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                    title="Editar grupo"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: group.id, name: group.name })}
                    className="p-2.5 rounded-xl transition-all duration-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200/60 shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                    title="Eliminar grupo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Styled Option Chips with emerald extra prices */}
              {groupOptions.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2.5 border-t border-gray-100">
                  {groupOptions.map(opt => (
                    <div
                      key={opt.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50/90 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-semibold text-gray-800 shadow-2xs transition-colors"
                    >
                      <span>{opt.name}</span>
                      {Number(opt.price_delta) > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          +Q{Number(opt.price_delta).toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400 italic">Sin opciones asignadas a este grupo</span>
                </div>
              )}
            </m.div>
          );
        })}
      </div>

      {showWizard && (
        <ModifierGroupWizard
          editingGroup={editingGroup}
          options={options}
          onClose={() => {
            setShowWizard(false);
            setEditingGroup(null);
          }}
          onCreated={handleCreated}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar grupo</h3>
              <p className="text-gray-500 mb-6">
                ¿Estás seguro de eliminar el grupo <strong>{confirmDelete.name}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteGroup}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </m.div>
        </div>
      )}
    </div>
  );
}

// Modifier Group Wizard Modal
function ModifierGroupWizard({ editingGroup, options, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: editingGroup?.name || '',
    groupType: editingGroup?.group_type || 'multiple',
    minSelect: editingGroup?.min_select ?? 1,
    maxSelect: editingGroup?.max_select ?? 3,
    isMandatory: editingGroup?.is_mandatory || false,
    options: editingGroup ? options.filter(o => o.group_id === editingGroup.id) : []
  });
  const [loading, setLoading] = useState(false);
  const [newOption, setNewOption] = useState('');
  const toast = useToast();

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (form.options.length === 0) {
      toast.error('Agrega al menos una opción');
      return;
    }
    setLoading(true);
    try {
      let groupId = editingGroup?.id;
      if (editingGroup) {
        await api.settings.updateModifierGroup(editingGroup.id, {
          name: form.name,
          groupType: form.groupType,
          minSelect: form.minSelect,
          maxSelect: form.maxSelect,
          isMandatory: form.isMandatory
        });
      } else {
        const result = await api.settings.createModifierGroup({
          name: form.name,
          groupType: form.groupType,
          minSelect: form.minSelect,
          maxSelect: form.maxSelect,
          isMandatory: form.isMandatory
        });
        groupId = result.groupId;
      }
      const existingOptions = editingGroup ? options.filter(o => o.group_id === editingGroup.id) : [];
      const existingIds = new Set(existingOptions.map(o => o.id));
      const formIds = new Set(form.options.filter(o => o.id).map(o => o.id));
      for (const opt of form.options) {
        if (opt.id) {
          if (existingIds.has(opt.id)) {
            await api.settings.updateModifierOption(opt.id, { name: opt.name, priceDelta: opt.price_delta });
          }
        } else {
          await api.settings.addModifierOption(groupId, { name: opt.name, priceDelta: opt.price_delta });
        }
      }
      for (const oldOpt of existingOptions) {
        if (!formIds.has(oldOpt.id)) {
          await api.settings.deleteModifierOption(oldOpt.id);
        }
      }
      toast.success(editingGroup ? 'Grupo actualizado' : 'Grupo creado');
      onCreated();
    } catch (error) {
      console.error('Error al guardar modificador:', error);
      toast.error(error?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    setForm(prev => ({
      ...prev,
      options: [...prev.options, { id: null, name: newOption.trim(), price_delta: 0 }]
    }));
    setNewOption('');
  };

  const updateOptionPrice = (index, price) => {
    setForm(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = { ...newOptions[index], price_delta: price };
      return { ...prev, options: newOptions };
    });
  };

  const removeOption = (index) => {
    setForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <m.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">
            {editingGroup ? 'Editar' : 'Nuevo'} Grupo de Modificadores
          </h3>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del grupo</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Ej: Salsas"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.groupType}
                onChange={e => setForm({ ...form, groupType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              >
                <option value="multiple">Múltiple</option>
                <option value="single">Único</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Obligatorio</label>
              <select
                value={form.isMandatory ? '1' : '0'}
                onChange={e => setForm({ ...form, isMandatory: e.target.value === '1' })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              >
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mín. selección</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.minSelect}
                onFocus={e => e.target.select()}
                onChange={e => setForm({ ...form, minSelect: e.target.value === '' ? 0 : Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máx. selección</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.maxSelect}
                onFocus={e => e.target.select()}
                onChange={e => setForm({ ...form, maxSelect: e.target.value === '' ? 1 : Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opciones</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newOption}
                onChange={e => setNewOption(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl"
                placeholder="Nueva opción"
              />
              <button
                onClick={addOption}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                title="Agregar opción"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50/90 border border-gray-200/60 rounded-xl p-2.5 shadow-2xs">
                  <span className="flex-1 text-sm font-medium text-gray-800">{opt.name}</span>
                  <span className="text-sm font-semibold text-gray-500">Q</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={opt.price_delta}
                    onFocus={e => e.target.select()}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                        updateOptionPrice(i, val === '' ? 0 : Number(val));
                      }
                    }}
                    className="w-20 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                  <button
                    onClick={() => removeOption(i)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-all hover:scale-110 active:scale-90 cursor-pointer"
                    title="Eliminar opción"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </m.div>
    </div>
  );
}

// Terminal Wizard Modal
