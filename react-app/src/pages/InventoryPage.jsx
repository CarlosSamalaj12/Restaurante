import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import api from '../api';
import { useToast } from '../hooks/useToast';
import {
  ArrowLeft,
  Plus,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  History,
  Loader2,
  Edit3,
  X
} from 'lucide-react';

function StockBadge({ stock, minStock }) {
  const s = Number(stock);
  const m = Number(minStock || 0);
  let color = 'text-green-700 bg-green-100';
  if (s <= 0) color = 'text-red-700 bg-red-100';
  else if (s <= m) color = 'text-amber-700 bg-amber-100';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {s <= 0 && <AlertTriangle className="w-3 h-3" />}
      {s}
    </span>
  );
}

export function InventoryPage({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showEntry, setShowEntry] = useState(null);
  const [showAdjust, setShowAdjust] = useState(null);
  const [showMovements, setShowMovements] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const toast = useToast();

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await api.inventory.list();
      setItems(data);
    } catch { toast.error('Error al cargar inventario'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadItems(); }, []);

  const handleSaveItem = async (form) => {
    try {
      if (editingItem) {
        await api.inventory.update(editingItem.id, form);
        toast.success('Insumo actualizado');
      } else {
        await api.inventory.create(form);
        toast.success('Insumo creado');
      }
      setShowForm(false);
      setEditingItem(null);
      loadItems();
    } catch { toast.error('Error al guardar'); }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('¿Desactivar este insumo?')) return;
    try {
      await api.inventory.remove(id);
      toast.success('Insumo desactivado');
      loadItems();
    } catch { toast.error('Error al desactivar'); }
  };

  const handleAddEntry = async (data) => {
    try {
      await api.inventory.addMovement({ ...data, type: 'entry' });
      toast.success('Entrada registrada');
      setShowEntry(null);
      loadItems();
    } catch { toast.error('Error al registrar entrada'); }
  };

  const handleAdjust = async (data) => {
    try {
      await api.inventory.addMovement({ ...data, type: 'adjustment' });
      toast.success('Ajuste registrado');
      setShowAdjust(null);
      loadItems();
    } catch { toast.error('Error al registrar ajuste'); }
  };

  const loadMovements = async (itemId) => {
    setMovementsLoading(true);
    try {
      const data = await api.inventory.movements(itemId);
      setMovements(data);
      setShowMovements(itemId);
    } catch { toast.error('Error al cargar movimientos'); }
    finally { setMovementsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg flex-1">Inventario</h1>
          <button
            onClick={() => { setEditingItem(null); setShowForm(true); }}
            className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay insumos registrados</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm"
            >
              + Agregar insumo
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <m.div
                key={item.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
              >
                <div className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    Number(item.current_stock) <= 0 ? 'bg-red-100' :
                    Number(item.current_stock) <= Number(item.min_stock) ? 'bg-amber-100' : 'bg-green-100'
                  }`}>
                    <Package className={`w-5 h-5 ${
                      Number(item.current_stock) <= 0 ? 'text-red-600' :
                      Number(item.current_stock) <= Number(item.min_stock) ? 'text-amber-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{item.unit}</p>
                  </div>
                  <div className="text-right">
                    <StockBadge stock={item.current_stock} minStock={item.min_stock} />
                    {Number(item.min_stock) > 0 && (
                      <p className="text-[10px] text-gray-400 mt-0.5">Mín: {item.min_stock}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => loadMovements(item.id)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Movimientos">
                      <History className="w-4 h-4 text-gray-400" />
                    </button>
                    <button onClick={() => { setEditingItem(item); setShowForm(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Editar">
                      <Edit3 className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="px-4 pb-3 flex gap-2">
                  <button onClick={() => setShowEntry(item)} className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100">
                    <TrendingUp className="w-3.5 h-3.5 inline mr-1" />Entrada
                  </button>
                  <button onClick={() => setShowAdjust(item)} className="flex-1 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100">
                    <TrendingDown className="w-3.5 h-3.5 inline mr-1" />Ajuste
                  </button>
                </div>

                {showMovements === item.id && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    {movementsLoading ? (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin mx-auto" />
                    ) : movements.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center">Sin movimientos</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {movements.map(m => (
                          <div key={m.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                m.type === 'entry' ? 'bg-green-500' :
                                m.type === 'exit' ? 'bg-red-500' : 'bg-amber-500'
                              }`} />
                              <span className="text-gray-600 capitalize">{m.type}</span>
                              {m.note && <span className="text-gray-400">— {m.note}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">
                                {m.type === 'exit' ? '-' : '+'}{m.quantity}
                              </span>
                              <span className="text-gray-400">{new Date(m.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </m.div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <ItemFormModal
          item={editingItem}
          onSave={handleSaveItem}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
        />
      )}

      {showEntry && (
        <MovementModal
          item={showEntry}
          type="entry"
          title="Registrar entrada"
          onSave={handleAddEntry}
          onClose={() => setShowEntry(null)}
        />
      )}

      {showAdjust && (
        <MovementModal
          item={showAdjust}
          type="adjustment"
          title="Ajustar stock"
          onSave={handleAdjust}
          onClose={() => setShowAdjust(null)}
        />
      )}
    </div>
  );
}

function ItemFormModal({ item, onSave, onClose }) {
  const [name, setName] = useState(item?.name || '');
  const [unit, setUnit] = useState(item?.unit || 'pz');
  const [costPrice, setCostPrice] = useState(item?.cost_price || 0);
  const [minStock, setMinStock] = useState(item?.min_stock || 0);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Nombre requerido'); return; }
    setSaving(true);
    await onSave({ name, unit, costPrice: Number(costPrice), minStock: Number(minStock) });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{item ? 'Editar insumo' : 'Nuevo insumo'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">Nombre</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" autoFocus />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500 font-medium">Unidad</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1">
                <option value="pz">Pieza</option>
                <option value="g">Gramo</option>
                <option value="kg">Kilogramo</option>
                <option value="ml">Mililitro</option>
                <option value="l">Litro</option>
                <option value="oz">Onza</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Costo</label>
              <input type="number" step="0.01" min="0" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Stock mín</label>
              <input type="number" step="0.01" min="0" value={minStock} onChange={e => setMinStock(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MovementModal({ item, type, title, onSave, onClose }) {
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!qty || qty <= 0) { toast.error('Cantidad inválida'); return; }
    setSaving(true);
    await onSave({ inventoryItemId: item.id, quantity: qty, note });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{item.name} ({item.unit})</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">Cantidad</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Nota (opcional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder={type === 'entry' ? 'Factura #, proveedor...' : 'Motivo del ajuste...'} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
