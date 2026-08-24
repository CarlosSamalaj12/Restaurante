import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import api from '../api';
import { 
  Receipt, 
  Printer, 
  Link2, 
  Check, 
  Users, 
  Clock,
  ChevronRight,
  RefreshCw,
  Loader2,
  ArrowLeft
} from 'lucide-react';

export function AccountsPage({ onBack, onSelectAccount }) {
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
      const data = await api.getOpenAccounts(null);
      setAccounts(data);
    } catch (err) {
      toast.error('Error al cargar cuentas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

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
      const [targetId, ...sourceIds] = selected;
      for (const sourceId of sourceIds) {
        await api.joinAccounts(targetId, sourceId);
      }
      toast.success(`${selected.length} cuentas unidas exitosamente`);
      setSelected([]);
      setSelectMode(false);
      loadAccounts();
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 -ml-1.5 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Receipt className="w-4 h-4 text-primary-600" />
            <h1 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Cuentas Abiertas</h1>
            {accounts.length > 0 && (
              <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {accounts.length}
              </span>
            )}
          </div>
          {accounts.length >= 2 && (
            <button
              onClick={() => {
                setSelectMode(!selectMode);
                setSelected([]);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
                selectMode 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Link2 className="w-3 h-3" />
              {selectMode ? 'Cancelar' : 'Unir'}
            </button>
          )}
          <button
            onClick={loadAccounts}
            className="p-1.5 text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {accounts.length > 0 && (
          <p className="text-[11px] text-gray-400 mt-1.5 ml-8">
            Total: <span className="font-medium text-gray-600">Q{accounts.reduce((s, a) => s + Number(a.total || 0), 0).toFixed(2)}</span>
          </p>
        )}
      </header>

      {/* Join action bar */}
      <AnimatePresence>
        {selectMode && selected.length >= 2 && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3"
          >
            <p className="text-xs text-blue-700 font-medium">
              {selected.length} cuentas seleccionadas
            </p>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {joining ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Link2 className="w-3.5 h-3.5" />
              )}
              {joining ? 'Uniendo...' : `Unir ${selected.length} cuentas`}
            </button>
          </m.div>
        )}
      </AnimatePresence>

      {/* Cards - Receipt style grid */}
      <div className="px-3 pt-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <m.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 text-center border border-gray-100 shadow-sm"
          >
            <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">No hay cuentas abiertas</p>
          </m.div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {accounts.map((account) => {
              const isMine = account.waiter_id === user?.id;
              const isSelected = selected.includes(account.id);
              
              return (
                <m.div
                  key={account.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="cursor-pointer transition-all"
                  onClick={() => {
                    if (selectMode) toggleSelect(account.id);
                    else onSelectAccount(account);
                  }}
                >
                  {/* Receipt card - improved */}
                  <div className={`
                    bg-white rounded-lg shadow-sm overflow-hidden border-2
                    ${isMine ? 'border-cyan-500 shadow-cyan-200 shadow-md' : 'border-gray-200'}
                    ${isSelected ? 'border-blue-500 ring-2 ring-blue-300' : ''}
                  `}>
                    {/* Header - Receipt style */}
                    <div className={`${isMine ? 'bg-cyan-600' : 'bg-gray-800'} text-white px-2 py-1.5`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-wide">MESA {account.table_code}</span>
                        {isMine && (
                          <span className="bg-white text-cyan-600 text-[8px] font-black px-1.5 py-0.5 rounded">
                            MÍO
                          </span>
                        )}
                      </div>
                      <p className="text-[7px] text-gray-300 mt-0.5">{account.check_number}</p>
                    </div>

                    {/* Waiter */}
                    <div className="px-2 pt-1.5 pb-1">
                      <p className={`text-[9px] font-medium truncate ${isMine ? 'text-cyan-600' : 'text-gray-500'}`}>
                        👤 {account.waiter_name}
                      </p>
                    </div>

                    {/* Products preview */}
                    <div className="px-2">
                      {account.items && account.items.length > 0 ? (
                        <div className="space-y-0.5 mb-1.5">
                          {account.items.slice(0, 4).map((item, i) => (
                            <div key={i} className="flex justify-between items-center">
                              <span className="text-[8px] text-gray-500 truncate flex-1 mr-1">
                                {item.qty}x {item.product_name}
                              </span>
                              <span className="text-[8px] text-gray-400 shrink-0">
                                Q{Number(item.line_total || 0).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          {account.item_count > 4 && (
                            <p className="text-[7px] text-gray-400 text-center">
                              +{account.item_count - 4} más...
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[8px] text-gray-400 italic mb-1.5">Sin productos</p>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t-2 border-dashed border-gray-300 mx-2"></div>

                    {/* Footer - Total + Info */}
                    <div className="px-2 py-1.5 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[7px] text-gray-400">{account.guest_count}👤</span>
                          <span className="text-[7px] text-gray-400">{timeSince(account.opened_at)}</span>
                        </div>
                        <p className="text-sm font-black text-gray-900">
                          Q{Number(account.total || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {!selectMode && (
                      <div className="px-2 pb-2 pt-1 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(account.id);
                          }}
                          disabled={printing === account.id}
                          className="flex-1 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[8px] font-medium flex items-center justify-center gap-0.5 transition-colors disabled:opacity-50"
                        >
                          {printing === account.id ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Printer className="w-2.5 h-2.5" />
                          )}
                          Precuenta
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAccount(account);
                          }}
                          className="flex-1 py-1 bg-gray-900 hover:bg-gray-800 text-white rounded text-[8px] font-bold flex items-center justify-center gap-0.5 transition-colors"
                        >
                          Entrar →
                        </button>
                      </div>
                    )}

                    {/* Selection */}
                    {selectMode && (
                      <div className="px-2 pb-2 pt-1 flex justify-center">
                        <div className={`
                          w-6 h-6 rounded-full border-2 flex items-center justify-center
                          ${isSelected 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'bg-white border-gray-300'}
                        `}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                    )}
                  </div>
                </m.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
