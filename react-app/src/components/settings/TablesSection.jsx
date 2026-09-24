import { useState } from 'react';
import { m } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  Check
} from 'lucide-react';

export function TablesSection({ tables, centers, onReload }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const handleCreated = () => {
    setShowWizard(false);
    setEditingTable(null);
    if (onReload) onReload();
  };

  const handleDeleteTable = async () => {
    if (!confirmDelete) return;
    try {
      await api.settings.deleteTable(confirmDelete.id);
      toast.success('Mesa eliminada');
      setConfirmDelete(null);
      if (onReload) onReload();
    } catch (error) {
      toast.error(error.message || 'Error al eliminar');
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {tables.length} mesas configuradas
        </h2>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva
        </button>
      </div>

      <div className="space-y-2">
        {tables.map(table => (
          <m.div
            key={table.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <div className="w-6 h-4 rounded bg-white/30" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">Mesa {table.code}</p>
              <p className="text-xs text-gray-500">{table.area_name} • {table.seats} asientos</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setEditingTable(table);
                  setShowWizard(true);
                }}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setConfirmDelete({ id: table.id, code: table.code })}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </m.div>
        ))}
      </div>

      {showWizard && (
        <TableWizardModal
          centers={centers}
          editingTable={editingTable}
          onClose={() => {
            setShowWizard(false);
            setEditingTable(null);
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar mesa</h3>
              <p className="text-gray-500 mb-6">
                ¿Estás seguro de eliminar la mesa <strong>{confirmDelete.code}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteTable}
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

// Table Wizard Modal
function TableWizardModal({ centers, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ prefix: '', seats: 4, quantity: 1, centerId: '' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    setLoading(true);
    try {
      for (let i = 1; i <= form.quantity; i++) {
        const code = `${form.prefix}-${i}`;
        await api.settings.createTable({
          code,
          seats: Number(form.seats),
          centerId: Number(form.centerId),
        });
      }
      toast.success(`¡${form.quantity} mesa${form.quantity > 1 ? 's' : ''} creada${form.quantity > 1 ? 's' : ''}!`);
      onCreated();
    } catch (error) {
      toast.error(error.message || 'Error al crear mesa');
    } finally {
      setLoading(false);
    }
  };

  const previews = [];
  for (let i = 1; i <= Math.min(form.quantity, 10); i++) {
    previews.push(`${form.prefix}-${i}`);
  }
  if (form.quantity > 10) {
    previews.push(`... y ${form.quantity - 10} más`);
  }

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
          <h3 className="font-bold text-gray-900 text-lg">Crear Mesas</h3>
          <div className="flex items-center justify-center gap-1 mt-3">
            {['1', '2', '3', '4', '5'].map((num, i) => (
              <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? 'bg-primary-600 text-white' : step === i + 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > i + 1 ? <Check className="w-3 h-3" /> : num}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Cuál es el prefijo de las mesas?</p>
              <input
                type="text"
                value={form.prefix}
                onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-2xl font-bold text-center uppercase tracking-wider focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="VAQ"
                autoFocus
                maxLength={10}
              />
              <p className="text-xs text-gray-400 text-center">Ejemplo: VAQ genera códigos VAQ-1, VAQ-2, etc.</p>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Cuántos asientos tiene cada mesa?</p>
              <div className="flex justify-center gap-3">
                {[2, 4, 6, 8].map(num => (
                  <button
                    key={num}
                    onClick={() => setForm({ ...form, seats: num })}
                    className={`w-16 h-16 rounded-xl text-lg font-bold transition-all ${
                      form.seats === num
                        ? 'bg-primary-600 text-white scale-110'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={form.seats}
                onFocus={e => e.target.select()}
                onChange={(e) => setForm({ ...form, seats: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="Otro número..."
              />
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿Cuántas mesas quieres crear?</p>
              <div className="flex justify-center gap-3">
                {[3, 5, 10, 15].map(num => (
                  <button
                    key={num}
                    onClick={() => setForm({ ...form, quantity: num })}
                    className={`w-16 h-16 rounded-xl text-lg font-bold transition-all ${
                      form.quantity === num
                        ? 'bg-primary-600 text-white scale-110'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={form.quantity}
                onFocus={e => e.target.select()}
                onChange={(e) => setForm({ ...form, quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="Otra cantidad..."
              />
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">¿A qué centro pertenece?</p>
              <div className="grid grid-cols-2 gap-3">
                {centers.length > 0 ? centers.map(center => (
                  <button
                    key={center.id}
                    onClick={() => setForm({ ...form, centerId: center.id })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      form.centerId === center.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{center.name}</p>
                  </button>
                )) : (
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    <p>No hay centros creados</p>
                    <p className="text-sm">Crea un centro primero</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm">Confirma los datos</p>
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500 mb-2">Se crearán:</p>
                <div className="flex flex-wrap justify-center gap-2 mb-3">
                  {previews.map((code, i) => (
                    <span key={i} className="px-3 py-1 bg-white rounded-lg text-sm font-medium text-gray-700 border">
                      {code}
                    </span>
                  ))}
                </div>
                <div className="border-t pt-2 space-y-1">
                  <p className="text-sm"><span className="text-gray-500">Asientos:</span> <span className="font-medium">{form.seats}</span></p>
                  <p className="text-sm"><span className="text-gray-500">Centro:</span> <span className="font-medium">{centers.find(c => c.id === form.centerId)?.name}</span></p>
                  <p className="text-sm"><span className="text-gray-500">Total:</span> <span className="font-bold text-primary-600">{form.quantity} mesa{form.quantity > 1 ? 's' : ''}</span></p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
              Atrás
            </button>
          ) : (
            <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">
              Cancelar
            </button>
          )}
          {step < 5 ? (
            <button
              onClick={() => {
                if (step === 1 && !form.prefix.trim()) {
                  toast.error('Ingresa el prefijo');
                  return;
                }
                if (step === 2 && (!form.seats || Number(form.seats) < 1)) {
                  toast.error('Ingresa los asientos');
                  return;
                }
                if (step === 3 && (!form.quantity || Number(form.quantity) < 1)) {
                  toast.error('Ingresa la cantidad');
                  return;
                }
                setStep(step + 1);
              }}
              className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Crear ${form.quantity} Mesa${form.quantity > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </m.div>
    </div>
  );
}

// Users Section
