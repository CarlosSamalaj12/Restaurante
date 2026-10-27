import { m, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export function PaymentFelBar({
  showFelPanel,
  felConfig,
  wantsInvoice,
  setWantsInvoice,
  recipientNit,
  setRecipientNit,
  recipientName,
  setRecipientName,
  recipientAddress,
  setRecipientAddress,
  searchingNit,
  handleSearchNit,
  handleSetCF,
}) {
  return (
    <AnimatePresence>
      {showFelPanel && felConfig?.is_enabled && (
        <m.div
          layout
          initial={{ opacity: 0, scaleY: 0.95 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0.95 }}
          transition={{ duration: 0.15 }}
          className="bg-slate-800 border-b border-slate-700 text-white px-5 py-3 overflow-hidden shrink-0 origin-top"
        >
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wantsInvoice}
                  onChange={(e) => setWantsInvoice(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                />
                <span>Emitir Factura SAT</span>
              </label>
              <button
                type="button"
                onClick={handleSetCF}
                className="text-[11px] font-bold px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg border border-slate-600 cursor-pointer"
              >
                CF
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
              <div className="relative">
                <label htmlFor="fel-nit-input" className="sr-only">
                  NIT o CF
                </label>
                <input
                  id="fel-nit-input"
                  type="text"
                  value={recipientNit}
                  onChange={(e) => setRecipientNit(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchNit(recipientNit)}
                  placeholder="NIT o CF..."
                  aria-label="NIT o CF para factura SAT"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-xs font-mono text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => handleSearchNit(recipientNit)}
                  disabled={searchingNit}
                  aria-label="Buscar NIT en SAT"
                  className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                >
                  {searchingNit ? <Loader2 className="w-3 h-3 animate-spin" /> : 'SAT'}
                </button>
              </div>

              <div>
                <label htmlFor="fel-name-input" className="sr-only">
                  Nombre de Factura
                </label>
                <input
                  id="fel-name-input"
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Nombre Factura..."
                  aria-label="Nombre del receptor de factura SAT"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-xs text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div>
                <label htmlFor="fel-addr-input" className="sr-only">
                  Dirección de Factura
                </label>
                <input
                  id="fel-addr-input"
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="Dirección..."
                  aria-label="Dirección para factura SAT"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-xs text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
