// react-app/src/components/public_menu/CartDrawer.jsx
// Carrito inteligente con soporte de rondas, selección de método de pago y vinculación por dispositivo

import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  Send,
  CreditCard,
  Banknote,
  QrCode,
  ShoppingBag,
  CheckCircle2,
  Receipt,
  Loader2,
  AlertCircle
} from 'lucide-react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';

export function CartDrawer({
  isOpen,
  onClose,
  cart,
  setCart,
  tableCode,
  menuMode = 'interactive',
  isKiosk = false,
  sessionData,
  onOrderSuccess,
  onRequestBill,
}) {
  const toast = useToast();
  const [paymentMethod, setPaymentMethod] = useState('card_pos');
  const [isSending, setIsSending] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [requestingBill, setRequestingBill] = useState(false);

  const subtotal = cart.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);

  const handleSendOrder = async () => {
    if (!cart.length) return;
    try {
      setIsSending(true);

      const payload = {
        sessionToken: sessionData?.sessionToken,
        isKiosk,
        paymentMethod,
        items: cart.map((it) => ({
          productId: it.productId,
          seatNo: 1,
          qty: it.qty,
          notes: it.notes || '',
          modifierOptionIds: (it.modifiers || []).map((m) => m.id),
        })),
      };

      const result = await api.digitalMenu.sendGuestOrder(payload);
      setSuccessInfo(result);
      setCart([]);
      if (onOrderSuccess) onOrderSuccess(result);
    } catch (err) {
      toast.error(err.message || 'No se pudo enviar la orden. Intenta nuevamente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleBill = async () => {
    if (!sessionData?.sessionToken) return;
    try {
      setRequestingBill(true);
      await api.digitalMenu.requestBill(
        { sessionToken: sessionData.sessionToken, paymentMethod },
        window.location.search.replace('?t=', '')
      );
      if (onRequestBill) onRequestBill(paymentMethod);
      toast.success('¡Cuenta solicitada! Un mesero se acercará a tu mesa con el cobro.');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al solicitar la cuenta');
    } finally {
      setRequestingBill(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm select-none">
      <m.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="w-full max-w-md bg-[#0D121D] h-full shadow-2xl flex flex-col border-l border-white/10"
      >
        {/* Cabecera del Carrito */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[var(--menu-primary)]/15 text-[var(--menu-primary)] border border-[var(--menu-primary)]/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white">
                {isKiosk ? 'Tu Pedido en Kiosco' : `Comanda ${tableCode ? `Mesa ${tableCode}` : ''}`}
              </h2>
              {sessionData?.checkNumber && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Cuenta activa: #{sessionData.checkNumber}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setSuccessInfo(null);
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pantalla de Éxito al Enviar Comanda */}
        {successInfo ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white">¡Comanda Enviada!</h3>
            <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
              Tus platillos entraron directamente al sistema de cocina. Te notificaremos cuando estén listos.
            </p>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 w-full max-w-xs text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Número de Cuenta:</span>
                <span className="font-bold text-white font-mono">{successInfo.checkNumber}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Platillos enviados:</span>
                <span className="font-bold text-emerald-400">{successInfo.itemsSent} ítems</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSuccessInfo(null);
                onClose();
              }}
              className="mt-4 px-6 py-3 rounded-2xl bg-[var(--menu-primary)] text-white text-xs font-bold shadow-lg"
            >
              Seguir Explorando el Menú
            </button>
          </div>
        ) : (
          <>
            {/* Lista de Ítems en el Carrito */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-slate-500 text-xs flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-2xl">
                    🛒
                  </div>
                  <span>Tu carrito está vacío. ¡Explora el menú y añade platillos!</span>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="font-bold text-white text-sm">
                        {item.qty}x {item.name}
                      </div>

                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-[11px] text-slate-400">
                          {item.modifiers.map((m) => m.name).join(', ')}
                        </div>
                      )}

                      {item.notes && (
                        <div className="text-[11px] text-amber-300 italic">
                          "{item.notes}"
                        </div>
                      )}
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className="font-extrabold text-white text-sm">
                        Q{(item.unitPrice * item.qty).toFixed(2)}
                      </span>
                      <button
                        onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300 p-1 transition"
                        title="Eliminar ítem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer con Métodos de Pago y Confirmación */}
            {cart.length > 0 && (
              <div className="p-5 bg-[#090C14] border-t border-white/10 space-y-4">
                {/* Selector de Método de Pago */}
                <div>
                  <span className="text-xs font-bold text-slate-300 block mb-2">
                    Forma de pago preferida:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 text-[11px] font-bold transition ${
                        paymentMethod === 'cash'
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span>Efectivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card_pos')}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 text-[11px] font-bold transition ${
                        paymentMethod === 'card_pos'
                          ? 'border-sky-500 bg-sky-500/15 text-sky-300 shadow'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-sky-400" />
                      <span>POS Tarjeta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank_transfer')}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 text-[11px] font-bold transition ${
                        paymentMethod === 'bank_transfer'
                          ? 'border-amber-500 bg-amber-500/15 text-amber-300 shadow'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-amber-400" />
                      <span>Transferencia</span>
                    </button>
                  </div>
                </div>

                {/* Subtotal */}
                <div className="flex items-center justify-between text-sm font-bold pt-1">
                  <span className="text-slate-400">Total Comanda:</span>
                  <span className="text-xl font-black text-white">Q{subtotal.toFixed(2)}</span>
                </div>

                {/* Botón Principal de Envío */}
                <button
                  disabled={isSending}
                  onClick={handleSendOrder}
                  className="w-full py-4 rounded-2xl bg-[var(--menu-primary)] hover:brightness-110 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-[var(--menu-primary)]/35 active:scale-98 transition disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando a Cocina...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Confirmar y Enviar Comanda</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Opción de Solicitar la Cuenta en Mesa si no hay items pendientes pero la sesión existe */}
            {cart.length === 0 && sessionData?.accountId && (
              <div className="p-4 bg-[#090C14] border-t border-white/10 space-y-2">
                <button
                  disabled={requestingBill}
                  onClick={handleBill}
                  className="w-full py-3 px-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-500/20 transition active:scale-98"
                >
                  <Receipt className="w-4 h-4" />
                  {requestingBill ? 'Solicitando...' : 'Solicitar la Cuenta en Mesa'}
                </button>
              </div>
            )}
          </>
        )}
      </m.div>
    </div>
  );
}
