import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Download, ExternalLink, FileText } from 'lucide-react';

export function VoucherPreviewModal({ isOpen, onClose, voucherUrl, title = 'Comprobante de Pago' }) {
  if (!isOpen || !voucherUrl) return null;

  const isPdf = voucherUrl.toLowerCase().endsWith('.pdf');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700/80">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{title}</h3>
                <p className="text-xs text-slate-400">Factura / Recibo adjunto</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={voucherUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
                title="Descargar archivo"
              >
                <Download className="w-5 h-5" />
              </a>
              <a
                href={voucherUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
                title="Abrir en pestaña nueva"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preview Body */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/50 min-h-[350px]">
            {isPdf ? (
              <iframe
                src={voucherUrl}
                title="Comprobante PDF"
                className="w-full h-[70vh] rounded-lg border border-slate-800"
              />
            ) : (
              <img
                src={voucherUrl}
                alt="Comprobante"
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-lg border border-slate-800"
              />
            )}
          </div>
        </m.div>
      </div>
    </AnimatePresence>
  );
}

export default VoucherPreviewModal;
