import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useToast } from '../hooks/useToast';
import {
  ArrowLeft,
  Plus,
  Loader2,
  Users,
  DollarSign,
  Search,
  X,
  ChevronRight,
  CreditCard
} from 'lucide-react';

export function CXCPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('clients');
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [pending, setPending] = useState([]);
  const [areas, setAreas] = useState([]);
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsData, pendingData, areasData] = await Promise.all([
        api.cxc.getClients(),
        api.cxc.getPending(),
        api.cxc.getAreas()
      ]);
      setClients(clientsData);
      setPending(pendingData);
      setAreas(areasData);
    } catch (error) {
      toast.error('Error al cargar datos CXC');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Cuentas por Cobrar</h1>
        </div>

        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'clients' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Clientes
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'pending' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Por Cobrar ({pending.length})
          </button>
          <button
            onClick={() => setActiveTab('areas')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'areas' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Áreas
          </button>
        </div>
      </header>

      <div className="p-4">
        {activeTab === 'clients' && (
          <ClientsTab clients={clients} areas={areas} onRefresh={loadData} />
        )}
        {activeTab === 'pending' && (
          <PendingTab pending={pending} onRefresh={loadData} />
        )}
        {activeTab === 'areas' && (
          <AreasTab areas={areas} onRefresh={loadData} />
        )}
      </div>
    </div>
  );
}

function ClientsTab({ clients, areas, onRefresh }) {
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
          <ClientCard key={client.id} client={client} />
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

function ClientCard({ client }) {
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
            Saldo: Q{Number(client.current_balance || 0).toFixed(2)}
          </p>
        </div>
        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : accounts.length > 0 ? (
                accounts.map(acc => (
                  <div key={acc.id} className="bg-gray-50 rounded-lg p-3 flex justify-between">
                    <div>
                      <p className="text-sm font-medium">{acc.check_number || `#${acc.id}`}</p>
                      <p className="text-xs text-gray-500">{new Date(acc.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-amber-600">Q{Number(acc.balance || 0).toFixed(2)}</p>
                      <p className={`text-xs ${acc.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                        {acc.status === 'paid' ? 'Pagado' : acc.status === 'partial' ? 'Parcial' : 'Pendiente'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">Sin cuentas</p>
              )}
            </div>
          </motion.div>
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
      <motion.div
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
      </motion.div>
    </div>
  );
}

function PendingTab({ pending, onRefresh }) {
  const toast = useToast();

  return (
    <div className="space-y-3">
      {pending.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay cuentas por cobrar</p>
        </div>
      ) : (
        pending.map(item => (
          <div key={item.client_id} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.full_name}</p>
                <p className="text-sm text-gray-500">
                  {item.pending_accounts} cuenta(s) pendiente(s)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-xs text-gray-500">Límite</p>
                <p className="font-semibold">Q{Number(item.credit_limit || 0).toFixed(0)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-xs text-gray-500">Saldo</p>
                <p className="font-semibold text-amber-600">Q{Number(item.current_balance || 0).toFixed(0)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-xs text-gray-500">Disponible</p>
                <p className="font-semibold text-green-600">Q{Number(item.available_credit || 0).toFixed(0)}</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AreasTab({ areas, onRefresh }) {
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
      <motion.div
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
      </motion.div>
    </div>
  );
}