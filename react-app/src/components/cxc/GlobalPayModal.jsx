import { useState } from 'react';
import { m } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Loader2,
  X
} from 'lucide-react';

export function GlobalPayModal({ client, onClose, onRefresh }) {
  const [amount, setAmount] = useState('');
  const [payMethod, setPayMethod] = useState('efectivo');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState(null);
  const toast = useToast();

  const handlePay = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    setPaying(true);
    try {
      const res = await api.cxc.payGlobal(client.id, { amount: val, payment_method: payMethod, reference, notes });
      toast.success(`Pago global de Q${res.total_paid.toFixed(2)} aplicado`);
      setResult(res);
      onRefresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPaying(false);
    }
  };

  const balance = Number(client.current_balance || 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <m.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Pago Global - {client.full_name}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {result ? (
            <div className="space-y-3">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-700">Q{result.total_paid.toFixed(2)}</p>
                <p className="text-sm text-green-600 mt-1">Total pagado</p>
              </div>
              {result.remaining > 0 && (
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-sm text-amber-700">Saldo no aplicado: Q{result.remaining.toFixed(2)}</p>
                  <p className="text-xs text-amber-500">No hay suficientes cuentas pendientes para este monto</p>
                </div>
              )}
              <p className="text-sm text-gray-500 text-center">Nuevo saldo del cliente: <span className="font-semibold text-gray-900">Q{result.client_balance.toFixed(2)}</span></p>
              {result.applied_payments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cuentas afectadas ({result.applied_payments.length})</p>
                  <div className="space-y-1.5">
                    {result.applied_payments.map((p, i) => (
                      <div key={i} className="flex justify-between bg-gray-50 rounded-lg p-2.5 text-sm">
                        <span className="text-gray-600">Cuenta #{p.account_id}</span>
                        <span className="font-medium text-green-600">-Q{p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={onClose} className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium">
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Saldo Actual</p>
                  <p className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>Q{balance.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Límite</p>
                  <p className="text-lg font-bold text-gray-800">Q{Number(client.credit_limit || 0).toFixed(2)}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Monto a pagar *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-xl p-3 text-lg font-semibold"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Método de pago</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Referencia (opcional)</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="No. de referencia"
                  className="w-full border border-gray-200 rounded-xl p-3"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">Notas (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas del pago..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl p-3 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm">
                  Cancelar
                </button>
                <button
                  onClick={handlePay}
                  disabled={paying || !amount || parseFloat(amount) <= 0}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando...</>
                  ) : (
                    <>Pagar Q{parseFloat(amount || 0).toFixed(2)}</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </m.div>
    </div>
  );
}

