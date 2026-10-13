import React, { useState, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { 
  X, 
  DollarSign, 
  Calendar, 
  CreditCard, 
  FileText, 
  Upload, 
  Trash2, 
  Loader2, 
  Coins, 
  CheckCircle2,
  Building2 
} from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';

export function SupplierPaymentModal({
  isOpen,
  onClose,
  supplier,
  expense = null, // Si es abono a una factura específica
  onSaved,
}) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const pendingAmount = expense 
    ? Number(expense.amount || 0) - Number(expense.paid_amount || 0)
    : Number(supplier?.pending_balance || 0);

  const [formData, setFormData] = useState({
    amount: pendingAmount > 0 ? String(pendingAmount) : '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'transferencia',
    referenceNumber: '',
    voucherUrl: '',
    notes: '',
  });

  if (!isOpen || !supplier) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.show('El comprobante no debe superar 8MB', { type: 'error' });
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api.expenses.uploadVoucher({
          base64: reader.result,
          fileName: file.name,
        });
        setFormData((prev) => ({ ...prev, voucherUrl: res.url }));
        toast.show('Comprobante adjuntado', { type: 'success' });
      } catch (err) {
        toast.show('Error al subir: ' + err.message, { type: 'error' });
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const num = Number(formData.amount);
    if (isNaN(num) || num <= 0) {
      toast.show('Ingresa un monto válido mayor a 0', { type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await api.expenses.registerSupplierPayment(supplier.id, {
        ...formData,
        expenseId: expense ? expense.id : null,
      });
      toast.show('Abono registrado con éxito', { type: 'success' });
      onSaved?.();
      onClose();
    } catch (err) {
      toast.show(err.message || 'Error al registrar abono', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Registrar Abono a Proveedor</h3>
                <p className="text-xs text-emerald-300 font-medium truncate max-w-xs">
                  {supplier.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Saldo Actual Banner */}
          <div className="bg-emerald-50 px-6 py-3 border-b border-emerald-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                {expense ? `Saldo Pendiente Factura (${expense.document_number || `#${expense.id}`})` : 'Deuda Total Pendiente'}
              </span>
              <span className="text-lg font-black text-emerald-950">
                Q {pendingAmount.toFixed(2)}
              </span>
            </div>
            {pendingAmount > 0 && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, amount: String(pendingAmount) })}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-200/60 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                Liquidar Saldo Completo
              </button>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Monto a Abonar (Q) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    Q
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-base font-bold text-slate-900 bg-emerald-50/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Fecha del Pago *
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Método de Pago *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'transferencia', label: 'Transferencia' },
                  { id: 'efectivo', label: 'Efectivo' },
                  { id: 'tarjeta', label: 'Tarjeta' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: m.id })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      formData.paymentMethod === m.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                No. de Referencia / Boleta Bancaria
              </label>
              <input
                type="text"
                placeholder="Ej: Transf #9823412 o Cheque #441"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-xs font-medium text-slate-800"
              />
            </div>

            {/* Voucher upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Comprobante de Pago (Boleta / Voucher)</span>
                {formData.voucherUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, voucherUrl: '' })}
                    className="text-rose-600 hover:text-rose-700 text-xs font-semibold"
                  >
                    Quitar
                  </button>
                )}
              </label>

              {formData.voucherUrl ? (
                <div className="flex items-center gap-3 p-2 border border-slate-200 rounded-xl bg-slate-50">
                  <img
                    src={formData.voucherUrl}
                    alt="Voucher"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-300"
                  />
                  <span className="text-xs text-slate-600 truncate flex-1">Comprobante adjuntado</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-emerald-700 font-bold px-2 py-1 rounded bg-emerald-100"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {uploadingImage ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-bold">
                      <Loader2 className="w-4 h-4 animate-spin" /> Subiendo comprobante...
                    </div>
                  ) : (
                    <div className="text-slate-500 text-xs flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span>Subir foto de boleta o transferencia</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Notas / Detalle del Pago
              </label>
              <textarea
                rows={2}
                placeholder="Observaciones de abono..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || uploadingImage}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Registrar Abono</span>
              </button>
            </div>
          </form>
        </m.div>
      </div>
    </AnimatePresence>
  );
}

export default SupplierPaymentModal;
