import { useState } from 'react';
import { m } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import {
  Loader2,
  X,
  Wallet,
  CheckCircle2,
  Printer,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  FileCheck2,
  AlertCircle
} from 'lucide-react';

export function GlobalPayModal({ client, onClose, onRefresh }) {
  const [amount, setAmount] = useState('');
  const [payMethod, setPayMethod] = useState('efectivo');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState(null);
  const toast = useToast();
  const { user } = useAuth();

  const balance = Number(client.current_balance || 0);
  const creditLimit = Number(client.credit_limit || 0);

  const handlePay = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    setPaying(true);
    try {
      const res = await api.cxc.payGlobal(client.id, {
        amount: val,
        payment_method: payMethod,
        reference: reference.trim(),
        notes: notes.trim()
      });
      toast.success(`Abono de Q${res.total_paid.toFixed(2)} registrado exitosamente`);
      setResult(res);
      onRefresh();
    } catch (error) {
      toast.error(error.message || 'Error al aplicar abono');
    } finally {
      setPaying(false);
    }
  };

  const setFullAmount = () => {
    if (balance > 0) {
      setAmount(balance.toFixed(2));
    }
  };

  const setHalfAmount = () => {
    if (balance > 0) {
      setAmount((balance / 2).toFixed(2));
    }
  };

  const printReceipt = () => {
    if (!result) return;
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Permite las ventanas emergentes para imprimir');
      return;
    }

    const cashierName = user?.full_name || 'Cajero';
    const dateStr = new Date().toLocaleDateString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const prevBalance = balance;
    const totalPaid = Number(result.total_paid || 0);
    const newBalance = Number(result.client_balance || 0);

    const affectedRows = (result.applied_payments || [])
      .map(
        (p) => `
        <div style="display:flex; justify-content:space-between; font-size:9pt; margin-bottom:2px;">
          <span>Cuenta #${p.account_id}</span>
          <span style="font-weight:bold;">-Q${Number(p.amount).toFixed(2)}</span>
        </div>
      `
      )
      .join('');

    w.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Comprobante de Abono - ${client.full_name}</title>
  <style>
    @page { margin: 0; size: 80mm auto; }
    body {
      font-family: 'Courier New', Courier, monospace, sans-serif;
      width: 72mm;
      margin: 0 auto;
      padding: 10px 4px;
      color: #000;
      font-size: 10pt;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .double-divider { border-top: 2px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 9.5pt; }
    .btn-print {
      display: block;
      width: 100%;
      padding: 8px;
      background: #000;
      color: #fff;
      font-weight: bold;
      border: none;
      border-radius: 4px;
      margin-bottom: 12px;
      cursor: pointer;
    }
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">IMPRIMIR COMPROBANTE</button>
  </div>

  <div class="text-center">
    <div style="font-size: 13pt; font-weight: bold;">RESTAURANTE POS</div>
    <div style="font-size: 9pt;">CONTROL DE CUENTAS POR COBRAR</div>
    <div class="double-divider"></div>
    <div style="font-size: 11pt; font-weight: bold;">COMPROBANTE DE ABONO</div>
  </div>

  <div class="divider"></div>

  <div class="row">
    <span>Fecha:</span>
    <span class="bold">${dateStr} ${timeStr}</span>
  </div>
  <div class="row">
    <span>Cliente:</span>
    <span class="bold">${client.full_name}</span>
  </div>
  ${client.area_name ? `
  <div class="row">
    <span>Área/Inst:</span>
    <span>${client.area_name}</span>
  </div>` : ''}
  <div class="row">
    <span>Atendido por:</span>
    <span>${cashierName}</span>
  </div>
  <div class="row">
    <span>Método Pago:</span>
    <span class="bold">${payMethod.toUpperCase()}</span>
  </div>
  ${reference ? `
  <div class="row">
    <span>Referencia:</span>
    <span>${reference}</span>
  </div>` : ''}

  <div class="divider"></div>

  <div class="row">
    <span>Saldo Anterior:</span>
    <span>Q${prevBalance.toFixed(2)}</span>
  </div>
  <div class="row" style="font-size: 11pt;">
    <span class="bold">ABONO RECIBIDO:</span>
    <span class="bold">Q${totalPaid.toFixed(2)}</span>
  </div>
  <div class="double-divider"></div>
  <div class="row" style="font-size: 11pt;">
    <span class="bold">NUEVO SALDO:</span>
    <span class="bold">Q${newBalance.toFixed(2)}</span>
  </div>

  ${affectedRows ? `
  <div class="divider"></div>
  <div style="font-size: 8.5pt; font-weight: bold; margin-bottom: 4px;">DESGLOSE CUENTAS ABONADAS:</div>
  ${affectedRows}
  ` : ''}

  <div class="divider"></div>
  <div class="text-center" style="font-size: 8.5pt; margin-top: 10px;">
    ¡Gracias por su pago puntual!<br/>
    Documento interno no válido como factura
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>
    `);
    w.document.close();
  };

  const paymentMethods = [
    { id: 'efectivo', label: 'Efectivo', icon: Banknote },
    { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
    { id: 'transferencia', label: 'Transferencia', icon: ArrowRightLeft },
    { id: 'cheque', label: 'Cheque', icon: FileCheck2 },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <m.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Wallet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Registrar Abono
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[220px]">
                {client.full_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {result ? (
            /* Post-payment confirmation view */
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
              </div>

              <div>
                <h4 className="text-lg font-extrabold text-slate-900">
                  ¡Abono Aplicado con Éxito!
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  El saldo de {client.full_name} ha sido actualizado
                </p>
              </div>

              {/* Stats card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500">Monto Abonado</span>
                  <span className="text-base font-extrabold text-emerald-600">
                    Q{Number(result.total_paid).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                  <span className="text-xs font-semibold text-slate-500">Nuevo Saldo Pendiente</span>
                  <span className="text-sm font-bold text-slate-900">
                    Q{Number(result.client_balance).toFixed(2)}
                  </span>
                </div>
                {result.remaining > 0 && (
                  <div className="flex items-center gap-2 bg-amber-50 p-2.5 rounded-xl text-amber-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Q{result.remaining.toFixed(2)} sobrante (no habían más comandas con deuda)</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={printReceipt}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Comprobante de Abono</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Finalizar y Volver a CXC
                </button>
              </div>
            </div>
          ) : (
            /* Input payment form */
            <>
              {/* Client Balance Info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Saldo Pendiente</p>
                  <p className={`text-xl font-extrabold mt-0.5 ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    Q{balance.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Límite Autorizado</p>
                  <p className="text-base font-bold text-slate-700 mt-0.5">
                    Q{creditLimit.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Shortcuts buttons */}
              {balance > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Atajos de Cobro Rápido
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={setFullAmount}
                      className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <span>Pagar Totalidad</span>
                      <span className="opacity-80 text-[11px]">(Q{balance.toFixed(0)})</span>
                    </button>
                    <button
                      type="button"
                      onClick={setHalfAmount}
                      className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <span>Pagar 50%</span>
                      <span className="opacity-80 text-[11px]">(Q{(balance / 2).toFixed(0)})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Amount input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Monto a Abonar (Q) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">
                    Q
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-lg font-extrabold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Método de Pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethods.map((m) => {
                    const Icon = m.icon;
                    const isSelected = payMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayMethod(m.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Referencia / No. Boleta (Opcional)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ej. Transferencia #849202"
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Observaciones / Notas (Opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles sobre el pago..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 outline-none resize-none"
                />
              </div>

              {/* Footer buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={paying}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={paying || !amount || parseFloat(amount) <= 0}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Aplicando Abono...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>Abonar Q{parseFloat(amount || 0).toFixed(2)}</span>
                    </>
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
