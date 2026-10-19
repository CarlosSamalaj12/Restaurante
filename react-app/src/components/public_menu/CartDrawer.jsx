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
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isSending, setIsSending] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [requestingBill, setRequestingBill] = useState(false);

  const subtotal = cart.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);

  const handleSendOrder = async () => {
    if (!cart.length) return;
    const finalMethod = paymentMethod || 'cash';
    try {
      setIsSending(true);

      const payload = {
        sessionToken: sessionData?.sessionToken,
        isKiosk,
        paymentMethod: finalMethod,
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
    const finalMethod = paymentMethod || 'cash';
    try {
      setRequestingBill(true);
      await api.digitalMenu.requestBill(
        { sessionToken: sessionData.sessionToken, paymentMethod: finalMethod },
        window.location.search.replace('?t=', '')
      );
      if (onRequestBill) onRequestBill(finalMethod);
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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-md select-none">
      <m.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-md bg-[#0B101B] h-full shadow-2xl flex flex-col border-l border-slate-800/80 overflow-hidden"
      >
        {/* Glow difuminado ambiental */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Cabecera del Carrito */}
        <div className="relative z-10 p-4 sm:p-5 border-b border-slate-800/80 bg-[#0E1524]/80 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base text-white tracking-tight">
                {isKiosk ? 'Tu Pedido en Kiosco' : `Comanda ${tableCode ? `Mesa ${tableCode}` : ''}`}
              </h2>
              {sessionData?.checkNumber ? (
                <span className="text-[11px] text-slate-400 font-mono">
                  Cuenta activa: #{sessionData.checkNumber}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  {cart.length} {cart.length === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setSuccessInfo(null);
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pantalla de Éxito al Enviar Comanda */}
        {successInfo ? (
          <div className="relative z-10 flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white">¡Comanda Enviada!</h3>
            <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
              Tus platillos entraron directamente al sistema de cocina. Te notificaremos cuando estén listos.
            </p>
            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 w-full max-w-xs text-xs space-y-2 shadow-inner">
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
              className="mt-4 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 transition active:scale-95"
            >
              Seguir Explorando el Menú
            </button>
          </div>
        ) : (
          <>
            {/* Lista de Ítems en el Carrito */}
            <div className="relative z-10 p-4 flex-1 overflow-y-auto space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-24 text-slate-500 text-xs flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-center text-3xl shadow-inner">
                    🛒
                  </div>
                  <span className="text-slate-400 font-medium">Tu carrito está vacío.</span>
                  <span className="text-slate-500 text-[11px]">¡Explora la carta y agrega tus especialidades favoritas!</span>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#111726]/90 border border-slate-800/80 flex items-start justify-between gap-3 text-xs shadow-md transition hover:border-slate-700/80"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-600/20 text-blue-400 font-black text-[11px] border border-blue-500/30">
                          {item.qty}x
                        </span>
                        <span className="font-black text-white text-sm">
                          {item.name}
                        </span>
                      </div>

                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-[11px] text-slate-400 pl-1">
                          {item.modifiers.map((m) => m.name).join(', ')}
                        </div>
                      )}

                      {item.notes && (
                        <div className="text-[11px] text-amber-300/90 italic pl-1">
                          "{item.notes}"
                        </div>
                      )}
                    </div>

                    <div className="text-right flex flex-col items-end gap-2">
                      <span className="font-black text-white text-sm">
                        Q {(item.unitPrice * item.qty).toFixed(2)}
                      </span>
                      <button
                        onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 p-1 rounded-lg transition"
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
              <div className="relative z-10 p-5 bg-[#0A0E17]/95 border-t border-slate-800/80 backdrop-blur-md space-y-4">
                {/* Selector de Método de Pago */}
                <div>
                  <span className="text-xs font-bold text-slate-300 block mb-2">
                    Forma de pago preferida:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 text-[11px] font-bold transition active:scale-95 ${
                        paymentMethod === 'cash'
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 ring-2 ring-emerald-500/40 shadow-md shadow-emerald-500/10'
                          : 'border-slate-800/80 bg-slate-900/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span>Efectivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 text-[11px] font-bold transition active:scale-95 ${
                        paymentMethod === 'card'
                          ? 'border-blue-500 bg-blue-950/40 text-blue-300 ring-2 ring-blue-500/40 shadow-md shadow-blue-500/10'
                          : 'border-slate-800/80 bg-slate-900/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-blue-400" />
                      <span>POS Tarjeta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transfer')}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 text-[11px] font-bold transition active:scale-95 ${
                        paymentMethod === 'transfer'
                          ? 'border-amber-500 bg-amber-950/40 text-amber-300 ring-2 ring-amber-500/40 shadow-md shadow-amber-500/10'
                          : 'border-slate-800/80 bg-slate-900/60 text-slate-400 hover:text-white'
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
                  <span className="text-xl font-black text-white">Q {subtotal.toFixed(2)}</span>
                </div>

                {/* Botón Principal de Envío */}
                <button
                  disabled={isSending}
                  onClick={handleSendOrder}
                  className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-600/35 active:scale-98 transition disabled:opacity-50"
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
              <div className="relative z-10 p-4 bg-[#0A0E17]/95 border-t border-slate-800/80 space-y-3">
                <div>
                  <span className="text-xs font-bold text-slate-300 block mb-2">
                    ¿Cómo deseas pagar la cuenta?
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 text-[11px] font-bold transition active:scale-95 ${
                        paymentMethod === 'cash'
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 ring-2 ring-emerald-500/40 shadow-md'
                          : 'border-slate-800/80 bg-slate-900/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span>Efectivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 text-[11px] font-bold transition active:scale-95 ${
                        paymentMethod === 'card'
                          ? 'border-blue-500 bg-blue-950/40 text-blue-300 ring-2 ring-blue-500/40 shadow-md'
                          : 'border-slate-800/80 bg-slate-900/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-blue-400" />
                      <span>POS Tarjeta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transfer')}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 text-[11px] font-bold transition active:scale-95 ${
                        paymentMethod === 'transfer'
                          ? 'border-amber-500 bg-amber-950/40 text-amber-300 ring-2 ring-amber-500/40 shadow-md'
                          : 'border-slate-800/80 bg-slate-900/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-amber-400" />
                      <span>Transferencia</span>
                    </button>
                  </div>
                </div>

                <button
                  disabled={requestingBill}
                  onClick={handleBill}
                  className="w-full py-3.5 px-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-black text-xs flex items-center justify-center gap-2 hover:bg-amber-500/20 transition active:scale-98 shadow-lg shadow-amber-500/10"
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
