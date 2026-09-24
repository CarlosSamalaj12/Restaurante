import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Loader2,
  X
} from 'lucide-react';

export function AccountDetailModal({ accountId, onClose, onRefresh }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('efectivo');
  const [payRef, setPayRef] = useState('');
  const [paying, setPaying] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadAccount();
  }, [accountId]);

  const loadAccount = async () => {
    setLoading(true);
    try {
      const data = await api.cxc.getAccount(accountId);
      setAccount(data);
    } catch (error) {
      toast.error('Error al cargar cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    if (amount > (account?.balance || 0)) {
      toast.error('El monto excede el saldo pendiente');
      return;
    }
    setPaying(true);
    try {
      await api.cxc.payAccount(accountId, {
        amount,
        payment_method: payMethod,
        reference: payRef,
        notes: ''
      });
      toast.success('Pago registrado');
      setShowPayment(false);
      setPayAmount('');
      setPayRef('');
      loadAccount();
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPaying(false);
    }
  };

  const statusConfig = {
    paid: { label: 'Pagado', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    partial: { label: 'Parcial', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    pending: { label: 'Pendiente', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <m.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-lg p-10 flex justify-center"
        >
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </m.div>
      </div>
    );
  }

  if (!account) return null;

  const status = statusConfig[account.status] || statusConfig.pending;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <m.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-gray-900">Cuenta CXC</h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {account.check_number || `#${account.id}`} · {new Date(account.created_at).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Info summary */}
          <div className="px-5 py-4 bg-gray-50 border-b">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Monto</p>
                <p className="text-lg font-bold text-gray-900">Q{Number(account.amount || 0).toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Saldo</p>
                <p className={`text-lg font-bold ${status.text}`}>Q{Number(account.balance || 0).toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Pagado</p>
                <p className="text-lg font-bold text-green-600">
                  Q{Number((account.amount || 0) - (account.balance || 0)).toFixed(2)}
                </p>
              </div>
            </div>
            {account.waiter_name && (
              <p className="text-xs text-gray-500 text-center mt-3">
                Atendido por: <span className="font-medium text-gray-700">{account.waiter_name}</span>
              </p>
            )}
            {account.notes && (
              <p className="text-xs text-gray-500 text-center mt-1">
                Nota: {account.notes}
              </p>
            )}
          </div>

          {/* Products */}
          <div className="px-5 py-4 border-b">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Productos ({account.items?.length || 0})
            </h4>
            {account.items?.length > 0 ? (
              <div className="space-y-1.5">
                {account.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                      {item.notes && (
                        <p className="text-[10px] text-amber-600 italic">Nota: {item.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{item.qty} × Q{Number(item.unit_price).toFixed(2)}</p>
                      <p className="text-sm font-semibold text-gray-900">Q{Number(item.line_total).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin productos (cargo manual)</p>
            )}
          </div>

          {/* Payments */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Pagos ({account.payments?.length || 0})
              </h4>
              {account.status !== 'paid' && (
                <button
                  onClick={() => setShowPayment(!showPayment)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  {showPayment ? 'Cancelar' : '+ Nuevo Pago'}
                </button>
              )}
            </div>

            {showPayment && (
              <m.div
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                style={{ transformOrigin: 'top' }}
                className="bg-blue-50 rounded-xl p-4 mb-3 space-y-3"
              >
                <p className="text-sm font-medium text-blue-900">Registrar Pago</p>
                <div>
                  <label className="text-xs text-blue-700">Monto</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full mt-1 p-2.5 border border-blue-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-blue-700">Método</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-blue-200 rounded-xl text-sm"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-blue-700">Referencia (opcional)</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="No. de referencia"
                    className="w-full mt-1 p-2.5 border border-blue-200 rounded-xl text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPayment(false)}
                    className="flex-1 py-2.5 border border-blue-200 rounded-xl text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handlePay}
                    disabled={paying || !payAmount}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                  >
                    {paying ? 'Pagando...' : `Pagar Q${parseFloat(payAmount || 0).toFixed(2)}`}
                  </button>
                </div>
              </m.div>
            )}

            {account.payments?.length > 0 ? (
              <div className="space-y-1.5">
                {account.payments.map(pay => (
                  <div key={pay.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Q{Number(pay.amount).toFixed(2)}</p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(pay.created_at).toLocaleDateString()} {new Date(pay.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">
                        {pay.payment_method}
                      </span>
                      {pay.reference && (
                        <p className="text-[10px] text-gray-400 mt-0.5">Ref: {pay.reference}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin pagos registrados</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white">
          <button onClick={onClose} className="w-full py-3 border border-gray-200 rounded-xl text-sm font-medium">
            Cerrar
          </button>
        </div>
      </m.div>
    </div>
  );
}

