import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { useToast } from '../../hooks/useToast';
import {
  X,
  UserPlus,
  Edit2,
  Building2,
  Phone,
  Coins,
  Percent,
  Check,
  Loader2
} from 'lucide-react';

export function ClientFormModal({ client, areas = [], onClose, onSave }) {
  const isEditing = Boolean(client?.id);
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    credit_limit: 0,
    cxc_area_id: '',
    default_discount_percent: 0,
  });

  useEffect(() => {
    if (client) {
      setForm({
        full_name: client.full_name || '',
        phone: client.phone || '',
        credit_limit: client.credit_limit || 0,
        cxc_area_id: client.cxc_area_id || '',
        default_discount_percent: client.default_discount_percent || 0,
      });
    }
  }, [client]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.full_name.trim()) {
      toast.error('El nombre del cliente es obligatorio');
      return;
    }
    const limit = parseFloat(form.credit_limit);
    if (isNaN(limit) || limit < 0) {
      toast.error('El límite de crédito debe ser un número mayor o igual a 0');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        ...form,
        full_name: form.full_name.trim(),
        credit_limit: limit,
        cxc_area_id: form.cxc_area_id ? Number(form.cxc_area_id) : null,
        default_discount_percent: parseFloat(form.default_discount_percent) || 0,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              {isEditing ? <Edit2 className="w-5 h-5 stroke-[2.2]" /> : <UserPlus className="w-5 h-5 stroke-[2.2]" />}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {isEditing ? 'Editar Cliente CXC' : 'Nuevo Cliente CXC'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing ? 'Actualizar límite de crédito y datos' : 'Registrar cliente con línea de crédito'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nombre Completo *
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              placeholder="Ej. Juan Pérez / Corporación Alfa"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Teléfono
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                placeholder="Ej. 5555-5555"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-slate-400" />
                Límite de Crédito (Q)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.credit_limit}
                onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Área / Institución
              </label>
              <select
                value={form.cxc_area_id}
                onChange={(e) => setForm({ ...form, cxc_area_id: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
              >
                <option value="">Ninguna / Particular</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-slate-400" />
                Descuento (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.default_discount_percent}
                onChange={(e) => setForm({ ...form, default_discount_percent: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                placeholder="0%"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isEditing ? 'Actualizar Cliente' : 'Crear Cliente'}
                </>
              )}
            </button>
          </div>
        </form>
      </m.div>
    </div>
  );
}
