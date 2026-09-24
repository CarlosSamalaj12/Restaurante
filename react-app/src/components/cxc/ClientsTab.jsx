import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Plus,
  Loader2,
  Users,
  Search,
  X,
  ChevronRight,
  Wallet,
  FileText
} from 'lucide-react';

export function ClientsTab({ clients, areas, onRefresh, onAccountClick, onGlobalPay, onStatement }) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const toast = useToast();

  const filtered = clients.filter(c => 
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data) => {
    try {
      await api.cxc.createClient(data);
      toast.success('Cliente creado');
      setShowForm(false);
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl"
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map(client => (
          <ClientCard key={client.id} client={client} onAccountClick={onAccountClick} onGlobalPay={onGlobalPay} onStatement={onStatement} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay clientes CXC
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <ClientFormModal
            areas={areas}
            onClose={() => setShowForm(false)}
            onSave={handleCreate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClientCard({ client, onAccountClick, onGlobalPay, onStatement }) {
  const [expanded, setExpanded] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.cxc.getClientAccounts(client.id);
      setAccounts(data);
      setExpanded(true);
    } catch (error) {
      toast.error('Error al cargar cuentas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => expanded ? setExpanded(false) : loadAccounts()}
        className="w-full p-4 flex items-center gap-3"
      >
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
          <Users className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium text-gray-900">{client.full_name}</p>
          <p className="text-sm text-gray-500">
            Límite: Q{Number(client.credit_limit || 0).toFixed(2)} · 
            Saldo: <span className={Number(client.current_balance) > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>Q{Number(client.current_balance || 0).toFixed(2)}</span>
          </p>
        </div>
        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <m.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            style={{ transformOrigin: 'top' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : accounts.length > 0 ? (
                accounts.map(acc => (
                  <m.button
                    key={acc.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onAccountClick(acc.id)}
                    className="w-full bg-gray-50 rounded-lg p-3 flex justify-between hover:bg-gray-100 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-medium">{acc.check_number || `#${acc.id}`}</p>
                      <p className="text-xs text-gray-500">{new Date(acc.created_at).toLocaleDateString()}</p>
                      {acc.waiter_name && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{acc.waiter_name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${Number(acc.balance) > 0 ? 'text-red-500' : 'text-green-600'}`}>
                        Q{Number(acc.balance || 0).toFixed(2)}
                      </p>
                      <p className={`text-xs font-medium ${acc.status === 'paid' ? 'text-green-600' : acc.status === 'partial' ? 'text-blue-600' : 'text-amber-600'}`}>
                        {acc.status === 'paid' ? 'Pagado' : acc.status === 'partial' ? 'Parcial' : 'Pendiente'}
                      </p>
                    </div>
                  </m.button>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">Sin cuentas</p>
              )}
            </div>

            <div className="px-4 pb-4 flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onGlobalPay(client); }}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-green-700 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                Pago Global
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onStatement(client); }}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Estado de Cuenta
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClientFormModal({ areas, onClose, onSave }) {
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    credit_limit: 0,
    cxc_area_id: '',
  });
  const toast = useToast();

  const handleSubmit = () => {
    if (!form.full_name) {
      toast.error('Nombre es requerido');
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md p-5"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">Nuevo Cliente CXC</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Nombre *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3"
              placeholder="Nombre del cliente"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Teléfono</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3"
              placeholder="5555-5555"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Límite de Crédito</label>
            <input
              type="number"
              value={form.credit_limit}
              onChange={(e) => setForm({ ...form, credit_limit: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-200 rounded-xl p-3"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Área/Institución</label>
            <select
              value={form.cxc_area_id}
              onChange={(e) => setForm({ ...form, cxc_area_id: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3"
            >
              <option value="">Seleccionar...</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="flex-1 py-3 bg-primary-600 text-white rounded-xl">
            Crear
          </button>
        </div>
      </m.div>
    </div>
  );
}

