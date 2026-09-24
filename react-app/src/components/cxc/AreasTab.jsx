import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Plus,
  CreditCard
} from 'lucide-react';

export function AreasTab({ areas, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();

  const handleCreate = async (name) => {
    if (!name) return;
    try {
      await api.cxc.createArea({ name });
      toast.success('Área creada');
      setShowForm(false);
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-500">
          {areas.length} áreas/ instituições
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Nueva
        </button>
      </div>

      <div className="space-y-2">
        {areas.map(area => (
          <div key={area.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-purple-600" />
              </div>
              <p className="font-medium text-gray-900">{area.name}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              area.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {area.is_active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <AreaFormModal
            onClose={() => setShowForm(false)}
            onSave={handleCreate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AreaFormModal({ onClose, onSave }) {
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-sm p-5"
      >
        <h3 className="font-semibold text-gray-900 mb-4">Nueva Área/Institución</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del área"
          className="w-full border border-gray-200 rounded-xl p-3 mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl">
            Cancelar
          </button>
          <button onClick={() => onSave(name)} className="flex-1 py-3 bg-primary-600 text-white rounded-xl">
            Crear
          </button>
        </div>
      </m.div>
    </div>
  );
}

