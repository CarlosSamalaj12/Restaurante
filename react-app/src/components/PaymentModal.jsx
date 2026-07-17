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

  const addLine = (method) => {
    setLines([...lines, { 
      id: Date.now(), 
      method: method.code, 
      methodLabel: method.label,
      amount: pending,
      received: method.code === 'cash' ? pending : 0,
      reference: ''
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

    setLoading(true);
    try {
      for (const line of lines) {
        await api.pay(accountId, {
          method: line.method,
          amount: Number(line.amount),
          referenceNo: line.reference || ''
        });
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
