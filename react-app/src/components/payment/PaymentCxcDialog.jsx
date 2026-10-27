import { m, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, UserCheck, Split, Banknote } from 'lucide-react';

export function PaymentCxcDialog({
  creditLimitAlert,
  setCreditLimitAlert,
  currencySymbol,
  handleApplyCreditSplit,
  handleCancelCreditAlert,
}) {
  return (
    <AnimatePresence>
      {creditLimitAlert && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-amber-300 relative"
          >
            {/* Encabezado con gradiente y advertencia */}
            <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 px-6 py-5 text-white relative">
              <button
                type="button"
                onClick={() => setCreditLimitAlert(null)}
                aria-label="Cerrar alerta de límite de crédito"
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
                  <AlertTriangle className="w-6 h-6 text-white stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight leading-tight">Límite de Crédito Insuficiente</h3>
                  <p className="text-xs text-amber-100 font-medium">Crédito Folio (CXC) · Cupo Excedido</p>
                </div>
              </div>
            </div>

            {/* Contenido con desglose del cliente y saldo */}
            <div className="p-6 space-y-4">
              {/* Tarjeta del cliente */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs">
                      <UserCheck className="w-4 h-4 text-amber-800" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cliente Folio</p>
                      <p className="text-sm font-black text-slate-900 leading-none">{creditLimitAlert.client?.full_name}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    ID #{creditLimitAlert.client?.id}
                  </span>
                </div>

                {/* Grid de 3 métricas de crédito */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Límite</p>
                    <p className="text-xs font-black text-slate-800 font-mono mt-0.5">
                      {currencySymbol}
                      {Number(creditLimitAlert.client?.credit_limit || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Deuda Actual</p>
                    <p className="text-xs font-black text-rose-700 font-mono mt-0.5">
                      {currencySymbol}
                      {Number(creditLimitAlert.client?.current_balance || 0).toFixed(2)}
                    </p>
                  </div>
                  <div
                    className={`p-2.5 rounded-xl border shadow-2xs ${
                      creditLimitAlert.availableCredit > 0
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    <p className="text-[10px] font-extrabold uppercase tracking-tight">Disponible</p>
                    <p className="text-xs font-black font-mono mt-0.5">
                      {currencySymbol}
                      {creditLimitAlert.availableCredit.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resumen del cobro intentado y excedente */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Monto que se intentó cargar a crédito:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {currencySymbol}
                    {creditLimitAlert.requestedAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Cupo máximo que se puede otorgar:</span>
                  <span className="font-bold font-mono text-emerald-700">
                    {currencySymbol}
                    {creditLimitAlert.availableCredit.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center font-bold text-rose-600 text-sm">
                  <span>Excedente sin límite de crédito:</span>
                  <span className="font-mono font-black">
                    +{currencySymbol}
                    {creditLimitAlert.excessAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Explicación y botones de decisión */}
              {creditLimitAlert.availableCredit > 0 ? (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-slate-600 leading-relaxed text-center">
                    ¿Deseas cargar únicamente el cupo disponible de{' '}
                    <strong className="text-emerald-700 font-bold">
                      {currencySymbol}
                      {creditLimitAlert.availableCredit.toFixed(2)}
                    </strong>{' '}
                    a crédito y dividir los{' '}
                    <strong className="text-rose-700 font-bold">
                      {currencySymbol}
                      {creditLimitAlert.excessAmount.toFixed(2)}
                    </strong>{' '}
                    restantes con otra forma de pago?
                  </p>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleApplyCreditSplit}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-colors duration-150 cursor-pointer ring-2 ring-emerald-500/20"
                    >
                      <Split className="w-4 h-4" />
                      <span>
                        Cargar {currencySymbol}
                        {creditLimitAlert.availableCredit.toFixed(2)} a CXC y Dividir Restante
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreditLimitAlert(null)}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-colors cursor-pointer"
                    >
                      Cancelar y elegir otro cliente o método
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs leading-relaxed text-center">
                    El cliente no cuenta con cupo disponible (límite alcanzado o en cero). No es posible otorgarle más crédito
                    en este momento.
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleCancelCreditAlert(true)}
                      className="w-full py-3 px-4 bg-slate-900 hover:bg-black active:scale-98 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-colors duration-150 cursor-pointer"
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Cambiar a Cobro en Efectivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreditLimitAlert(null)}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-colors cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
