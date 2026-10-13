import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Building2, 
  Download, 
  FileText, 
  Coins, 
  Calendar, 
  CreditCard, 
  ExternalLink,
  CheckCircle2,
  Clock,
  Plus,
  Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import { VoucherPreviewModal } from './VoucherPreviewModal';
import { SupplierPaymentModal } from './SupplierPaymentModal';

export function SupplierStatementModal({ isOpen, onClose, supplierId, onReload }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [statement, setStatement] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('bills'); // 'bills' | 'payments'
  
  // Modals
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [paymentBill, setPaymentBill] = useState(null); // specific bill to pay
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  const fetchStatement = async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const data = await api.expenses.getSupplierStatement(supplierId);
      setStatement(data);
    } catch (err) {
      toast.show(err.message || 'Error al cargar estado de cuenta', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && supplierId) {
      fetchStatement();
    }
  }, [isOpen, supplierId]);

  if (!isOpen) return null;

  const handleExportExcel = () => {
    if (!statement) return;
    const { supplier, bills, payments, summary } = statement;

    const billsData = bills.map((b) => ({
      Fecha: b.expense_date,
      'No. Factura/Serie': b.document_number || 'S/N',
      Categoría: b.category_name,
      Concepto: b.description,
      'Monto Total': Number(b.amount || 0),
      'Monto Abonado': Number(b.paid_amount || 0),
      'Saldo Pendiente': Number(b.pending_amount || 0),
      Estado: b.status === 'paid' ? 'Pagado' : b.status === 'partial' ? 'Abono Parcial' : 'Pendiente',
      Notas: b.notes || '',
    }));

    const paymentsData = payments.map((p) => ({
      Fecha: p.payment_date,
      Monto: Number(p.amount || 0),
      'Método de Pago': p.payment_method,
      'No. Referencia/Boleta': p.reference_number || 'S/N',
      'Factura Aplicada': p.bill_number || 'Abono Global',
      'Registrado Por': p.created_by_name || 'Admin',
      Notas: p.notes || '',
    }));

    const wb = XLSX.utils.book_new();
    const wsBills = XLSX.utils.json_to_sheet(billsData);
    const wsPayments = XLSX.utils.json_to_sheet(paymentsData);

    XLSX.utils.book_append_sheet(wb, wsBills, 'Facturas y Compras');
    XLSX.utils.book_append_sheet(wb, wsPayments, 'Historial de Abonos');

    const fileName = `Estado_Cuenta_${supplier.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.show('Estado de cuenta exportado exitosamente', { type: 'success' });
  };

  const supplier = statement?.supplier;
  const summary = statement?.summary;
  const bills = statement?.bills || [];
  const payments = statement?.payments || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-w-4xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {supplier?.name || 'Estado de Cuenta de Proveedor'}
                </h3>
                <p className="text-xs text-slate-300">
                  {supplier?.tax_id ? `NIT/Doc: ${supplier.tax_id} | ` : ''}
                  {supplier?.contact_name ? `Contacto: ${supplier.contact_name} | ` : ''}
                  {supplier?.phone ? `Tel: ${supplier.phone}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                disabled={loading || !statement}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                title="Exportar a Excel"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Excel</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex-1 p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold">Cargando estado de cuenta...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* KPIs de Cuenta por Pagar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Total Facturado a Crédito
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    Q {Number(summary?.totalCreditInvoiced || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                    Total Abonado / Liquidado
                  </span>
                  <span className="text-xl font-black text-emerald-800">
                    Q {Number(summary?.totalPaid || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                      Saldo Deudor Actual
                    </span>
                    <span className="text-xl font-black text-rose-900">
                      Q {Number(summary?.pendingDebt || 0).toFixed(2)}
                    </span>
                  </div>

                  {Number(summary?.pendingDebt || 0) > 0 && (
                    <button
                      onClick={() => {
                        setPaymentBill(null);
                        setIsPayModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Abonar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-tabs: Facturas vs Pagos */}
              <div className="border-b border-slate-200 flex items-center gap-4">
                <button
                  onClick={() => setActiveSubTab('bills')}
                  className={`pb-3 text-xs font-bold tracking-tight transition-colors flex items-center gap-2 border-b-2 ${
                    activeSubTab === 'bills'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Facturas & Compras ({bills.length})</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('payments')}
                  className={`pb-3 text-xs font-bold tracking-tight transition-colors flex items-center gap-2 border-b-2 ${
                    activeSubTab === 'payments'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  <span>Historial de Abonos ({payments.length})</span>
                </button>
              </div>

              {/* Sub-tab 1: Bills */}
              {activeSubTab === 'bills' && (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">No. Doc</th>
                        <th className="py-3 px-4">Concepto</th>
                        <th className="py-3 px-4 text-right">Total</th>
                        <th className="py-3 px-4 text-right">Abonado</th>
                        <th className="py-3 px-4 text-right">Saldo</th>
                        <th className="py-3 px-4 text-center">Estado</th>
                        <th className="py-3 px-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bills.map((bill) => {
                        const isPending = bill.status !== 'paid' && bill.payment_method === 'por_pagar';
                        return (
                          <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                              {bill.expense_date}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-700">
                              {bill.document_number || '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-800 font-medium max-w-xs truncate">
                              {bill.description}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">
                              Q {Number(bill.amount).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-emerald-700">
                              Q {Number(bill.paid_amount || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-rose-700">
                              Q {Number(bill.pending_amount || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  bill.status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : bill.status === 'partial'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {bill.status === 'paid' ? 'Pagado' : bill.status === 'partial' ? 'Parcial' : 'Pendiente'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {bill.voucher_url && (
                                  <button
                                    onClick={() => setSelectedVoucher(bill.voucher_url)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"
                                    title="Ver comprobante adjunto"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>
                                )}
                                {isPending && (
                                  <button
                                    onClick={() => {
                                      setPaymentBill(bill);
                                      setIsPayModalOpen(true);
                                    }}
                                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                                  >
                                    Pagar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {bills.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No hay compras o facturas registradas para este proveedor.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sub-tab 2: Payments */}
              {activeSubTab === 'payments' && (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">Método</th>
                        <th className="py-3 px-4">No. Referencia</th>
                        <th className="py-3 px-4">Factura Asociada</th>
                        <th className="py-3 px-4 text-right">Monto Abonado</th>
                        <th className="py-3 px-4">Registrado Por</th>
                        <th className="py-3 px-4 text-center">Comprobante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                            {p.payment_date}
                          </td>
                          <td className="py-3 px-4 uppercase font-bold text-slate-600">
                            {p.payment_method}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">
                            {p.reference_number || '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {p.bill_number ? `Factura ${p.bill_number}` : 'Abono Global a Saldo'}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-800">
                            Q {Number(p.amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {p.created_by_name || 'Admin'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {p.voucher_url ? (
                              <button
                                onClick={() => setSelectedVoucher(p.voucher_url)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded-md inline-flex items-center gap-1 text-[11px] font-bold"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Ver</span>
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No se han registrado abonos o pagos a este proveedor.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </m.div>

        {/* Voucher Lightbox Modal */}
        <VoucherPreviewModal
          isOpen={Boolean(selectedVoucher)}
          onClose={() => setSelectedVoucher(null)}
          voucherUrl={selectedVoucher}
          title="Comprobante de Pago / Factura"
        />

        {/* Register Payment Modal */}
        <SupplierPaymentModal
          isOpen={isPayModalOpen}
          onClose={() => {
            setIsPayModalOpen(false);
            setPaymentBill(null);
          }}
          supplier={supplier}
          expense={paymentBill}
          onSaved={() => {
            fetchStatement();
            onReload?.();
          }}
        />
      </div>
    </AnimatePresence>
  );
}

export default SupplierStatementModal;
