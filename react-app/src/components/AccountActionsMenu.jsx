import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { 
  Percent, 
  Printer, 
  RotateCcw,
  X,
  ChevronRight,
  SplitSquareVertical,
  ArrowRightLeft,
  Trash2,
  ArrowRight,
  ArrowLeftRight,
  Check,
  Users,
} from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/useToast';

export function AccountActionsMenu({ accountId, account, tableId, totals, onClose, onRefresh }) {
  const [activeAction, setActiveAction] = useState(null);
  const toast = useToast();

  const menuItems = [
    {
      id: 'split',
      icon: SplitSquareVertical,
      label: 'Dividir Cuenta',
      description: 'Dividir entre varias cuentas',
      color: 'bg-blue-500',
    },
    {
      id: 'shared',
      icon: Users,
      label: 'Cuenta Compartida',
      description: 'Dividir igual entre personas',
      color: 'bg-indigo-500',
    },
    {
      id: 'transfer',
      icon: ArrowRight,
      label: 'Transferir Cuenta',
      description: 'Mover a otra cuenta (otro centro)',
      color: 'bg-cyan-500',
    },
    {
      id: 'join',
      icon: ArrowLeftRight,
      label: 'Unir Cuentas',
      description: 'Combinar con otra cuenta',
      color: 'bg-teal-500',
    },
    {
      id: 'moveSeat',
      icon: ArrowRightLeft,
      label: 'Mover Silla',
      description: 'Transferir productos entre sillas',
      color: 'bg-purple-500',
    },
    {
      id: 'discount',
      icon: Percent,
      label: 'Aplicar Descuento',
      description: 'Agregar descuento a la cuenta',
      color: 'bg-green-500',
    },
    {
      id: 'precheck',
      icon: Printer,
      label: 'Pre-Cuenta',
      description: 'Imprimir cuenta parcial',
      color: 'bg-amber-500',
    },
    {
      id: 'tip',
      icon: RotateCcw,
      label: totals?.tipIsOverridden ? 'Restaurar Propina' : 'Quitar Propina',
      description: totals?.tipPercent > 0 ? `Propina actual: ${totals.tipPercent}%` : 'Sin propina configurada',
      color: 'bg-pink-500',
    },
    {
      id: 'close',
      icon: Trash2,
      label: 'Cerrar/Anular Cuenta',
      description: 'Cierra o anula la cuenta actual',
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <m.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[85vh] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Acciones de Cuenta</h2>
            <p className="text-sm text-gray-500">{account?.check_number}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <m.button
                key={item.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveAction(item.id)}
                className="w-full bg-gray-50 rounded-xl p-4 flex items-center gap-4 text-left"
              >
                <div className={`${item.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </m.button>
            );
          })}
        </div>
      </m.div>

      <AnimatePresence>
        {activeAction === 'split' && (
          <SplitAccountsModal 
            accountId={accountId} 
            account={account}
            tableId={tableId}
            onClose={() => setActiveAction(null)}
            onRefresh={onRefresh}
          />
        )}
        {activeAction === 'shared' && (
          <SharedAccountModal 
            accountId={accountId} 
            account={account}
            totals={totals}
            onClose={() => setActiveAction(null)}
            onRefresh={onRefresh}
          />
        )}
        {activeAction === 'transfer' && (
          <TransferAccountModal
            accountId={accountId}
            account={account}
            onClose={() => setActiveAction(null)}
            onRefresh={onRefresh}
          />
        )}
        {activeAction === 'join' && (
          <JoinAccountsModal
            accountId={accountId}
            account={account}
            onClose={() => setActiveAction(null)}
            onRefresh={onRefresh}
          />
        )}
        {activeAction === 'moveSeat' && (
          <MoveSeatModal 
            accountId={accountId}
            items={account?.items || []}
            onClose={() => setActiveAction(null)}
            onRefresh={onRefresh}
          />
        )}
        {activeAction === 'discount' && (
          <DiscountModal 
            accountId={accountId}
            onClose={() => setActiveAction(null)}
            onRefresh={onRefresh}
          />
        )}
        {activeAction === 'precheck' && (
          <PrecheckModal 
            accountId={accountId}
            account={account}
            totals={totals}
            onClose={() => setActiveAction(null)}
          />
        )}
        {activeAction === 'tip' && (
          <TipModal
            accountId={accountId}
            totals={totals}
            onClose={() => setActiveAction(null)}
            onRefresh={onRefresh}
          />
        )}
        {activeAction === 'close' && (
          <CloseAccountModal
            accountId={accountId}
            account={account}
            onClose={() => setActiveAction(null)}
            onRefresh={onRefresh}
            onCloseMenu={onClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SplitAccountsModal({ accountId, account, tableId, onClose, onRefresh }) {
  const [step, setStep] = useState(1);
  const [splitCount, setSplitCount] = useState(2);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const toast = useToast();

  const items = account?.items || [];

  const handleAssign = (itemId, accountIndex) => {
    setAssignments(prev => ({
      ...prev,
      [itemId]: prev[itemId] === accountIndex ? undefined : accountIndex
    }));
    setSelectedItemId(null);
  };

  const getAssignedCount = (accountIndex) => {
    return Object.values(assignments).filter(a => a === accountIndex).length;
  };

  const getAccountTotal = (accountIndex) => {
    return items
      .filter(item => assignments[item.id] === accountIndex)
      .reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  };

  const getUnassignedItems = () => {
    return items.filter(item => assignments[item.id] === undefined);
  };

  const handleSplit = async () => {
    const assignedCount = items.filter(item => assignments[item.id] !== undefined).length;
    if (assignedCount === 0) {
      toast.error('Asigna al menos un producto a una cuenta');
      return;
    }

    setLoading(true);
    try {
      const splits = [];
      for (let i = 0; i < splitCount; i++) {
        const itemIds = items
          .filter(item => assignments[item.id] === i)
          .map(item => item.id);
        if (itemIds.length > 0) {
          splits.push({ name: `Cuenta ${i + 1}`, itemIds });
        }
      }

      await api.splitCustom(accountId, { splits });
      toast.success('Cuenta dividida exitosamente');
      onRefresh();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSplitBySeat = async () => {
    const seats = [...new Set(items.map(i => i.seat_no || 1))].sort((a, b) => a - b);
    if (seats.length < 2) {
      toast.error('Los productos deben estar en al menos 2 sillas diferentes');
      return;
    }

    setLoading(true);
    try {
      const splits = seats.map(seat => ({
        name: `Silla ${seat}`,
        itemIds: items.filter(i => (i.seat_no || 1) === seat).map(i => i.id)
      }));

      await api.splitCustom(accountId, { splits });
      toast.success(`Cuentas divididas por silla (${seats.length} cuentas)`);
      onRefresh();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl w-full max-w-2xl p-5"
        >
          <h3 className="font-semibold text-gray-900 mb-1">Dividir Cuenta</h3>
          <p className="text-xs text-gray-500 mb-4">¿Entre cuántas cuentas deseas dividir?</p>
          
          <div className="grid grid-cols-5 gap-2 mb-4">
            {[2, 3, 4, 5, 6].map(n => (
              <m.button
                key={n}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setSplitCount(n); setStep(2); }}
                className={`py-3 rounded-xl font-semibold text-lg transition-all ${
                  splitCount === n && splitCount <= 6
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {n}
              </m.button>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 mb-4">
            <p className="text-sm text-gray-500 mb-3">Personalizado</p>
            <div className="flex items-center gap-3">
              <m.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl font-semibold text-gray-600 hover:bg-gray-200"
              >
                −
              </m.button>
              <div className="flex-1 text-center">
                <span className="text-4xl font-bold text-gray-900">{splitCount}</span>
                <span className="text-sm text-gray-500 ml-1">cuentas</span>
              </div>
              <m.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSplitCount(Math.min(30, splitCount + 1))}
                className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl font-semibold text-gray-600 hover:bg-gray-200"
              >
                +
              </m.button>
            </div>
          </div>

          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">ó</span>
            </div>
          </div>

          <m.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSplitBySeat}
            disabled={loading}
            className="w-full py-3.5 bg-purple-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-purple-700 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {loading ? 'Dividiendo...' : 'Dividir por Silla'}
          </m.button>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium">
              Cancelar
            </button>
            <m.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl text-sm font-medium"
            >
              Manual
            </m.button>
          </div>
        </m.div>
      </div>
    );
  }

  const baseColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500',
    'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'
  ];
  const baseLightColors = [
    'bg-blue-50 border-blue-200', 'bg-emerald-50 border-emerald-200', 'bg-purple-50 border-purple-200',
    'bg-amber-50 border-amber-200', 'bg-pink-50 border-pink-200', 'bg-cyan-50 border-cyan-200'
  ];
  const baseTextColors = [
    'text-blue-700', 'text-emerald-700', 'text-purple-700',
    'text-amber-700', 'text-pink-700', 'text-cyan-700'
  ];
  const baseHeaderColors = [
    'bg-blue-600', 'bg-emerald-600', 'bg-purple-600',
    'bg-amber-600', 'bg-pink-600', 'bg-cyan-600'
  ];
  const accountColors = Array.from({ length: splitCount }, (_, i) => baseColors[i % baseColors.length]);
  const accountLightColors = Array.from({ length: splitCount }, (_, i) => baseLightColors[i % baseLightColors.length]);
  const accountTextColors = Array.from({ length: splitCount }, (_, i) => baseTextColors[i % baseTextColors.length]);
  const accountHeaderColors = Array.from({ length: splitCount }, (_, i) => baseHeaderColors[i % baseHeaderColors.length]);

  const unassigned = getUnassignedItems();
  const assignedCount = items.filter(item => assignments[item.id] !== undefined).length;

  const assignedItems = items.filter(item => assignments[item.id] !== undefined);

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">Dividir en {splitCount} cuentas</h3>
            <p className="text-xs text-gray-500">Toca un producto y luego la cuenta donde va</p>
          </div>
          <button onClick={() => setStep(1)} className="text-sm text-blue-600 font-medium hover:underline">
            Cambiar cantidad
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Unassigned items tray */}
          <div className="bg-gray-50 border-b px-5 py-2.5 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Productos sin asignar
              </p>
              <span className="text-xs text-gray-400">{unassigned.length} items</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ maxHeight: '120px' }}>
              {unassigned.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-600 py-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Todos asignados
                </div>
              ) : (
                unassigned.map(item => (
                  <m.button
                    key={item.id}
                    layout
                    onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                    className={`flex-shrink-0 w-40 p-2.5 rounded-lg border-2 text-left transition-all ${
                      selectedItemId === item.id
                        ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs font-medium text-gray-900 truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Q{Number(item.line_total || 0).toFixed(2)}</p>
                  </m.button>
                ))
              )}
            </div>
          </div>

          {/* Account columns */}
          <div className="flex-1 overflow-x-auto overflow-y-auto p-5">
            <div className="flex gap-3 h-full" style={{ minWidth: `${Math.max(splitCount * 180, 100)}px` }}>
              {Array.from({ length: splitCount }, (_, i) => {
                const accountItems = items.filter(item => assignments[item.id] === i);
                const isTarget = selectedItemId !== null;
                return (
                  <m.div
                    key={i}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => {
                      if (selectedItemId !== null) {
                        handleAssign(selectedItemId, i);
                      }
                    }}
                    className={`flex-1 min-w-[160px] rounded-xl border-2 flex flex-col transition-all ${
                      isTarget
                        ? `${accountLightColors[i]} cursor-pointer hover:shadow-lg border-dashed`
                        : 'border-gray-200 bg-gray-50/50'
                    }`}
                  >
                    {/* Account header */}
                    <div className={`${accountHeaderColors[i]} rounded-t-lg px-3 py-2 text-center`}>
                      <p className="text-white font-bold text-xs">Cuenta {i + 1}</p>
                      <p className="text-white/90 text-base font-bold">Q{getAccountTotal(i).toFixed(2)}</p>
                      <p className="text-white/70 text-[10px]">{getAssignedCount(i)} items</p>
                    </div>

                    {/* Assigned items */}
                    <div className="flex-1 p-2 space-y-1.5 min-h-[60px]">
                      {accountItems.length === 0 ? (
                        <div className="flex items-center justify-center h-full py-4">
                          <p className="text-xs text-gray-400">
                            {isTarget ? 'Toca para asignar' : 'Vacía'}
                          </p>
                        </div>
                      ) : (
                        accountItems.map(item => (
                          <m.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssignments(prev => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                              });
                            }}
                            className="group relative bg-white rounded-lg border border-gray-100 p-2 cursor-pointer hover:border-red-200 hover:bg-red-50/30 transition-all"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-xs font-medium text-gray-800 truncate flex-1">{item.product_name}</p>
                              <span className="text-[10px] text-gray-300 group-hover:text-red-400 transition-colors">✕</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">Q{Number(item.line_total || 0).toFixed(2)}</p>
                          </m.div>
                        ))
                      )}
                    </div>
                  </m.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-white flex items-center gap-3 flex-shrink-0">
          <div className="flex-1">
            {selectedItemId !== null ? (
              <span className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Producto seleccionado — toca una cuenta para asignarlo
              </span>
            ) : unassigned.length > 0 ? (
              <span className="text-xs text-amber-600 font-medium">
                {unassigned.length} producto{unassigned.length !== 1 ? 's' : ''} sin asignar
              </span>
            ) : (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Todos los productos asignados
              </span>
            )}
          </div>
          <button
            onClick={handleSplit}
            disabled={loading || assignedCount === 0}
            className="px-6 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 hover:bg-blue-600 transition-colors"
          >
            {loading ? 'Dividiendo...' : 'Dividir Cuenta'}
          </button>
        </div>
      </m.div>
    </div>
  );
}

function SharedAccountModal({ accountId, account, totals, onClose, onRefresh }) {
  const [peopleCount, setPeopleCount] = useState(2);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  // Load items when modal opens
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.printPrecheck(accountId);
        setItems(data.items || []);
      } catch (err) {
        toast.error('Error al cargar productos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accountId]);

  // Calculate shared split - each product appears in every account with 1/n quantity
  const getSharedPreview = () => {
    if (!items.length || peopleCount < 2) return [];
    const fraction = 1 / peopleCount;
    const fractionText = peopleCount === 2 ? '1/2' : peopleCount === 3 ? '1/3' : `1/${peopleCount}`;

    return items.map(item => {
      const unitPrice = Number(item.unit_price) || 0;
      const originalQty = Number(item.qty) || 1;
      const originalTotal = Number(item.line_total) || 0;
      const fractionalQty = Number((fraction).toFixed(2));
      const fractionalTotal = Number((originalTotal * fraction).toFixed(2));

      return {
        ...item,
        fractionText,
        originalQty,
        originalTotal,
        fractionalQty,
        fractionalTotal,
      };
    });
  };

  const previewItems = getSharedPreview();
  const grandTotal = items.reduce((s, i) => s + Number(i.line_total || 0), 0);
  const perPerson = Number((grandTotal / peopleCount).toFixed(2));

  const handleCreate = async () => {
    if (peopleCount < 2) return;
    setCreating(true);
    try {
      await api.splitShared(accountId, { peopleCount });
      toast.success(`${peopleCount} cuentas compartidas creadas`);
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al crear cuentas compartidas');
    } finally {
      setCreating(false);
    }
  };

  const baseColors = [
    'bg-indigo-500', 'bg-pink-500', 'bg-amber-500',
    'bg-emerald-500', 'bg-cyan-500', 'bg-purple-500'
  ];
  const baseLightColors = [
    'bg-indigo-50 border-indigo-200',
    'bg-pink-50 border-pink-200',
    'bg-amber-50 border-amber-200',
    'bg-emerald-50 border-emerald-200',
    'bg-cyan-50 border-cyan-200',
    'bg-purple-50 border-purple-200',
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">Cuenta Compartida</h3>
            <p className="text-xs text-gray-500">Todos pagan lo mismo — cada producto se divide entre las personas</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* People selector */}
        <div className="px-5 py-3 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">¿Entre cuántas personas?</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPeopleCount(Math.max(2, peopleCount - 1))}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 flex items-center justify-center"
              >
                −
              </button>
              <span className="w-10 text-center font-bold text-lg text-gray-900">{peopleCount}</span>
              <button
                onClick={() => setPeopleCount(Math.min(12, peopleCount + 1))}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
          {/* Quick select buttons */}
          <div className="flex gap-2 mt-2">
            {[2, 3, 4, 5, 6, 8].filter(n => n <= 12).map(n => (
              <button
                key={n}
                onClick={() => setPeopleCount(n)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  peopleCount === n
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Preview: shared products + per-person columns */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-400">Cargando productos...</p>
            </div>
          ) : (
            <>
              {/* Per-person totals summary */}
              <div className="flex gap-3 mb-4" style={{ minWidth: `${Math.max(peopleCount * 200, 400)}px` }}>
                {Array.from({ length: peopleCount }, (_, i) => (
                  <div key={i} className={`flex-1 min-w-[180px] rounded-xl border-2 ${baseLightColors[i % baseLightColors.length]} px-3 py-2 text-center`}>
                    <p className={`${baseColors[i % baseColors.length]} text-white text-xs font-bold rounded-full py-0.5`}>
                      Persona {i + 1}
                    </p>
                    <p className="text-xl font-black text-gray-900 mt-1">Q{perPerson.toFixed(2)}</p>
                  </div>
                ))}
              </div>

              {/* Products table - all items with fractional qty and price */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden" style={{ minWidth: `${Math.max(peopleCount * 200, 400)}px` }}>
                <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: `2fr repeat(${peopleCount}, 1fr) 1fr` }}>
                  {/* Product header */}
                  <div className="px-3 py-2 bg-gray-100 text-xs font-bold text-gray-600">Producto</div>
                  {/* Per-person headers */}
                  {Array.from({ length: peopleCount }, (_, i) => (
                    <div key={i} className={`px-2 py-2 text-center text-xs font-bold ${baseColors[i % baseColors.length]} text-white`}>
                      Persona {i + 1}
                    </div>
                  ))}
                  <div className="px-3 py-2 bg-gray-100 text-xs font-bold text-gray-600 text-right">Total</div>
                </div>

                {previewItems.map(item => (
                  <div key={item.id} className="grid border-b border-gray-100 last:border-0 hover:bg-white transition-colors" style={{ gridTemplateColumns: `2fr repeat(${peopleCount}, 1fr) 1fr` }}>
                    {/* Product name + original info */}
                    <div className="px-3 py-2 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{item.product_name}</p>
                        <p className="text-[10px] text-gray-400">
                          {item.originalQty}x original · Q{item.originalTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {/* Each person gets 1/n */}
                    {Array.from({ length: peopleCount }, (_, i) => (
                      <div key={i} className="px-2 py-2 text-center border-l border-gray-100 flex flex-col items-center justify-center">
                        <span className={`${baseColors[i % baseColors.length]} text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 mb-0.5`}>
                          {item.fractionText}
                        </span>
                        <span className="text-xs font-semibold text-gray-700">
                          {item.fractionalQty}x
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Q{item.fractionalTotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {/* Total for this product */}
                    <div className="px-3 py-2 text-right flex items-center justify-end">
                      <span className="text-xs font-bold text-gray-900">Q{item.originalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400">Total cuenta</p>
            <p className="text-lg font-bold text-gray-900">Q{grandTotal.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Cada persona paga</p>
            <p className="text-xl font-black text-indigo-600">Q{perPerson.toFixed(2)}</p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || loading || peopleCount < 2}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            {creating ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Creando...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Crear {peopleCount} Cuentas
              </>
            )}
          </button>
        </div>
      </m.div>
    </div>
  );
}

function MoveSeatModal({ accountId, items: initialItems, onClose, onRefresh }) {
  // staged: map of itemId -> newSeatNo (null if same/not moved)
  const [staged, setStaged] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const seats = [...new Set(initialItems.map(i => i.seat_no || 1))].sort((a, b) => a - b);
  const maxSeat = Math.max(...seats, 4);

  // Apply staged changes to get the "preview" state
  const items = initialItems.map(item => ({
    ...item,
    effectiveSeat: staged[item.id] !== undefined ? staged[item.id] : (item.seat_no || 1),
  }));

  const getItemsForSeat = (seat) => {
    return items.filter(i => i.effectiveSeat === seat);
  };

  const getMovedCount = () => Object.values(staged).filter(s => s !== null).length;

  const selectItem = (itemId) => {
    setStaged(prev => {
      const id = String(itemId);
      const next = { ...prev };
      // Toggle: if already pending (null), deselect; if already moved, clear; if new, mark pending
      if (next[id] === null) {
        // Already pending → deselect
        delete next[id];
      } else if (next[id] !== undefined) {
        // Already moved to a seat → clear
        delete next[id];
      } else {
        // New → mark as pending (null = waiting for destination)
        next[id] = null;
      }
      return next;
    });
  };

  const moveSelectedToSeat = (destSeat) => {
    const selectedId = Object.keys(staged).find(id => staged[id] === null);
    if (!selectedId) return;
    const item = items.find(i => String(i.id) === selectedId);
    if (!item || item.effectiveSeat === destSeat) {
      setStaged({});
      return;
    }
    setStaged({ [selectedId]: destSeat });
  };

  // The currently selected item (pending a destination)
  const pendingItemId = Object.keys(staged).find(id => staged[id] === null);
  const pendingItem = pendingItemId ? items.find(i => String(i.id) === pendingItemId) : null;

  const handleSave = async () => {
    const moves = Object.entries(staged)
      .filter(([_, newSeat]) => newSeat !== null)
      .map(([itemId, newSeat]) => ({ itemId: Number(itemId), newSeat }));

    if (moves.length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      for (const { itemId, newSeat } of moves) {
        await api.moveItemSeat(itemId, newSeat);
      }
      toast.success(`${moves.length} producto${moves.length > 1 ? 's' : ''} movido${moves.length > 1 ? 's' : ''}`);
      onRefresh();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col"
      >
        {/* Header - compacta */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">Mover Silla</h3>
            <p className="text-xs text-gray-400">
              {pendingItem
                ? `"${pendingItem.product_name}" (Silla ${pendingItem.effectiveSeat}) — toca la silla destino`
                : '1. Toca un producto → 2. Toca la silla destino'}
            </p>
          </div>
          <button onClick={() => { setStaged({}); onClose(); }} className="p-2 hover:bg-gray-100 rounded-xl">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Seat columns - maximizado */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(maxSeat, 6)}, minmax(0, 1fr))` }}>
            {Array.from({ length: maxSeat }, (_, i) => i + 1).map(seat => {
              const seatItems = getItemsForSeat(seat);
              const isTarget = pendingItem && pendingItem.effectiveSeat !== seat;
              const isSource = pendingItem && pendingItem.effectiveSeat === seat;

              return (
                <m.div
                  key={seat}
                  layout
                  onClick={() => moveSelectedToSeat(seat)}
                  animate={isTarget ? { scale: 1.01 } : {}}
                  className={`
                    rounded-xl border-2 overflow-hidden transition-all
                    ${isTarget ? 'border-blue-400 bg-blue-50 shadow-lg shadow-blue-200 cursor-pointer' : ''}
                    ${isSource ? 'border-gray-200 bg-gray-50 opacity-60' : ''}
                    ${!pendingItem ? 'border-gray-200 bg-gray-50' : ''}
                  `}
                >
                  {/* Seat header */}
                  <div className={`px-3 py-2 flex items-center justify-between ${
                    isTarget ? 'bg-blue-500 text-white' : 'bg-gray-800 text-white'
                  }`}>
                    <span className="font-bold text-sm">Silla {seat}</span>
                    <span className={`text-[10px] ${isTarget ? 'text-blue-100' : 'text-gray-300'}`}>
                      {seatItems.length} item{seatItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Target hint */}
                  {isTarget && (
                    <div className="bg-blue-500 text-white text-[10px] font-bold text-center py-1">
                      ✓ Mover aquí
                    </div>
                  )}

                  {/* Items - compacto */}
                  <div className="p-2 space-y-1">
                    {seatItems.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4 italic">
                        {isTarget ? 'Soltar aquí' : 'Vacía'}
                      </p>
                    ) : (
                      seatItems.map(item => {
                        const isPending = pendingItemId !== undefined && pendingItemId === String(item.id);
                        const isMoved = staged[String(item.id)] !== undefined && staged[String(item.id)] !== null;

                        return (
                          <m.button
                            key={item.id}
                            layout
                            whileTap={{ scale: pendingItem && !isSource ? 0.97 : 0 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!pendingItem || isSource) {
                                selectItem(String(item.id));
                              }
                            }}
                            className={`
                              w-full text-left px-2 py-1.5 rounded-lg transition-all border text-xs
                              ${isPending
                                ? 'bg-blue-500 text-white border-blue-600 shadow'
                                : isMoved
                                  ? 'bg-green-50 text-green-700 border-green-300'
                                  : 'bg-white border-gray-100 text-gray-700 hover:border-gray-300'
                              }
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate font-medium leading-tight">{item.product_name}</span>
                              <span className={`shrink-0 ml-1 ${isPending ? 'text-blue-200' : 'text-gray-400'}`}>
                                {item.qty || 1}x
                              </span>
                            </div>
                            {isMoved && (
                              <p className="text-[10px] text-green-600 mt-0.5">→ Silla {staged[item.id]}</p>
                            )}
                          </m.button>
                        );
                      })
                    )}
                  </div>
                </m.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
          {saving ? (
            <div className="flex items-center justify-center gap-2 text-purple-600 text-xs font-medium">
              Guardando...
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => { setStaged({}); onClose(); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 ${
                  getMovedCount() > 0
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {getMovedCount() > 0 ? `${getMovedCount()} cambios — Guardar` : 'Guardar'}
              </button>
            </div>
          )}
        </div>
      </m.div>
    </div>
  );
}

function DiscountModal({ accountId, onClose, onRefresh }) {
  const [type, setType] = useState('percent');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleApply = async () => {
    if (!value) return;
    setLoading(true);
    try {
      await api.addDiscount(accountId, {
        type,
        value: parseFloat(value),
        reason,
        createdBy: 1,
      });
      toast.success('Descuento aplicado');
      onRefresh();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md p-5"
      >
        <h3 className="font-semibold text-gray-900 mb-4">Aplicar Descuento</h3>
        
        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-2 block">Tipo de Descuento</label>
          <div className="flex gap-2">
            <button
              onClick={() => setType('percent')}
              className={`flex-1 py-2 rounded-xl border ${type === 'percent' ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200'}`}
            >
              Porcentaje
            </button>
            <button
              onClick={() => setType('fixed')}
              className={`flex-1 py-2 rounded-xl border ${type === 'fixed' ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200'}`}
            >
              Monto Fijo
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-2 block">
            Valor ({type === 'percent' ? '%' : 'Q'})
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-3"
            placeholder={type === 'percent' ? '10' : '25.00'}
          />
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-2 block">Razón (opcional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-3"
            placeholder="Promoción, etc."
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl">
            Cancelar
          </button>
          <button 
            onClick={handleApply} 
            disabled={!value || loading}
            className="flex-1 py-3 bg-green-500 text-white rounded-xl disabled:opacity-50"
          >
            {loading ? 'Aplicando...' : 'Aplicar'}
          </button>
        </div>
      </m.div>
    </div>
  );
}

function PrecheckModal({ accountId, account, totals, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.printPrecheck(accountId);
        setItems(data.items || []);
      } catch (err) {
        console.error('Error cargando items para precuenta:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accountId]);

  const handlePrint = () => {
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Pre-Cuenta</title>
          <style>
            @page { size: 80mm auto; margin: 3mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Consolas', 'Courier New', monospace; width: 72mm; margin: 0 auto; font-size: 12px; }
            .center { text-align: center; }
            .row { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .sep { border-top: 1px dashed #000; margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2>PRE-CUENTA</h2>
            <p>Mesa: ${account?.table_code || '-'}</p>
            <p>Cuenta #: ${account?.check_number || '-'}</p>
          </div>
          <div class="sep"></div>
          ${items.map(item => `
            <p class="row"><span>${item.qty || 1}x ${item.product_name || '-'}</span><span>Q ${Number(item.line_total || 0).toFixed(2)}</span></p>
          `).join('')}
          <div class="sep"></div>
          <p><strong>Subtotal:</strong> Q ${totals?.subtotal?.toFixed(2) || '0.00'}</p>
          ${totals?.discountTotal > 0 ? `<p><strong>Descuento:</strong> -Q ${totals.discountTotal.toFixed(2)}</p>` : ''}
          ${totals?.tipAmount > 0 ? `<p><strong>Propina:</strong> Q ${totals.tipAmount.toFixed(2)}</p>` : ''}
          <div class="sep"></div>
          <p class="row bold"><span>TOTAL:</span><span>Q ${totals?.total?.toFixed(2) || '0.00'}</span></p>
          <div class="sep"></div>
          <p class="center">Gracias por su visita</p>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[85vh] flex flex-col"
      >
        <h3 className="font-semibold text-gray-900 mb-4">Pre-Cuenta</h3>

        {loading ? (
          <p className="text-sm text-gray-500 text-center py-4">Cargando productos...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4 italic mb-4">Sin productos</p>
        ) : (
          <div className="flex-1 overflow-y-auto max-h-[40vh] mb-4 space-y-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.qty || 1}x {item.product_name}
                </span>
                <span className="text-gray-600 font-medium">
                  Q {Number(item.line_total || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>Q {totals?.subtotal?.toFixed(2) || '0.00'}</span>
          </div>
          {totals?.discountTotal > 0 && (
            <div className="flex justify-between text-red-500">
              <span>Descuento</span>
              <span>-Q {totals.discountTotal.toFixed(2)}</span>
            </div>
          )}
          {totals?.tipAmount > 0 && (
            <div className="flex justify-between">
              <span>Propina</span>
              <span>Q {totals.tipAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total</span>
            <span>Q {totals?.total?.toFixed(2) || '0.00'}</span>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl">
            Cerrar
          </button>
          <button onClick={handlePrint} className="flex-1 py-3 bg-amber-500 text-white rounded-xl flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </m.div>
    </div>
  );
}

function TipModal({ accountId, totals, onClose, onRefresh }) {
  const toast = useToast();

  const handleToggleTip = async () => {
    try {
      if (totals?.tipIsOverridden) {
        await api.restoreTip(accountId);
        toast.success('Propina restaurada');
      } else {
        await api.removeTip(accountId);
        toast.success('Propina removida');
      }
      onRefresh();
      onClose();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-sm p-5"
      >
        <h3 className="font-semibold text-gray-900 mb-2">
          {totals?.tipIsOverridden ? 'Restaurar Propina' : 'Quitar Propina'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {totals?.tipIsOverridden 
            ? 'La configuración global de propina se volverá a aplicar.' 
            : `Esto eliminará la propina (${totals?.tipPercent}%) de la cuenta.`}
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl">
            Cancelar
          </button>
          <button
            onClick={handleToggleTip}
            className={`flex-1 py-3 text-white rounded-xl ${totals?.tipIsOverridden ? 'bg-pink-500' : 'bg-gray-900'}`}
          >
            {totals?.tipIsOverridden ? 'Restaurar' : 'Quitar'}
          </button>
        </div>
      </m.div>
    </div>
  );
}

function CloseAccountModal({ accountId, account, onClose, onRefresh, onCloseMenu }) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleClose = async () => {
    setLoading(true);
    try {
      await api.closeAccount(accountId);
      toast.success('Cuenta cerrada');
      onRefresh();
      onCloseMenu();
    } catch (error) {
      toast.error(error.message || 'Error al cerrar cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-sm p-5"
      >
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="font-semibold text-gray-900 text-center mb-2">
          ¿Cerrar Cuenta?
        </h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          Estás por cerrar la cuenta <strong>{account?.check_number}</strong>.
          {account?.items?.length > 0
            ? ' Los productos serán anulados.'
            : ' La cuenta está vacía.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 rounded-xl font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium disabled:opacity-50"
          >
            {loading ? 'Cerrando...' : 'Cerrar Cuenta'}
          </button>
        </div>
      </m.div>
    </div>
  );
}

function TransferAccountModal({ accountId, account, onClose, onRefresh }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.getOpenAccounts();
      const openAccounts = data.filter(a => a.status === 'open' && a.id !== accountId);
      setAccounts(openAccounts);
    } catch (error) {
      toast.error('Error al cargar cuentas');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedAccount) return;
    setTransferring(true);
    try {
      const result = await api.transferAccount(accountId, selectedAccount);
      toast.success(`Cuenta transferida. ${result.transferredItems} productos movidos.`);
      onRefresh();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Error al transferir');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Transferir Cuenta</h3>
          <p className="text-sm text-gray-500">Mover todos los productos a otra cuenta</p>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-gray-500">No hay otras cuentas abiertas</p>
          ) : (
            <div className="space-y-2">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccount(acc.id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedAccount === acc.id
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">Mesa {acc.table_code || '-'}</p>
                      <p className="text-xs text-gray-500">
                        Cuenta #: {acc.check_number} • Centro: {acc.operation_center_name || '-'}
                      </p>
                    </div>
                    <p className="font-bold text-cyan-600">Q {Number(acc.total || 0).toFixed(2) || '0.00'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl">
            Cancelar
          </button>
          <button
            onClick={handleTransfer}
            disabled={!selectedAccount || transferring}
            className="flex-1 py-3 bg-cyan-500 text-white rounded-xl disabled:opacity-50"
          >
            {transferring ? 'Transferiendo...' : 'Transferir'}
          </button>
        </div>
      </m.div>
    </div>
  );
}

function JoinAccountsModal({ accountId, account, onClose, onRefresh }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.getOpenAccounts();
      const openAccounts = data.filter(a => a.status === 'open' && a.id !== accountId);
      setAccounts(openAccounts);
    } catch (error) {
      toast.error('Error al cargar cuentas');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!selectedAccount) return;
    setJoining(true);
    try {
      const result = await api.joinAccounts(accountId, selectedAccount);
      toast.success(`Cuentas unidas. ${result.joinedItems} productos movidos.`);
      onRefresh();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Error al unir');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Unir Cuentas</h3>
          <p className="text-sm text-gray-500">Combinar esta cuenta con otra (la otra se cierra)</p>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-gray-500">No hay otras cuentas abiertas</p>
          ) : (
            <div className="space-y-2">
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccount(acc.id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedAccount === acc.id
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">Mesa {acc.table_code || '-'}</p>
                      <p className="text-xs text-gray-500">
                        Cuenta #: {acc.check_number} • Centro: {acc.operation_center_name || '-'}
                      </p>
                    </div>
                    <p className="font-bold text-teal-600">Q {Number(acc.total || 0).toFixed(2) || '0.00'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl">
            Cancelar
          </button>
          <button
            onClick={handleJoin}
            disabled={!selectedAccount || joining}
            className="flex-1 py-3 bg-teal-500 text-white rounded-xl disabled:opacity-50"
          >
            {joining ? 'Uniendo...' : 'Unir'}
          </button>
        </div>
      </m.div>
    </div>
  );
}