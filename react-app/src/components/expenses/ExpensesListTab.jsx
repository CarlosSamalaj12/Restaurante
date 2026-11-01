import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Download, 
  Calendar, 
  Filter, 
  Trash2, 
  Edit2, 
  FileText, 
  Coins, 
  CreditCard, 
  Building2, 
  Tag, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  RefreshCw,
  Loader2,
  DollarSign
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { ExpenseFormModal } from './ExpenseFormModal';
import { VoucherPreviewModal } from './VoucherPreviewModal';
import { ConfirmDialog } from '../ConfirmDialog';

export function ExpensesListTab({ categories = [], suppliers = [], onReload }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [kpis, setKpis] = useState({
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    cashAmount: 0,
    totalCount: 0,
  });

  // Diálogo de confirmación moderno con diseño
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    itemName: '',
    itemDetail: '',
    confirmText: 'Eliminar Gasto',
    variant: 'danger',
    loading: false,
    onConfirm: () => {},
  });

  const closeConfirm = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
  };

  // Filters
  const [datePreset, setDatePreset] = useState('month'); // 'today' | 'week' | 'month' | 'all' | 'custom'
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [previewVoucherUrl, setPreviewVoucherUrl] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.expenses.getExpenses({
        startDate: datePreset === 'all' ? null : startDate,
        endDate: datePreset === 'all' ? null : endDate,
        categoryId: selectedCategory || null,
        supplierId: selectedSupplier || null,
        paymentMethod: selectedMethod || null,
        status: selectedStatus || null,
        search: search || null,
      });
      setExpenses(res.expenses || []);
      setKpis(res.kpis || {});
    } catch (err) {
      toast.show(err.message || 'Error al cargar gastos', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [startDate, endDate, selectedCategory, selectedSupplier, selectedMethod, selectedStatus, datePreset]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExpenses();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleDelete = (id, desc) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar este registro de gasto?',
      message: 'El movimiento contable y su comprobante asociado serán eliminados.',
      itemName: desc || 'Gasto',
      itemDetail: 'Esta acción no se puede deshacer.',
      variant: 'danger',
      confirmText: 'Eliminar Gasto',
      loading: false,
      onConfirm: async () => {
        setDeletingId(id);
        setConfirmDialog((prev) => ({ ...prev, loading: true }));
        try {
          await api.expenses.deleteExpense(id);
          toast.success('Gasto eliminado exitosamente');
          fetchExpenses();
          onReload?.();
          closeConfirm();
        } catch (err) {
          toast.error(err.message || 'Error al eliminar el gasto');
          closeConfirm();
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const handleExportExcel = () => {
    if (expenses.length === 0) {
      toast.show('No hay datos para exportar', { type: 'error' });
      return;
    }

    const exportRows = expenses.map((e) => ({
      Fecha: e.expense_date,
      Categoría: e.category_name,
      Concepto: e.description,
      'No. Documento/Factura': e.document_number || 'S/N',
      Proveedor: e.supplier_name || 'Gasto General',
      'Método de Pago': e.payment_method,
      Estado: e.status === 'paid' ? 'Pagado' : e.status === 'partial' ? 'Abono Parcial' : 'Por Pagar',
      'Monto Total (Q)': Number(e.amount),
      'Monto Pagado (Q)': Number(e.paid_amount || 0),
      'Saldo Pendiente (Q)': Number(e.pending_amount || 0),
      'Descontado de Caja Chica': e.affects_shift_cash ? 'Sí' : 'No',
      'Registrado Por': e.created_by_name || 'Admin',
      Notas: e.notes || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
    const fileName = `Reporte_Gastos_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.show('Reporte exportado a Excel', { type: 'success' });
  };

  return (
    <div className="space-y-5">
      {/* KPIs Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Total Gastos
            </span>
            <span className="text-base sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1 block truncate">
              Q {Number(kpis.totalAmount || 0).toFixed(2)}
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
              {kpis.totalCount || 0} registros
            </span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0 ml-2">
            <Coins className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Total Pagado
            </span>
            <span className="text-base sm:text-2xl font-black text-emerald-700 mt-0.5 sm:mt-1 block truncate">
              Q {Number(kpis.paidAmount || 0).toFixed(2)}
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
              Liquidado
            </span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0 ml-2">
            <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Por Pagar (Deuda)
            </span>
            <span className="text-base sm:text-2xl font-black text-rose-700 mt-0.5 sm:mt-1 block truncate">
              Q {Number(kpis.pendingAmount || 0).toFixed(2)}
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
              Pendientes
            </span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shrink-0 ml-2">
            <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Total Efectivo
            </span>
            <span className="text-base sm:text-2xl font-black text-teal-700 mt-0.5 sm:mt-1 block truncate">
              Q {Number(kpis.cashAmount || 0).toFixed(2)}
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
              Caja chica
            </span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shrink-0 ml-2">
            <DollarSign className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Row 1: Presets, Custom Date, Buttons */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-none w-full lg:w-auto shrink-0 -mx-1 sm:mx-0 px-1">
            {[
              { id: 'today', label: 'Hoy' },
              { id: 'week', label: 'Esta Semana' },
              { id: 'month', label: 'Este Mes' },
              { id: 'all', label: 'Todo' },
              { id: 'custom', label: 'Personalizado' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {datePreset !== 'all' && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold text-slate-700 bg-slate-50 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 flex-1 sm:flex-initial justify-between">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setDatePreset('custom');
                    setStartDate(e.target.value);
                  }}
                  className="bg-transparent border-0 focus:ring-0 p-0 text-xs font-bold text-slate-800"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setDatePreset('custom');
                    setEndDate(e.target.value);
                  }}
                  className="bg-transparent border-0 focus:ring-0 p-0 text-xs font-bold text-slate-800"
                />
              </div>
            )}

            <button
              onClick={handleExportExcel}
              disabled={loading || expenses.length === 0}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 shrink-0 cursor-pointer"
              title="Exportar a Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              onClick={() => {
                setEditingExpense(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all shrink-0 ml-auto sm:ml-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nuevo Gasto</span>
            </button>
          </div>
        </div>

        {/* Row 2: Selectors & Search Input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 pt-2 border-t border-slate-100">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por concepto, doc o proveedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Todas las Categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Todos los Proveedores</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Todos los Métodos</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
            <option value="por_pagar">Por Pagar (Crédito)</option>
          </select>
        </div>
      </div>

      {/* Expenses List: Dual Mobile Cards & Desktop Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs font-semibold">Cargando lista de gastos...</p>
          </div>
        ) : (
          <>
            {/* Mobile View (< md): Touch-optimized tactile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {expenses.map((expense) => {
                const isCredit = expense.payment_method === 'por_pagar';
                return (
                  <div key={expense.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                    {/* Header: Date + Category pill + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500">
                          {expense.expense_date}
                        </span>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs"
                          style={{ backgroundColor: expense.category_color || '#64748b' }}
                        >
                          {expense.category_name}
                        </span>
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          expense.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : expense.status === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {expense.status === 'paid' ? 'Pagado' : expense.status === 'partial' ? 'Abono Parcial' : 'Por Pagar'}
                      </span>
                    </div>

                    {/* Concept & Doc */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {expense.description}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                        {expense.document_number && (
                          <span className="font-mono font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                            Doc: {expense.document_number}
                          </span>
                        )}
                        <span>•</span>
                        <span className="font-semibold text-slate-700">
                          {expense.supplier_name || 'Gasto General'}
                        </span>
                      </div>
                    </div>

                    {/* Details & Amount */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="uppercase text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {expense.payment_method}
                          </span>
                          {Boolean(expense.affects_shift_cash) && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                              Caja Chica
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Por: {expense.created_by_name?.split(' ')[0] || 'Admin'}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-black text-slate-900 text-sm">
                          Q {Number(expense.amount).toFixed(2)}
                        </div>
                        {isCredit && Number(expense.pending_amount) > 0 && (
                          <div className="text-[10px] font-bold text-rose-600">
                            Resta: Q {Number(expense.pending_amount).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5 pt-0.5">
                      {expense.voucher_url && (
                        <button
                          onClick={() => setPreviewVoucherUrl(expense.voucher_url)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors mr-auto cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Ver Voucher</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingExpense(expense);
                          setIsFormOpen(true);
                        }}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-slate-200/80 cursor-pointer"
                        title="Editar gasto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id, expense.description)}
                        disabled={deletingId === expense.id}
                        className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200/80 cursor-pointer"
                        title="Eliminar gasto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {expenses.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No se encontraron registros de gastos con los filtros seleccionados.
                </div>
              )}
            </div>

            {/* Desktop View (>= md): Full Detailed Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Fecha</th>
                    <th className="py-3.5 px-4">Categoría</th>
                    <th className="py-3.5 px-4">Concepto / No. Doc</th>
                    <th className="py-3.5 px-4">Proveedor</th>
                    <th className="py-3.5 px-4">Método</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-right">Monto Total</th>
                    <th className="py-3.5 px-4">Usuario</th>
                    <th className="py-3.5 px-4 text-center">Voucher</th>
                    <th className="py-3.5 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((expense) => {
                    const isCredit = expense.payment_method === 'por_pagar';

                    return (
                      <tr key={expense.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                          {expense.expense_date}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: expense.category_color || '#64748b' }}
                          >
                            {expense.category_name}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 truncate">
                            {expense.description}
                          </div>
                          {expense.document_number && (
                            <div className="text-[11px] font-mono text-slate-500 font-semibold mt-0.5">
                              Doc: {expense.document_number}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                          {expense.supplier_name ? (
                            <span className="font-semibold text-slate-900">{expense.supplier_name}</span>
                          ) : (
                            <span className="text-slate-400 italic">General</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="uppercase text-[11px] font-bold text-slate-600">
                            {expense.payment_method}
                          </span>
                          {Boolean(expense.affects_shift_cash) && (
                            <span className="block text-[10px] text-emerald-600 font-bold">
                              Caja Chica
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              expense.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : expense.status === 'partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {expense.status === 'paid' ? 'Pagado' : expense.status === 'partial' ? 'Abono Parcial' : 'Por Pagar'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-black text-slate-900 text-sm">
                            Q {Number(expense.amount).toFixed(2)}
                          </div>
                          {isCredit && Number(expense.pending_amount) > 0 && (
                            <div className="text-[11px] font-bold text-rose-600">
                              Resta: Q {Number(expense.pending_amount).toFixed(2)}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {expense.created_by_name?.split(' ')[0] || 'Admin'}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {expense.voucher_url ? (
                            <button
                              onClick={() => setPreviewVoucherUrl(expense.voucher_url)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Ver</span>
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingExpense(expense);
                                setIsFormOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar gasto"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id, expense.description)}
                              disabled={deletingId === expense.id}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar gasto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No se encontraron registros de gastos con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Form Modal */}
      <ExpenseFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        categories={categories}
        suppliers={suppliers}
        initialData={editingExpense}
        onSaved={() => {
          fetchExpenses();
          onReload?.();
        }}
      />

      {/* Voucher Lightbox Modal */}
      <VoucherPreviewModal
        isOpen={Boolean(previewVoucherUrl)}
        onClose={() => setPreviewVoucherUrl(null)}
        voucherUrl={previewVoucherUrl}
        title="Comprobante de Gasto / Factura"
      />

      {/* Modal de confirmación estilizado */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        itemName={confirmDialog.itemName}
        itemDetail={confirmDialog.itemDetail}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        loading={confirmDialog.loading}
      />
    </div>
  );
}

export default ExpensesListTab;
