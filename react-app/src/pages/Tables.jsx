import { useState, useEffect, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { playNewOrderChime, playCallWaiterChime } from '../utils/soundAlerts';
import { MacDock } from '../components/MacDock';
import { BackButton } from '../components/BackButton';
import { printPrecheckThermal } from '../utils/printReceipts';
import {
  ArrowLeft,
  Users,
  Plus,
  Loader2,
  Clock,
  LayoutGrid,
  UtensilsCrossed,
  Printer,
  X,
  Coffee,
  Receipt,
  User,
  Check,
  Lock,
  BellRing,
  Smartphone,
  Monitor
} from 'lucide-react';

// Formato de tiempo transcurrido desde opened_at (ej. "42m", "1h 15m")
function formatElapsedTime(openedAt) {
  if (!openedAt) return null;
  const opened = new Date(openedAt).getTime();
  if (isNaN(opened)) return null;
  const now = Date.now();
  const diffMinutes = Math.floor(Math.max(0, now - opened) / 60000);
  if (diffMinutes < 60) {
    return `${Math.max(1, diffMinutes)}m`;
  }
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return `${hours}h ${mins}m`;
}

// Icono gráfico vectorial para mesas rectangulares (Salón / General)
function RectangularTableSVG({ isOccupied, seats = 4 }) {
  const isLarge = seats >= 6;
  return (
    <div className="relative flex flex-col items-center justify-center my-1 select-none pointer-events-none">
      {/* Sillas superiores */}
      <div className="flex gap-1.5 mb-1">
        <span
          className={`h-1.5 rounded-full transition-colors ${
            isOccupied ? 'bg-[#F6ACA3]' : 'bg-[#9FE1CD]'
          } ${isLarge ? 'w-3.5' : 'w-4'}`}
        />
        <span
          className={`h-1.5 rounded-full transition-colors ${
            isOccupied ? 'bg-[#F6ACA3]' : 'bg-[#9FE1CD]'
          } ${isLarge ? 'w-3.5' : 'w-4'}`}
        />
        {isLarge && (
          <span
            className={`h-1.5 w-3.5 rounded-full transition-colors ${
              isOccupied ? 'bg-[#F6ACA3]' : 'bg-[#9FE1CD]'
            }`}
          />
        )}
      </div>

      {/* Tablero central */}
      <div
        className={`rounded-lg flex items-center justify-center transition-colors shadow-xs ${
          isOccupied
            ? 'bg-[#FCEAE7] border border-[#F8B7AF] text-[#D13B2C]'
            : 'bg-white/80 border border-[#BCECE0] text-[#0D8267]'
        } ${isLarge ? 'w-16 h-8' : 'w-14 h-8'}`}
      >
        {isOccupied ? (
          <div className="flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-[#D13B2C]" />
          </div>
        ) : (
          <div className="flex gap-1 items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9FE1CD]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#9FE1CD]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#9FE1CD]" />
            {isLarge && <span className="w-1.5 h-1.5 rounded-full bg-[#9FE1CD]" />}
          </div>
        )}
      </div>

      {/* Sillas inferiores */}
      <div className="flex gap-1.5 mt-1">
        <span
          className={`h-1.5 rounded-full transition-colors ${
            isOccupied ? 'bg-[#F6ACA3]' : 'bg-[#9FE1CD]'
          } ${isLarge ? 'w-3.5' : 'w-4'}`}
        />
        <span
          className={`h-1.5 rounded-full transition-colors ${
            isOccupied ? 'bg-[#F6ACA3]' : 'bg-[#9FE1CD]'
          } ${isLarge ? 'w-3.5' : 'w-4'}`}
        />
        {isLarge && (
          <span
            className={`h-1.5 w-3.5 rounded-full transition-colors ${
              isOccupied ? 'bg-[#F6ACA3]' : 'bg-[#9FE1CD]'
            }`}
          />
        )}
      </div>
    </div>
  );
}

// Icono gráfico vectorial para mesas redondas (Terraza / Exterior)
function RoundTableSVG({ isOccupied }) {
  return (
    <div className="relative flex items-center justify-center my-1 select-none pointer-events-none">
      {/* Halo exterior de sillas redondas */}
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
          isOccupied ? 'bg-[#FDE2DF]/70' : 'bg-[#D9F4ED]/80'
        }`}
      >
        {/* Mesa redonda interior */}
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-xs ${
            isOccupied
              ? 'bg-white border border-[#F8B7AF] text-[#D13B2C]'
              : 'bg-white border border-[#BCECE0] text-[#0D8267]'
          }`}
        >
          {isOccupied ? (
            <Coffee className="w-4 h-4 text-[#D13B2C]" />
          ) : (
            <svg
              className="w-4 h-4 text-[#0D8267]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M4 12a8 8 0 0 1 16 0" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

export function Tables({ onBack, onSelectTable, centers, autoOpenTable, onNavigate }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState(null);

  // Modales
  const [activeTable, setActiveTable] = useState(null);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [modalAccounts, setModalAccounts] = useState([]);
  const [loadingModalAccounts, setLoadingModalAccounts] = useState(false);
  const [guestCount, setGuestCount] = useState(4);
  const [printingId, setPrintingId] = useState(null);

  const toast = useToast();
  const { user, selectedTerminal, restaurantName, logoUrl, currencySymbol = '$', canView, logout, businessProfile } = useAuth();

  const isKioskMode = user?.default_view === 'tables' && !canView('dashboard');
  const lockedCenterId = selectedTerminal?.operation_center_id || user?.operation_center_id;
  const canSwitchCenters = !isKioskMode && (!lockedCenterId || canView('dashboard'));

  useEffect(() => {
    if (lockedCenterId && (!selectedCenter || !canSwitchCenters)) {
      setSelectedCenter(lockedCenterId);
    } else if (selectedTerminal?.operation_center_id && !selectedCenter) {
      setSelectedCenter(selectedTerminal.operation_center_id);
    } else if (user?.operation_center_id && !selectedCenter) {
      setSelectedCenter(user.operation_center_id);
    }
  }, [user, selectedTerminal, lockedCenterId, canSwitchCenters]);

  useEffect(() => {
    loadTables();
  }, [selectedCenter]);

  // Manejo de auto-open cuando se navega con cuenta preseleccionada
  useEffect(() => {
    if (autoOpenTable && tables.length > 0) {
      const table = tables.find((t) => t.id === autoOpenTable.tableId);
      if (table) {
        onSelectTable(autoOpenTable.accountId, table.code, table.id);
      }
    }
  }, [autoOpenTable, tables]);

  const loadTables = async () => {
    setLoading(true);
    try {
      const data = await api.getTables(selectedCenter);
      setTables(data);
    } catch (error) {
      toast.error('Error al cargar mesas');
    } finally {
      setLoading(false);
    }
  };

  // Socket listeners para eventos en vivo de Auto-Comanda y Asistencia en Mesa
  const handleSelfServiceOrder = (data) => {
    playNewOrderChime();
    toast.success(`📱 ¡Nueva auto-comanda en Mesa ${data.tableCode || ''}! (Sin Mesero)`);
    loadTables();
  };

  const handleCallWaiter = (data) => {
    playCallWaiterChime();
    toast.warning(`🔔 Mesa ${data.tableCode || ''}: Cliente solicita mesero (${data.guestAlias || 'Comensal'})`);
    loadTables();
  };

  const handleRequestBill = (data) => {
    playCallWaiterChime();
    const methodLabel =
      data.paymentMethod === 'cash'
        ? 'Efectivo'
        : data.paymentMethod === 'bank_transfer'
        ? 'Transferencia'
        : 'Tarjeta';
    toast.info(`💳 Mesa ${data.tableCode || ''}: Cuenta solicitada (${methodLabel})`);
    loadTables();
  };

  const handleCallWaiterDismissed = () => {
    loadTables();
  };

  useSocket({
    'orders:self_service_new': handleSelfServiceOrder,
    'table:call_waiter': handleCallWaiter,
    'table:request_bill': handleRequestBill,
    'table:call_waiter_dismissed': handleCallWaiterDismissed,
  });

  const handleAttendWaiterCall = async (e, table) => {
    e?.stopPropagation?.();
    try {
      await api.digitalMenu.attendWaiterCall(table.id);
      toast.success(`Llamado de Mesa ${table.code} atendido`);
      loadTables();
      if (showAccountsModal && activeTable?.id === table.id) {
        fetchTableAccounts(table.id);
      }
    } catch (err) {
      toast.error('Error al marcar llamado como atendido');
    }
  };

  // Cargar cuentas frescas para una mesa
  const fetchTableAccounts = async (tableId) => {
    setLoadingModalAccounts(true);
    try {
      const accts = await api.getAccounts(tableId);
      setModalAccounts(accts || []);
      return accts;
    } catch (error) {
      toast.error('Error al cargar cuentas de la mesa');
      return [];
    } finally {
      setLoadingModalAccounts(false);
    }
  };

  // 1. Manejador para Abrir Mesa Libre
  const handleOpenFreeTable = (table) => {
    setActiveTable(table);
    setGuestCount(Number(table.seats) || 4);
    setShowQuickOpen(true);
  };

  const handleConfirmCreateAccount = async () => {
    if (!activeTable) return;
    try {
      const result = await api.createAccount(activeTable.id, {
        waiterId: user?.id || 1,
        guestCount,
        centerId: selectedCenter,
      });
      toast.success(`Cuenta ${result.checkNumber || ''} creada`);
      setShowQuickOpen(false);
      const targetTable = activeTable;
      setActiveTable(null);
      loadTables();
      onSelectTable(result.accountId, targetTable.code, targetTable.id);
    } catch (error) {
      toast.error(error.message || 'Error al abrir mesa');
    }
  };

  // 2. Manejador para botón [+ Comanda] en mesa ocupada
  const handleComandaPress = async (e, table) => {
    e.stopPropagation();
    setActiveTable(table);

    // Si la mesa ya tiene cuentas precargadas del backend
    const tableAccounts = table.accounts || [];

    if (tableAccounts.length === 1) {
      // 1 sola cuenta: Ir directo a ordenar
      onSelectTable(tableAccounts[0].id, table.code, table.id);
      return;
    }

    if (tableAccounts.length > 1) {
      // Múltiples cuentas: Mostrar selector rápido de cuenta
      setModalAccounts(tableAccounts);
      setShowAccountPicker(true);
      return;
    }

    // Fallback: Si no vinieron en el objeto table, consultarlas al server
    const fetched = await fetchTableAccounts(table.id);
    if (fetched.length === 1) {
      onSelectTable(fetched[0].id, table.code, table.id);
    } else if (fetched.length > 1) {
      setShowAccountPicker(true);
    } else {
      // No había cuenta activa, abrir creación
      setGuestCount(table.seats || 4);
      setShowQuickOpen(true);
    }
  };

  // 3. Manejador para botón [Cuentas (N)] o clic en el cuerpo de mesa ocupada
  const handleAccountsModalPress = async (e, table) => {
    if (e) e.stopPropagation();
    setActiveTable(table);
    setGuestCount(table.seats || 4);
    setShowAccountsModal(true);
    // Usar las cuentas que ya tiene la mesa si están disponibles, y refrescar en paralelo
    if (table.accounts && table.accounts.length > 0) {
      setModalAccounts(table.accounts);
    }
    fetchTableAccounts(table.id);
  };

  // Crear cuenta adicional dentro del modal de cuentas
  const handleCreateAdditionalAccount = async () => {
    if (!activeTable) return;
    try {
      const result = await api.createAccount(activeTable.id, {
        waiterId: user?.id || 1,
        guestCount,
        centerId: selectedCenter,
      });
      toast.success(`Cuenta adicional ${result.checkNumber || ''} creada`);
      setShowAccountsModal(false);
      setShowAccountPicker(false);
      const targetTable = activeTable;
      setActiveTable(null);
      loadTables();
      onSelectTable(result.accountId, targetTable.code, targetTable.id);
    } catch (error) {
      toast.error(error.message || 'Error al crear cuenta');
    }
  };

  // Imprimir pre-cuenta desde el modal
  const handlePrintPrecheck = async (e, accountId) => {
    e.stopPropagation();
    setPrintingId(accountId);
    try {
      const data = await api.printPrecheck(accountId);
      printPrecheckThermal({
        account: data.account,
        items: data.items,
        businessProfile
      });
      toast.success('Pre-cuenta enviada a imprimir');
    } catch (error) {
      toast.error(error.message || 'Error al imprimir pre-cuenta');
    } finally {
      setPrintingId(null);
    }
  };

  // Agrupar mesas por área
  const tablesByArea = useMemo(() => {
    return tables.reduce((acc, table) => {
      const areaKey = `${table.area_id || 'unknown'}-${table.area_name || 'Sin área'}`;
      const areaName = table.area_name || 'Sin área';
      if (!acc[areaKey]) acc[areaKey] = { name: areaName, tables: [] };
      acc[areaKey].tables.push(table);
      return acc;
    }, {});
  }, [tables]);

  const freeTables = tables.filter((t) => Number(t.open_accounts) === 0).length;
  const busyTables = tables.filter((t) => Number(t.open_accounts) > 0).length;

  return (
    <div className={`min-h-screen bg-[#F6F8F8] text-gray-900 select-none ${isKioskMode ? 'pb-8' : 'pb-24'}`}>
      {/* Header Principal */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Lado Izquierdo: Regresar + Título + Resumen + Pastillas de Estado */}
          <div className="flex items-center gap-3 flex-wrap">
            {canView('dashboard') && (
              <BackButton
                onClick={onBack}
                label="Inicio"
                title="Volver al Panel Principal"
              />
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 leading-tight">Mesas</h1>
              <p className="text-xs text-gray-500 font-medium">
                {tables.length} mesas · {busyTables} ocupadas
              </p>
            </div>

            {/* Badges de estado */}
            <div className="flex items-center gap-2 ml-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#D7F3EB] text-[#0D8267]">
                <span className="w-2 h-2 rounded-full bg-[#0D8267]" />
                {freeTables} libres
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FDE2DF] text-[#D13B2C]">
                <span className="w-2 h-2 rounded-full bg-[#D13B2C] animate-pulse" />
                {busyTables} ocupadas
              </span>
            </div>
          </div>

          {/* Lado Derecho: Filtro de Centros / Centro Asignado + Salir (PIN) + Avatar */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
            {canSwitchCenters ? (
              <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
                <button
                  onClick={() => setSelectedCenter(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCenter === null
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Todas
                </button>
                {centers?.map((center) => (
                  <button
                    key={center.id}
                    onClick={() => setSelectedCenter(center.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCenter === center.id
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {center.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-800 border border-gray-200/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>
                  {centers?.find((c) => c.id === selectedCenter)?.name ||
                    selectedTerminal?.center_name ||
                    'Salón Asignado'}
                </span>
              </div>
            )}

            {/* Botón Salir (PIN) para meseros y operadores */}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold transition-all shadow-2xs"
              title="Cerrar sesión / Cambiar de PIN"
            >
              <Lock className="w-3.5 h-3.5 text-red-600" />
              <span>Salir (PIN)</span>
            </button>

            {/* Avatar / Branding */}
            <div
              className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs shadow-xs ml-1 shrink-0"
              title={user?.full_name || ''}
            >
              {user?.full_name ? (
                user.full_name.charAt(0).toUpperCase()
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 py-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 text-gray-400">
            <Loader2 className="w-9 h-9 animate-spin text-gray-400 mb-3" />
            <p className="text-sm font-medium">Cargando mesas...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {Object.entries(tablesByArea).map(([areaKey, { name: areaName, tables: areaTables }]) => {
              const isTerrazaArea =
                areaName.toLowerCase().includes('terraza') ||
                areaName.toLowerCase().includes('exterior');
              const freeInArea = areaTables.filter((t) => Number(t.open_accounts) === 0).length;

              return (
                <m.section
                  key={areaKey}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-8"
                >
                  {/* Encabezado del Área */}
                  <div className="flex items-center justify-between mb-3.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-800" />
                      <h2 className="text-sm font-black text-gray-800 tracking-wider uppercase">
                        {areaName}
                      </h2>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50/80 text-blue-700 border border-blue-100/60">
                      {freeInArea === 0
                        ? `${areaTables.length} Mesas en Sala`
                        : `${freeInArea} Mesas Disponibles`}
                    </span>
                  </div>

                  {/* Cuadrícula de Mesas */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3.5">
                    {areaTables.map((table, index) => {
                      const isOccupied = Number(table.open_accounts) > 0;
                      const accountsCount = Number(table.open_accounts) || 0;
                      const isRound =
                        isTerrazaArea ||
                        table.code.toUpperCase().startsWith('TE') ||
                        Number(table.seats) <= 2;
                      const elapsedTime = formatElapsedTime(table.opened_at);
                      const tableTotal = Number(table.total) || 0;
                      const accountsList = table.accounts || [];
                      const hasWaiterCall = table.call_waiter_status === 'requested' || accountsList.some((a) => a.call_waiter_status === 'requested');
                      const isSelfOrder = table.order_source === 'qr_guest' || accountsList.some((a) => a.order_source === 'qr_guest');
                      const isKioskOrder = table.order_source === 'kiosk' || accountsList.some((a) => a.order_source === 'kiosk');

                      return (
                        <m.div
                          key={table.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.02, duration: 0.2 }}
                          whileHover={{ y: -2 }}
                          onClick={() => {
                            if (isOccupied) {
                              handleAccountsModalPress(null, table);
                            } else {
                              handleOpenFreeTable(table);
                            }
                          }}
                          className={`
                            relative flex flex-col justify-between p-3.5 rounded-2xl cursor-pointer
                            transition-all duration-200 border shadow-xs hover:shadow-md
                            ${
                              hasWaiterCall
                                ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400 text-amber-950'
                                : isOccupied
                                ? 'bg-[#FDF2F0] border-[#FED7D2] text-[#931D14]'
                                : 'bg-[#EAF8F5] border-[#BCECE0] text-[#095C48]'
                            }
                          `}
                        >
                          {/* Badge flotante de número de cuentas en esquina superior derecha */}
                          {isOccupied && accountsCount > 1 && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md z-10 ring-2 ring-white">
                              {accountsCount}
                            </div>
                          )}

                          {/* Banner de alerta si el cliente llama a mesero */}
                          {hasWaiterCall && (
                            <div className="w-full mb-2 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-amber-500 text-white text-[11px] font-black shadow-sm animate-pulse z-10">
                              <span className="flex items-center gap-1.5 truncate">
                                <BellRing className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">¡Llaman Mesero!</span>
                              </span>
                              <button
                                onClick={(e) => handleAttendWaiterCall(e, table)}
                                className="px-2 py-0.5 bg-white text-amber-900 text-[10px] font-black rounded-md hover:bg-amber-100 transition shadow-2xs shrink-0 active:scale-95"
                                title="Marcar como atendido"
                              >
                                Atender
                              </button>
                            </div>
                          )}

                          {/* Fila Superior de la Tarjeta: Badges e Info */}
                          <div className="flex items-center justify-between w-full mb-1">
                            {isOccupied ? (
                              <>
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FDE2DF] text-[#D13B2C]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#D13B2C] animate-pulse" />
                                    {elapsedTime || '1m'}
                                  </span>
                                  {isSelfOrder && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                                      <Smartphone className="w-3 h-3 text-blue-600" />
                                      QR
                                    </span>
                                  )}
                                  {isKioskOrder && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                                      <Monitor className="w-3 h-3 text-purple-600" />
                                      Kiosco
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-black text-[#D13B2C]">
                                  {currencySymbol}
                                  {tableTotal.toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#D7F3EB] text-[#0D8267]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#0D8267]" />
                                  Libre
                                </span>
                                <span className="text-[11px] font-semibold text-[#0D8267]/75">
                                  {table.seats >= 6 ? `Mesa Grande: ${table.seats}p` : `Cap: ${table.seats || 4}p`}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Gráfico Central: Silueta de la Mesa */}
                          <div className="py-1 flex items-center justify-center">
                            {isRound ? (
                              <RoundTableSVG isOccupied={isOccupied} />
                            ) : (
                              <RectangularTableSVG isOccupied={isOccupied} seats={table.seats} />
                            )}
                          </div>

                          {/* Nombre de la Mesa y Subtítulos */}
                          <div className="text-center w-full mt-0.5">
                            <span
                              className={`text-lg font-black tracking-tight block ${
                                isOccupied ? 'text-[#C02E20]' : 'text-[#0D6353]'
                              }`}
                            >
                              {table.code}
                            </span>

                            {isOccupied ? (
                              <div className="space-y-1 mt-0.5">
                                <p className="text-[11px] font-medium text-[#C02E20]/80 truncate">
                                  {isSelfOrder ? 'Auto-Comanda (Sin Mesero)' : (table.waiter_name || 'Sin mesero')}
                                </p>

                                {/* Desglose de cuentas */}
                                {accountsList.length > 0 && (
                                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#C02E20] bg-white/70 py-0.5 px-1.5 rounded-md border border-[#FAD7D2] truncate">
                                    {accountsList.slice(0, 2).map((acc, idx) => (
                                      <span key={acc.id} className="whitespace-nowrap">
                                        Cta {idx + 1}: {currencySymbol}
                                        {Number(acc.total).toFixed(2)}
                                      </span>
                                    ))}
                                    {accountsList.length > 2 && (
                                      <span className="text-[9px] text-[#C02E20]/70 font-semibold">
                                        +{accountsList.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-[#0D8267]/80 mt-0.5">
                                <Users className="w-3 h-3 opacity-70" />
                                <span>{table.seats || 4}</span>
                              </div>
                            )}
                          </div>

                          {/* Botones Inferiores de Acción */}
                          <div className="mt-3 w-full">
                            {isOccupied ? (
                              <div className="grid grid-cols-2 gap-1.5 w-full">
                                <m.button
                                  whileTap={{ scale: 0.94 }}
                                  onClick={(e) => handleComandaPress(e, table)}
                                  className="py-1.5 px-1 bg-white text-[#C02E20] text-[11px] font-extrabold rounded-lg border border-[#F8B7AF] hover:bg-[#FDECE9] active:scale-[0.98] transition-all flex items-center justify-center gap-0.5 shadow-2xs"
                                  title="Tomar comanda"
                                >
                                  <Plus className="w-3 h-3 stroke-[3]" />
                                  <span>Comanda</span>
                                </m.button>
                                <m.button
                                  whileTap={{ scale: 0.94 }}
                                  onClick={(e) => handleAccountsModalPress(e, table)}
                                  className="py-1.5 px-1 bg-black text-white text-[11px] font-extrabold rounded-lg hover:bg-neutral-800 active:scale-[0.98] transition-all flex items-center justify-center gap-1 shadow-2xs"
                                  title="Ver cuentas"
                                >
                                  <span>Cuentas ({accountsCount})</span>
                                </m.button>
                              </div>
                            ) : (
                              <m.button
                                whileTap={{ scale: 0.96 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenFreeTable(table);
                                }}
                                className="w-full py-2 px-2 bg-white text-[#0D8267] text-xs font-bold rounded-xl border border-[#BCECE0] hover:bg-[#E5F8F3] active:scale-[0.98] transition-all flex items-center justify-center gap-1 shadow-2xs"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Abrir Mesa</span>
                              </m.button>
                            )}
                          </div>
                        </m.div>
                      );
                    })}
                  </div>
                </m.section>
              );
            })}
          </AnimatePresence>
        )}

        {/* Estado Vacío */}
        {!loading && tables.length === 0 && (
          <div className="text-center py-28">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-400">
              <LayoutGrid className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-1">No hay mesas disponibles</h3>
            <p className="text-xs text-gray-500">No encontramos mesas para el centro seleccionado</p>
          </div>
        )}
      </main>

      {/* Barra de Navegación Inferior Flotante Estilo macOS */}
      {!isKioskMode && (
        <MacDock currentView="tables" onNavigate={onNavigate} />
      )}

      {/* ======================================================== */}
      {/* 1. MODAL RÁPIDO PARA ABRIR MESA LIBRE */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showQuickOpen && activeTable && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setShowQuickOpen(false)}
          >
            <m.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 min-w-[56px] px-3.5 rounded-2xl bg-[#EAF8F5] border border-[#BCECE0] text-[#0D8267] flex items-center justify-center font-black text-base whitespace-nowrap shrink-0 shadow-xs tracking-tight">
                    {activeTable.code}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
                      Abrir Mesa {activeTable.code}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
                      {activeTable.area_name} · Capacidad: {activeTable.seats}p
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQuickOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selector de Comensales */}
              <div className="my-5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Número de comensales
                </label>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded-2xl border border-gray-100">
                  <m.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                    className="w-12 h-12 bg-white rounded-xl shadow-xs text-xl font-black text-gray-700 hover:bg-gray-100 flex items-center justify-center"
                  >
                    −
                  </m.button>
                  <div className="text-center">
                    <span className="text-3xl font-black text-gray-900">{guestCount}</span>
                    <span className="block text-[11px] font-medium text-gray-500">
                      {guestCount === 1 ? 'persona' : 'personas'}
                    </span>
                  </div>
                  <m.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setGuestCount(Math.min(20, guestCount + 1))}
                    className="w-12 h-12 bg-white rounded-xl shadow-xs text-xl font-black text-gray-700 hover:bg-gray-100 flex items-center justify-center"
                  >
                    +
                  </m.button>
                </div>

                {/* Accesos rápidos de comensales */}
                <div className="flex justify-between gap-2 mt-3">
                  {[1, 2, 4, 6, 8].map((num) => (
                    <button
                      key={num}
                      onClick={() => setGuestCount(num)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        guestCount === num
                          ? 'bg-[#0D8267] text-white border-[#0D8267] shadow-xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {num}p
                    </button>
                  ))}
                </div>
              </div>

              {/* Botón de Apertura */}
              <m.button
                whileTap={{ scale: 0.97 }}
                onClick={handleConfirmCreateAccount}
                className="w-full py-3.5 bg-gray-950 text-white rounded-2xl font-bold text-sm shadow-md hover:bg-black transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Abrir Mesa y Tomar Comanda
              </m.button>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 2. MODAL SELECTOR RÁPIDO DE CUENTA (+ Comanda con múltiples) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showAccountPicker && activeTable && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setShowAccountPicker(false)}
          >
            <m.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 min-w-[50px] px-3 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-sm whitespace-nowrap shadow-sm">
                    {activeTable.code}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Mesa {activeTable.code}</h3>
                    <p className="text-xs text-slate-500 font-medium">¿A qué cuenta agregarás comanda?</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAccountPicker(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lista de Cuentas */}
              <div className="space-y-2.5 my-3 max-h-60 overflow-y-auto pr-1">
                {modalAccounts.map((account, idx) => (
                  <m.button
                    key={account.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowAccountPicker(false);
                      onSelectTable(account.id, activeTable.code, activeTable.id);
                    }}
                    className="w-full p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-200 rounded-2xl flex items-center justify-between transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 text-white shadow-2xs flex items-center justify-center text-xs font-black">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900 text-xs">
                          {account.check_number || `Cuenta #${idx + 1}`}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold text-slate-700">{account.waiter_name || activeTable.waiter_name}</span>
                          <span>•</span>
                          <span>{account.guest_count} {Number(account.guest_count) === 1 ? 'comensal' : 'comensales'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-xs text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-lg">
                        {currencySymbol} {Number(account.totals?.total ?? account.total ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </m.button>
                ))}
              </div>

              {/* Opción para crear cuenta nueva */}
              <button
                onClick={handleCreateAdditionalAccount}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Crear Nueva Cuenta en esta Mesa
              </button>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 3. MODAL DE GESTIÓN DE CUENTAS (Cuentas (N) / Clic en Ocupada) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showAccountsModal && activeTable && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center sm:p-4"
            onClick={() => setShowAccountsModal(false)}
          >
            <m.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden"
            >
              {/* Barra superior de arrastre en móvil */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Cabecera del Modal */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 min-w-[54px] px-3.5 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-base shadow-sm whitespace-nowrap tracking-wide flex-shrink-0">
                    {activeTable.code}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-extrabold text-gray-900 text-lg leading-tight">
                        Mesa {activeTable.code}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Ocupada
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-medium">
                      <span>{activeTable.area_name || 'Salón Principal'}</span>
                      <span className="text-gray-300">•</span>
                      <span>Total en mesa:</span>
                      <span className="font-extrabold text-amber-900 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-lg text-xs">
                        {currencySymbol} {Number(activeTable.total || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowAccountsModal(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido: Cuentas Abiertas */}
              <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                    Cuentas Activas ({modalAccounts.length})
                  </h3>
                  {loadingModalAccounts && (
                    <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                  )}
                </div>

                {modalAccounts.length === 0 && !loadingModalAccounts && (
                  <p className="text-xs text-gray-400 py-6 text-center">No hay cuentas abiertas en esta mesa</p>
                )}

                {modalAccounts.map((account, index) => {
                  const accTotal = Number(account.totals?.total ?? account.total ?? 0);
                  const isPrintingThis = printingId === account.id;
                  const isQrAccount = account.order_source === 'qr_guest';
                  const isKioskAccount = account.order_source === 'kiosk';
                  const isCallingWaiter = account.call_waiter_status === 'requested';
                  const waiterName = isQrAccount
                    ? 'Auto-Comanda (Sin Mesero)'
                    : (account.waiter_name || activeTable.waiter_name || 'Mesero');

                  return (
                    <div
                      key={account.id}
                      className="p-4 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-sm transition-all space-y-3"
                    >
                      {/* Banner de llamado de mesero en la cuenta */}
                      {isCallingWaiter && (
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-xs animate-pulse">
                          <span className="flex items-center gap-1.5">
                            <BellRing className="w-3.5 h-3.5" />
                            <span>¡Comensal solicita mesero!</span>
                          </span>
                          <button
                            onClick={(e) => handleAttendWaiterCall(e, activeTable)}
                            className="px-2.5 py-0.5 bg-white text-amber-900 text-[10px] font-black rounded-md hover:bg-amber-100 transition shadow-2xs"
                          >
                            Atender
                          </button>
                        </div>
                      )}

                      {/* Cabecera de la cuenta: Número, Nombre de responsable / mesero, comensales y monto */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-xs flex-shrink-0">
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                                {account.check_number || `Cuenta #${index + 1}`}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                <Users className="w-3 h-3 text-slate-500" />
                                {account.guest_count || 1} {Number(account.guest_count) === 1 ? 'comensal' : 'comensales'}
                              </span>
                              {isQrAccount && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                                  <Smartphone className="w-3 h-3 text-blue-600" />
                                  QR Auto
                                </span>
                              )}
                              {isKioskAccount && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                                  <Monitor className="w-3 h-3 text-purple-600" />
                                  Kiosco
                                </span>
                              )}
                              {account.requested_payment_method && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  💳 Pide: {account.requested_payment_method === 'cash' ? 'Efectivo' : (account.requested_payment_method === 'transfer' || account.requested_payment_method === 'bank_transfer') ? 'Transferencia' : 'Tarjeta'}
                                </span>
                              )}
                            </div>

                            {/* Fila del Nombre del Mesero / Responsable */}
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                <User className="w-2.5 h-2.5" />
                              </div>
                              <span className="text-xs font-bold text-slate-800">
                                {waiterName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                (Atiende)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Total de la Cuenta */}
                        <div className="text-right flex-shrink-0">
                          <span className={`inline-block px-2.5 py-1 rounded-xl font-extrabold text-sm ${
                            accTotal > 0 
                              ? 'bg-amber-50 text-amber-800 border border-amber-200/70' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {currencySymbol} {accTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Botones de acción por cuenta */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setShowAccountsModal(false);
                            onSelectTable(account.id, activeTable.code, activeTable.id);
                          }}
                          className="py-2.5 px-3 bg-slate-900 hover:bg-black active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          + Comanda
                        </button>
                        <button
                          onClick={(e) => handlePrintPrecheck(e, account.id)}
                          disabled={isPrintingThis}
                          className="py-2.5 px-3 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
                        >
                          {isPrintingThis ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                          ) : (
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          Pre-cuenta
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Sección para agregar nueva cuenta */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-xs font-bold text-slate-700">Comensales nueva cuenta:</span>
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
                      <button
                        onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                        className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center transition-colors"
                      >
                        −
                      </button>
                      <span className="text-xs font-black text-slate-900 w-5 text-center font-mono">
                        {guestCount}
                      </span>
                      <button
                        onClick={() => setGuestCount(guestCount + 1)}
                        className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <m.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateAdditionalAccount}
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    Abrir Nueva Cuenta en Mesa {activeTable.code}
                  </m.button>
                </div>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Tables;
