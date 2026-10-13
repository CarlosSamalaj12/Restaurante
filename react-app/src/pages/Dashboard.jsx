import { useState, useEffect, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import api from '../api';
import { MacDock } from '../components/MacDock';
import { CenterSelectorBar } from '../components/CenterSelectorBar';
import { InstallPwaButton } from '../components/InstallPwaButton';
import { 
  LayoutGrid, 
  Settings, 
  LogOut,
  Clock,
  Users,
  PlayCircle,
  BarChart3,
  CreditCard,
  ChefHat,
  Printer,
  Search,
  Plus,
  RefreshCw,
  Bell,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Receipt,
  Store,
  X,
  UtensilsCrossed,
  ArrowRight,
  TrendingUp,
  Shield,
  AlertTriangle
} from 'lucide-react';

export function Dashboard({ onNavigate, onSelectTable }) {
  const { user, logout, restaurantName, logoUrl, canView, hasPermission } = useAuth();

  // Estados principales
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [tables, setTables] = useState([]);
  const [openAccounts, setOpenAccounts] = useState([]);
  const [kdsOrders, setKdsOrders] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [shiftSummary, setShiftSummary] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeAccountIndex, setActiveAccountIndex] = useState(0);

  // Modales
  const [showQuickTableModal, setShowQuickTableModal] = useState(false);
  const [quickTableId, setQuickTableId] = useState(null);
  const [quickGuests, setQuickGuests] = useState(2);
  const [quickLoading, setQuickLoading] = useState(false);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);

  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Período del día y saludo
  const getDayPeriod = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { greeting: 'Buenos días', period: 'DESAYUNO' };
    if (hour < 18) return { greeting: 'Buenas tardes', period: 'ALMUERZO' };
    return { greeting: 'Buenas noches', period: 'CENA' };
  };

  const { greeting, period: mealPeriod } = getDayPeriod();

  // Carga inicial y datos
  const loadData = async (centerId, showIndicator = false) => {
    if (showIndicator) setIsSyncing(true);
    try {
      // 1. Bootstrap de centros
      const bData = await api.bootstrap().catch(() => ({ centers: [] }));
      const availableCenters = bData.centers || [];
      setCenters(availableCenters);

      const targetCenter = centerId || selectedCenter || availableCenters[0]?.id;
      if (!selectedCenter && targetCenter) {
        setSelectedCenter(targetCenter);
      }

      if (!targetCenter) {
        if (showIndicator) setIsSyncing(false);
        return;
      }

      // 2. Mesas del centro
      const tData = await api.getTables(targetCenter).catch(() => []);
      setTables(Array.isArray(tData) ? tData : []);

      // 3. Cuentas abiertas con ítems
      const accData = await api.getOpenAccounts(targetCenter).catch(() => []);
      const validAccounts = Array.isArray(accData) ? accData : [];
      setOpenAccounts(validAccounts);

      // Si el índice activo queda fuera de rango, resetear
      if (validAccounts.length === 0) {
        setActiveAccountIndex(0);
      } else if (activeAccountIndex >= validAccounts.length) {
        setActiveAccountIndex(0);
      }

      // 4. KDS Órdenes
      const kdsData = await api.kds.getOrders(targetCenter).catch(() => []);
      setKdsOrders(Array.isArray(kdsData) ? kdsData : []);

      // 5. Turno Activo
      const shiftRes = await api.checkActiveShift(targetCenter).catch(() => ({ active: false, shift: null }));
      setActiveShift(shiftRes?.active ? shiftRes.shift : null);

      if (shiftRes?.active && shiftRes.shift?.id) {
        try {
          const preview = await api.previewShift(targetCenter);
          setShiftSummary(preview?.summary || null);
        } catch {
          setShiftSummary(null);
        }
      } else {
        setShiftSummary(null);
      }

    } catch (err) {
      console.error('Error cargando información del Dashboard:', err);
    } finally {
      if (showIndicator) {
        setTimeout(() => setIsSyncing(false), 500);
      }
    }
  };

  // Carga al montar y al cambiar centro
  useEffect(() => {
    loadData(selectedCenter);
  }, [selectedCenter]);

  // Actualización periódica en segundo plano cada 20s
  useEffect(() => {
    const interval = setInterval(() => {
      loadData(selectedCenter, false);
    }, 20000);
    return () => clearInterval(interval);
  }, [selectedCenter]);

  // Cálculos de métricas
  const totalTablesCount = tables.length || 0;
  const freeTablesList = tables.filter(t => (t.open_accounts || 0) === 0);
  const freeTablesCount = freeTablesList.length;
  const busyTablesCount = totalTablesCount - freeTablesCount;
  const occupancyRate = totalTablesCount > 0 ? Math.round((busyTablesCount / totalTablesCount) * 100) : 0;
  const availableRate = 100 - occupancyRate;

  // Comensales
  const occupiedPax = openAccounts.reduce((acc, a) => acc + (Number(a.guest_count) || 2), 0);
  const totalPaxCapacity = tables.reduce((acc, t) => acc + (Number(t.capacity) || 4), 0);
  const freePax = Math.max(0, totalPaxCapacity - occupiedPax);

  // Ventas y cuentas por cobrar en salón
  const pendingFloorTotal = openAccounts.reduce((sum, a) => sum + (Number(a.total) || 0), 0);
  const shiftCashTotal = Number(shiftSummary?.cash_total || 0);
  const shiftSalesTotal = Number(shiftSummary?.total_sales || shiftSummary?.grand_total || shiftCashTotal || 0);
  const openingCash = Number(activeShift?.opening_cash || shiftSummary?.openingCash || 300);

  // Cocina y tiempos (conteo estricto de órdenes reales en KDS)
  const kitchenOrdersCount = Array.isArray(kdsOrders) ? kdsOrders.length : 0;
  
  // Mesa con mayor tiempo de espera o sentados
  const getElapsedMinutes = (dateStr) => {
    if (!dateStr) return 0;
    const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
    return Math.floor(diff / 60000);
  };

  // Notificaciones reales calculadas dinámicamente
  const notifications = useMemo(() => {
    const list = [];

    // 1. Órdenes demoradas en cocina (> 15 min)
    const delayedOrders = kdsOrders.filter((o) => {
      const min = getElapsedMinutes(o.created_at || o.opened_at);
      return min >= 15;
    });
    if (delayedOrders.length > 0) {
      list.push({
        id: 'delayed-kds',
        type: 'warning',
        icon: Clock,
        title: `${delayedOrders.length} comanda${delayedOrders.length > 1 ? 's' : ''} demorada${delayedOrders.length > 1 ? 's' : ''}`,
        desc: 'Hay órdenes en cocina con más de 15 minutos en preparación.',
        color: 'text-amber-500',
        bg: 'bg-amber-50',
        actionView: 'kds',
      });
    }

    // 2. Alerta de turno no abierto
    if (!activeShift) {
      list.push({
        id: 'no-shift',
        type: 'danger',
        icon: AlertTriangle,
        title: 'Turno de caja cerrado',
        desc: 'No hay un turno activo en este centro de operación.',
        color: 'text-rose-500',
        bg: 'bg-rose-50',
        actionView: 'shifts',
      });
    }

    // 3. Mesas con tiempo muy prolongado en salón (> 120 min)
    const longAccounts = openAccounts.filter((a) => {
      const min = getElapsedMinutes(a.opened_at || a.created_at);
      return min >= 120;
    });
    if (longAccounts.length > 0) {
      list.push({
        id: 'long-accounts',
        type: 'info',
        icon: Clock,
        title: `${longAccounts.length} mesa${longAccounts.length > 1 ? 's' : ''} con más de 2h`,
        desc: 'Mesas con servicio prolongado activas en salón.',
        color: 'text-blue-500',
        bg: 'bg-blue-50',
        actionView: 'tables',
      });
    }

    return list;
  }, [kdsOrders, activeShift, openAccounts]);

  // Mesa seleccionada en la tarjeta en vivo
  const currentActiveAccount = openAccounts[activeAccountIndex] || null;

  // Acciones rápidas: Abrir mesa
  const handleOpenQuickTable = async () => {
    if (!quickTableId) return;
    setQuickLoading(true);
    try {
      const selectedTbl = tables.find(t => t.id === quickTableId);
      const res = await api.createAccount(quickTableId, {
        waiterId: user?.id,
        guestCount: Number(quickGuests) || 2,
        centerId: selectedCenter,
      });

      const newAccountId = res?.accountId || res?.id;
      setShowQuickTableModal(false);
      setQuickTableId(null);

      if (onSelectTable && newAccountId) {
        onSelectTable(newAccountId, selectedTbl?.code || `M-${quickTableId}`, quickTableId);
      } else if (onNavigate) {
        onNavigate('tables');
      }
    } catch (err) {
      console.error('Error al abrir mesa rápida:', err);
      alert(err.message || 'No se pudo abrir la mesa');
    } finally {
      setQuickLoading(false);
    }
  };

  // Búsqueda de tickets
  const handleSearchTickets = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      // 1. Buscar en cuentas abiertas locales
      const queryLower = searchQuery.toLowerCase().trim();
      const localMatches = openAccounts.filter(a => 
        String(a.check_number || '').toLowerCase().includes(queryLower) ||
        String(a.table_code || '').toLowerCase().includes(queryLower) ||
        String(a.id || '') === queryLower
      );

      // 2. Si no hay muchas o es número, buscar pagadas
      let paidMatches = [];
      try {
        const paidRes = await api.searchPaidAccounts(queryLower, selectedCenter);
        if (Array.isArray(paidRes)) paidMatches = paidRes;
      } catch {}

      const combined = [
        ...localMatches.map(m => ({ ...m, is_open: true })),
        ...paidMatches.filter(p => !localMatches.some(l => l.id === p.id)).map(p => ({ ...p, is_open: false }))
      ];

      setSearchResults(combined);
    } catch (err) {
      console.error('Error en búsqueda de ticket:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Filtrado de módulos por roles
  const userRole = user?.role || 'waiter';
  const roleNameMap = {
    superadmin: 'Superadministrador',
    admin: 'Administrador',
    manager: 'Gerente',
    cashier: 'Cajero',
    waiter: 'Mesero',
    kitchen: 'Cocina'
  };

  const currentRoleLabel = roleNameMap[userRole] || userRole;
  const canViewExecutive = canView ? canView('executive') : (hasPermission?.('reports.view') ?? true);

  // Tarjetas de módulos táctiles
  const moduleCards = [
    {
      id: 'tables',
      title: 'Mesas & Salón',
      subtitle: 'Visualizar mapa, cambiar comensales y unir mesas',
      badge: `${totalTablesCount} Mesas`,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-100',
      icon: LayoutGrid,
      iconBg: 'bg-blue-600 text-white',
      footerLeft: `${freeTablesCount} Libres`,
      footerLeftColor: 'text-emerald-600 font-medium',
      footerRight: `${busyTablesCount} Ocupada${busyTablesCount !== 1 ? 's' : ''}`,
      footerRightColor: 'text-amber-600 font-medium',
      roles: ['superadmin', 'admin', 'manager', 'cashier', 'waiter']
    },
    {
      id: 'kds',
      title: 'KDS Cocina',
      subtitle: 'Pantalla de comandas en tiempo real y pase',
      badge: `${kitchenOrdersCount} Activa${kitchenOrdersCount !== 1 ? 's' : ''}`,
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-100',
      icon: ChefHat,
      iconBg: 'bg-orange-500 text-white',
      footerLeft: currentActiveAccount ? `Mesa ${currentActiveAccount.table_code}` : 'Sin comandas',
      footerLeftColor: 'text-gray-700 font-medium',
      footerRight: kitchenOrdersCount > 0 ? 'En preparación' : 'Al día',
      footerRightColor: kitchenOrdersCount > 0 ? 'text-orange-600 font-medium' : 'text-emerald-600 font-medium',
      roles: ['superadmin', 'admin', 'manager', 'cashier', 'kitchen']
    },
    {
      id: 'shifts',
      title: 'Turnos & Caja',
      subtitle: 'Apertura, arqueos parciales y corte final Z',
      badge: activeShift ? `Turno #${activeShift.id}` : 'Sin Turno',
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-100',
      icon: PlayCircle,
      iconBg: 'bg-teal-600 text-white',
      footerLeft: `Cajero: ${user?.full_name?.split(' ')[0] || 'Cajero'}`,
      footerLeftColor: 'text-gray-600',
      footerRight: activeShift ? 'Caja Abierta' : 'Cerrada',
      footerRightColor: activeShift ? 'text-emerald-600 font-medium' : 'text-gray-500',
      roles: ['superadmin', 'admin', 'manager', 'cashier']
    },
    {
      id: 'reports',
      title: 'Reportes',
      subtitle: 'Ventas por salón, productos top y métricas',
      badge: 'Día & Mes',
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-100',
      icon: BarChart3,
      iconBg: 'bg-amber-600 text-white',
      footerLeft: 'Ticket Promedio',
      footerLeftColor: 'text-gray-600',
      footerRight: busyTablesCount > 0 ? `Q ${(pendingFloorTotal / Math.max(1, busyTablesCount)).toFixed(2)}` : 'Q 0.00',
      footerRightColor: 'text-gray-900 font-semibold',
      roles: ['superadmin', 'admin', 'manager']
    },
    {
      id: 'settings',
      title: 'Configuración',
      subtitle: 'Menú, impresoras térmicas, cartas e impuestos',
      badge: 'Ajustes',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-100',
      icon: Settings,
      iconBg: 'bg-purple-600 text-white',
      footerLeft: 'Impresora Comandas',
      footerLeftColor: 'text-gray-600',
      footerRight: 'Conectada',
      footerRightColor: 'text-emerald-600 font-medium',
      roles: ['superadmin', 'admin', 'manager']
    },
    {
      id: 'accounts',
      title: 'Cuentas y Pagos',
      subtitle: 'División de cuentas, propinas, POS y reimpresión',
      badge: `${openAccounts.length} Por Cobrar`,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      icon: CreditCard,
      iconBg: 'bg-emerald-600 text-white',
      footerLeft: 'Por Facturar:',
      footerLeftColor: 'text-gray-600',
      footerRight: `Q ${pendingFloorTotal.toFixed(2)}`,
      footerRightColor: 'text-gray-900 font-bold',
      roles: ['superadmin', 'admin', 'manager', 'cashier']
    },
    {
      id: 'cxc',
      title: 'Cuentas por Cobrar (CXC)',
      subtitle: 'Clientes de crédito, estados de cuenta, cartera y abonos globales',
      badge: 'CXC & Folio',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      icon: Users,
      iconBg: 'bg-indigo-600 text-white',
      footerLeft: 'Crédito Folio',
      footerLeftColor: 'text-gray-600',
      footerRight: 'Gestión Cartera',
      footerRightColor: 'text-indigo-600 font-semibold',
      roles: ['superadmin', 'admin', 'manager', 'cashier'],
    },
    {
      id: 'expenses',
      title: 'Gastos & Proveedores (CXP)',
      subtitle: 'Egresos operativos, compras, cuentas por pagar y balance',
      badge: 'CXP & Gastos',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-100',
      icon: Receipt,
      iconBg: 'bg-rose-600 text-white',
      footerLeft: 'Control Egresos',
      footerLeftColor: 'text-gray-600',
      footerRight: 'Proveedores & P&L',
      footerRightColor: 'text-rose-600 font-semibold',
      roles: ['superadmin', 'admin', 'manager', 'cashier'],
    },
    {
      id: 'executive-dashboard',
      title: 'Dashboard Ejecutivo',
      subtitle: 'Métricas financieras, curvas de venta, salones y rendimiento',
      badge: 'Métricas',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      icon: TrendingUp,
      iconBg: 'bg-emerald-600 text-white',
      footerLeft: 'Ingresos y Ventas',
      footerLeftColor: 'text-gray-600',
      footerRight: 'Finanzas',
      footerRightColor: 'text-emerald-600 font-medium',
      roles: ['superadmin', 'admin', 'manager'],
      permission: 'dashboard.executive',
    }
  ];

  const visibleModules = moduleCards.filter((m) => {
    if (userRole === 'superadmin') return true;
    if (m.id === 'settings') {
      return ['superadmin', 'admin', 'manager'].includes(userRole);
    }
    if (canView) {
      return canView(m.id);
    }
    return !m.roles || m.roles.includes(userRole);
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-28 select-none font-sans antialiased">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR                                                         */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
        {/* ========================================================================= */}
        {/* TIER 1: Branding, Usuario & Acciones Principales                          */}
        {/* ========================================================================= */}
        <div className="px-4 lg:px-6 py-2.5">
          <div className="flex items-center justify-between gap-3 max-w-[1700px] mx-auto flex-wrap sm:flex-nowrap">
            
            {/* Lado Izquierdo: Branding, Saludo, Estado y Roles */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-11 h-11 rounded-xl bg-slate-950 text-white font-mono font-bold flex items-center justify-center text-sm shadow-sm ring-1 ring-black/5 overflow-hidden flex-shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={restaurantName || 'POS'} className="w-full h-full object-contain p-1" />
                ) : (
                  <span>{`{cs}`}</span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-slate-900 text-base lg:text-lg leading-tight">
                    {greeting}, {user?.full_name?.split(' ')[0] || 'Carlos'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    En línea
                  </span>
                  {userRole === 'superadmin' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200 shadow-xs">
                      <Shield className="w-3 h-3 text-purple-600" /> Superadmin
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                  <span className={userRole === 'superadmin' ? 'font-bold text-purple-700' : ''}>
                    {currentRoleLabel}
                  </span>
                  <span>•</span>
                  <span>{activeShift ? `Turno #${activeShift.id}` : 'Turno General'}</span>
                  <span>•</span>
                  <span>Caja #01</span>
                </p>
              </div>
            </div>

            {/* Lado Derecho: Reloj, Sincronización, Notificaciones y Salir */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {/* Reloj y Período */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-xl border border-slate-200/70 text-xs font-medium text-slate-700 shrink-0">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-mono font-semibold tracking-wider">
                  {currentTime.toLocaleTimeString('es-GT', { hour12: false })}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 tracking-wider">
                  {mealPeriod}
                </span>
              </div>

              {/* Acceso al Dashboard Ejecutivo */}
              {canViewExecutive && (
                <button
                  onClick={() => onNavigate('executive-dashboard')}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200/80 text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
                  title="Abrir Dashboard Ejecutivo"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Dashboard Ejecutivo</span>
                </button>
              )}

              {/* Acceso a Configuración */}
              {['superadmin', 'admin', 'manager'].includes(userRole) && (
                <button
                  onClick={() => onNavigate('settings')}
                  className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0 ${
                    userRole === 'superadmin'
                      ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                      : 'bg-slate-100 text-slate-700 border-slate-200/80 hover:bg-slate-200/80'
                  }`}
                  title="Abrir Configuración del Sistema"
                >
                  <Settings className={`w-3.5 h-3.5 ${userRole === 'superadmin' ? 'text-purple-600' : 'text-slate-600'}`} />
                  <span>Configuración</span>
                </button>
              )}

              {/* Acceso directo a Usuarios / Personal */}
              {['superadmin', 'admin'].includes(userRole) && (
                <button
                  onClick={() => onNavigate('settings', { tab: 'users' })}
                  className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
                  title="Gestión de Usuarios, Meseros, Cajeros y Códigos PIN"
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Usuarios</span>
                </button>
              )}

              {/* Botón Instalar PWA */}
              <InstallPwaButton variant="header" />

              {/* Botón Sincronizar */}
              <button
                onClick={() => loadData(selectedCenter, true)}
                title="Sincronizar información"
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/70 transition-colors shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
              </button>

              {/* Notificaciones */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/70 transition-colors cursor-pointer"
                  title="Alertas y notificaciones"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white animate-pulse">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {/* Popover de Notificaciones */}
                <AnimatePresence>
                  {showNotifications && (
                    <m.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-xs"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="font-bold text-slate-800">Alertas del Sistema</span>
                        <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100 mt-1 max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="py-6 text-center text-slate-500">
                            <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2 opacity-90" />
                            <p className="font-bold text-slate-800 text-xs">Todo al día</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">No hay órdenes demoradas ni alertas activas.</p>
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            const IconComp = notif.icon;
                            return (
                              <div
                                key={notif.id}
                                onClick={() => {
                                  if (notif.actionView && onNavigate) {
                                    onNavigate(notif.actionView);
                                    setShowNotifications(false);
                                  }
                                }}
                                className="py-2.5 px-2 flex items-start gap-2.5 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                              >
                                <div className={`p-1.5 rounded-lg shrink-0 ${notif.bg} ${notif.color}`}>
                                  <IconComp className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-slate-800 leading-tight">{notif.title}</p>
                                  <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">{notif.desc}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Botón Salir */}
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50/50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors text-xs font-semibold shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TIER 2: Selector de Salones / Centros de Operación (Ribbon Amplio)        */}
        {/* ========================================================================= */}
        {centers.length > 0 && (
          <div className="border-t border-slate-100/90 bg-slate-50/80 px-4 lg:px-6 py-2 shadow-inner">
            <div className="flex items-center gap-3 max-w-[1700px] mx-auto">
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-500 shrink-0">
                <Store className="w-3.5 h-3.5 text-indigo-600" />
                <span className="uppercase tracking-wider text-[11px] text-slate-600 font-extrabold">Salones:</span>
              </div>
              <div className="flex-1 min-w-0">
                <CenterSelectorBar
                  centers={centers}
                  selectedCenter={selectedCenter}
                  onSelectCenter={(id) => setSelectedCenter(id)}
                />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* CONTENEDOR PRINCIPAL                                                      */}
      {/* ========================================================================= */}
      <main className="max-w-[1700px] mx-auto px-4 lg:px-6 pt-5 space-y-6">

        {/* ========================================================================= */}
        {/* 2. TOP METRICS CARDS (4 TARJETAS)                                         */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Mesas Libres (Verde Menta) */}
          <m.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-[#F0FDF4] rounded-2xl p-4 border border-[#DCFCE7] shadow-sm relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] flex items-center justify-center text-[#15803D]">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#15803D]">
                  +{freeTablesCount} disponibles
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{freeTablesCount}</span>
                <span className="text-xs font-extrabold uppercase tracking-wide text-[#15803D]">Mesas Libres</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {availableRate}% de capacidad en salón disponible
              </p>
            </div>
            {/* Barra de progreso */}
            <div className="w-full bg-[#DCFCE7] h-1.5 rounded-full overflow-hidden mt-3">
              <div 
                className="bg-[#22C55E] h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(5, availableRate))}%` }} 
              />
            </div>
          </m.div>

          {/* Card 2: Mesas Ocupadas (Ámbar / Naranja) */}
          <m.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#FFFBEB] rounded-2xl p-4 border border-[#FEF3C7] shadow-sm relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
                  <Users className="w-4 h-4" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#D97706] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                  Activas
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{busyTablesCount}</span>
                <span className="text-xs font-extrabold uppercase tracking-wide text-[#D97706]">
                  {busyTablesCount === 1 ? 'Mesa Ocupada' : 'Mesas Ocupadas'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium truncate">
                {currentActiveAccount 
                  ? `Mesa ${currentActiveAccount.table_code} (${currentActiveAccount.guest_count || 2} personas) • ${getElapsedMinutes(currentActiveAccount.opened_at)} min sentados`
                  : 'Ninguna mesa ocupada en este momento'
                }
              </p>
            </div>
            {/* Barra de progreso */}
            <div className="w-full bg-[#FEF3C7] h-1.5 rounded-full overflow-hidden mt-3">
              <div 
                className="bg-[#F59E0B] h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(5, occupancyRate))}%` }} 
              />
            </div>
          </m.div>

          {/* Card 3: Órdenes Hoy (Azul Claro) */}
          <m.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#EFF6FF] rounded-2xl p-4 border border-[#DBEAFE] shadow-sm relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-[#DBEAFE] flex items-center justify-center text-[#2563EB]">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DBEAFE] text-[#2563EB]">
                  En cocina: {kitchenOrdersCount}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {Math.max(kitchenOrdersCount, busyTablesCount, 1)}
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wide text-[#2563EB]">Órdenes Hoy</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {currentActiveAccount?.check_number ? `Ticket #${currentActiveAccount.check_number}` : 'Tickets al día'} • Tiempo prom: 14 min
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 mt-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>KDS sincronizado sin demoras</span>
            </div>
          </m.div>

          {/* Card 4: Ventas Día (Púrpura / Violeta) */}
          <m.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#FAF5FF] rounded-2xl p-4 border border-[#F3E8FF] shadow-sm relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] flex items-center justify-center text-[#7E22CE] font-bold text-sm">
                  Q
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F3E8FF] text-[#7E22CE] flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 -rotate-45" />
                  Turno actual
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-slate-500">GTQ</span>
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {shiftSalesTotal.toFixed(2)}
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wide text-[#7E22CE]">Ventas Día</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium truncate">
                Pendiente de facturar en salón: <strong className="text-slate-700">Q {pendingFloorTotal.toFixed(2)}</strong>
              </p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mt-3 pt-2 border-t border-purple-100">
              <span>Fondo inicial: Q {openingCash.toFixed(2)}</span>
              <button 
                onClick={() => onNavigate('shifts')}
                className="text-[#7E22CE] font-bold hover:underline flex items-center gap-0.5"
              >
                Arqueo X <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </m.div>
        </div>

        {/* ========================================================================= */}
        {/* 3. SECCIÓN MEDIA: ACCIONES RÁPIDAS (IZQ) & ACTIVIDAD EN VIVO (DER)       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ======================================================================= */}
          {/* COLUMNA IZQUIERDA: ACCIONES RÁPIDAS & MÓDULOS (7 DE 12 COLS)           */}
          {/* ======================================================================= */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            
            {/* Header de la sección de módulos */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xs font-black text-slate-400 tracking-wider uppercase">
                  Acciones Rápidas & Módulos
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Selecciona una estación táctil para gestionar el servicio
                </p>
              </div>

              {/* Botones de acción superior */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all"
                >
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span>Buscar Ticket</span>
                </button>

                <button
                  onClick={() => {
                    const firstFree = freeTablesList[0]?.id || null;
                    setQuickTableId(firstFree);
                    setQuickGuests(2);
                    setShowQuickTableModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Abrir Mesa Rápida</span>
                </button>
              </div>
            </div>

            {/* Grid de 6 Tarjetas de Módulos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleModules.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <m.button
                    key={item.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.04 }}
                    whileHover={{ y: -3, transition: { duration: 0.15 } }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onNavigate(item.id)}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between h-44 group relative overflow-hidden"
                  >
                    {/* Encabezado de la tarjeta: Icono + Badge */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-11 h-11 rounded-xl ${item.iconBg} flex items-center justify-center shadow-sm`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      </div>

                      {/* Título y Subtítulo */}
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                          {item.title}
                        </h3>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {item.subtitle}
                      </p>
                    </div>

                    {/* Footer de estado */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className={`flex items-center gap-1.5 ${item.footerLeftColor}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {item.footerLeft}
                      </span>
                      <span className={`flex items-center gap-1.5 ${item.footerRightColor}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {item.footerRight}
                      </span>
                    </div>
                  </m.button>
                );
              })}
            </div>
          </div>

          {/* ======================================================================= */}
          {/* COLUMNA DERECHA: ACTIVIDAD EN VIVO DE SALÓN (5 DE 12 COLS)              */}
          {/* ======================================================================= */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            
            {/* Header columna derecha */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-black text-slate-400 tracking-wider uppercase">
                  Actividad en Vivo de Salón
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {centers.find(c => c.id === selectedCenter)?.name || 'Salón Principal'}
                </p>
              </div>

              {/* Indicador de conexión en vivo */}
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-bold text-emerald-700">En Vivo</span>
              </div>
            </div>

            {/* 1. Tarjeta de Orden Activa */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
              {currentActiveAccount ? (
                <>
                  {/* Encabezado de la mesa activa */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                        {currentActiveAccount.table_code?.replace(/\D/g, '') || '1'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Mesa {currentActiveAccount.table_code} ({currentActiveAccount.area_name || currentActiveAccount.center_name || 'Salón'})
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Mesero: {currentActiveAccount.waiter_name || user?.full_name?.split(' ')[0] || 'Roberto M.'} • {currentActiveAccount.guest_count || 2} Comensales
                        </p>
                      </div>
                    </div>

                    <div className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 font-extrabold text-xs">
                      Q {Number(currentActiveAccount.total || 0).toFixed(2)}
                    </div>
                  </div>

                  {/* Lista de productos pedidos */}
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 divide-y divide-slate-200/60 font-mono text-xs">
                    {Array.isArray(currentActiveAccount.items) && currentActiveAccount.items.length > 0 ? (
                      currentActiveAccount.items.slice(0, 4).map((itm, idx) => (
                        <div key={idx} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between">
                          <span className="text-slate-800 truncate mr-2">
                            <strong className="text-slate-900 font-semibold">{itm.qty}x</strong> {itm.product_name}
                          </span>
                          <span className="text-slate-700 font-medium flex-shrink-0">
                            Q {Number(itm.line_total || 0).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-2 text-center text-slate-400 font-sans text-xs">
                        Orden abierta sin ítems aún
                      </div>
                    )}
                  </div>

                  {/* Footer de la comanda: Tiempo en cocina + Botón Ver Comanda */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Cocina: {getElapsedMinutes(currentActiveAccount.opened_at)} min en preparación</span>
                    </div>

                    <button
                      onClick={() => {
                        if (onSelectTable) {
                          onSelectTable(currentActiveAccount.id, currentActiveAccount.table_code, currentActiveAccount.table_id);
                        } else {
                          onNavigate('tables');
                        }
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <span>Ver Comanda</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Controles del carrusel si hay más de 1 orden */}
                  {openAccounts.length > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <span>Mesa {activeAccountIndex + 1} de {openAccounts.length} activas</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setActiveAccountIndex(prev => (prev > 0 ? prev - 1 : openAccounts.length - 1))}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setActiveAccountIndex(prev => (prev < openAccounts.length - 1 ? prev + 1 : 0))}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Estado vacío cuando no hay mesas abiertas */
                <div className="text-center py-6">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs">Sin mesas ocupadas en este salón</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Utiliza el botón de &quot;Abrir Mesa Rápida&quot; para iniciar un nuevo servicio.
                  </p>
                </div>
              )}
            </div>

            {/* 2. Tarjeta de Verificación / Evento de Auditoría */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">
                    {activeShift ? 'Caja Chica verificada' : 'Turno cerrado'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {activeShift ? 'Apertura confirmada por Administrador' : 'Listo para iniciar nuevo turno'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-medium text-slate-400">
                {activeShift?.opened_at ? new Date(activeShift.opened_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }) : '19:30'}
              </span>
            </div>

            {/* 3. Tarjeta Oscura: Capacidad Total de Salón */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-white">Capacidad Total de Salón</h4>
                  <p className="text-[11px] text-slate-400">{occupancyRate}% ocupado</p>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-xs font-mono font-bold text-emerald-400 border border-slate-700">
                  {busyTablesCount} / {totalTablesCount} Mesas
                </span>
              </div>

              {/* Barra bicolor de capacidad */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div 
                  className="bg-amber-500 h-full transition-all duration-500" 
                  style={{ width: `${occupancyRate}%` }} 
                  title="Ocupado"
                />
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${availableRate}%` }} 
                  title="Disponible"
                />
              </div>

              {/* Leyenda de mesas y comensales */}
              <div className="flex items-center justify-between text-xs pt-1 text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {busyTablesCount} Ocupada ({occupiedPax} pax)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {freeTablesCount} Libres ({freePax} pax)
                </span>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 4. BARRA DE NAVEGACIÓN DOCK FLOTANTE ESTILO MACOS                         */}
      {/* ========================================================================= */}
      <MacDock
        currentView="dashboard"
        onNavigate={onNavigate}
        kitchenOrdersCount={kitchenOrdersCount}
      />

      {/* ========================================================================= */}
      {/* 5. MODAL: ABRIR MESA RÁPIDA                                               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showQuickTableModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <m.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Abrir Mesa Rápida</h3>
                    <p className="text-xs text-slate-500">Selecciona una mesa libre e indica los comensales</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowQuickTableModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selección de mesa libre */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mesa Disponible
                </label>
                {freeTablesList.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                    {freeTablesList.map(tbl => (
                      <button
                        key={tbl.id}
                        type="button"
                        onClick={() => setQuickTableId(tbl.id)}
                        className={`
                          p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1
                          ${quickTableId === tbl.id 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.02]' 
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                          }
                        `}
                      >
                        <span className="font-extrabold text-sm">{tbl.code}</span>
                        <span className={`text-[10px] ${quickTableId === tbl.id ? 'text-emerald-100' : 'text-slate-400'}`}>
                          Cap: {tbl.capacity || 4}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center font-medium">
                    No hay mesas libres en este salón. Revisa el salón o libera una mesa.
                  </div>
                )}
              </div>

              {/* Selector de Comensales */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Cantidad de Comensales
                </label>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-medium text-slate-600">Personas en la mesa:</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuickGuests(prev => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center shadow-sm"
                    >
                      -
                    </button>
                    <span className="font-bold font-mono text-base text-slate-900 w-6 text-center">
                      {quickGuests}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuickGuests(prev => prev + 1)}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Botón de Confirmación */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuickTableModal(false)}
                  className="w-1/3 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!quickTableId || quickLoading}
                  onClick={handleOpenQuickTable}
                  className="w-2/3 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {quickLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UtensilsCrossed className="w-4 h-4" />
                      <span>Abrir e Iniciar Orden</span>
                    </>
                  )}
                </button>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 6. MODAL: BUSCAR TICKET / CUENTA                                          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showSearchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <m.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Buscar Ticket o Cuenta</h3>
                    <p className="text-xs text-slate-500">Ingresa número de ticket, check o código de mesa</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSearchModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Formulario de búsqueda */}
              <form onSubmit={handleSearchTickets} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: 0104, ELD-10, o check..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {searchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Buscar'}
                </button>
              </form>

              {/* Resultados */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((res, i) => (
                    <div 
                      key={i}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            Ticket #{res.check_number || res.id}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            res.is_open ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {res.is_open ? 'Abierta' : 'Pagada'}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-0.5">
                          Mesa {res.table_code} • Total: Q {Number(res.total || 0).toFixed(2)}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setShowSearchModal(false);
                          if (res.is_open && onSelectTable) {
                            onSelectTable(res.id, res.table_code, res.table_id);
                          } else {
                            onNavigate('reprints');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold text-blue-600 hover:bg-blue-50"
                      >
                        {res.is_open ? 'Ver Orden' : 'Ver Recibo'}
                      </button>
                    </div>
                  ))
                ) : searchQuery && !searchLoading ? (
                  <p className="text-center text-xs text-slate-400 py-4">No se encontraron tickets con ese criterio.</p>
                ) : null}
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default Dashboard;
