import { useState, useEffect } from 'react';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Receipt,
  Printer
} from 'lucide-react';

export function VoidedReportPage({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [voidedItems, setVoidedItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    loadVoidedItems();
  }, []);

  const loadVoidedItems = async () => {
    setLoading(true);
    try {
      const data = await api.getVoidedItems();
      setVoidedItems(data);
    } catch (error) {
      toast.error('Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `Q${Number(n || 0).toFixed(2)}`;

  const handlePrint = (item) => {
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Reversión #${item.id}</title>
          <style>
            @page { size: 80mm auto; margin: 3mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Consolas', 'Courier New', monospace; width: 72mm; margin: 0 auto; font-size: 11px; }
            .center { text-align: center; }
            .sep { border-top: 1px dashed #000; margin: 5px 0; }
            .strikethrough { text-decoration: line-through; color: #999; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2>PRODUCTO ANULADO</h2>
          </div>
          <div class="sep"></div>
          <p><strong>Producto:</strong> ${item.product_name}</p>
          <p><strong>Razón:</strong> ${item.void_reason || 'Sin especificar'}</p>
          <p><strong>Fecha:</strong> ${item.voided_at ? new Date(item.voided_at).toLocaleString() : '-'}</p>
          <p><strong>Autorizó:</strong> ${item.authorized_by_name || 'N/A'}</p>
          <div class="sep"></div>
          <p><strong>Comprobante #:</strong> ${item.check_number || '-'}</p>
          <div class="sep"></div>
          <p class="center">Firma: _______________</p>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Reporte de Anulados</h1>
          <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
            {voidedItems.length} anulado{voidedItems.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : voidedItems.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay productos anulados</p>
          </div>
        ) : (
          <>
            {/* Tabla principal */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-red-600 text-white text-xs">
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Fecha / Hora</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Cuenta</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Producto Anulado</th>
                      <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">Total Anulado</th>
                      <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Autorizó (PIN)</th>
                      <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voidedItems.map((item, i) => {
                      const isSelected = selectedId === item.id;
                      return (
                        <>
                          <tr
                            key={item.id}
                            onClick={() => setSelectedId(isSelected ? null : item.id)}
                            className={`border-t border-gray-100 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-red-50 hover:bg-red-100'
                                : i % 2 === 0
                                ? 'bg-white hover:bg-gray-50'
                                : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                          >
                            <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                              {item.voided_at ? new Date(item.voided_at).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="font-mono font-medium text-gray-800">{item.check_number || `#${item.id}`}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-block w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
                                <span className="font-medium text-red-700">{item.product_name}</span>
                              </div>
                              {item.void_reason && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{item.void_reason}</p>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-red-600 whitespace-nowrap">
                              {fmt(item.void_total)}
                            </td>
                            <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                              <span className="font-medium text-gray-800">{item.authorized_by_name || 'N/A'}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); handlePrint(item); }}
                                className="p-1.5 hover:bg-white rounded-lg transition-colors"
                                title="Imprimir"
                              >
                                <Printer className="w-4 h-4 text-gray-400" />
                              </button>
                            </td>
                          </tr>
                          {/* Comanda expandida */}
                          {isSelected && (
                            <tr key={`detail-${item.id}`} className="bg-red-50/30">
                              <td colSpan={6} className="px-4 py-3">
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                  {/* Comanda header */}
                                  <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Receipt className="w-4 h-4 text-gray-400" />
                                      <span className="text-white font-semibold text-sm">
                                        Comanda {item.check_number || `#${item.id}`}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-400">
                                      <span>Autorizó: <span className="text-white font-medium">{item.authorized_by_name || 'N/A'}</span></span>
                                      <span>·</span>
                                      <span>{item.voided_at ? new Date(item.voided_at).toLocaleString('es-GT') : ''}</span>
                                    </div>
                                  </div>
                                  {/* Productos de la cuenta */}
                                  {item.account_products && item.account_products.length > 0 ? (
                                    <div className="divide-y divide-gray-100">
                                      {item.account_products.map((prod, pi) => {
                                        const isVoidedProd = prod.status === 'void';
                                        return (
                                          <div
                                            key={pi}
                                            className={`flex items-center justify-between px-4 py-2.5 ${
                                              isVoidedProd ? 'bg-red-50' : ''
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                              {isVoidedProd && (
                                                <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0">
                                                  VOID
                                                </span>
                                              )}
                                              <span className={`text-sm ${isVoidedProd ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                {prod.product_name}
                                              </span>
                                              {prod.qty > 1 && (
                                                <span className="text-xs text-gray-400">×{prod.qty}</span>
                                              )}
                                            </div>
                                            <span className={`text-sm font-medium flex-shrink-0 ml-3 ${
                                              isVoidedProd ? 'line-through text-gray-400' : 'text-gray-700'
                                            }`}>
                                              {fmt(prod.line_total)}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                      Sin productos registrados
                                    </div>
                                  )}
                                  {/* Razón */}
                                  {item.void_reason && (
                                    <div className="px-4 py-2.5 bg-red-50 border-t border-red-100">
                                      <p className="text-xs font-medium text-red-600">
                                        <span className="font-semibold">Razón de anulación:</span> {item.void_reason}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Toca una fila para ver la comanda completa con todos los productos
            </p>
          </>
        )}
      </div>
    </div>
  );
}

