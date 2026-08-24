import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { 
  Receipt, 
  Printer, 
  Link2, 
  X, 
  Check, 
  Users, 
  Clock,
  ChevronRight,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import api from '../api';

export function OpenAccountsPanel({ selectedCenter, onSelectAccount, onRefresh }) {
  const { user } = useAuth();
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState([]);
  const [joining, setJoining] = useState(false);
  const [printing, setPrinting] = useState(null);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.getOpenAccounts(selectedCenter || null);
      setAccounts(data);
    } catch (err) {
      toast.error('Error al cargar cuentas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [selectedCenter]);

  const toggleSelect = (accountId) => {
    setSelected(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleJoin = async () => {
    if (selected.length < 2) {
      toast.error('Selecciona al menos 2 cuentas para unir');
      return;
    }
    
    const confirm = window.confirm(
      `¿Unir ${selected.length} cuentas en una sola?\n\n` +
      selected.map(id => {
        const acc = accounts.find(a => a.id === id);
        return acc ? `• Mesa ${acc.table_code} (Q${Number(acc.total || 0).toFixed(2)})` : '';
      }).join('\n')
    );
    if (!confirm) return;

    setJoining(true);
    try {
      // Join all accounts into the first one (the target)
      const [targetId, ...sourceIds] = selected;
      for (const sourceId of sourceIds) {
        await api.joinAccounts(targetId, sourceId);
      }
      toast.success(`${selected.length} cuentas unidas exitosamente`);
      setSelected([]);
      setSelectMode(false);
      loadAccounts();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || 'Error al unir cuentas');
    } finally {
      setJoining(false);
    }
  };

  const handlePrint = async (accountId) => {
    setPrinting(accountId);
    try {
      const data = await api.printPrecheck(accountId);
      // Show a simple print preview
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const account = data.account;
        const items = data.items;
        const subtotal = items.reduce((sum, i) => sum + Number(i.line_total || 0), 0);
        const tax = subtotal * 0.12;
        const total = subtotal + tax;
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Precuenta - ${account.check_number}</title>
            <style>
              body { font-family: 'Consolas', 'Courier New', monospace; padding: 20px; max-width: 300px; margin: auto; }
              h2 { text-align: center; margin-bottom: 5px; }
              p { margin: 3px 0; text-align: center; }
              hr { border: 1px dashed #000; }
              .item { display: flex; justify-content: space-between; margin: 5px 0; }
              .total { font-weight: bold; font-size: 1.2em; }
              .center { text-align: center; }
            </style>
          </head>
          <body>
            <h2>${account.center_name || 'Restaurante'}</h2>
            <p class="center">${new Date().toLocaleString()}</p>
            <p class="center"><strong>Check: ${account.check_number}</strong></p>
            <p class="center">Mesa: ${account.table_code}</p>
            <p class="center">Mesero: ${account.waiter_name}</p>
            <p class="center">Comensales: ${account.guest_count}</p>
            <hr>
            ${items.map(item => `
              <div class="item">
                <span>${item.qty}x ${item.product_name}</span>
                <span>Q${Number(item.line_total || 0).toFixed(2)}</span>
              </div>
            `).join('')}
            <hr>
            <div class="item">
              <span>Subtotal</span>
              <span>Q${subtotal.toFixed(2)}</span>
            </div>
            <div class="item">
              <span>Impuesto (12%)</span>
              <span>Q${tax.toFixed(2)}</span>
            </div>
            <div class="item total">
              <span>TOTAL</span>
              <span>Q${total.toFixed(2)}</span>
            </div>
            <hr>
            <p class="center" style="font-size: 0.8em; margin-top: 20px;">¡Gracias por su visita!</p>
            <script>window.print();</script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      toast.error('Error al imprimir precuenta');
    } finally {
      setPrinting(null);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  };

  const timeSince = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now - then) / 60000);
    if (diff < 60) return `${diff}m`;
    const hrs = Math.floor(diff / 60);
    return `${hrs}h ${diff % 60}m`;
  };

  return (
    <div className="px-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Cuentas Abiertas
          </h2>
          {accounts.length > 0 && (
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {accounts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAccounts}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {accounts.length >= 2 && (
            <button
              onClick={() => {
                setSelectMode(!selectMode);
                setSelected([]);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectMode 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Link2 className="w-3 h-3 inline mr-1" />
              {selectMode ? 'Cancelar' : 'Unir cuentas'}
            </button>
          )}
        </div>
      </div>

      {/* Join action bar */}
      <AnimatePresence>
        {selectMode && selected.length >= 2 && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-3 bg-blue-50 border border-blue-200 rounded-xl p-3"
          >
            <p className="text-xs text-blue-700 mb-2">
              {selected.length} cuentas seleccionadas
            </p>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {joining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {joining ? 'Uniendo...' : `Unir ${selected.length} cuentas`}
            </button>
          </m.div>
        )}
      </AnimatePresence>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
          <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No hay cuentas abiertas</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {accounts.map((account) => {
            const isMine = account.waiter_id === user?.id;
            const isSelected = selected.includes(account.id);
            
            return (
              <m.div
                key={account.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`
                  relative bg-white rounded-xl border-2 p-3 shadow-sm transition-all cursor-pointer
                  ${isMine ? 'border-cyan-400 bg-cyan-50/30' : 'border-gray-100 hover:border-gray-200'}
                  ${isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : ''}
                `}
                onClick={() => {
                  if (selectMode) {
                    toggleSelect(account.id);
                  } else {
                    onSelectAccount(account);
                  }
                }}
              >
                {/* Selection checkbox */}
                {selectMode && (
                  <div className={`
                    absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${isSelected 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'bg-white border-gray-300'}
                  `}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                )}

                {/* Mine badge */}
                {isMine && !selectMode && (
                  <div className="absolute -top-1.5 -left-1.5 bg-cyan-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    MÍO
                  </div>
                )}

                {/* Card content */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-bold text-gray-900">
                        Mesa {account.table_code}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{account.guest_count} com.</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">
                      Q{Number(account.total || 0).toFixed(0)}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {account.item_count} ítems
                    </p>
                  </div>
                </div>

                {/* Waiter & Time */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span className={isMine ? 'font-semibold text-cyan-700' : ''}>
                    {account.waiter_name}
                  </span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{timeSince(account.opened_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                {!selectMode && (
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAccount(account);
                      }}
                      className="flex-1 bg-gray-900 hover:bg-gray-800 text-white rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1"
                    >
                      Entrar <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrint(account.id);
                      }}
                      disabled={printing === account.id}
                      className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-xs font-medium disabled:opacity-50"
                    >
                      {printing === account.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Printer className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Check number */}
                <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                  {account.check_number}
                </p>
              </m.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
