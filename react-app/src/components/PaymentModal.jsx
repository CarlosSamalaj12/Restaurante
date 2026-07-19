import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Loader2, Check, Banknote, CreditCard, Smartphone } from 'lucide-react';
import api from '../api';
import { useToast } from '../hooks/useToast';

const PAYMENT_METHODS = [
  { code: 'cash', label: 'Efectivo', icon: Banknote, color: 'bg-emerald-500' },
  { code: 'card', label: 'Tarjeta', icon: CreditCard, color: 'bg-blue-500' },
  { code: 'transfer', label: 'Transferencia', icon: Smartphone, color: 'bg-violet-500' },
  { code: 'cxc', label: 'CXC', icon: CreditCard, color: 'bg-amber-500' },
];

export function PaymentModal({ accountId, totals, onClose, onSuccess }) {
  const [paymentMethods, setPaymentMethods] = useState(PAYMENT_METHODS);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('select');
  const [cxcClients, setCxcClients] = useState([]);
  const [showCxcSelector, setShowCxcSelector] = useState(false);
  const [cxcSearch, setCxcSearch] = useState('');
  const toast = useToast();

  const pending = totals?.pending || 0;
  const totalPaid = lines.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const change = Math.max(0, totalPaid - pending);
  const isPaid = totalPaid >= pending;

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const data = await api.bootstrap();
      if (data.paymentMethods?.length > 0) {
        setPaymentMethods(data.paymentMethods.map(pm => ({
          code: pm.code,
          label: pm.label,
          icon: Banknote,
          color: 'bg-primary-500'
        })));
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const addLine = async (method) => {
    if (method.code === 'cxc') {
      try {
        const data = await api.cxc.getClients();
        setCxcClients(data.filter(c => c.cxc_enabled));
        setShowCxcSelector(true);
      } catch (error) {
        toast.error('Error al cargar clientes CXC');
        return;
      }
    }
    setLines([...lines, { 
      id: Date.now(), 
      method: method.code, 
      methodLabel: method.label,
      amount: method.code === 'cxc' ? pending : pending,
      received: method.code === 'cash' ? pending : 0,
      reference: '',
      cxcClientId: null,
      cxcClientName: ''
    }]);
  };

  const updateLine = (id, field, value) => {
    setLines(lines.map(l => 
      l.id === id ? { ...l, [field]: value } : l
    ));
  };

  const removeLine = (id) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const handlePay = async () => {
    if (!isPaid || lines.length === 0) {
      toast.error('El monto es insuficiente');
      return;
    }

    const cxcLine = lines.find(l => l.method === 'cxc');
    if (cxcLine && !cxcLine.cxcClientId) {
      toast.error('Selecciona un cliente CXC');
      return;
    }

    setLoading(true);
    try {
      for (const line of lines) {
        await api.pay(accountId, {
          method: line.method,
          amount: Number(line.amount),
          referenceNo: line.reference || ''
        });

        if (line.method === 'cxc' && line.cxcClientId) {
          await api.cxc.createAccount({
            client_id: line.cxcClientId,
            account_id: accountId,
            amount: Number(line.amount),
            reference: line.reference || '',
            notes: ''
          });
        }
      }
      setStep('success');
      toast.success('Pago registrado');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (error) {
      toast.error(error.message || 'Error al procesar pago');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [10, 20, 50, 100, 200, 500];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">Cobrar</h2>
            <p className="text-sm text-gray-500">Total: Q {pending.toFixed(2)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          
          {/* Payment Lines */}
          <AnimatePresence>
            {lines.map(line => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 text-sm">{line.methodLabel}</span>
                    <button
                      onClick={() => removeLine(line.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wide">Monto</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.amount}
                        onChange={(e) => updateLine(line.id, 'amount', e.target.value)}
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    
                    {line.method === 'cash' && (
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide">Recibido</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.received}
                          onChange={(e) => updateLine(line.id, 'received', e.target.value)}
                          className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        {Number(line.received) >= Number(line.amount) && (
                          <p className="text-xs text-emerald-600 mt-1 font-medium">
                            Cambio: Q {(Number(line.received) - Number(line.amount)).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {['card', 'transfer'].includes(line.method) && (
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wide">Referencia</label>
                        <input
                          type="text"
                          value={line.reference}
                          onChange={(e) => updateLine(line.id, 'reference', e.target.value)}
                          className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Últimos 4 dígitos"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Quick Amounts */}
          {lines.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Montos rápidos</p>
              <div className="flex flex-wrap gap-1.5">
                {quickAmounts.map(amount => (
                  <button
                    key={amount}
                    onClick={() => {
                      if (lines.length > 0) {
                        updateLine(lines[lines.length - 1].id, 'amount', amount);
                      }
                    }}
                    className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 active:bg-gray-200"
                  >
                    Q{amount}
                  </button>
                ))}
                <button
                  onClick={() => {
                    if (lines.length > 0) {
                      updateLine(lines[lines.length - 1].id, 'amount', pending);
                    }
                  }}
                  className="px-2.5 py-1 bg-primary-100 rounded-lg text-xs font-medium text-primary-700"
                >
                  Total
                </button>
              </div>
            </div>
          )}

          {/* CXC Client Selector */}
          {lines.some(l => l.method === 'cxc' && !l.cxcClientId) && (
            <div className="mb-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Seleccionar Cliente CXC</p>
              <input
                type="text"
                value={cxcSearch}
                onChange={(e) => setCxcSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full mb-2 p-2.5 border border-gray-200 rounded-xl text-sm"
                autoFocus
              />
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {cxcClients.filter(c =>
                  c.full_name.toLowerCase().includes(cxcSearch.toLowerCase())
                ).map(client => (
                  <button
                    key={client.id}
                    onClick={() => {
                      setLines(lines.map(l =>
                        l.method === 'cxc' && !l.cxcClientId
                          ? { ...l, cxcClientId: client.id, cxcClientName: client.full_name }
                          : l
                      ));
                      setShowCxcSelector(false);
                    }}
                    className="w-full p-3 bg-amber-50 rounded-xl flex items-center gap-3 hover:bg-amber-100 transition-colors text-left"
                  >
                    <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{client.full_name}</p>
                      <p className="text-[10px] text-gray-500">
                        Crédito: Q{Number(client.credit_limit || 0).toFixed(0)} · 
                        Saldo: Q{Number(client.current_balance || 0).toFixed(0)}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-amber-700">
                      Q{Number((client.credit_limit || 0) - (client.current_balance || 0)).toFixed(0)}
                    </span>
                  </button>
                ))}
                {cxcClients.length === 0 && (
                  <p className="text-sm text-gray-400 py-4 text-center">No hay clientes CXC disponibles</p>
                )}
              </div>
            </div>
          )}

          {/* CXC Client selected badge */}
          {lines.some(l => l.method === 'cxc' && l.cxcClientId) && (
            <div className="mb-4 p-3 bg-amber-50 rounded-xl flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Cliente: {lines.find(l => l.method === 'cxc')?.cxcClientName}
                </p>
              </div>
              <button
                onClick={() => {
                  setLines(lines.map(l =>
                    l.method === 'cxc' ? { ...l, cxcClientId: null, cxcClientName: '' } : l
                  ));
                }}
                className="text-xs text-red-600 font-medium hover:underline"
              >
                Cambiar
              </button>
            </div>
          )}

          {/* Add Payment Method */}
          {step !== 'success' && (
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Agregar forma de pago</p>
              <div className="grid grid-cols-4 gap-2">
                {paymentMethods.slice(0, 4).map(method => {
                  const Icon = method.icon;
                  return (
                    <motion.button
                      key={method.code}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => addLine(method)}
                      className={`${method.color} text-white rounded-xl p-3 flex flex-col items-center gap-1`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium">{method.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Success State */}
          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-8 h-8 text-emerald-600" />
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900">¡Pago Exitoso!</h3>
              <p className="text-sm text-gray-500 mt-1">Redirigiendo...</p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className="p-5 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-gray-600">Total pendiente</span>
              <span className="font-semibold text-gray-900">Q {pending.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-4">
              <span className="text-gray-600">Pagando</span>
              <span className="font-semibold text-emerald-600">Q {totalPaid.toFixed(2)}</span>
            </div>
            {change > 0 && (
              <div className="flex justify-between text-sm mb-4">
                <span className="text-gray-600">Cambio</span>
                <span className="font-semibold text-blue-600">Q {change.toFixed(2)}</span>
              </div>
            )}
            
            <motion.button
              whileTap={{ scale: isPaid && lines.length > 0 ? 0.98 : 1 }}
              onClick={handlePay}
              disabled={!isPaid || loading || lines.length === 0}
              className={`
                w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all
                ${isPaid && lines.length > 0
                  ? 'bg-emerald-600 text-white active:bg-emerald-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Cobrar Q {pending.toFixed(2)}
                </>
              )}
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
