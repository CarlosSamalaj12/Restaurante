// AccountActionsMenu - Menú modal de acciones para cuentas y división de consumos
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
  Plus,
  Minus,
  Edit2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ProductIconBadge } from '../utils/productIcons';

export function AccountActionsMenu({ accountId, account, tableId, totals, onClose, onRefresh }) {
  const [activeAction, setActiveAction] = useState(null);
  const toast = useToast();
  const { hasPermission = () => true } = useAuth() || {};

  const allMenuItems = [
    {
      id: 'split',
      icon: SplitSquareVertical,
      label: 'Dividir Cuenta',
      description: 'Dividir entre varias cuentas',
      color: 'bg-blue-500',
      allowed: hasPermission('orders.transfer') || hasPermission('orders.shared'),
    },
    {
      id: 'shared',
      icon: Users,
      label: 'Cuenta Compartida',
      description: 'Dividir igual entre personas',
      color: 'bg-indigo-500',
      allowed: hasPermission('orders.shared'),
    },
    {
      id: 'transfer',
      icon: ArrowRight,
      label: 'Transferir Cuenta',
      description: 'Mover a otra cuenta (otro centro)',
      color: 'bg-cyan-500',
      allowed: hasPermission('orders.transfer'),
    },
    {
      id: 'join',
      icon: ArrowLeftRight,
      label: 'Unir Cuentas',
      description: 'Combinar con otra cuenta',
      color: 'bg-teal-500',
      allowed: hasPermission('orders.transfer'),
    },
    {
      id: 'moveSeat',
      icon: ArrowRightLeft,
      label: 'Mover Silla',
      description: 'Transferir productos entre sillas',
      color: 'bg-purple-500',
      allowed: hasPermission('orders.transfer'),
    },
    {
      id: 'discount',
      icon: Percent,
      label: 'Aplicar Descuento',
      description: 'Agregar descuento a la cuenta',
      color: 'bg-green-500',
      allowed: true, // Visible para meseros pero requiere PIN de supervisor
    },
    {
      id: 'precheck',
      icon: Printer,
      label: 'Pre-Cuenta',
      description: 'Imprimir cuenta parcial',
      color: 'bg-amber-500',
      allowed: true,
    },
    {
      id: 'tip',
      icon: RotateCcw,
      label: totals?.tipIsOverridden ? 'Restaurar Propina' : 'Quitar Propina',
      description: totals?.tipPercent > 0 ? `Propina actual: ${totals.tipPercent}%` : 'Sin propina configurada',
      color: 'bg-pink-500',
      allowed: hasPermission('payments.create') || hasPermission('orders.edit'),
    },
    {
      id: 'close',
      icon: Trash2,
      label: 'Cerrar/Anular Cuenta',
      description: 'Cierra o anula la cuenta actual',
      color: 'bg-red-500',
      allowed: true, // Visible para meseros pero requiere PIN de supervisor
    },
  ];

  const menuItems = allMenuItems.filter(item => item.allowed);

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
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  // Ítems iniciales activos con desglose de cantidades
  const activeItems = (account?.items || [])
    .filter(it => it.status !== 'void')
    .map(it => ({
      id: it.id,
      productId: it.product_id,
      productName: it.product_name,
      qty: Number(it.qty || 1),
      maxQty: Number(it.qty || 1),
      unitPrice: Number(it.unit_price || 0),
      seatNo: it.seat_no || 1,
      notes: it.notes || '',
      modifiers: it.modifiers || [],
    }));

  // Estado de cuentas divididas
  // accounts[0] = Cuenta 1 (Principal) que conserva su cuenta y check_number
  // accounts[1] = Cuenta 2 (vacía al inicio)
  const [accounts, setAccounts] = useState(() => [
    {
      id: 'source',
      name: account?.check_number ? `${account.check_number} (Principal)` : 'Cuenta 1',
      isSource: true,
      items: activeItems,
    },
    {
      id: 'acc_2',
      name: 'Cuenta 2',
      isSource: false,
      items: [],
    },
  ]);

  // Modal para seleccionar cuántas unidades mover cuando qty > 1
  const [moveModal, setMoveModal] = useState(null);

  // Edición de nombre de cuenta inline
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingName, setEditingName] = useState('');

  // Cálculos de totales
  const getAccountTotal = (acc) => {
    return acc.items.reduce((sum, it) => sum + (Number(it.unitPrice || 0) * Number(it.qty || 0)), 0);
  };

  const getAccountItemCount = (acc) => {
    return acc.items.reduce((sum, it) => sum + Number(it.qty || 0), 0);
  };

  const totalOriginal = activeItems.reduce((sum, it) => sum + (Number(it.unitPrice || 0) * Number(it.qty || 0)), 0);
  const totalDistributed = accounts.reduce((sum, acc) => sum + getAccountTotal(acc), 0);

  // Agregar una nueva cuenta vacía
  const handleAddAccount = () => {
    if (accounts.length >= 8) {
      toast.info('Límite máximo de 8 cuentas alcanzado');
      return;
    }
    const newIdx = accounts.length + 1;
    setAccounts(prev => [
      ...prev,
      {
        id: `acc_${Date.now()}`,
        name: `Cuenta ${newIdx}`,
        isSource: false,
        items: []
      }
    ]);
  };

  // Eliminar una cuenta creada (Cuenta 2+) devolviendo sus productos a Cuenta 1
  const handleRemoveAccount = (removeIndex) => {
    if (removeIndex === 0) return;
    const accToRemove = accounts[removeIndex];
    const itemsToReturn = accToRemove.items || [];

    setAccounts(prev => {
      const nextAccounts = [...prev];
      if (itemsToReturn.length > 0) {
        const sourceItems = [...nextAccounts[0].items];
        for (const retItem of itemsToReturn) {
          const existing = sourceItems.find(it => it.id === retItem.id);
          if (existing) {
            existing.qty = Number((existing.qty + retItem.qty).toFixed(2));
          } else {
            sourceItems.push(retItem);
          }
        }
        nextAccounts[0] = { ...nextAccounts[0], items: sourceItems };
      }
      nextAccounts.splice(removeIndex, 1);
      return nextAccounts;
    });

    toast.info(`'${accToRemove.name}' eliminada. Sus productos volvieron a Cuenta 1.`);
  };

  // Iniciar el movimiento de un ítem hacia targetIndex
  const handleInitiateMove = (sourceIndex, targetIndex, item) => {
    if (sourceIndex === targetIndex) return;
    const currentQty = Number(item.qty || 1);

    if (currentQty > 1) {
      // Abre el selector de cantidad para especificar cuántas unidades mover
      setMoveModal({
        item,
        sourceIndex,
        targetIndex,
        maxAvailable: currentQty,
        qtyToMove: 1
      });
    } else {
      // 1 sola unidad: transferir de inmediato
      executeMove(sourceIndex, targetIndex, item.id, 1, item);
    }
  };

  // Ejecutar el movimiento de ítems
  const executeMove = (sourceIndex, targetIndex, itemId, qtyToMove, itemRef) => {
    const parsedQty = Math.max(1, Math.min(Number(qtyToMove), Number(itemRef.qty || 1)));

    setAccounts(prev => {
      const next = prev.map(a => ({ ...a, items: a.items.map(it => ({ ...it })) }));
      const sourceAcc = next[sourceIndex];
      const targetAcc = next[targetIndex];

      const srcItemIndex = sourceAcc.items.findIndex(it => it.id === itemId);
      if (srcItemIndex === -1) return prev;
      const srcItem = sourceAcc.items[srcItemIndex];
      const baseItem = { ...srcItem };

      // Reducir o remover de la cuenta origen
      if (parsedQty >= srcItem.qty) {
        sourceAcc.items.splice(srcItemIndex, 1);
      } else {
        srcItem.qty = Number((srcItem.qty - parsedQty).toFixed(2));
      }

      // Agregar a la cuenta destino
      const existingInTarget = targetAcc.items.find(it => it.id === itemId);
      if (existingInTarget) {
        existingInTarget.qty = Number((existingInTarget.qty + parsedQty).toFixed(2));
      } else {
        targetAcc.items.push({
          ...baseItem,
          qty: parsedQty
        });
      }

      return next;
    });

    setMoveModal(null);
  };

  // Dividir automáticamente por número de silla (seat_no)
  const handleSplitBySeat = () => {
    const seats = [...new Set(activeItems.map(i => i.seatNo || 1))].sort((a, b) => a - b);
    if (seats.length < 2) {
      toast.error('Los productos deben estar en al menos 2 sillas diferentes para dividir por silla');
      return;
    }

    const newAccounts = seats.map((seat, idx) => ({
      id: idx === 0 ? 'source' : `acc_seat_${seat}`,
      name: idx === 0 
        ? `${account?.check_number || 'Cuenta 1'} (Silla ${seat})`
        : `Cuenta Silla ${seat}`,
      isSource: idx === 0,
      items: activeItems.filter(it => (it.seatNo || 1) === seat)
    }));

    setAccounts(newAccounts);
    toast.success(`Productos distribuidos automáticamente en ${seats.length} sillas`);
  };

  // Confirmar y guardar la división en base de datos
  const handleConfirmSplit = async () => {
    const secondaryWithItems = accounts.slice(1).filter(a => a.items.length > 0);
    if (secondaryWithItems.length === 0) {
      toast.error('Mueve al menos un producto a Cuenta 2 antes de confirmar la división');
      return;
    }

    if (accounts[0].items.length === 0) {
      toast.error('La Cuenta 1 principal no puede quedar vacía');
      return;
    }

    setLoading(true);
    try {
      const splitsPayload = accounts.map((acc, idx) => ({
        name: acc.name,
        isSource: idx === 0,
        items: acc.items.map(it => ({ id: it.id, qty: it.qty }))
      }));

      await api.splitCustom(accountId, { splits: splitsPayload });
      toast.success(`Cuenta dividida exitosamente en ${accounts.length} cuentas`);
      onRefresh();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Error al dividir la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const accPalettes = [
    { header: 'bg-slate-900 text-white', accent: 'text-slate-900', border: 'border-slate-200', tag: 'bg-slate-100 text-slate-700' },
    { header: 'bg-emerald-700 text-white', accent: 'text-emerald-700', border: 'border-emerald-200', tag: 'bg-emerald-50 text-emerald-800' },
    { header: 'bg-blue-600 text-white', accent: 'text-blue-600', border: 'border-blue-200', tag: 'bg-blue-50 text-blue-800' },
    { header: 'bg-purple-600 text-white', accent: 'text-purple-600', border: 'border-purple-200', tag: 'bg-purple-50 text-purple-800' },
    { header: 'bg-amber-600 text-white', accent: 'text-amber-600', border: 'border-amber-200', tag: 'bg-amber-50 text-amber-800' },
    { header: 'bg-rose-600 text-white', accent: 'text-rose-600', border: 'border-rose-200', tag: 'bg-rose-50 text-rose-800' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-3 sm:p-5">
      <m.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden"
      >
        {/* Header Superior */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <SplitSquareVertical className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Dividir Cuenta</h2>
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                Mesa {account?.table_code || '-'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Transfiere productos o unidades entre cuentas. Cuenta 1 conserva el número de cuenta original.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSplitBySeat}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-purple-200 shadow-2xs cursor-pointer"
              title="Distribuir productos automáticamente por silla"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Por Silla</span>
            </button>

            <button
              type="button"
              onClick={handleAddAccount}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-blue-200 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Agregar otra cuenta</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Columnas de Cuentas */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6 bg-slate-50/60">
          <div className="flex gap-4 items-stretch min-h-full pb-2" style={{ minWidth: `${Math.max(accounts.length * 280, 100)}px` }}>
            {accounts.map((acc, accIdx) => {
              const palette = accPalettes[accIdx % accPalettes.length];
              const accTotal = getAccountTotal(acc);
              const itemCount = getAccountItemCount(acc);
              const isEditing = editingIndex === accIdx;

              return (
                <div
                  key={acc.id}
                  className={`flex-1 min-w-[270px] max-w-[340px] bg-white rounded-2xl border-2 ${palette.border} shadow-sm flex flex-col overflow-hidden transition-all`}
                >
                  {/* Encabezado de la Cuenta */}
                  <div className={`${palette.header} px-4 py-3 flex-shrink-0`}>
                    <div className="flex items-center justify-between mb-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1 w-full mr-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (editingName.trim()) {
                                  setAccounts(prev => prev.map((a, i) => i === accIdx ? { ...a, name: editingName.trim() } : a));
                                }
                                setEditingIndex(null);
                              }
                            }}
                            autoFocus
                            className="bg-white/20 text-white placeholder-white/60 text-xs px-2 py-1 rounded font-bold w-full focus:outline-none focus:ring-1 focus:ring-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (editingName.trim()) {
                                setAccounts(prev => prev.map((a, i) => i === accIdx ? { ...a, name: editingName.trim() } : a));
                              }
                              setEditingIndex(null);
                            }}
                            className="p-1 hover:bg-white/20 rounded cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
                          <span className="font-extrabold text-sm truncate tracking-tight">
                            {acc.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIndex(accIdx);
                              setEditingName(acc.name);
                            }}
                            className="p-1 text-white/60 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                            title="Editar nombre"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {accIdx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAccount(accIdx)}
                          className="p-1 text-white/60 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer ml-1"
                          title="Eliminar cuenta y regresar productos a Cuenta 1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-white/15">
                      <span className="text-xl font-black tracking-tight">
                        Q{accTotal.toFixed(2)}
                      </span>
                      <span className="text-[11px] font-semibold text-white/80">
                        {itemCount} {itemCount === 1 ? 'unidad' : 'unidades'}
                      </span>
                    </div>
                  </div>

                  {/* Lista de productos de la cuenta */}
                  <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[50vh] min-h-[160px]">
                    {acc.items.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center py-8 text-gray-400 px-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                          <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-xs font-semibold text-gray-500">Cuenta Vacía</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Toca &quot;Mover&quot; en cualquier platillo para asignarlo aquí.
                        </p>
                      </div>
                    ) : (
                      acc.items.map((item) => {
                        const lineTotal = Number(item.unitPrice || 0) * Number(item.qty || 1);
                        return (
                          <div
                            key={item.id}
                            className="bg-white border border-gray-200/90 hover:border-gray-300 rounded-xl p-2.5 shadow-2xs transition-all space-y-2 group"
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <ProductIconBadge productName={item.productName} size="sm" className="mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${palette.tag}`}>
                                      S{item.seatNo}
                                    </span>
                                    <span className="text-xs font-bold text-gray-900 truncate">
                                      {item.productName}
                                    </span>
                                  </div>
                                  {item.qty > 1 && (
                                    <p className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded w-fit mt-1">
                                      {item.qty} unidades disponibles
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs font-black text-gray-900">
                                  Q{lineTotal.toFixed(2)}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  {item.qty} × Q{Number(item.unitPrice || 0).toFixed(2)}
                                </p>
                              </div>
                            </div>

                            {/* Botones de transferencia hacia las otras cuentas */}
                            <div className="pt-1.5 border-t border-gray-100 flex gap-1 flex-wrap">
                              {accounts.length === 2 ? (
                                <button
                                  type="button"
                                  onClick={() => handleInitiateMove(accIdx, accIdx === 0 ? 1 : 0, item)}
                                  className={`w-full py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer ${
                                    accIdx === 0
                                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                                  }`}
                                >
                                  {accIdx === 0 ? (
                                    <>
                                      <span>Mover a {accounts[1].name}</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </>
                                  ) : (
                                    <>
                                      <ArrowLeft className="w-3 h-3" />
                                      <span>Devolver a Cuenta 1</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                accounts.map((otherAcc, otherIdx) => {
                                  if (otherIdx === accIdx) return null;
                                  return (
                                    <button
                                      key={otherAcc.id}
                                      type="button"
                                      onClick={() => handleInitiateMove(accIdx, otherIdx, item)}
                                      className="flex-1 py-1 px-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer truncate"
                                      title={`Mover a ${otherAcc.name}`}
                                    >
                                      <span>→ C{otherIdx + 1}</span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal / Selector de Cantidad cuando un producto tiene qty > 1 */}
        {moveModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs z-[70] flex items-center justify-center p-4">
            <m.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-gray-100 space-y-4"
            >
              <div className="text-center">
                <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  División de Cantidades
                </span>
                <h3 className="text-base font-black text-gray-900 mt-1.5">
                  {moveModal.item.productName}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  De <strong>{accounts[moveModal.sourceIndex].name}</strong> hacia <strong>{accounts[moveModal.targetIndex].name}</strong>
                </p>
              </div>

              {/* Selector de Unidades */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700">Cantidad a transferir:</span>
                  <span className="text-[11px] text-gray-500 font-semibold">
                    (de {moveModal.maxAvailable} disp.)
                  </span>
                </div>

                <div className="flex items-center justify-center gap-3 py-1">
                  <button
                    type="button"
                    onClick={() => setMoveModal(prev => ({
                      ...prev,
                      qtyToMove: Math.max(1, prev.qtyToMove - 1)
                    }))}
                    disabled={moveModal.qtyToMove <= 1}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-200 hover:border-blue-400 text-gray-700 font-bold flex items-center justify-center shadow-2xs transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="w-16 text-center">
                    <span className="text-2xl font-black text-gray-900">{moveModal.qtyToMove}</span>
                    <p className="text-[10px] text-gray-400 font-medium">unidad(es)</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMoveModal(prev => ({
                      ...prev,
                      qtyToMove: Math.min(prev.maxAvailable, prev.qtyToMove + 1)
                    }))}
                    disabled={moveModal.qtyToMove >= moveModal.maxAvailable}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-200 hover:border-blue-400 text-gray-700 font-bold flex items-center justify-center shadow-2xs transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Accesos rápidos */}
                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setMoveModal(prev => ({ ...prev, qtyToMove: 1 }))}
                    className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      moveModal.qtyToMove === 1
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Solo 1 unidad
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoveModal(prev => ({ ...prev, qtyToMove: prev.maxAvailable }))}
                    className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      moveModal.qtyToMove === moveModal.maxAvailable
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Todas ({moveModal.maxAvailable})
                  </button>
                </div>

                {moveModal.qtyToMove < moveModal.maxAvailable && (
                  <p className="text-[11px] text-slate-500 font-medium text-center mt-2">
                    ℹ️ Quedarán <strong>{moveModal.maxAvailable - moveModal.qtyToMove}</strong> en {accounts[moveModal.sourceIndex].name}.
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMoveModal(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => executeMove(
                    moveModal.sourceIndex,
                    moveModal.targetIndex,
                    moveModal.item.id,
                    moveModal.qtyToMove,
                    moveModal.item
                  )}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                >
                  Mover {moveModal.qtyToMove} {moveModal.qtyToMove === 1 ? 'unidad' : 'unidades'}
                </button>
              </div>
            </m.div>
          </div>
        )}

        {/* Footer Inferior */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-500 font-medium">Total Mesa:</span>
              <span className="font-extrabold text-gray-900">Q{totalOriginal.toFixed(2)}</span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-500 font-medium">Distribución:</span>
              <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg">
                Q{totalDistributed.toFixed(2)} ✓
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmSplit}
              disabled={loading || accounts.slice(1).every(a => a.items.length === 0)}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? (
                <span>Dividiendo cuentas...</span>
              ) : (
                <span>Confirmar División ({accounts.length} Cuentas)</span>
              )}
            </button>
          </div>
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
  const { hasPermission = () => true } = useAuth() || {};
  const requiresSupervisorPin = !hasPermission('orders.discount');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [type, setType] = useState('percent');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleApply = async () => {
    if (!value) return;
    if (requiresSupervisorPin && !supervisorPin.trim()) {
      toast.error('Se requiere PIN de supervisor para autorizar el descuento');
      return;
    }
    setLoading(true);
    try {
      await api.addDiscount(accountId, {
        type,
        value: parseFloat(value),
        reason,
        createdBy: 1,
        authPin: requiresSupervisorPin ? supervisorPin.trim() : undefined,
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
        
        {requiresSupervisorPin && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold mb-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              Requiere Autorización de Supervisor
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={supervisorPin}
              onChange={(e) => setSupervisorPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Ingresa PIN de Gerente / Admin"
              className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-sm text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        )}

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
            placeholder="Promoción, cortesía, etc."
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl">
            Cancelar
          </button>
          <button 
            onClick={handleApply} 
            disabled={!value || loading || (requiresSupervisorPin && !supervisorPin.trim())}
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
  const { hasPermission = () => true } = useAuth() || {};
  const requiresSupervisorPin = !hasPermission('accounts.close') && !hasPermission('accounts.void');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleClose = async () => {
    if (requiresSupervisorPin && !supervisorPin.trim()) {
      toast.error('Se requiere PIN de supervisor para anular/cerrar la cuenta');
      return;
    }
    setLoading(true);
    try {
      await api.closeAccount(accountId, requiresSupervisorPin ? supervisorPin.trim() : null);
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
        className="bg-white rounded-2xl w-full max-w-sm p-5 text-center"
      >
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">
          ¿Cerrar / Anular Cuenta?
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Estás por cerrar la cuenta <strong>{account?.check_number}</strong>.
          {account?.items?.length > 0
            ? ' Los productos activos serán anulados.'
            : ' La cuenta está vacía.'}
        </p>

        {requiresSupervisorPin && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
            <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold mb-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              Requiere Autorización de Supervisor
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={supervisorPin}
              onChange={(e) => setSupervisorPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Ingresa PIN de Gerente / Admin"
              className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-sm text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 rounded-xl font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleClose}
            disabled={loading || (requiresSupervisorPin && !supervisorPin.trim())}
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