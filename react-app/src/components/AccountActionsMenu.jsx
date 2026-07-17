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

function SplitAccountsModal({ accountId, tableId, onClose, onRefresh }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    if (!tableId) return;
    setLoading(true);
    try {
      const data = await api.getAccounts(tableId);
      setAccounts(data);
    } catch (error) {
      toast.error('Error al cargar cuentas');
    } finally {
      setLoading(false);
    }
  };

  const handleSplitEqual = async () => {
    if (accounts.length < 2) {
      toast.error('Necesitas al menos 2 cuentas para dividir');
      return;
    }
    try {
      const targetIds = accounts.filter(a => a.id !== accountId).map(a => a.id);
      await api.splitEqual(accountId, targetIds);
      toast.success('Cuenta dividida equitativamente');
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
        <h3 className="font-semibold text-gray-900 mb-4">Dividir Cuenta</h3>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando...</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Dividirá los productos de esta cuenta entre {accounts.length} cuentas de la mesa.
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl">
                Cancelar
              </button>
              <button onClick={handleSplitEqual} className="flex-1 py-3 bg-blue-500 text-white rounded-xl">
                Dividir 1/{accounts.length}
              </button>
            </div>
          </>
        )}
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
            body { font-family: monospace; width: 72mm; margin: 0 auto; font-size: 12px; }
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