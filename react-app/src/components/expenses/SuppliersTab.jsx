import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Edit2, 
  Trash2, 
  FileText, 
  Coins, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ExternalLink 
} from 'lucide-react';
import { SupplierFormModal } from './SupplierFormModal';
import { SupplierStatementModal } from './SupplierStatementModal';
import { SupplierPaymentModal } from './SupplierPaymentModal';
import { ConfirmDialog } from '../ConfirmDialog';
import api from '../../api';
import { useToast } from '../../hooks/useToast';

export function SuppliersTab({ suppliers = [], onReload }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [onlyDebt, setOnlyDebt] = useState(false);

  // Modals state
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statementSupplierId, setStatementSupplierId] = useState(null);
  const [payingSupplier, setPayingSupplier] = useState(null);

  // Diálogo de confirmación moderno con diseño
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    itemName: '',
    itemDetail: '',
    confirmText: 'Eliminar Proveedor',
    variant: 'danger',
    loading: false,
    onConfirm: () => {},
  });

  const closeConfirm = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
  };

  const filtered = suppliers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.tax_id && s.tax_id.toLowerCase().includes(search.toLowerCase())) ||
      (s.contact_name && s.contact_name.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.toLowerCase().includes(search.toLowerCase()));

    const matchesDebt = onlyDebt ? Number(s.pending_balance || 0) > 0 : true;
    return matchesSearch && matchesDebt;
  });

  const totalDebt = suppliers.reduce((acc, s) => acc + Number(s.pending_balance || 0), 0);
  const suppliersWithDebt = suppliers.filter((s) => Number(s.pending_balance || 0) > 0).length;

  const handleDelete = (id, name, balance) => {
    if (balance > 0) {
      toast.error('No puedes eliminar un proveedor con saldo deudor pendiente');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar este proveedor?',
      message: 'El proveedor se removerá de tu catálogo comercial. El historial contable ya cerrado no se modificará.',
      itemName: name,
      itemDetail: 'Sin deuda pendiente',
      variant: 'danger',
      confirmText: 'Eliminar Proveedor',
      loading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }));
        try {
          await api.expenses.deleteSupplier(id);
          toast.success('Proveedor eliminado exitosamente');
          onReload?.();
          closeConfirm();
        } catch (err) {
          toast.error(err.message || 'Error al eliminar');
          closeConfirm();
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* KPIs Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Deuda Total a Proveedores
            </span>
            <span className="text-2xl font-black text-rose-700 mt-1 block">
              Q {totalDebt.toFixed(2)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Proveedores con Deuda
            </span>
            <span className="text-2xl font-black text-amber-700 mt-1 block">
              {suppliersWithDebt}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Total Proveedores
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {suppliers.length}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, NIT, contacto o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={onlyDebt}
              onChange={(e) => setOnlyDebt(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
            />
            <span>Solo con deuda activa</span>
          </label>
        </div>

        <button
          onClick={() => {
            setEditingSupplier(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-98 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nuevo Proveedor</span>
        </button>
      </div>

      {/* Suppliers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((supplier) => {
          const debt = Number(supplier.pending_balance || 0);
          const hasDebt = debt > 0;

          return (
            <div
              key={supplier.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between group ${
                hasDebt ? 'border-rose-200/80 hover:border-rose-300' : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {supplier.name}
                    </h4>
                    {supplier.tax_id && (
                      <span className="text-[11px] font-mono text-slate-500 font-semibold">
                        NIT: {supplier.tax_id}
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                      hasDebt
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {hasDebt ? `Debe Q ${debt.toFixed(2)}` : 'Al día'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-600 my-3">
                  {supplier.contact_name && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">Contacto:</span>
                      <span className="font-semibold text-slate-800">{supplier.contact_name}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Crédito: {supplier.credit_days > 0 ? `${supplier.credit_days} días` : 'Contado'}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setStatementSupplierId(supplier.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Estado Cuenta</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {hasDebt && (
                    <button
                      onClick={() => setPayingSupplier(supplier)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors active:scale-95"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Abonar</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setEditingSupplier(supplier);
                      setIsFormOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Editar proveedor"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(supplier.id, supplier.name, debt)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Eliminar proveedor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
          <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="font-bold text-sm text-slate-700">No se encontraron proveedores</p>
          <p className="text-xs text-slate-400 mt-1">Registra nuevos proveedores para llevar el control de tus deudas y compras.</p>
        </div>
      )}

      {/* Form Modal */}
      <SupplierFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingSupplier}
        onSaved={onReload}
      />

      {/* Statement Modal */}
      <SupplierStatementModal
        isOpen={Boolean(statementSupplierId)}
        onClose={() => setStatementSupplierId(null)}
        supplierId={statementSupplierId}
        onReload={onReload}
      />

      {/* Quick Pay Modal */}
      <SupplierPaymentModal
        isOpen={Boolean(payingSupplier)}
        onClose={() => setPayingSupplier(null)}
        supplier={payingSupplier}
        onSaved={onReload}
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

export default SuppliersTab;
