import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Tag, Search, DollarSign, Layers } from 'lucide-react';
import { CategoryFormModal } from './CategoryFormModal';
import { ConfirmDialog } from '../ConfirmDialog';
import api from '../../api';
import { useToast } from '../../hooks/useToast';

export function ExpenseCategoriesTab({ categories = [], onReload }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Diálogo de confirmación moderno con diseño
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    itemName: '',
    itemDetail: '',
    confirmText: 'Eliminar Categoría',
    variant: 'danger',
    loading: false,
    onConfirm: () => {},
  });

  const closeConfirm = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = (id, name, count) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar categoría de gastos?',
      message: count > 0 
        ? `Esta categoría tiene ${count} gastos registrados vinculados. ¿Deseas eliminarla de todas formas?`
        : 'Esta categoría se eliminará permanentemente de tu catálogo.',
      itemName: name,
      itemDetail: count > 0 ? `${count} gastos registrados` : 'Sin gastos registrados',
      variant: 'danger',
      confirmText: 'Eliminar Categoría',
      loading: false,
      onConfirm: async () => {
        setDeletingId(id);
        setConfirmDialog((prev) => ({ ...prev, loading: true }));
        try {
          await api.expenses.deleteCategory(id);
          toast.success('Categoría eliminada');
          onReload?.();
          closeConfirm();
        } catch (err) {
          toast.error(err.message || 'Error al eliminar categoría');
          closeConfirm();
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar categorías de gasto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={() => {
            setSelectedCategory(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nueva Categoría</span>
        </button>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((cat) => {
          const totalSpent = Number(cat.total_spent || 0);
          const count = Number(cat.expenses_count || 0);

          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Top color indicator line */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: cat.color || '#3b82f6' }}
              />

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color || '#3b82f6' }}
                    />
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                      {cat.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setSelectedCategory(cat);
                        setIsModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar categoría"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name, count)}
                      disabled={deletingId === cat.id}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                  {cat.description || 'Sin descripción detallada.'}
                </p>
              </div>

              {/* Stats Footer */}
              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-600">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>{count} {count === 1 ? 'gasto' : 'gastos'}</span>
                </div>
                <div className="font-bold text-slate-900 flex items-center gap-0.5">
                  <span className="text-slate-400 text-[10px]">Q</span>
                  <span>{totalSpent.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
          <Tag className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="font-bold text-sm text-slate-700">No se encontraron categorías</p>
          <p className="text-xs text-slate-400 mt-1">Crea una nueva categoría para organizar tus gastos.</p>
        </div>
      )}

      {/* Modal */}
      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedCategory}
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

export default ExpenseCategoriesTab;
