import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  MoreVertical,
  Check,
  Loader2
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useOrderData } from '../hooks/useOrderData';
import { PaymentModal } from '../components/PaymentModal';
import { AccountActionsMenu } from '../components/AccountActionsMenu';
import { OrderItemsList } from '../components/orders/OrderItemsList';
import { CatalogGrid } from '../components/orders/CatalogGrid';
import { ModifierSelectModal } from '../components/orders/ModifierSelectModal';
import { VoidItemModal } from '../components/orders/VoidItemModal';

export function OrderView({ accountId, tableCode, tableId, onBack }) {
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

  const {
    account,
    items,
    totals,
    categories,
    filteredProducts,
    centers,
    selectedCenter,
    setSelectedCenter,
    selectedCategory,
    setSelectedCategory,
    loading,
    addingItem,
    loadData,
    addItemToAccount,
    handleSendOrder,
    confirmVoidItem
  } = useOrderData(accountId);

  const handleAddItem = async (product) => {
    const requiredModifiers = product.modifiers?.filter(m => m.minSelect > 0) || [];
    if (requiredModifiers.length > 0) {
      setSelectedProduct(product);
      setSelectedModifiers({});
      setItemNotes('');
      setShowModifierModal(true);
      return;
    }
    const success = await addItemToAccount(product.id, 1, currentSeat, [], '');
    if (success) {
      toast.success(`${product.name} agregado`);
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

  const handleConfirmModifiers = async () => {
    if (!selectedProduct) return;
    const allOptionIds = Object.values(selectedModifiers).flat();
    const success = await addItemToAccount(selectedProduct.id, 1, currentSeat, allOptionIds, itemNotes);
    if (success) {
      toast.success(`${selectedProduct.name} agregado`);
      setShowModifierModal(false);
    }
  };

  const handleVoidItem = (item) => {
    setItemToVoid(item);
    setVoidPin('');
    setVoidReason('');
    setShowVoidModal(true);
  };

  const onConfirmVoid = async () => {
    const success = await confirmVoidItem(itemToVoid, voidPin, voidReason);
    if (success) {
      setShowVoidModal(false);
      setItemToVoid(null);
      setVoidPin('');
      setVoidReason('');
    }
  };

  const handlePaymentSuccess = () => {
    toast.success('¡Cuenta cerrada!');
    onBack();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <m.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-gray-400" />
        </m.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <m.header 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white border-b border-gray-100 sticky top-0 z-30"
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <m.button
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </m.button>
            <div>
              <h1 className="font-semibold text-gray-900">Mesa {tableCode}</h1>
              <p className="text-xs text-gray-500">{account?.check_number}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <m.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSendOrder}
              className="px-3 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar</span>
            </m.button>
            <m.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowActions(true)}
              className="p-2 bg-gray-100 text-gray-700 rounded-xl"
            >
              <MoreVertical className="w-5 h-5" />
            </m.button>
          </div>
        </div>
      </m.header>

      <div className="flex flex-col lg:flex-row">
        {/* Order Summary */}
        <OrderItemsList
          items={items}
          account={account}
          totals={totals}
          handleVoidItem={handleVoidItem}
        />

        {/* Products Panel */}
        <CatalogGrid
          centers={centers}
          selectedCenter={selectedCenter}
          setSelectedCenter={setSelectedCenter}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          currentSeat={currentSeat}
          setCurrentSeat={setCurrentSeat}
          guestCount={account?.guest_count}
          filteredProducts={filteredProducts}
          handleAddItem={handleAddItem}
          addingItem={addingItem}
        />
      </div>

      {/* Bottom Pay Button (Mobile) */}
      <m.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-100 lg:hidden"
      >
        <m.button
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
        </m.button>
      </m.div>

      {/* Desktop Pay Button */}
      <div className="hidden lg:block fixed bottom-4 right-4">
        <m.button
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
        </m.button>
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
      <ModifierSelectModal
        isOpen={showModifierModal}
        selectedProduct={selectedProduct}
        selectedModifiers={selectedModifiers}
        handleModifierToggle={handleModifierToggle}
        itemNotes={itemNotes}
        setItemNotes={setItemNotes}
        handleConfirmModifiers={handleConfirmModifiers}
        addingItem={addingItem}
        onClose={() => setShowModifierModal(false)}
      />

      {/* Void Confirmation Modal */}
      <VoidItemModal
        isOpen={showVoidModal}
        itemToVoid={itemToVoid}
        voidPin={voidPin}
        setVoidPin={setVoidPin}
        voidReason={voidReason}
        setVoidReason={setVoidReason}
        onConfirm={onConfirmVoid}
        onClose={() => {
          setShowVoidModal(false);
          setVoidPin('');
          setVoidReason('');
        }}
      />
    </div>
  );
}

export default OrderView;
