import React, { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Upload, 
  Trash2, 
  DollarSign, 
  Calendar, 
  Tag, 
  Building2, 
  FileText, 
  CreditCard, 
  Wallet, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';

export function ExpenseFormModal({
  isOpen,
  onClose,
  onSaved,
  categories = [],
  suppliers = [],
  initialData = null,
}) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    expenseDate: new Date().toISOString().split('T')[0],
    categoryId: '',
    supplierId: '',
    description: '',
    documentNumber: '',
    amount: '',
    paymentMethod: 'efectivo',
    affectsShiftCash: false,
    voucherUrl: '',
    notes: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        expenseDate: initialData.expense_date || new Date().toISOString().split('T')[0],
        categoryId: initialData.category_id || '',
        supplierId: initialData.supplier_id || '',
        description: initialData.description || '',
        documentNumber: initialData.document_number || '',
        amount: initialData.amount || '',
        paymentMethod: initialData.payment_method || 'efectivo',
        affectsShiftCash: Boolean(initialData.affects_shift_cash),
        voucherUrl: initialData.voucher_url || '',
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        expenseDate: new Date().toISOString().split('T')[0],
        categoryId: categories[0]?.id || '',
        supplierId: '',
        description: '',
        documentNumber: '',
        amount: '',
        paymentMethod: 'efectivo',
        affectsShiftCash: false,
        voucherUrl: '',
        notes: '',
      });
    }
  }, [initialData, categories, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.show('El archivo no debe exceder 8MB', { type: 'error' });
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
        toast.show('Comprobante adjuntado con éxito', { type: 'success' });
      } catch (err) {
        toast.show('Error al subir el comprobante: ' + (err.message || 'Error'), { type: 'error' });
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.categoryId) {
      toast.show('Selecciona una categoría de gasto', { type: 'error' });
      return;
    }
    if (!formData.description.trim()) {
      toast.show('Ingresa una descripción o concepto', { type: 'error' });
      return;
    }
    const numAmount = Number(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.show('El monto debe ser mayor a 0', { type: 'error' });
      return;
    }

    if (formData.paymentMethod === 'por_pagar' && !formData.supplierId) {
      toast.show('Para un gasto "Por Pagar", debes seleccionar a qué proveedor se le debe', { type: 'error' });
      return;
    }

    setLoading(true);
    try {
      if (initialData?.id) {
        await api.expenses.updateExpense(initialData.id, formData);
        toast.show('Gasto actualizado exitosamente', { type: 'success' });
      } else {
        await api.expenses.createExpense(formData);
        toast.show('Gasto registrado exitosamente', { type: 'success' });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.show(err.message || 'Error al guardar el gasto', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
        <m.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {initialData ? 'Editar Registro de Gasto' : 'Nuevo Gasto Operativo'}
                </h3>
                <p className="text-xs text-slate-300">
                  {initialData ? 'Modifica los datos del egreso' : 'Registra un egreso administrativo o de operación'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Fila 1: Fecha y Monto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Fecha del Gasto *
                </label>
                <input
                  type="date"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-800 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Monto Total (Q) *
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
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-bold text-slate-900 bg-emerald-50/30 placeholder:text-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Fila 2: Categoría y Proveedor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" />
                  Categoría *
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-800 bg-slate-50/50"
                >
                  <option value="">-- Seleccionar categoría --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  Proveedor
                </label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-800 bg-slate-50/50"
                >
                  <option value="">-- Sin proveedor (Gasto general) --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.tax_id ? `(${s.tax_id})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fila 3: Descripción y No. Documento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Concepto / Descripción *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Compra de verduras, pago de luz, etc."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-800 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  No. Factura / Serie
                </label>
                <input
                  type="text"
                  placeholder="Ej: FAC-45892"
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium text-slate-800 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Fila 4: Método de Pago */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                Forma de Pago *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'efectivo', label: 'Efectivo', color: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
                  { id: 'tarjeta', label: 'Tarjeta', color: 'border-blue-300 bg-blue-50 text-blue-800' },
                  { id: 'transferencia', label: 'Transferencia', color: 'border-purple-300 bg-purple-50 text-purple-800' },
                  { id: 'por_pagar', label: 'Por Pagar (Crédito)', color: 'border-amber-300 bg-amber-50 text-amber-800' },
                ].map((item) => {
                  const isSelected = formData.paymentMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: item.id })}
                      className={`p-2.5 rounded-xl border-2 text-xs font-bold transition-all text-center ${
                        isSelected
                          ? `${item.color} ring-2 ring-offset-1 ring-slate-400 font-extrabold shadow-sm`
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opcional Caja Chica si es Efectivo */}
            {formData.paymentMethod === 'efectivo' && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="affectsShiftCash"
                  checked={formData.affectsShiftCash}
                  onChange={(e) => setFormData({ ...formData, affectsShiftCash: e.target.checked })}
                  className="mt-1 w-4 h-4 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="affectsShiftCash" className="text-xs text-slate-700 cursor-pointer">
                  <span className="font-bold text-emerald-950 block">Descontar de la caja chica del turno activo</span>
                  Si marcas esta casilla, el monto de este gasto se restará automáticamente del arqueo de efectivo en la gaveta del turno actual.
                </label>
              </div>
            )}

            {/* Adjuntar Voucher / Factura (Imagen) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                  Comprobante / Voucher (Imagen o PDF)
                </span>
                {formData.voucherUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, voucherUrl: '' })}
                    className="text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Quitar comprobante
                  </button>
                )}
              </label>

              {formData.voucherUrl ? (
                <div className="relative rounded-2xl border border-slate-200 p-2.5 bg-slate-50 flex items-center gap-4">
                  <img
                    src={formData.voucherUrl}
                    alt="Voucher"
                    className="w-16 h-16 object-cover rounded-xl border border-slate-300 shadow-xs"
                    onError={(e) => {
                      // Fallback si es PDF
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">Comprobante adjuntado</p>
                    <a
                      href={formData.voucherUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ver archivo original
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700"
                  >
                    Reemplazar
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-4 text-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {uploadingImage ? (
                    <div className="flex items-center justify-center gap-2 text-indigo-600 text-xs font-bold py-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Subiendo comprobante...
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-slate-500 py-1">
                      <Upload className="w-6 h-6 text-slate-400 mb-0.5" />
                      <span className="text-xs font-bold text-slate-700">Haz clic para subir comprobante o foto de factura</span>
                      <span className="text-[11px] text-slate-400">PNG, JPG, WebP o PDF hasta 8MB</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notas / Observaciones */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Notas u Observaciones Adicionales
              </label>
              <textarea
                rows={2}
                placeholder="Anotaciones para auditoría o contabilidad..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs text-slate-800 bg-slate-50/50"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || uploadingImage}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{initialData ? 'Actualizar Gasto' : 'Guardar Gasto'}</span>
              </button>
            </div>
          </form>
        </m.div>
      </div>
    </AnimatePresence>
  );
}

export default ExpenseFormModal;
