import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft,
  Plus,
  Loader2,
  Users,
  DollarSign,
  Search,
  X,
  ChevronRight,
  CreditCard,
  Wallet,
  FileText,
  Download,
  Printer
} from 'lucide-react';

export function CXCPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('clients');
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [pending, setPending] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [globalPayClient, setGlobalPayClient] = useState(null);
  const [statementClient, setStatementClient] = useState(null);
  const [showPendingSummary, setShowPendingSummary] = useState(false);
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
          <button
            onClick={() => setShowPendingSummary(true)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
          >
            Reporte General
          </button>
        </div>
      </header>

      <div className="p-4">
        {activeTab === 'clients' && (
          <ClientsTab clients={clients} areas={areas} onRefresh={loadData} onAccountClick={setSelectedAccountId} onGlobalPay={setGlobalPayClient} onStatement={setStatementClient} />
        )}
        {activeTab === 'pending' && (
          <PendingTab pending={pending} onRefresh={loadData} />
        )}
        {activeTab === 'areas' && (
          <AreasTab areas={areas} onRefresh={loadData} />
        )}
      </div>

      <AnimatePresence>
        {selectedAccountId && (
          <AccountDetailModal key="account-detail"
            accountId={selectedAccountId}
            onClose={() => setSelectedAccountId(null)}
            onRefresh={loadData}
          />
        )}
        {globalPayClient && (
          <GlobalPayModal key="global-pay"
            client={globalPayClient}
            onClose={() => setGlobalPayClient(null)}
            onRefresh={loadData}
          />
        )}
        {statementClient && (
          <StatementModal key="statement"
            client={statementClient}
            onClose={() => setStatementClient(null)}
          />
        )}
        {showPendingSummary && (
          <PendingSummaryModal key="pending-summary"
            onClose={() => setShowPendingSummary(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClientsTab({ clients, areas, onRefresh, onAccountClick, onGlobalPay, onStatement }) {
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

function AccountDetailModal({ accountId, onClose, onRefresh }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('efectivo');
  const [payRef, setPayRef] = useState('');
  const [paying, setPaying] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadAccount();
  }, [accountId]);

  const loadAccount = async () => {
    setLoading(true);
    try {
      const data = await api.cxc.getAccount(accountId);
      setAccount(data);
    } catch (error) {
      toast.error('Error al cargar cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    if (amount > (account?.balance || 0)) {
      toast.error('El monto excede el saldo pendiente');
      return;
    }
    setPaying(true);
    try {
      await api.cxc.payAccount(accountId, {
        amount,
        payment_method: payMethod,
        reference: payRef,
        notes: ''
      });
      toast.success('Pago registrado');
      setShowPayment(false);
      setPayAmount('');
      setPayRef('');
      loadAccount();
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPaying(false);
    }
  };

  const statusConfig = {
    paid: { label: 'Pagado', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    partial: { label: 'Parcial', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    pending: { label: 'Pendiente', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <m.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-lg p-10 flex justify-center"
        >
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </m.div>
      </div>
    );
  }

  if (!account) return null;

  const status = statusConfig[account.status] || statusConfig.pending;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <m.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-gray-900">Cuenta CXC</h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {account.check_number || `#${account.id}`} · {new Date(account.created_at).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Info summary */}
          <div className="px-5 py-4 bg-gray-50 border-b">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Monto</p>
                <p className="text-lg font-bold text-gray-900">Q{Number(account.amount || 0).toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Saldo</p>
                <p className={`text-lg font-bold ${status.text}`}>Q{Number(account.balance || 0).toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Pagado</p>
                <p className="text-lg font-bold text-green-600">
                  Q{Number((account.amount || 0) - (account.balance || 0)).toFixed(2)}
                </p>
              </div>
            </div>
            {account.waiter_name && (
              <p className="text-xs text-gray-500 text-center mt-3">
                Atendido por: <span className="font-medium text-gray-700">{account.waiter_name}</span>
              </p>
            )}
            {account.notes && (
              <p className="text-xs text-gray-500 text-center mt-1">
                Nota: {account.notes}
              </p>
            )}
          </div>

          {/* Products */}
          <div className="px-5 py-4 border-b">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Productos ({account.items?.length || 0})
            </h4>
            {account.items?.length > 0 ? (
              <div className="space-y-1.5">
                {account.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                      {item.notes && (
                        <p className="text-[10px] text-amber-600 italic">Nota: {item.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{item.qty} × Q{Number(item.unit_price).toFixed(2)}</p>
                      <p className="text-sm font-semibold text-gray-900">Q{Number(item.line_total).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin productos (cargo manual)</p>
            )}
          </div>

          {/* Payments */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Pagos ({account.payments?.length || 0})
              </h4>
              {account.status !== 'paid' && (
                <button
                  onClick={() => setShowPayment(!showPayment)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  {showPayment ? 'Cancelar' : '+ Nuevo Pago'}
                </button>
              )}
            </div>

            {showPayment && (
              <m.div
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                style={{ transformOrigin: 'top' }}
                className="bg-blue-50 rounded-xl p-4 mb-3 space-y-3"
              >
                <p className="text-sm font-medium text-blue-900">Registrar Pago</p>
                <div>
                  <label className="text-xs text-blue-700">Monto</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full mt-1 p-2.5 border border-blue-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-blue-700">Método</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-blue-200 rounded-xl text-sm"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-blue-700">Referencia (opcional)</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="No. de referencia"
                    className="w-full mt-1 p-2.5 border border-blue-200 rounded-xl text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPayment(false)}
                    className="flex-1 py-2.5 border border-blue-200 rounded-xl text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handlePay}
                    disabled={paying || !payAmount}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                  >
                    {paying ? 'Pagando...' : `Pagar Q${parseFloat(payAmount || 0).toFixed(2)}`}
                  </button>
                </div>
              </m.div>
            )}

            {account.payments?.length > 0 ? (
              <div className="space-y-1.5">
                {account.payments.map(pay => (
                  <div key={pay.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Q{Number(pay.amount).toFixed(2)}</p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(pay.created_at).toLocaleDateString()} {new Date(pay.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">
                        {pay.payment_method}
                      </span>
                      {pay.reference && (
                        <p className="text-[10px] text-gray-400 mt-0.5">Ref: {pay.reference}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin pagos registrados</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white">
          <button onClick={onClose} className="w-full py-3 border border-gray-200 rounded-xl text-sm font-medium">
            Cerrar
          </button>
        </div>
      </m.div>
    </div>
  );
}

function GlobalPayModal({ client, onClose, onRefresh }) {
  const [amount, setAmount] = useState('');
  const [payMethod, setPayMethod] = useState('efectivo');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState(null);
  const toast = useToast();

  const handlePay = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    setPaying(true);
    try {
      const res = await api.cxc.payGlobal(client.id, { amount: val, payment_method: payMethod, reference, notes });
      toast.success(`Pago global de Q${res.total_paid.toFixed(2)} aplicado`);
      setResult(res);
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPaying(false);
    }
  };

  const balance = Number(client.current_balance || 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <m.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Pago Global - {client.full_name}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {result ? (
            <div className="space-y-3">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-700">Q{result.total_paid.toFixed(2)}</p>
                <p className="text-sm text-green-600 mt-1">Total pagado</p>
              </div>
              {result.remaining > 0 && (
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-sm text-amber-700">Saldo no aplicado: Q{result.remaining.toFixed(2)}</p>
                  <p className="text-xs text-amber-500">No hay suficientes cuentas pendientes para este monto</p>
                </div>
              )}
              <p className="text-sm text-gray-500 text-center">Nuevo saldo del cliente: <span className="font-semibold text-gray-900">Q{result.client_balance.toFixed(2)}</span></p>
              {result.applied_payments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cuentas afectadas ({result.applied_payments.length})</p>
                  <div className="space-y-1.5">
                    {result.applied_payments.map((p, i) => (
                      <div key={i} className="flex justify-between bg-gray-50 rounded-lg p-2.5 text-sm">
                        <span className="text-gray-600">Cuenta #{p.account_id}</span>
                        <span className="font-medium text-green-600">-Q{p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={onClose} className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium">
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Saldo Actual</p>
                  <p className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>Q{balance.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Límite</p>
                  <p className="text-lg font-bold text-gray-800">Q{Number(client.credit_limit || 0).toFixed(2)}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Monto a pagar *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl p-3 text-lg font-semibold"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Método de pago</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Referencia (opcional)</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="No. de referencia"
                  className="w-full border border-gray-200 rounded-xl p-3"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Notas (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas del pago..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl p-3 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm">
                  Cancelar
                </button>
                <button
                  onClick={handlePay}
                  disabled={paying || !amount || parseFloat(amount) <= 0}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando...</>
                  ) : (
                    <>Pagar Q{parseFloat(amount || 0).toFixed(2)}</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </m.div>
    </div>
  );
}

function StatementModal({ client, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterCenter, setFilterCenter] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCheck, setFilterCheck] = useState('');
  const toast = useToast();
  const { user } = useAuth();
  const tableRef = useRef(null);

  useEffect(() => {
    loadStatement();
  }, []);

  const loadStatement = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCenter) params.center_id = filterCenter;
      if (filterStartDate) params.start_date = filterStartDate;
      if (filterEndDate) params.end_date = filterEndDate;
      if (filterCheck) params.check_number = filterCheck;
      const res = await api.cxc.getStatement(client.id, params);
      setData(res);
    } catch (error) {
      toast.error('Error al cargar estado de cuenta');
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    const params = {};
    if (filterCenter) params.center_id = filterCenter;
    if (filterStartDate) params.start_date = filterStartDate;
    if (filterEndDate) params.end_date = filterEndDate;
    if (filterCheck) params.check_number = filterCheck;
    const qs = new URLSearchParams(params).toString();
    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`/api/cxc/export-statement/${client.id}${qs ? '?' + qs : ''}`, {
        headers: { ...(token && { 'X-Auth-Token': token }) }
      });
      if (!res.ok) throw new Error('Error al exportar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Estado_Cuenta_${client.full_name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Error al exportar Excel');
    }
  };

  const printReport = () => {
    if (!data) return;
    const w = window.open('', '_blank');
    const userName = user?.full_name || 'Usuario';
    const balance = Number(data.client.current_balance);
    const rowsHtml = data.movements.map((m, i) => `
      <tr${i % 2 === 1 ? ' class="alt"' : ''}>
        <td style="text-align:left">${new Date(m.date).toLocaleDateString()}</td>
        <td style="text-align:left">${m.description}</td>
        <td>${m.center_name || '-'}</td>
        <td class="${m.charge > 0 ? 'red' : ''}">${m.charge > 0 ? 'Q' + m.charge.toFixed(2) : '-'}</td>
        <td class="${m.payment > 0 ? 'green' : ''}">${m.payment > 0 ? 'Q' + m.payment.toFixed(2) : '-'}</td>
        <td class="${m.balance > 0 ? 'red' : 'green'}">Q${m.balance.toFixed(2)}</td>
      </tr>
    `).join('');

    w.document.write(`
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Estado de Cuenta - ${data.client.full_name}</title>
<style>
  @page { margin: 1.5cm; size: landscape; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #222; margin:0; padding:20px; }
  .header { text-align:center; margin-bottom:20px; }
  .header h1 { color: #1F4E79; font-size: 20pt; margin:0; }
  .header p { color: #666; font-size: 9pt; margin:2px 0; }
  .summary { display:flex; justify-content:center; gap:15px; margin:15px 0; }
  .summary > div { background:#f5f5f5; border:1px solid #ddd; border-radius:6px; padding:8px 18px; text-align:center; }
  .summary > div .label { font-size:7.5pt; color:#888; text-transform:uppercase; }
  .summary > div .value { font-size:16pt; font-weight:bold; }
  table { width:100%; border-collapse:collapse; margin-top:10px; }
  th { background:#1F4E79; color:#fff; font-size:8pt; text-transform:uppercase; padding:7px 6px; text-align:right; }
  th:first-child, th:nth-child(2), th:nth-child(3) { text-align:left; }
  td { padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:9pt; }
  td:first-child, td:nth-child(2), td:nth-child(3) { text-align:left; }
  .alt td { background:#f9f9f9; }
  .red { color:#d32f2f; font-weight:bold; }
  .green { color:#2e7d32; font-weight:bold; }
  .total td { background:#e8e8e8; font-weight:bold; font-size:10pt; border-top:2px solid #999; }
  .footer { text-align:center; color:#999; font-size:7.5pt; margin-top:20px; }
  @media print { body { padding:0; } .no-print { display:none; } }
</style></head><body>
<div class="no-print" style="text-align:right;margin-bottom:10px">
  <button onclick="window.print()" style="padding:6px 18px;background:#1F4E79;color:#fff;border:none;border-radius:4px;cursor:pointer">Imprimir</button>
  <button onclick="window.close()" style="padding:6px 18px;background:#ccc;border:none;border-radius:4px;cursor:pointer;margin-left:6px">Cerrar</button>
</div>
<div class="header">
  <h1>ESTADO DE CUENTA</h1>
  <p>${data.client.full_name}${data.client.area_name ? '  |  ' + data.client.area_name : ''}</p>
  <p>Generado por: ${userName}  |  ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  ${filterStartDate || filterEndDate ? '  |  Período: ' + (filterStartDate || '—') + ' al ' + (filterEndDate || '—') : ''}</p>
</div>
<div class="summary">
  <div><div class="label">Total Cargado</div><div class="value">Q${data.totals.total_charged.toFixed(2)}</div></div>
  <div><div class="label">Total Pagado</div><div class="value" style="color:#2e7d32">Q${data.totals.total_paid.toFixed(2)}</div></div>
  <div><div class="label">Saldo Actual</div><div class="value" style="color:${balance > 0 ? '#d32f2f' : '#2e7d32'}">Q${balance.toFixed(2)}</div></div>
  <div><div class="label">Límite</div><div class="value">Q${Number(data.client.credit_limit || 0).toFixed(2)}</div></div>
</div>
<table>
<thead><tr><th>Fecha</th><th>Descripción</th><th>Centro</th><th>Cargo</th><th>Pago</th><th>Saldo</th></tr></thead>
<tbody>${rowsHtml}</tbody>
<tfoot><tr class="total"><td colspan="3">TOTALES</td>
  <td class="red">Q${data.totals.total_charged.toFixed(2)}</td>
  <td class="green">Q${data.totals.total_paid.toFixed(2)}</td>
  <td class="${balance > 0 ? 'red' : 'green'}">Q${balance.toFixed(2)}</td>
</tr></tfoot>
</table>
<div class="footer">Documento generado el ${new Date().toLocaleString()} - Sistema de Cuentas por Cobrar</div>
<script>window.onload=function(){setTimeout(function(){document.querySelector('.no-print').style.display='none';window.print();window.close()},500)}</script>
</body></html>
`);
    w.document.close();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-5xl p-10 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const balance = Number(data.client.current_balance);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <m.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">Estado de Cuenta</h3>
            <p className="text-sm text-gray-500">
              {data.client.full_name}{data.client.area_name ? ` · ${data.client.area_name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={printReport}
              className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={exportExcel}
              className="px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-medium flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Centro:</label>
            <select
              value={filterCenter}
              onChange={(e) => setFilterCenter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
            >
              <option value="">Todos</option>
              {data.centers?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Chk:</label>
            <input
              type="text"
              value={filterCheck}
              onChange={(e) => setFilterCheck(e.target.value)}
              placeholder="No. de check"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white w-28"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Desde:</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Hasta:</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
            />
          </div>
          <button
            onClick={loadStatement}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium"
          >
            Filtrar
          </button>
          {(filterCenter || filterStartDate || filterEndDate || filterCheck) && (
            <button
              onClick={() => { setFilterCenter(''); setFilterStartDate(''); setFilterEndDate(''); setFilterCheck(''); }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="px-6 py-4 bg-gray-50 border-b grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Total Cargado</p>
            <p className="text-lg font-bold text-gray-900">Q{data.totals.total_charged.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Total Pagado</p>
            <p className="text-lg font-bold text-green-600">Q{data.totals.total_paid.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Saldo Actual</p>
            <p className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>Q{balance.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Límite</p>
            <p className="text-lg font-bold text-gray-900">Q{Number(data.client.credit_limit || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Movements Table */}
        <div className="flex-1 overflow-auto px-6 py-4" ref={tableRef}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Fecha</th>
                <th className="text-left py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Descripción</th>
                <th className="text-left py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Centro</th>
                <th className="text-right py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Cargo</th>
                <th className="text-right py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Pago</th>
                <th className="text-right py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {data.movements.map((m, i) => (
                <tr key={i} className={`border-b border-gray-50 ${m.type === 'initial' ? 'bg-gray-50' : ''}`}>
                  <td className="py-2.5 text-gray-600 whitespace-nowrap">{new Date(m.date).toLocaleDateString()}</td>
                  <td className={`py-2.5 ${m.type === 'initial' ? 'text-gray-400 italic' : 'text-gray-800'}`}>{m.description}</td>
                  <td className="py-2.5 text-gray-500 text-sm">{m.center_name || '-'}</td>
                  <td className="py-2.5 text-right">
                    {m.charge > 0 ? (
                      <span className="font-medium text-red-600">Q{m.charge.toFixed(2)}</span>
                    ) : '-'}
                  </td>
                  <td className="py-2.5 text-right">
                    {m.payment > 0 ? (
                      <span className="font-medium text-green-600">Q{m.payment.toFixed(2)}</span>
                    ) : '-'}
                  </td>
                  <td className={`py-2.5 text-right font-semibold ${
                    m.balance > 0 ? 'text-red-600' : m.balance < 0 ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    Q{m.balance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="py-3 text-gray-700" colSpan={3}>TOTALES</td>
                <td className="py-3 text-right text-red-600">Q{data.totals.total_charged.toFixed(2)}</td>
                <td className="py-3 text-right text-green-600">Q{data.totals.total_paid.toFixed(2)}</td>
                <td className={`py-3 text-right ${
                  balance > 0 ? 'text-red-600' : 'text-green-600'
                }`}>Q{balance.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">
            Cerrar
          </button>
        </div>
      </m.div>
    </div>
  );
}

function PendingSummaryModal({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterCenter, setFilterCenter] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [centers, setCenters] = useState([]);
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => { loadSummary(); }, []);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCenter) params.center_id = filterCenter;
      if (filterStartDate) params.start_date = filterStartDate;
      if (filterEndDate) params.end_date = filterEndDate;
      const res = await api.cxc.getPendingSummary(params);
      setData(res);
      setCenters(res.centers || []);
    } catch (error) {
      toast.error('Error al cargar resumen');
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    const params = {};
    if (filterCenter) params.center_id = filterCenter;
    if (filterStartDate) params.start_date = filterStartDate;
    if (filterEndDate) params.end_date = filterEndDate;
    const qs = new URLSearchParams(params).toString();
    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`/api/cxc/export-pending-summary${qs ? '?' + qs : ''}`, {
        headers: { ...(token && { 'X-Auth-Token': token }) }
      });
      if (!res.ok) throw new Error('Error al exportar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Reporte_Saldos_Pendientes.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Error al exportar Excel');
    }
  };

  const printReport = () => {
    if (!data) return;
    const w = window.open('', '_blank');
    const userName = user?.full_name || 'Usuario';
    const rowsHtml = (data.clients || []).map((c, i) => {
      const balance = Number(c.total_charged) - Number(c.total_paid);
      return `<tr${i % 2 === 1 ? ' class="alt"' : ''}>
        <td style="text-align:left">${c.full_name}</td>
        <td style="text-align:left">${c.area_name || '-'}</td>
        <td>${Number(c.account_count)}</td>
        <td>Q${Number(c.total_charged).toFixed(2)}</td>
        <td class="green">Q${Number(c.total_paid).toFixed(2)}</td>
        <td class="${balance > 0 ? 'red' : 'green'}">Q${balance.toFixed(2)}</td>
      </tr>`;
    }).join('');

    w.document.write(`
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Reporte General de Saldos</title>
<style>
  @page { margin: 1.5cm; size: landscape; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #222; margin:0; padding:20px; }
  .header { text-align:center; margin-bottom:20px; }
  .header h1 { color: #1F4E79; font-size: 20pt; margin:0; }
  .header p { color: #666; font-size: 9pt; margin:2px 0; }
  .summary { display:flex; justify-content:center; gap:15px; margin:15px 0; }
  .summary > div { background:#f5f5f5; border:1px solid #ddd; border-radius:6px; padding:8px 18px; text-align:center; }
  .summary > div .label { font-size:7.5pt; color:#888; text-transform:uppercase; }
  .summary > div .value { font-size:16pt; font-weight:bold; }
  table { width:100%; border-collapse:collapse; margin-top:10px; }
  th { background:#1F4E79; color:#fff; font-size:8pt; text-transform:uppercase; padding:7px 6px; text-align:right; }
  th:first-child, th:nth-child(2) { text-align:left; }
  td { padding:5px 6px; border:1px solid #ddd; text-align:right; font-size:9pt; }
  td:first-child, td:nth-child(2) { text-align:left; }
  .alt td { background:#f9f9f9; }
  .red { color:#d32f2f; font-weight:bold; }
  .green { color:#2e7d32; font-weight:bold; }
  .total td { background:#e8e8e8; font-weight:bold; font-size:10pt; border-top:2px solid #999; }
  .footer { text-align:center; color:#999; font-size:7.5pt; margin-top:20px; }
  @media print { body { padding:0; } .no-print { display:none; } }
</style></head><body>
<div class="no-print" style="text-align:right;margin-bottom:10px">
  <button onclick="window.print()" style="padding:6px 18px;background:#1F4E79;color:#fff;border:none;border-radius:4px;cursor:pointer">Imprimir</button>
  <button onclick="window.close()" style="padding:6px 18px;background:#ccc;border:none;border-radius:4px;cursor:pointer;margin-left:6px">Cerrar</button>
</div>
<div class="header">
  <h1>REPORTE GENERAL DE SALDOS</h1>
  <p>Generado por: ${userName}  |  ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  ${filterStartDate || filterEndDate ? '  |  Período: ' + (filterStartDate || '—') + ' al ' + (filterEndDate || '—') : ''}</p>
</div>
<div class="summary">
  <div><div class="label">Clientes</div><div class="value">${data.totals.total_clients}</div></div>
  <div><div class="label">Total Cargado</div><div class="value">Q${data.totals.total_charged.toFixed(2)}</div></div>
  <div><div class="label">Total Pagado</div><div class="value" style="color:#2e7d32">Q${data.totals.total_paid.toFixed(2)}</div></div>
  <div><div class="label">Saldo Total</div><div class="value" style="color:${data.totals.total_balance > 0 ? '#d32f2f' : '#2e7d32'}">Q${data.totals.total_balance.toFixed(2)}</div></div>
</div>
<table>
<thead><tr><th>Cliente</th><th>Área</th><th>Cuentas</th><th>Cargado</th><th>Pagado</th><th>Saldo</th></tr></thead>
<tbody>${rowsHtml}</tbody>
<tfoot><tr class="total"><td colspan="2">${data.totals.total_clients} clientes</td>
  <td>${data.clients.reduce((s, c) => s + Number(c.account_count), 0)}</td>
  <td>Q${data.totals.total_charged.toFixed(2)}</td>
  <td class="green">Q${data.totals.total_paid.toFixed(2)}</td>
  <td class="${data.totals.total_balance > 0 ? 'red' : 'green'}">Q${data.totals.total_balance.toFixed(2)}</td>
</tr></tfoot>
</table>
<div class="footer">Documento generado el ${new Date().toLocaleString()} - Sistema de Cuentas por Cobrar</div>
<script>window.onload=function(){setTimeout(function(){document.querySelector('.no-print').style.display='none';window.print();window.close()},500)}</script>
</body></html>
`);
    w.document.close();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-5xl p-10 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <m.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">Reporte General de Saldos</h3>
            <p className="text-sm text-gray-500">{data.totals.total_clients} clientes con saldo</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={printReport} className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium flex items-center gap-1.5">
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button onClick={exportExcel} className="px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-medium flex items-center gap-1.5">
              <Download className="w-4 h-4" />
              Excel
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Centro:</label>
            <select value={filterCenter} onChange={(e) => setFilterCenter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
              <option value="">Todos</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Desde:</label>
            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Hasta:</label>
            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white" />
          </div>
          <button onClick={loadSummary} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">Filtrar</button>
          {(filterCenter || filterStartDate || filterEndDate) && (
            <button onClick={() => { setFilterCenter(''); setFilterStartDate(''); setFilterEndDate(''); }} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600">Limpiar</button>
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50 border-b grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Clientes</p>
            <p className="text-lg font-bold text-gray-900">{data.totals.total_clients}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Total Cargado</p>
            <p className="text-lg font-bold text-gray-900">Q{data.totals.total_charged.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Total Pagado</p>
            <p className="text-lg font-bold text-green-600">Q{data.totals.total_paid.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Saldo Total</p>
            <p className={`text-lg font-bold ${data.totals.total_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>Q{data.totals.total_balance.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Cliente</th>
                <th className="text-left py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Área</th>
                <th className="text-right py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Cuentas</th>
                <th className="text-right py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Cargado</th>
                <th className="text-right py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Pagado</th>
                <th className="text-right py-3 text-[10px] text-gray-500 uppercase font-semibold tracking-wider">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {(data.clients || []).map((c, i) => (
                <tr key={c.id} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="py-3 text-gray-900 font-medium">{c.full_name}</td>
                  <td className="py-3 text-gray-500">{c.area_name || '-'}</td>
                  <td className="py-3 text-right text-gray-700">{c.account_count}</td>
                  <td className="py-3 text-right text-gray-800">Q{Number(c.total_charged).toFixed(2)}</td>
                  <td className="py-3 text-right text-green-600">Q{Number(c.total_paid).toFixed(2)}</td>
                  <td className={`py-3 text-right font-semibold ${Number(c.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    Q{Number(c.balance).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="py-3 text-gray-700" colSpan={2}>{data.totals.total_clients} clientes</td>
                <td className="py-3 text-right text-gray-700">{data.clients.reduce((s, c) => s + Number(c.account_count), 0)}</td>
                <td className="py-3 text-right text-gray-800">Q{data.totals.total_charged.toFixed(2)}</td>
                <td className="py-3 text-right text-green-600">Q{data.totals.total_paid.toFixed(2)}</td>
                <td className={`py-3 text-right ${data.totals.total_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  Q{data.totals.total_balance.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cerrar</button>
        </div>
      </m.div>
    </div>
  );
}