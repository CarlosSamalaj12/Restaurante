import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  MoreVertical,
  Check,
  Loader2
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useOrderData } from '../hooks/useOrderData';
import { PaymentModal } from '../components/PaymentModal';
import { AccountActionsMenu } from '../components/AccountActionsMenu';
import { BackButton } from '../components/BackButton';
import { OrderItemsList } from '../components/orders/OrderItemsList';
import { CatalogGrid } from '../components/orders/CatalogGrid';
import { ModifierSelectModal } from '../components/orders/ModifierSelectModal';
import { VoidItemModal } from '../components/orders/VoidItemModal';

export function OrderView({ accountId, tableCode, tableId, onBack, onNavigate }) {
  const { user, logout, currencySymbol = 'Q', hasPermission } = useAuth() || {};
  const [showPayment, setShowPayment] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState({});
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [itemToVoid, setItemToVoid] = useState(null);
  const [voidPin, setVoidPin] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState('');
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
    kitchenNotes,
    selectedCenter,
    setSelectedCenter,
    selectedCategory,
    setSelectedCategory,
    loading,
    addingProductId,
    loadData,
    addItemToAccount,
    updateItemQuantity,
    updateItemNotes,
    confirmVoidItem
  } = useOrderData(accountId);

  const handleSendOrder = async () => {
    try {
      await api.sendOrder(accountId);
      toast.success('Pedido enviado ✓');
      await loadData();

      const role = String(user?.role || '').toLowerCase();
      const roleNames = String(user?.role_names || '').toLowerCase();
      const isWaiter = role === 'waiter' || roleNames.includes('mesero');

      if (isWaiter) {
        // Para mesero: cierra sesión y queda en el login listo para el siguiente mesero
        await logout();
      } else {
        // Para cajero / admin / gerente: vuelve al dashboard principal
        if (onNavigate) {
          onNavigate('dashboard');
        } else if (onBack) {
          onBack();
        }
      }
    } catch (error) {
      toast.error(error.message || 'Error al enviar');
    }
  };

  const handleAddItem = async (product) => {
    const hasModifiers = Array.isArray(product.modifiers) && product.modifiers.length > 0;
    if (hasModifiers) {
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
    const modifier = selectedProduct?.modifiers?.find(m => m.groupId === groupId);
    const minSelect = Number(modifier?.minSelect || 0);
    const maxSelect = Number(modifier?.maxSelect || 0);

    setSelectedModifiers(prev => {
      const current = prev[groupId] || [];
      if (current.includes(optionId)) {
        // En modificadores obligatorios de opción única, no permitir desmarcar a vacío
        if (minSelect === 1 && maxSelect === 1) {
          return prev;
        }
        return { ...prev, [groupId]: current.filter(id => id !== optionId) };
      }
      // Selección única tipo radio button: cambiar directamente sin alert invasivo
      if (maxSelect === 1) {
        return { ...prev, [groupId]: [optionId] };
      }
      // Selección múltiple con tope: evitar agregar si superó el límite, sin alerts invasivos
      if (maxSelect > 1 && current.length >= maxSelect) {
        return prev;
      }
      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  const handleConfirmModifiers = async () => {
    if (!selectedProduct) return;

    // Validación inline antes de enviar al backend
    const missingGroup = selectedProduct.modifiers?.find(m => {
      const min = Number(m.minSelect || 0);
      const selected = selectedModifiers[m.groupId] || [];
      return min > 0 && selected.length < min;
    });

    if (missingGroup) {
      toast.info(`Selecciona las opciones obligatorias en "${missingGroup.name}"`);
      return;
    }

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
    setVoidError('');
    setShowVoidModal(true);
  };

  const onConfirmVoid = async (qtyToVoid) => {
    setVoidError('');
    try {
      const success = await confirmVoidItem(itemToVoid, voidPin, voidReason, qtyToVoid);
      if (success) {
        setShowVoidModal(false);
        setItemToVoid(null);
        setVoidPin('');
        setVoidReason('');
        setVoidError('');
      }
    } catch (err) {
      setVoidError(err.message || 'Error al autorizar anulación');
    }
  };

  const handlePaymentSuccess = () => {
    toast.success('¡Cuenta cerrada!');
    onBack();
  };

  // Solo se muestra spinner en la primera carga inicial del componente
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <m.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-primary-600" />
        </m.div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cargando comanda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <m.header 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-2xs"
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton
              onClick={onBack}
              label="Mesas"
              title="Volver a mesas"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-gray-900 text-base">Mesa {tableCode}</h1>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                  #{account?.check_number}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {account?.operation_center_name || 'Salón'} · Silla activa: {currentSeat}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <m.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSendOrder}
              className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Enviar</span>
            </m.button>
            <m.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowActions(true)}
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer transition-colors"
              title="Opciones de cuenta"
            >
              <MoreVertical className="w-5 h-5" />
            </m.button>
          </div>
        </div>
      </m.header>

      <div className="flex flex-col lg:flex-row">
        {/* Order Summary (Items & Totals) */}
        <OrderItemsList
          items={items}
          account={account}
          totals={totals}
          updateItemQuantity={updateItemQuantity}
          updateItemNotes={updateItemNotes}
          handleVoidItem={handleVoidItem}
          quickNotes={kitchenNotes}
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
          addingProductId={addingProductId}
          items={items}
        />
      </div>

      {/* Bottom Pay Button (Mobile) - Solo visible con permiso payments.create */}
      {hasPermission?.('payments.create') && (
        <m.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-100 lg:hidden shadow-lg z-20"
        >
          <m.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowPayment(true)}
            disabled={!totals.pending || totals.pending <= 0}
            className={`
              w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md
              ${totals.pending > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              }
            `}
          >
            <Check className="w-4 h-4" />
            Cobrar {currencySymbol} {Number(totals.pending || totals.total || 0).toFixed(2)}
          </m.button>
        </m.div>
      )}

      {/* Desktop Pay Button - Solo visible con permiso payments.create */}
      {hasPermission?.('payments.create') && (
        <div className="hidden lg:block fixed bottom-4 right-4 z-20">
          <m.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowPayment(true)}
            disabled={!totals.pending || totals.pending <= 0}
            className={`
              px-6 py-4 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-xl transition-all cursor-pointer
              ${totals.pending > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              }
            `}
          >
            <Check className="w-5 h-5" />
            Cobrar {currencySymbol} {Number(totals.pending || totals.total || 0).toFixed(2)}
          </m.button>
        </div>
      )}

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
        addingItem={Boolean(addingProductId)}
        currencySymbol={currencySymbol}
        quickNotes={kitchenNotes}
        onClose={() => setShowModifierModal(false)}
      />

      {/* Void Confirmation Modal */}
      <VoidItemModal
        isOpen={showVoidModal}
        itemToVoid={itemToVoid}
        voidPin={voidPin}
        setVoidPin={(pin) => {
          setVoidPin(pin);
          if (voidError) setVoidError('');
        }}
        voidReason={voidReason}
        setVoidReason={setVoidReason}
        error={voidError}
        onConfirm={onConfirmVoid}
        onClose={() => {
          setShowVoidModal(false);
          setItemToVoid(null);
          setVoidPin('');
          setVoidReason('');
          setVoidError('');
        }}
      />
    </div>
  );
}

export default OrderView;
