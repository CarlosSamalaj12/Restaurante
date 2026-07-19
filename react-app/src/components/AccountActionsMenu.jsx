import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      <motion.div
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
              <motion.button
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
              </motion.button>
            );
          })}
        </div>
      </motion.div>

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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl w-full max-w-md p-5"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Dividir Cuenta</h3>
          <p className="text-sm text-gray-500 mb-4">¿Entre cuántas cuentas deseas dividir?</p>
          
          <div className="grid grid-cols-5 gap-2 mb-4">
            {[2, 3, 4, 5, 6].map(n => (
              <motion.button
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
              </motion.button>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 mb-4">
            <p className="text-sm text-gray-500 mb-3">Personalizado</p>
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl font-semibold text-gray-600 hover:bg-gray-200"
              >
                −
              </motion.button>
              <div className="flex-1 text-center">
                <span className="text-4xl font-bold text-gray-900">{splitCount}</span>
                <span className="text-sm text-gray-500 ml-1">cuentas</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSplitCount(Math.min(30, splitCount + 1))}
                className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl font-semibold text-gray-600 hover:bg-gray-200"
              >
                +
              </motion.button>
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

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSplitBySeat}
            disabled={loading}
            className="w-full py-3.5 bg-purple-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-purple-700 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {loading ? 'Dividiendo...' : 'Dividir por Silla'}
          </motion.button>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium">
              Cancelar
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl text-sm font-medium"
            >
              Manual
            </motion.button>
          </div>
        </motion.div>
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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
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
          <div className="bg-gray-50 border-b px-5 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Productos sin asignar
              </p>
              <span className="text-xs text-gray-400">{unassigned.length} items</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {unassigned.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600 py-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Todos asignados
                </div>
              ) : (
                unassigned.map(item => (
                  <motion.button
                    key={item.id}
                    layout
                    onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                    className={`flex-shrink-0 w-36 p-3 rounded-xl border-2 text-left transition-all ${
                      selectedItemId === item.id
                        ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Q{Number(item.line_total || 0).toFixed(2)}</p>
                  </motion.button>
                ))
              )}
            </div>
          </div>

          {/* Account columns */}
          <div className="flex-1 overflow-x-auto overflow-y-auto p-5">
            <div className="flex gap-4 h-full" style={{ minWidth: `${Math.max(splitCount * 180, 100)}px` }}>
              {Array.from({ length: splitCount }, (_, i) => {
                const accountItems = items.filter(item => assignments[item.id] === i);
                const isTarget = selectedItemId !== null;
                return (
                  <motion.div
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
                    className={`flex-1 min-w-[150px] rounded-xl border-2 flex flex-col transition-all ${
                      isTarget
                        ? `${accountLightColors[i]} cursor-pointer hover:shadow-lg border-dashed`
                        : 'border-gray-200 bg-gray-50/50'
                    }`}
                  >
                    {/* Account header */}
                    <div className={`${accountHeaderColors[i]} rounded-t-lg px-3 py-2.5 text-center`}>
                      <p className="text-white font-bold text-sm">Cuenta {i + 1}</p>
                      <p className="text-white/90 text-lg font-bold">Q{getAccountTotal(i).toFixed(2)}</p>
                      <p className="text-white/70 text-[10px]">{getAssignedCount(i)} items</p>
                    </div>

                    {/* Assigned items */}
                    <div className="flex-1 p-2 space-y-1.5 min-h-[80px]">
                      {accountItems.length === 0 ? (
                        <div className="flex items-center justify-center h-full py-6">
                          <p className="text-xs text-gray-400">
                            {isTarget ? 'Toca para asignar' : 'Vacía'}
                          </p>
                        </div>
                      ) : (
                        accountItems.map(item => (
                          <motion.div
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
                            className="group relative bg-white rounded-lg border border-gray-100 p-2.5 cursor-pointer hover:border-red-200 hover:bg-red-50/30 transition-all"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-xs font-medium text-gray-800 truncate flex-1">{item.product_name}</p>
                              <span className="text-[10px] text-gray-300 group-hover:text-red-400 transition-colors">✕</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">Q{Number(item.line_total || 0).toFixed(2)}</p>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white flex items-center gap-3">
          <div className="flex-1">
            {selectedItemId !== null ? (
              <span className="text-sm text-blue-600 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Producto seleccionado — toca una cuenta para asignarlo
              </span>
            ) : unassigned.length > 0 ? (
              <span className="text-sm text-amber-600 font-medium">
                {unassigned.length} producto{unassigned.length !== 1 ? 's' : ''} sin asignar
              </span>
            ) : (
              <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Todos los productos asignados
              </span>
            )}
          </div>
          <button
            onClick={handleSplit}
            disabled={loading || assignedCount === 0}
            className="px-8 py-3 bg-blue-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                Dividiendo...
              </span>
            ) : (
              'Dividir Cuenta'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function MoveSeatModal({ accountId, items, onClose, onRefresh }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [newSeat, setNewSeat] = useState('');
  const toast = useToast();

  const seats = [...new Set(items.map(i => i.seat_no || 1))].sort((a, b) => a - b);
  const maxSeat = Math.max(...seats, 4);

  const handleMove = async () => {
    if (!selectedItem || !newSeat) return;
    try {
      await api.moveItemSeat(selectedItem, parseInt(newSeat));
      toast.success('Producto movido');
      onRefresh();
      onClose();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md p-5"
      >
        <h3 className="font-semibold text-gray-900 mb-4">Mover a Silla</h3>
        
        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-2 block">Seleccionar Producto</label>
          <select 
            value={selectedItem || ''} 
            onChange={(e) => setSelectedItem(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full border border-gray-200 rounded-xl p-3"
          >
            <option value="">Elegir...</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>
                {item.product_name} (Silla {item.seat_no || 1})
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="text-sm text-gray-600 mb-2 block">Mover a Silla</label>
          <select 
            value={newSeat} 
            onChange={(e) => setNewSeat(e.target.value)}
            className="w-full border border-gray-200 rounded-xl p-3"
          >
            <option value="">Elegir...</option>
            {Array.from({ length: maxSeat }, (_, i) => i + 1).map(seat => (
              <option key={seat} value={seat}>Silla {seat}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl">
            Cancelar
          </button>
          <button 
            onClick={handleMove} 
            disabled={!selectedItem || !newSeat}
            className="flex-1 py-3 bg-purple-500 text-white rounded-xl disabled:opacity-50"
          >
            Mover
          </button>
        </div>
      </motion.div>
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
      <motion.div
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
      </motion.div>
    </div>
  );
}

function PrecheckModal({ account, totals, onClose }) {
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
            <p>Check: ${account?.check_number || '-'}</p>
          </div>
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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md p-5"
      >
        <h3 className="font-semibold text-gray-900 mb-4">Pre-Cuenta</h3>
        <div className="mb-4 space-y-2 text-sm">
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
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl">
            Cerrar
          </button>
          <button onClick={handlePrint} className="flex-1 py-3 bg-amber-500 text-white rounded-xl flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </motion.div>
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
      <motion.div
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
      </motion.div>
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
      <motion.div
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
      </motion.div>
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
      <motion.div
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
                        Check: {acc.check_number} • Centro: {acc.operation_center_name || '-'}
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
      </motion.div>
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
      <motion.div
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
                        Check: {acc.check_number} • Centro: {acc.operation_center_name || '-'}
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
      </motion.div>
    </div>
  );
}