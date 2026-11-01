import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useCxcData } from '../hooks/useCxcData';
import { ClientsTab } from '../components/cxc/ClientsTab';
import { AreasModal } from '../components/cxc/AreasModal';
import { ClientFormModal } from '../components/cxc/ClientFormModal';
import { AccountDetailModal } from '../components/cxc/AccountDetailModal';
import { GlobalPayModal } from '../components/cxc/GlobalPayModal';
import { StatementModal } from '../components/cxc/StatementModal';
import { PendingSummaryModal } from '../components/cxc/PendingSummaryModal';
import { BackButton } from '../components/BackButton';
import { useToast } from '../hooks/useToast';
import api from '../api';
import { 
  Users, 
  Building2, 
  FileText, 
  Loader2, 
  RefreshCw,
  Wallet,
  Coins,
  ShieldCheck,
  AlertTriangle,
  Search,
  Plus,
  LayoutGrid,
  Table2,
  X,
  UserCheck
} from 'lucide-react';

export function CXCPage({ onBack }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'debt' | 'clean' | 'exceeded'
  const [areaFilter, setAreaFilter] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Modals state
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [globalPayClient, setGlobalPayClient] = useState(null);
  const [statementClient, setStatementClient] = useState(null);
  const [showPendingSummary, setShowPendingSummary] = useState(false);
  const [showAreasModal, setShowAreasModal] = useState(false);
  const [clientFormModalData, setClientFormModalData] = useState(null); // null = closed, {} = new, client = edit

  const toast = useToast();
  const {
    clients = [],
    areas = [],
    loading,
    loadData
  } = useCxcData();

  // Financial KPIs Calculations
  const kpis = useMemo(() => {
    let totalPorCobrar = 0;
    let totalCreditoOtorgado = 0;
    let clientesConDeuda = 0;
    let clientesAlDia = 0;
    let clientesExcedidos = 0;

    clients.forEach((c) => {
      const balance = Number(c.current_balance || 0);
      const limit = Number(c.credit_limit || 0);
      totalPorCobrar += balance;
      totalCreditoOtorgado += limit;

      if (balance > 0) {
        clientesConDeuda++;
      } else {
        clientesAlDia++;
      }

      if (limit > 0 && balance >= limit * 0.8) {
        clientesExcedidos++;
      }
    });

    const totalCreditoDisponible = Math.max(0, totalCreditoOtorgado - totalPorCobrar);

    return {
      totalPorCobrar,
      totalCreditoOtorgado,
      totalCreditoDisponible,
      clientesConDeuda,
      clientesAlDia,
      clientesExcedidos
    };
  }, [clients]);

  // Filtered Clients List
  const filteredClients = useMemo(() => {
    const q = search.toLowerCase().trim();

    return clients.filter((c) => {
      // Search filter
      const matchesSearch =
        !q ||
        (c.full_name && c.full_name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.area_name && c.area_name.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Area filter
      if (areaFilter && String(c.cxc_area_id) !== String(areaFilter)) {
        return false;
      }

      // Status filter
      const balance = Number(c.current_balance || 0);
      const limit = Number(c.credit_limit || 0);

      if (statusFilter === 'debt') {
        return balance > 0;
      }
      if (statusFilter === 'clean') {
        return balance <= 0;
      }
      if (statusFilter === 'exceeded') {
        return (limit > 0 && balance >= limit * 0.8) || (limit === 0 && balance > 0);
      }

      return true;
    });
  }, [clients, search, areaFilter, statusFilter]);

  // Save client (create or edit)
  const handleSaveClient = async (formData) => {
    try {
      if (clientFormModalData?.id) {
        await api.cxc.updateClient(clientFormModalData.id, formData);
        toast.success('Cliente actualizado correctamente');
      } else {
        await api.cxc.createClient(formData);
        toast.success('Cliente creado exitosamente');
      }
      setClientFormModalData(null);
      loadData();
    } catch (error) {
      toast.error(error.message || 'Error al guardar cliente');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-9 h-9 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Cargando Cuentas por Cobrar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: Back & Title */}
          <div className="flex items-center justify-between gap-2.5 sm:gap-3 w-full md:w-auto min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <BackButton onClick={onBack} label="Volver" labelClassName="hidden sm:inline" title="Regresar al Menú Principal" />
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="font-extrabold text-slate-900 text-sm sm:text-lg tracking-tight truncate">
                    Cuentas por Cobrar (CXC)
                  </h1>
                  <span className="px-1.5 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                    Crédito
                  </span>
                </div>
                <p className="hidden sm:block text-[11px] text-slate-500 font-medium truncate">
                  Panel unificado de cobranza, límites de crédito y abonos
                </p>
              </div>
            </div>

            {/* Mobile-only primary action button */}
            <button
              onClick={() => setClientFormModalData({})}
              className="md:hidden px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cliente</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pb-0.5 -mx-1 px-1 sm:mx-0 sm:px-0">
            <button
              onClick={() => setClientFormModalData({})}
              className="hidden md:flex px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Cliente</span>
            </button>

            <button
              onClick={() => setShowAreasModal(true)}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100/80 text-purple-700 border border-purple-200 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
              <span>Áreas</span>
            </button>

            <button
              onClick={() => setShowPendingSummary(true)}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span>Reporte</span>
            </button>

            <button
              onClick={loadData}
              title="Actualizar datos de CXC"
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        {/* Executive KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Total por Cobrar */}
          <div className="bg-white p-3 sm:p-4.5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Total por Cobrar</p>
              <h3 className="text-base sm:text-xl font-extrabold text-rose-600 leading-tight truncate">
                Q{kpis.totalPorCobrar.toFixed(2)}
              </h3>
            </div>
          </div>

          {/* Clientes con Deuda */}
          <div className="bg-white p-3 sm:p-4.5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Con Deuda</p>
              <h3 className="text-base sm:text-xl font-extrabold text-slate-900 leading-tight truncate">
                {kpis.clientesConDeuda} <span className="text-[10px] sm:text-xs font-semibold text-slate-400">/ {clients.length}</span>
              </h3>
            </div>
          </div>

          {/* Crédito Otorgado */}
          <div className="bg-white p-3 sm:p-4.5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Coins className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Crédito Otorgado</p>
              <h3 className="text-base sm:text-xl font-extrabold text-slate-900 leading-tight truncate">
                Q{kpis.totalCreditoOtorgado.toFixed(2)}
              </h3>
            </div>
          </div>

          {/* Crédito Disponible */}
          <div className="bg-white p-3 sm:p-4.5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Disponible</p>
              <h3 className="text-base sm:text-xl font-extrabold text-emerald-600 leading-tight truncate">
                Q{kpis.totalCreditoDisponible.toFixed(2)}
              </h3>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-2.5 sm:space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente, teléfono o institución..."
                className="w-full pl-9 sm:pl-10 pr-9 py-2 sm:py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Area Filter Dropdown & View Mode */}
            <div className="flex items-center gap-2">
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="py-2 sm:py-2.5 px-3 sm:px-3.5 bg-slate-50/80 border border-slate-200 rounded-xl sm:rounded-2xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer flex-1 md:flex-initial"
              >
                <option value="">Todas las Áreas ({areas.length})</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              {/* View Switcher (Cards vs Table) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl sm:rounded-2xl border border-slate-200 shrink-0">
                <button
                  onClick={() => setViewMode('cards')}
                  title="Vista de Tarjetas Visuales"
                  className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  title="Vista de Tabla Contable"
                  className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Table2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Status Quick Filter Chips */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pb-0.5 pt-0.5 text-xs -mx-1 px-1 sm:mx-0 sm:px-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({clients.length})
            </button>

            <button
              onClick={() => setStatusFilter('debt')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                statusFilter === 'debt'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <span>Con Deuda</span>
              <span className="opacity-90 font-extrabold">({kpis.clientesConDeuda})</span>
            </button>

            <button
              onClick={() => setStatusFilter('clean')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                statusFilter === 'clean'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span>Al Día</span>
              <span className="opacity-90 font-extrabold">({kpis.clientesAlDia})</span>
            </button>

            <button
              onClick={() => setStatusFilter('exceeded')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                statusFilter === 'exceeded'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>En Riesgo</span>
              <span className="opacity-90 font-extrabold">({kpis.clientesExcedidos})</span>
            </button>
          </div>
        </div>

        {/* Client List / Table Section */}
        <ClientsTab
          clients={filteredClients}
          areas={areas}
          viewMode={viewMode}
          onRefresh={loadData}
          onAccountClick={setSelectedAccountId}
          onGlobalPay={setGlobalPayClient}
          onStatement={setStatementClient}
          onEditClient={(client) => setClientFormModalData(client)}
        />
      </div>

      {/* Modals & Dialogs */}
      <AnimatePresence>
        {/* Create / Edit Client Modal */}
        {clientFormModalData && (
          <ClientFormModal
            key="client-form"
            client={clientFormModalData.id ? clientFormModalData : null}
            areas={areas}
            onClose={() => setClientFormModalData(null)}
            onSave={handleSaveClient}
          />
        )}

        {/* Manage Areas Modal */}
        {showAreasModal && (
          <AreasModal
            key="areas-modal"
            areas={areas}
            onClose={() => setShowAreasModal(false)}
            onRefresh={loadData}
          />
        )}

        {/* Account Detail Modal */}
        {selectedAccountId && (
          <AccountDetailModal
            key="account-detail"
            accountId={selectedAccountId}
            onClose={() => setSelectedAccountId(null)}
            onRefresh={loadData}
          />
        )}

        {/* Global Pay / Abono Modal */}
        {globalPayClient && (
          <GlobalPayModal
            key="global-pay"
            client={globalPayClient}
            onClose={() => setGlobalPayClient(null)}
            onRefresh={loadData}
          />
        )}

        {/* Statement / Estado de Cuenta Modal */}
        {statementClient && (
          <StatementModal
            key="statement"
            client={statementClient}
            onClose={() => setStatementClient(null)}
          />
        )}

        {/* General Balances Report Modal */}
        {showPendingSummary && (
          <PendingSummaryModal
            key="pending-summary"
            onClose={() => setShowPendingSummary(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default CXCPage;