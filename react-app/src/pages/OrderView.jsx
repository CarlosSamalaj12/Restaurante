import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useToast } from '../hooks/useToast';
import { PaymentModal } from '../components/PaymentModal';
import { AccountActionsMenu } from '../components/AccountActionsMenu';
import {
  ArrowLeft,
  Send,
  Loader2,
  Check,
  Trash2,
  Package,
  ShoppingBag,
  X,
  MoreVertical,
  Plus
} from 'lucide-react';

export function OrderView({ accountId, tableCode, tableId, onBack }) {
  const [account, setAccount] = useState(null);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({});
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingItem, setAddingItem] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [itemToVoid, setItemToVoid] = useState(null);
  const [voidPin, setVoidPin] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [currentSeat, setCurrentSeat] = useState(1);
  const [itemNotes, setItemNotes] = useState('');
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, [accountId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountData, productsData, categoriesData] = await Promise.all([
        api.getAccount(accountId),
        api.getProducts(),
        api.getCategories()
      ]);
      
      setAccount(accountData.account);
      setItems(accountData.items || []);
      setTotals(accountData.totals || {});
      setCategories(categoriesData || []);
      setProducts(productsData || []);
      
      if (productsData.categories?.length > 0) {
        setSelectedCategory(productsData.categories[0].id);
      }
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (product) => {
    const requiredModifiers = product.modifiers?.filter(m => m.minSelect > 0) || [];
    if (requiredModifiers.length > 0) {
      setSelectedProduct(product);
      setSelectedModifiers({});
      setItemNotes('');
      setShowModifierModal(true);
      return;
    }
    await addItemToAccount(product.id, 1, [], '');
  };

  const addItemToAccount = async (productId, qty, modifierOptionIds, notes = '') => {
    setAddingItem(true);
    try {
      await api.addItem(accountId, {
        productId,
        qty,
        seatNo: currentSeat,
        modifierOptionIds,
        notes
      });
      toast.success(`${selectedProduct?.name || 'Producto'} agregado`);
      loadData();
      setShowModifierModal(false);
    } catch (error) {
      console.error('Add item error:', error);
      toast.error(error.message || 'Error al agregar producto');
    } finally {
      setAddingItem(false);
    }
  };

  const handleModifierToggle = (groupId, optionId) => {
    const modifier = selectedProduct.modifiers?.find(m => m.groupId === groupId);
    const maxSelect = modifier?.maxSelect || 0;

    setSelectedModifiers(prev => {
      const current = prev[groupId] || [];
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter(id => id !== optionId) };
      }
      if (maxSelect > 0 && current.length >= maxSelect) {
        toast.info(`Máximo ${maxSelect} opción${maxSelect > 1 ? 'es' : ''} para "${modifier.name}"`);
        return prev;
      }
      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  const handleConfirmModifiers = () => {
    if (!selectedProduct) return;
    const allOptionIds = Object.values(selectedModifiers).flat();
    addItemToAccount(selectedProduct.id, 1, allOptionIds, itemNotes);
  };

  const handleSendOrder = async () => {
    try {
      await api.sendOrder(accountId);
      toast.success('Pedido enviado a cocina');
      loadData();
    } catch (error) {
      toast.error(error.message || 'Error al enviar');
    }
  };

  const handleVoidItem = (item) => {
    setItemToVoid(item);
    setVoidPin('');
    setVoidReason('');
    setShowVoidModal(true);
  };

  const confirmVoidItem = async () => {
    if (!itemToVoid) return;
    
    // Check if item was sent (needs PIN)
    if (itemToVoid.sent_at && !voidPin.trim()) {
      toast.error('Ingresa el PIN de autorización para anular productos enviados');
      return;
    }
    
    try {
      const payload = {
        reason: voidReason || 'Cancelado'
      };
      
      // If item was sent, use PIN auth
      if (itemToVoid.sent_at) {
        payload.authPin = voidPin;
      } else {
        // If not sent, just pass the waiter ID
        payload.authorizedBy = account?.waiter_id;
      }
      
      await api.voidItem(itemToVoid.id, payload);
      toast.success('Producto anulado');
      setShowVoidModal(false);
      setItemToVoid(null);
      setVoidPin('');
      setVoidReason('');
      loadData();
    } catch (error) {
      toast.error(error.message || 'Error al anular');
    }
  };

  const handlePaymentSuccess = () => {
    toast.success('¡Cuenta cerrada!');
    onBack();
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-gray-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <motion.header 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white border-b border-gray-100 sticky top-0 z-30"
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </motion.button>
            <div>
              <h1 className="font-semibold text-gray-900">Mesa {tableCode}</h1>
              <p className="text-xs text-gray-500">{account?.check_number}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSendOrder}
              className="px-3 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowActions(true)}
              className="p-2 bg-gray-100 text-gray-700 rounded-xl"
            >
              <MoreVertical className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.header>

      <div className="flex flex-col lg:flex-row">
        {/* Order Summary - Collapsible on mobile */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-gray-100"
        >
          {/* Order Header */}
          <div className="px-4 py-3 border-b border-gray-50">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-gray-500" />
                <h2 className="font-medium text-gray-900 text-sm">Tu Orden</h2>
              </div>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                {items.length} items
              </span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: Math.max(account?.guest_count || 4, 1) }, (_, i) => i + 1).map(seat => {
                const count = items.filter(it => (it.seat_no || 1) === seat).length;
                return count > 0 ? (
                  <span key={seat} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    seat === 1 ? 'bg-blue-100 text-blue-700' :
                    seat === 2 ? 'bg-emerald-100 text-emerald-700' :
                    seat === 3 ? 'bg-amber-100 text-amber-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    S{seat}: {count}
                  </span>
                ) : null;
              })}
            </div>
          </div>
          
          {/* Items List */}
          <div className="p-3 space-y-2 max-h-[30vh] lg:max-h-[calc(100vh-200px)] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Sin productos</p>
                </motion.div>
              ) : (
                items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="p-2.5 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            (item.seat_no || 1) === 1 ? 'bg-blue-100 text-blue-700' :
                            (item.seat_no || 1) === 2 ? 'bg-emerald-100 text-emerald-700' :
                            (item.seat_no || 1) === 3 ? 'bg-amber-100 text-amber-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            S{(item.seat_no || 1)}
                          </span>
                          <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                        </div>
                        {item.modifiers?.length > 0 && (
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate ml-7">
                            {item.modifiers.map(m => m.name).join(', ')}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-amber-600 italic mt-0.5 ml-7">
                            Nota: {item.notes}
                          </p>
                        )}
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleVoidItem(item)}
                        className="p-1.5 text-red-500/70 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-gray-500">
                        {item.qty} × Q{Number(item.unit_price || 0).toFixed(2)}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        Q{Number(item.line_total || 0).toFixed(2)}
                      </span>
                    </div>
                    {item.sent_at && (
                      <span className="inline-block mt-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        ✓ Enviado
                      </span>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Totals */}
          <div className="p-4 bg-gray-50 border-t border-gray-100">
                <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>Q {Number(totals.subtotal || 0).toFixed(2)}</span>
              </div>
              {Number(totals.discountTotal || 0) > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Descuento</span>
                  <span>-Q {Number(totals.discountTotal || 0).toFixed(2)}</span>
                </div>
              )}
              {Number(totals.tipAmount || 0) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Propina</span>
                  <span>Q {Number(totals.tipAmount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-primary-600">Q {Number(totals.total || 0).toFixed(2)}</span>
              </div>
              {Number(totals.pending || 0) > 0 && (
                <div className="flex justify-between text-amber-600 font-medium">
                  <span>Pendiente</span>
                  <span>Q {Number(totals.pending || 0).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Products Panel */}
        <div className="flex-1 p-3 lg:p-4">
          {/* Categories - Horizontal scroll */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(null)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                ${selectedCategory === null
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600'
                }
              `}
            >
              Todos
            </motion.button>
            {categories.map(cat => (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(cat.id)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                  ${selectedCategory === cat.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}
              >
                {cat.name}
              </motion.button>
            ))}
          </div>

          {/* Seat selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
            {Array.from({ length: Math.max(account?.guest_count || 4, 1) }, (_, i) => i + 1).map(seat => (
              <motion.button
                key={seat}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentSeat(seat)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5
                  ${currentSeat === seat
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentSeat === seat ? 'bg-white' : 'bg-gray-400'}`} />
                Silla {seat}
              </motion.button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => {
                return (
                  <motion.button
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleAddItem(product)}
                    disabled={addingItem}
                    className="relative bg-white rounded-2xl p-4 border border-gray-200 text-left disabled:opacity-50 hover:border-emerald-400 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="pb-2 mb-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">
                        {product.name}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-emerald-600">
                        Q{Number(product.base_price || 0).toFixed(0)}
                      </span>
                      <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shadow-sm">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom Pay Button */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-100 lg:hidden"
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowPayment(true)}
          disabled={!totals.pending || totals.pending <= 0}
          className={`
            w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all
            ${totals.pending > 0
              ? 'bg-emerald-600 text-white active:bg-emerald-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <Check className="w-4 h-4" />
          Cobrar Q {Number(totals.pending || 0).toFixed(2)}
        </motion.button>
      </motion.div>

      {/* Desktop Pay Button */}
      <div className="hidden lg:block fixed bottom-4 right-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowPayment(true)}
          disabled={!totals.pending || totals.pending <= 0}
          className={`
            px-6 py-4 rounded-2xl font-semibold text-sm flex items-center gap-2 shadow-lg transition-all
            ${totals.pending > 0
              ? 'bg-emerald-600 text-white shadow-emerald-500/25 active:bg-emerald-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <Check className="w-5 h-5" />
          Cobrar Q {Number(totals.pending || 0).toFixed(2)}
        </motion.button>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayment && (
          <PaymentModal
            accountId={accountId}
            totals={totals}
            onClose={() => setShowPayment(false)}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </AnimatePresence>

      {/* Account Actions Menu */}
      <AnimatePresence>
        {showActions && (
          <AccountActionsMenu
            accountId={accountId}
            account={{ ...account, items }}
            tableId={tableId}
            totals={totals}
            onClose={() => setShowActions(false)}
            onRefresh={loadData}
          />
        )}
      </AnimatePresence>

      {/* Modifier Selection Modal */}
      <AnimatePresence>
        {showModifierModal && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowModifierModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[80vh] overflow-hidden"
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              <div className="px-5 pb-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-lg">{selectedProduct.name}</h2>
                <p className="text-sm text-gray-500">Selecciona las opciones</p>
              </div>

              <div className="p-5 space-y-5 max-h-[50vh] overflow-y-auto">
                {selectedProduct.modifiers?.map(modifier => (
                  <div key={modifier.groupId}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{modifier.name}</h3>
                      <span className="text-xs text-gray-500">
                        {modifier.minSelect > 0 && `(Mín: ${modifier.minSelect})`}
                        {modifier.maxSelect > 0 && ` (Máx: ${modifier.maxSelect})`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {modifier.options?.map(option => {
                        const isSelected = (selectedModifiers[modifier.groupId] || []).includes(option.id);
                        return (
                          <motion.button
                            key={option.id}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleModifierToggle(modifier.groupId, option.id)}
                            className={`
                              p-3 rounded-xl border-2 text-left transition-all
                              ${isSelected
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                              }
                            `}
                          >
                            <p className={`text-sm font-medium ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                              {option.name}
                            </p>
                            {option.price_delta != 0 && (
                              <p className={`text-xs mt-0.5 ${isSelected ? 'text-primary-600' : 'text-gray-500'}`}>
                                {option.price_delta > 0 ? '+' : ''}Q{Number(option.price_delta).toFixed(2)}
                              </p>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 border-t border-gray-100 space-y-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Observación (opcional)</label>
                  <textarea
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    placeholder="Ej: Sin cebolla, término medio..."
                    rows={2}
                    className="w-full mt-1 p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirmModifiers}
                  disabled={addingItem}
                  className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {addingItem ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Agregar a la orden
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Void Confirmation Modal */}
      <AnimatePresence>
        {showVoidModal && itemToVoid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowVoidModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                ¿Anular producto?
              </h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                Estás por eliminar <strong>{itemToVoid.product_name}</strong> de la orden
              </p>
              
              {/* Warning for sent items */}
              {itemToVoid.sent_at && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <p className="text-sm text-amber-700 font-medium flex items-center gap-2">
                    ⚠️ Este producto ya fue enviado a cocina
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Se requiere PIN de autorización
                  </p>
                </div>
              )}
              
              {/* PIN Input for sent items */}
              {itemToVoid.sent_at && (
                <div className="mb-4">
                  <label className="text-xs text-gray-500 font-medium">PIN de Autorización *</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={voidPin}
                    onChange={(e) => setVoidPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ingresa tu PIN"
                    maxLength={12}
                    className="w-full mt-1 p-3 border border-gray-200 rounded-xl text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                </div>
              )}
              
              {/* Reason Input */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 font-medium">Razón (opcional)</label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Ej: Error en pedido, cliente canceló..."
                  className="w-full mt-1 p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowVoidModal(false);
                    setVoidPin('');
                    setVoidReason('');
                  }}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmVoidItem}
                  disabled={itemToVoid.sent_at && !voidPin.trim()}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm ${
                    itemToVoid.sent_at && !voidPin.trim()
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  Anular
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
