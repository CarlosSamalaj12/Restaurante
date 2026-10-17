import { useState, useEffect, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import api from '../api';
import { BackButton } from '../components/BackButton';
import { printPrecheckThermal } from '../utils/printReceipts';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { 
  Receipt, 
  Printer, 
  Link2, 
  Check, 
  Users, 
  Clock, 
  RefreshCw, 
  Loader2, 
  ArrowLeft,
  Search,
  User,
  Coins,
  AlertTriangle,
  ShoppingBag,
  X,
  RotateCcw,
  Lock,
  History,
  Building2,
  LogOut
} from 'lucide-react';

export function AccountsPage({ onBack, onSelectAccount, onNavigate }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('open'); // 'open' | 'closed'
  const [accounts, setAccounts] = useState([]);
  const [closedAccounts, setClosedAccounts] = useState([]);
  const [loadingClosed, setLoadingClosed] = useState(false);
  const [reopeningId, setReopeningId] = useState(null);
  const [centers, setCenters] = useState([]);
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [joining, setJoining] = useState(false);
  const [printing, setPrinting] = useState(null);
  const [businessProfile, setBusinessProfile] = useState(null);

  // Diálogo de confirmación moderno con diseño
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    itemName: '',
    itemDetail: '',
    confirmText: 'Confirmar',
    variant: 'warning',
    loading: false,
    onConfirm: () => {},
  });

  const closeConfirm = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
  };

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('ALL');
  const [filterMyTables, setFilterMyTables] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const [accountsRes, tablesRes, bootstrapRes] = await Promise.allSettled([
        api.getOpenAccounts(null),
        api.getTables(),
        api.bootstrap()
      ]);

      if (accountsRes.status === 'fulfilled') {
        const accs = accountsRes.value || [];
        setAccounts(accs);
        // If user has accounts, default to their tables
        const myCount = accs.filter(a => a.waiter_id === user?.id).length;
        if (myCount > 0) {
          setFilterMyTables(true);
        }
      }
      if (tablesRes.status === 'fulfilled') {
        setTables(tablesRes.value || []);
      }
      if (bootstrapRes.status === 'fulfilled') {
        const bCenters = bootstrapRes.value?.centers || [];
        setCenters(bCenters);
        if (bootstrapRes.value?.businessProfile) {
          setBusinessProfile(bootstrapRes.value.businessProfile);
        }
        if (bCenters.length > 0 && !selectedCenterId) {
          setSelectedCenterId(bCenters[0].id);
        }
      }
    } catch (err) {
      toast.error('Error al cargar cuentas');
    } finally {
      setLoading(false);
    }
  };

  const loadClosedAccounts = async (centerId = selectedCenterId) => {
    setLoadingClosed(true);
    try {
      const cId = centerId || centers[0]?.id || 1;
      const today = new Date().toISOString().split('T')[0];
      const results = await api.searchPaidAccounts(searchQuery || '', cId, today, today);
      setClosedAccounts(results || []);
    } catch (err) {
      console.error('Error al cargar cuentas cerradas:', err);
    } finally {
      setLoadingClosed(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'closed') {
      loadClosedAccounts();
    }
  }, [activeTab, selectedCenterId]);

  const handleReopenAccount = (account) => {
    if (account.shift_status === 'closed') {
      toast.error('No se puede reabrir: el turno de caja ya fue cerrado para mantener la integridad contable.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: '¿Reabrir esta cuenta?',
      message: 'Se transferirá nuevamente a cuentas activas para que puedas modificar platillos y ajustar o registrar formas de pago.',
      itemName: `Cuenta #${account.check_number} — Mesa ${account.table_code || 'S/N'}`,
      itemDetail: `Monto total acumulado: Q${Number(account.total || 0).toFixed(2)}`,
      variant: 'warning',
      confirmText: 'Reabrir Cuenta',
      loading: false,
      onConfirm: async () => {
        setReopeningId(account.id);
        setConfirmDialog((prev) => ({ ...prev, loading: true }));
        try {
          const res = await api.reopenAccount(account.id, 'Reapertura para modificación desde Cuentas');
          toast.success(res.message || 'Cuenta reabierta correctamente');
          closeConfirm();
          if (onSelectAccount) {
            onSelectAccount({
              id: res.accountId || account.id,
              table_code: res.tableCode || account.table_code,
              table_id: res.tableId || account.table_id
            });
          } else {
            loadAccounts();
            loadClosedAccounts();
          }
        } catch (e) {
          toast.error(e.message || 'Error al reabrir cuenta');
          closeConfirm();
        } finally {
          setReopeningId(null);
        }
      },
    });
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const toggleSelect = (accountId) => {
    setSelected((prev) => 
      prev.includes(accountId) 
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleJoin = () => {
    if (selected.length < 2) {
      toast.error('Selecciona al menos 2 cuentas para unir');
      return;
    }

    const selectedDetails = selected
      .map((id) => {
        const acc = accounts.find((a) => a.id === id);
        return acc ? `Mesa ${acc.table_code} (Q${Number(acc.total || 0).toFixed(2)})` : null;
      })
      .filter(Boolean)
      .join(' • ');

    setConfirmDialog({
      isOpen: true,
      title: '¿Unir cuentas en una sola?',
      message: `Se unificarán las ${selected.length} cuentas seleccionadas en una sola cuenta activa con todos sus consumos.`,
      itemName: `${selected.length} cuentas seleccionadas para fusión`,
      itemDetail: selectedDetails,
      variant: 'info',
      confirmText: 'Unir Cuentas',
      loading: false,
      onConfirm: async () => {
        setJoining(true);
        setConfirmDialog((prev) => ({ ...prev, loading: true }));
        try {
          const [targetId, ...sourceIds] = selected;
          for (const sourceId of sourceIds) {
            await api.joinAccounts(targetId, sourceId);
          }
          toast.success(`${selected.length} cuentas unidas exitosamente`);
          setSelected([]);
          setSelectMode(false);
          loadAccounts();
          closeConfirm();
        } catch (err) {
          toast.error(err.message || 'Error al unir cuentas');
          closeConfirm();
        } finally {
          setJoining(false);
        }
      },
    });
  };

  const handlePrint = async (accountId) => {
    setPrinting(accountId);
    try {
      const data = await api.printPrecheck(accountId);
      printPrecheckThermal({
        account: data.account,
        items: data.items,
        businessProfile
      });
      toast.success('Precuenta enviada a imprimir');
    } catch (err) {
      toast.error('Error al imprimir precuenta');
    } finally {
      setPrinting(null);
    }
  };

  const timeSince = (dateStr) => {
    if (!dateStr) return { text: '', isLong: false };
    const now = new Date();
    const then = new Date(dateStr);
    const diff = Math.max(0, Math.floor((now - then) / 60000));
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    const isLong = hrs >= 24;
    if (hrs === 0) return { text: `${mins}m`, isLong: false };
    return { text: `${hrs}h ${mins}m`, isLong };
  };

  // Metrics calculations
  const totalPending = useMemo(() => {
    return accounts.reduce((sum, a) => sum + Number(a.total || 0), 0);
  }, [accounts]);

  const occupiedTablesCount = useMemo(() => {
    return new Set(accounts.map((a) => a.table_id || a.table_code)).size;
  }, [accounts]);

  const totalTablesCount = tables.length > 0 ? tables.length : Math.max(accounts.length, 24);

  const emptyOrdersCount = useMemo(() => {
    return accounts.filter(
      (a) => (!a.items || a.items.length === 0) && Number(a.total || 0) === 0
    ).length;
  }, [accounts]);

  const avgTimeFormatted = useMemo(() => {
    if (accounts.length === 0) return '0 min';
    const totalMinutes = accounts.reduce((sum, a) => {
      if (!a.opened_at) return sum;
      const diff = Math.max(0, Math.floor((new Date() - new Date(a.opened_at)) / 60000));
      return sum + diff;
    }, 0);
    const avg = totalMinutes / accounts.length;
    if (avg < 60) return `${Math.round(avg)} min`;
    const hrs = Math.floor(avg / 60);
    const mins = Math.round(avg % 60);
    return `${hrs}h ${mins}m`;
  }, [accounts]);

  // Dynamic Salones / Areas from open accounts
  const areaGroups = useMemo(() => {
    const map = {};
    accounts.forEach((a) => {
      let areaKey = a.area_name || a.center_name || 'Salón Principal';
      const prefixMatch = (a.table_code || '').match(/^([A-Za-z]+)/);
      const prefix = prefixMatch ? prefixMatch[1] : '';
      let displayLabel = areaKey;
      if (prefix && !areaKey.toLowerCase().includes(prefix.toLowerCase())) {
        displayLabel = `${areaKey} - ${prefix}`;
      }
      if (!map[displayLabel]) {
        map[displayLabel] = { key: displayLabel, label: displayLabel, count: 0 };
      }
      map[displayLabel].count += 1;
    });
    return Object.values(map);
  }, [accounts]);

  const myAccountsCount = useMemo(() => {
    return accounts.filter((a) => a.waiter_id === user?.id).length;
  }, [accounts, user]);

  // Filtering accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTable = (account.table_code || '').toLowerCase().includes(q);
        const matchesCheck = (account.check_number ? String(account.check_number) : '').toLowerCase().includes(q);
        const matchesWaiter = (account.waiter_name || '').toLowerCase().includes(q);
        if (!matchesTable && !matchesCheck && !matchesWaiter) {
          return false;
        }
      }

      // 2. Salón / Area Filter
      if (selectedArea !== 'ALL') {
        let areaKey = account.area_name || account.center_name || 'Salón Principal';
        const prefixMatch = (account.table_code || '').match(/^([A-Za-z]+)/);
        const prefix = prefixMatch ? prefixMatch[1] : '';
        let displayLabel = areaKey;
        if (prefix && !areaKey.toLowerCase().includes(prefix.toLowerCase())) {
          displayLabel = `${areaKey} - ${prefix}`;
        }
        if (displayLabel !== selectedArea) {
          return false;
        }
      }

      // 3. Mis Mesas / Todo el Salón
      if (filterMyTables && user?.id) {
        if (account.waiter_id !== user.id) {
          return false;
        }
      }

      return true;
    });
  }, [accounts, searchQuery, selectedArea, filterMyTables, user]);

  // User presentation
  const userName = user?.full_name || user?.name || user?.username || 'Carlos Samalaj';
  const userInitials = useMemo(() => {
    const parts = userName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [userName]);

  const userRoleText = user?.role_name ? `${user.role_name} / Turno A` : 'Mesero / Turno A';

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-slate-800 pb-16">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-3">
            <BackButton 
              onClick={onBack}
              label="Volver"
              title="Volver"
            />
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/70 flex items-center justify-center text-[#0a4855] shadow-xs flex-shrink-0">
              <Receipt className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  {activeTab === 'open' ? 'Cuentas Abiertas' : 'Cuentas Cerradas / Reabrir'}
                </h1>
                <span className="bg-[#e1f5f7] text-[#0c7585] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#b2e7ed]">
                  {activeTab === 'open' ? `${accounts.length} activas` : `${closedAccounts.length} cerradas (hoy)`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal leading-tight hidden sm:block">
                {activeTab === 'open'
                  ? 'Control de mesas activas y facturación en curso'
                  : 'Historial de hoy y reapertura de cuentas para modificaciones contables'}
              </p>
            </div>
          </div>

          {/* Center: Search Box */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por mesa (ELD-2), comanda (#CHK-0062) o mesero..."
              className="w-full pl-10 pr-8 py-2 bg-slate-50/80 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all shadow-xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Actions & User Chip */}
          <div className="flex items-center gap-2 sm:gap-3">
            {activeTab === 'open' && accounts.length >= 2 && (
              <button
                onClick={() => {
                  setSelectMode(!selectMode);
                  setSelected([]);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs ${
                  selectMode
                    ? 'bg-[#0a4855] text-white shadow-[#0a4855]/20 shadow-md'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{selectMode ? 'Cancelar' : 'Unir Cuentas'}</span>
              </button>
            )}

            <button
              onClick={activeTab === 'open' ? loadAccounts : () => loadClosedAccounts()}
              disabled={activeTab === 'open' ? loading : loadingClosed}
              title="Actualizar cuentas"
              className="w-9 h-9 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${(activeTab === 'open' ? loading : loadingClosed) ? 'animate-spin text-teal-600' : ''}`} />
            </button>

            {/* Subtle Divider */}
            <div className="h-7 w-px bg-slate-200 hidden sm:block" />

            {/* User Profile Chip */}
            <div className="flex items-center gap-2.5 pl-1">
              <div className="w-9 h-9 rounded-full bg-[#0a4855] text-white font-bold text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                {userInitials}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {userRoleText}
                </p>
              </div>
            </div>

            {/* Botón Salir (PIN) */}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ml-1"
              title="Cerrar sesión / Salir (PIN)"
            >
              <LogOut className="w-4 h-4 text-red-600" />
              <span className="hidden sm:inline">Salir (PIN)</span>
            </button>
          </div>
        </div>

        {/* Tab switch row */}
        <div className="px-4 lg:px-6 pb-2.5 pt-1 max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setActiveTab('open')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'open'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Abiertas ({accounts.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('closed')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'closed'
                    ? 'bg-[#0a4855] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cerradas (Hoy) ({closedAccounts.length})</span>
              </button>
            </div>

            {onNavigate && (
              <button
                onClick={() => onNavigate('cxc')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all shadow-2xs cursor-pointer"
                title="Abrir Cuentas por Cobrar (Clientes, Créditos y Folios)"
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cuentas por Cobrar (CXC)</span>
              </button>
            )}
          </div>

          {activeTab === 'closed' && centers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Centro:
              </span>
              <select
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs outline-none"
              >
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Mobile Search Row */}
        <div className="px-4 pb-3 md:hidden">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por mesa, comanda o mesero..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1600px] mx-auto px-4 lg:px-6 pt-5">
        {activeTab === 'open' ? (
          <>
            {/* Metric Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {/* Card 1: TOTAL PENDIENTE */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                TOTAL PENDIENTE
              </span>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                Q{totalPending.toFixed(2)}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
              <Coins className="w-5 h-5 stroke-[2]" />
            </div>
          </div>

          {/* Card 2: MESAS OCUPADAS */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                MESAS OCUPADAS
              </span>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                {occupiedTablesCount}{' '}
                <span className="text-xs font-medium text-slate-500 font-sans tracking-normal">
                  de {totalTablesCount} mesas
                </span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-xs">
              <Users className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>

          {/* Card 3: SIN PEDIDOS */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                SIN PEDIDOS
              </span>
              <p className="text-2xl font-black text-amber-500 tracking-tight mt-1">
                {emptyOrdersCount}{' '}
                <span className="text-xs font-medium text-amber-600/90 font-sans tracking-normal">
                  requieren comanda
                </span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-xs">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>

          {/* Card 4: TIEMPO PROMEDIO */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                TIEMPO PROMEDIO
              </span>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                {avgTimeFormatted}
              </p>
            </div>
            <div className="w-11 h-11 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-xs">
              <Clock className="w-5 h-5 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          {/* Left: Salón Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
            <span className="text-xs font-bold text-slate-400 mr-1 flex-shrink-0">
              Salón:
            </span>
            <button
              onClick={() => setSelectedArea('ALL')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-xs ${
                selectedArea === 'ALL'
                  ? 'bg-[#0c4e5b] text-white shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/90'
              }`}
            >
              Todas ({accounts.length})
            </button>
            {areaGroups.map((group) => (
              <button
                key={group.key}
                onClick={() => setSelectedArea(group.key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-xs ${
                  selectedArea === group.key
                    ? 'bg-[#0c4e5b] text-white shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/90'
                }`}
              >
                {group.label} ({group.count})
              </button>
            ))}
          </div>

          {/* Right: Filtrar por Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-bold text-slate-400 mr-1">
              Filtrar por:
            </span>
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/70">
              <button
                onClick={() => setFilterMyTables(true)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterMyTables
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Mis Mesas ({myAccountsCount})
              </button>
              <button
                onClick={() => setFilterMyTables(false)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  !filterMyTables
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todo el Salón
              </button>
            </div>
          </div>
        </div>

        {/* Join Selection Sticky Bar (when selectMode is active) */}
        <AnimatePresence>
          {selectMode && selected.length >= 2 && (
            <m.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 bg-[#0a4855] text-white rounded-2xl p-4 shadow-lg flex items-center justify-between flex-wrap gap-3"
            >
              <div>
                <p className="text-sm font-bold">
                  {selected.length} cuentas seleccionadas para unir
                </p>
                <p className="text-xs text-teal-100">
                  Los productos y órdenes se combinarán en la primera cuenta elegida.
                </p>
              </div>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="bg-white text-[#0a4855] hover:bg-teal-50 px-5 py-2 rounded-xl text-xs font-black shadow-md flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                {joining ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                {joining ? 'Uniendo cuentas...' : `Unir ${selected.length} Cuentas Ahora`}
              </button>
            </m.div>
          )}
        </AnimatePresence>

        {/* Accounts Card Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
            <p className="text-xs font-semibold">Cargando cuentas activas...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs max-w-md mx-auto my-8">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400 border border-slate-100">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              No se encontraron cuentas abiertas
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {searchQuery.trim() || selectedArea !== 'ALL' || filterMyTables
                ? 'Prueba ajustando los filtros o el término de búsqueda.'
                : 'Actualmente no hay ninguna mesa con cuenta abierta.'}
            </p>
            {(searchQuery.trim() || selectedArea !== 'ALL' || filterMyTables) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedArea('ALL');
                  setFilterMyTables(false);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Restablecer Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAccounts.map((account) => {
              const isMine = account.waiter_id === user?.id;
              const isSelected = selected.includes(account.id);
              const isEmpty = (!account.items || account.items.length === 0) && Number(account.total || 0) === 0;
              const timeInfo = timeSince(account.opened_at);

              return (
                <div
                  key={account.id}
                  onClick={() => {
                    if (selectMode) toggleSelect(account.id);
                  }}
                  className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                    selectMode ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'ring-2 ring-teal-600 border-teal-600 shadow-md'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {/* Card Header (Deep Teal #0c4451) */}
                  <div className="bg-[#0c4451] text-white px-4 py-3 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-extrabold tracking-wide uppercase">
                          MESA {account.table_code}
                        </span>
                        {isMine && (
                          <span className="bg-white/20 text-white text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase">
                            MÍO
                          </span>
                        )}
                      </div>
                      {timeInfo.text && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          timeInfo.isLong 
                            ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
                            : 'bg-white/15 text-white/95'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {timeInfo.text}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-teal-200/80 mt-0.5">
                      {account.check_number ? (String(account.check_number).startsWith('#') ? account.check_number : `CHK-${account.check_number}`) : `ID-${account.id}`}
                    </p>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    {/* Waiter row & status badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-xs font-semibold text-slate-700 truncate">
                          {account.waiter_name}
                        </span>
                      </div>
                      {isEmpty ? (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200/70 text-[10px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0">
                          Esperando orden
                        </span>
                      ) : account.area_name ? (
                        <span className="text-[10px] text-slate-400 font-medium truncate flex-shrink-0">
                          {account.area_name}
                        </span>
                      ) : (
                        <span className="bg-sky-50 text-sky-700 border border-sky-200/70 text-[10px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0">
                          Cuenta Activa
                        </span>
                      )}
                    </div>

                    {/* Products list or empty state */}
                    <div className="min-h-[110px] flex flex-col justify-center my-1">
                      {isEmpty ? (
                        <div className="text-center py-2">
                          <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-1.5 text-slate-300">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                          <p className="text-xs font-medium text-slate-500 italic">
                            Sin productos agregados
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Toca entrar para registrar comanda
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {(account.items || []).slice(0, 4).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div className="flex items-center min-w-0 mr-2">
                                <span className="font-bold text-sky-700 mr-1.5 flex-shrink-0">
                                  {Number(item.qty || 1).toFixed(2)}x
                                </span>
                                <span className="text-slate-700 font-normal truncate">
                                  {item.product_name}
                                </span>
                              </div>
                              <span className="font-semibold text-slate-700 flex-shrink-0 whitespace-nowrap">
                                Q{Number(item.line_total || 0).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          {account.item_count > 4 && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectAccount(account);
                              }}
                              className="text-center text-[11px] font-semibold text-sky-600 hover:text-sky-700 py-1 bg-sky-50/60 rounded-lg cursor-pointer mt-1"
                            >
                              + {account.item_count - 4} productos más...
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Dashed divider */}
                    <div className="border-t border-dashed border-slate-200 my-2" />

                    {/* Subtotal & Guests */}
                    <div className="flex items-end justify-between">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium text-slate-400">
                          {account.guest_count || 1} pers.
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          SUBTOTAL
                        </span>
                        <span className="text-xl font-black text-slate-900 tracking-tight">
                          Q{Number(account.total || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Bottom */}
                  <div className="p-3 bg-slate-50/70 border-t border-slate-100">
                    {selectMode ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(account.id);
                        }}
                        className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                          isSelected
                            ? 'bg-[#0a4855] text-white shadow-[#0a4855]/20 shadow-sm'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-white text-[#0a4855] border-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        {isSelected ? 'Seleccionada' : 'Seleccionar'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(account.id);
                          }}
                          disabled={printing === account.id}
                          className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200/90 shadow-xs transition-colors disabled:opacity-50"
                        >
                          {printing === account.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Printer className="w-3.5 h-3.5" />
                          )}
                          Precuenta
                        </button>

                        {isEmpty ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAccount(account);
                            }}
                            className="flex-1 py-2 px-3 bg-[#0e1d28] hover:bg-[#1a2d3b] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                          >
                            + Tomar Pedido
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAccount(account);
                            }}
                            className="flex-1 py-2 px-3 bg-[#0a4855] hover:bg-[#083a45] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                          >
                            Entrar →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </>
        ) : (
          <div className="space-y-4">
            {/* Info notice about integrity */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm mb-0.5 text-amber-950">
                  Reapertura de Cuentas y Políticas de Auditoría
                </span>
                <p className="text-amber-800 leading-relaxed">
                  Solo se permite reabrir cuentas cuyo turno de caja siga <strong>activo</strong>. Al reabrir, la cuenta volverá a estar abierta en su mesa para que puedas corregir platillos, modificar o eliminar formas de pago erróneas y cerrarla nuevamente. Si el turno en que se cobró ya fue cerrado, la cuenta permanecerá bloqueada por integridad contable.
                </p>
              </div>
            </div>

            {loadingClosed ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
                <p className="text-xs font-semibold">Cargando cuentas cerradas...</p>
              </div>
            ) : closedAccounts.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs max-w-md mx-auto my-8">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400 border border-slate-100">
                  <History className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  No hay cuentas cerradas hoy en este centro
                </h3>
                <p className="text-xs text-slate-500">
                  Las cuentas cobradas hoy aparecerán aquí para consulta o reapertura.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {closedAccounts.map((account) => {
                  const isClosedShift = account.shift_status === 'closed';
                  const isReopening = reopeningId === account.id;

                  return (
                    <div
                      key={account.id}
                      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-4 space-y-3">
                        {/* Header: Table, Check and Shift Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-900 text-sm">
                                Mesa {account.table_code}
                              </span>
                              <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                #{account.check_number}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Cerrada: {account.closed_at ? new Date(account.closed_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }) : '---'}
                            </p>
                          </div>

                          {isClosedShift ? (
                            <span
                              title="Turno de caja cerrado. Por integridad contable la reapertura está bloqueada."
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3 text-slate-400" />
                              Turno Cerrado
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Turno Activo
                            </span>
                          )}
                        </div>

                        {/* Waiter info */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Mesero: <strong>{account.waiter_name || '---'}</strong></span>
                        </div>

                        {/* Amount */}
                        <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            TOTAL COBRADO
                          </span>
                          <span className="text-xl font-black text-slate-900 font-mono tracking-tight">
                            Q{Number(account.total || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Card Action */}
                      <div className="p-3 bg-slate-50/70 border-t border-slate-100">
                        {isClosedShift ? (
                          <div
                            title="No se puede reabrir porque el turno de caja ya fue cerrado."
                            className="w-full py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Turno Cerrado (Bloqueado)</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReopenAccount(account)}
                            disabled={isReopening}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                          >
                            {isReopening ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            <span>Reabrir Cuenta</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de confirmación estilizado */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        itemName={confirmDialog.itemName}
        itemDetail={confirmDialog.itemDetail}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        loading={confirmDialog.loading}
      />
    </div>
  );
}
