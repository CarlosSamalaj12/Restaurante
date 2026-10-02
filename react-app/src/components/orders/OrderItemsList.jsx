import React, { useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Package,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  FileText,
  ChefHat,
  Pencil,
  X,
  Loader2,
  Check
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ProductIconBadge } from '../../utils/productIcons';

const QUICK_NOTES = [
  'Sin cebolla',
  'Salsa aparte',
  'Bien caliente',
  'Sin sal',
  'Sin picante',
  'Para llevar'
];

export function OrderItemsList({
  items,
  account,
  totals,
  updateItemQuantity,
  updateItemNotes,
  handleVoidItem,
  quickNotes = []
}) {
  const { currencySymbol = 'Q' } = useAuth() || {};
  const [editingItem, setEditingItem] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const availableQuickNotes = useMemo(() => {
    if (Array.isArray(quickNotes) && quickNotes.length > 0) {
      return quickNotes
        .filter(n => typeof n === 'string' || n.is_active !== 0)
        .map(n => typeof n === 'string' ? n : n.label)
        .filter(Boolean);
    }
    return QUICK_NOTES;
  }, [quickNotes]);

  const handleOpenNotes = (item) => {
    setEditingItem(item);
    setNotesDraft(item.notes || '');
  };

  const handleCloseNotes = () => {
    setEditingItem(null);
    setNotesDraft('');
    setSavingNotes(false);
  };

  const handleSaveNotes = async () => {
    if (!editingItem || !updateItemNotes) return;
    setSavingNotes(true);
    try {
      const success = await updateItemNotes(editingItem.id, notesDraft.trim());
      if (success) {
        handleCloseNotes();
      }
    } finally {
      setSavingNotes(false);
    }
  };

  const handleToggleQuickNote = (note) => {
    const current = notesDraft.trim();
    if (!current) {
      setNotesDraft(note);
    } else if (current.includes(note)) {
      const regex = new RegExp(`(^|,\\s*)${note}(,\\s*|$)`, 'gi');
      const updated = current.replace(regex, ', ').replace(/^,\s*|,\s*$/g, '').trim();
      setNotesDraft(updated);
    } else {
      setNotesDraft(`${current}, ${note}`);
    }
  };

  return (
    <m.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-gray-100 flex-shrink-0 flex flex-col justify-between"
    >
      <div>
        {/* Order Header */}
        <div className="px-4 py-3 border-b border-gray-50 bg-slate-50/50">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary-600" />
              <h2 className="font-bold text-gray-900 text-sm">Tu Orden</h2>
            </div>
            <span className="px-2.5 py-0.5 bg-primary-50 text-primary-700 rounded-full text-xs font-bold border border-primary-200/50">
              {items.length} {items.length === 1 ? 'producto' : 'productos'}
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: Math.max(account?.guest_count || 4, 1) }, (_, i) => i + 1).map(seat => {
              const count = items
                .filter(it => (it.seat_no || 1) === seat)
                .reduce((acc, it) => acc + Number(it.qty || 1), 0);
              return count > 0 ? (
                <span key={seat} className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow-2xs ${
                  seat === 1 ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                  seat === 2 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                  seat === 3 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  'bg-purple-100 text-purple-800 border border-purple-200'
                }`}>
                  S{seat}: {count}
                </span>
              ) : null;
            })}
          </div>
        </div>
        
        {/* Items List */}
        <div className="p-3 space-y-2.5 max-h-[35vh] lg:max-h-[calc(100vh-320px)] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {items.length === 0 ? (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-10"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2 text-gray-400">
                  <Package className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-gray-500">Sin productos aún</p>
                <p className="text-xs text-gray-400 mt-0.5">Toca cualquier platillo del menú para agregarlo</p>
              </m.div>
            ) : (
              items.map((item) => {
                const isSent = Boolean(item.sent_at);

                return (
                  <m.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-3 rounded-2xl border transition-all ${
                      isSent
                        ? 'bg-slate-50 border-slate-200/80 shadow-2xs'
                        : 'bg-white border-primary-200/70 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <ProductIconBadge productName={item.product_name} size="sm" className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              (item.seat_no || 1) === 1 ? 'bg-blue-100 text-blue-700' :
                              (item.seat_no || 1) === 2 ? 'bg-emerald-100 text-emerald-700' :
                              (item.seat_no || 1) === 3 ? 'bg-amber-100 text-amber-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              S{(item.seat_no || 1)}
                            </span>
                            <p className="text-sm font-bold text-gray-900 truncate">
                              {item.product_name}
                            </p>
                          </div>

                          {/* Modificadores */}
                          {item.modifiers?.length > 0 && (
                            <p className="text-[11px] text-gray-500 mt-1 truncate">
                              {item.modifiers.map(m => m.name).join(', ')}
                            </p>
                          )}

                          {/* Notas / Observaciones */}
                          {item.notes ? (
                            <div
                              onClick={() => !isSent && handleOpenNotes(item)}
                              className={`text-[11px] text-amber-800 bg-amber-50/90 border border-amber-200/80 px-2 py-0.5 rounded-md font-medium mt-1 flex items-center justify-between gap-1 transition-all ${
                                !isSent ? 'cursor-pointer hover:bg-amber-100 hover:border-amber-300' : ''
                              }`}
                              title={!isSent ? 'Toca para editar observaciones' : ''}
                            >
                              <span className="truncate">📝 {item.notes}</span>
                              {!isSent && <Pencil className="w-2.5 h-2.5 text-amber-600 shrink-0" />}
                            </div>
                          ) : !isSent ? (
                            <button
                              type="button"
                              onClick={() => handleOpenNotes(item)}
                              className="mt-1 text-[11px] font-medium text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
                              title="Agregar nota u observación para cocina"
                            >
                              <FileText className="w-2.5 h-2.5" />
                              <span>+ Nota</span>
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {/* Botones de acción derecha (Nota + Eliminar) */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {!isSent && (
                          <m.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => handleOpenNotes(item)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar observación"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </m.button>
                        )}
                        <m.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => {
                            if (isSent) {
                              handleVoidItem(item);
                            } else if (updateItemQuantity) {
                              updateItemQuantity(item.id, 0);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title={isSent ? 'Anular producto enviado (PIN requerido)' : 'Eliminar de la comanda'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </m.button>
                      </div>
                    </div>

                    {/* Fila de Cantidad y Total */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100">
                      {!isSent && updateItemQuantity ? (
                        /* Controles de cantidad instantáneos para ítems no enviados */
                        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl">
                          <m.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => updateItemQuantity(item.id, Number(item.qty || 1) - 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-white hover:bg-red-50 hover:text-red-600 text-gray-700 font-bold transition-all shadow-2xs cursor-pointer"
                            title={Number(item.qty) === 1 ? 'Eliminar' : 'Reducir'}
                          >
                            <Minus className="w-3 h-3" />
                          </m.button>
                          <span className="w-7 text-center font-bold text-xs text-gray-900">
                            {item.qty}
                          </span>
                          <m.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => updateItemQuantity(item.id, Number(item.qty || 1) + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-white hover:bg-emerald-50 hover:text-emerald-600 text-gray-700 font-bold transition-all shadow-2xs cursor-pointer"
                            title="Aumentar"
                          >
                            <Plus className="w-3 h-3" />
                          </m.button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-700">
                            {item.qty} × {currencySymbol} {Number(item.unit_price || 0).toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {currencySymbol} {Number(item.line_total || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {isSent && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md w-fit">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Enviado a preparación</span>
                      </div>
                    )}
                  </m.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Totals Section */}
      <div className="p-4 bg-slate-50 border-t border-gray-100">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600 text-xs">
            <span>Subtotal</span>
            <span className="font-semibold">{currencySymbol} {Number(totals.subtotal || 0).toFixed(2)}</span>
          </div>
          {Number(totals.discountTotal || 0) > 0 && (
            <div className="flex justify-between text-red-600 text-xs font-semibold">
              <span>Descuento</span>
              <span>-{currencySymbol} {Number(totals.discountTotal || 0).toFixed(2)}</span>
            </div>
          )}
          {Number(totals.tipAmount || 0) > 0 && (
            <div className="flex justify-between text-gray-600 text-xs">
              <span>Propina</span>
              <span className="font-semibold">{currencySymbol} {Number(totals.tipAmount || 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-gray-900 pt-2 border-t border-gray-200 text-base">
            <span>Total</span>
            <span className="text-primary-600">{currencySymbol} {Number(totals.total || 0).toFixed(2)}</span>
          </div>
          {Number(totals.pending || 0) > 0 && (
            <div className="flex justify-between text-amber-600 font-bold text-xs pt-0.5">
              <span>Pendiente de pago</span>
              <span>{currencySymbol} {Number(totals.pending || 0).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Editar Observaciones del Ítem */}
      <AnimatePresence>
        {editingItem && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={handleCloseNotes}
          >
            <m.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm leading-tight truncate max-w-[200px]">
                      {editingItem.product_name}
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Silla {editingItem.seat_no || 1} · Observaciones de cocina
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseNotes}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                {/* Atajos Rápidos */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Atajos rápidos
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableQuickNotes.map((note) => {
                      const isIncluded = notesDraft.includes(note);
                      return (
                        <button
                          key={note}
                          type="button"
                          onClick={() => handleToggleQuickNote(note)}
                          className={`
                            px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border
                            ${isIncluded
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            }
                          `}
                        >
                          {isIncluded ? '✓ ' : '+ '}
                          {note}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Input de texto libre */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Detalle personalizado
                  </label>
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Ej: Término medio, sin cebolla, salsa aparte..."
                    rows={3}
                    autoFocus
                    className="w-full p-3 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-gray-50/50"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-gray-100 bg-white flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseNotes}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <m.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-colors"
                >
                  {savingNotes ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Guardar Nota</span>
                </m.button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}

export default OrderItemsList;
