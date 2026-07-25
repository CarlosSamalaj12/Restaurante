import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../api';
import { useToast } from '../hooks/useToast';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Receipt,
  Clock,
  Printer,
  FileText,
  Package,
  CheckCircle,
  XCircle,
  Search,
  ShoppingCart,
  Building2,
  CreditCard,
  Hash,
  Download,
  FileSpreadsheet,
  Users,
} from 'lucide-react';
import { CXCPage } from './CXC';
import { InventoryPage } from './InventoryPage';
import { exportToExcel, exportToPDF } from '../utils/exports';

export function ReportsPage({ onBack }) {
  const [report, setReport] = useState(null);

  if (report === 'cxc') {
    return <CXCPage onBack={() => setReport(null)} />;
  }

  if (report === 'voided') {
    return (
      <VoidedReportPage
        onBack={() => setReport(null)}
      />
    );
  }

  if (report === 'tips') {
    return (
      <TipsReportPage
        onBack={() => setReport(null)}
      />
    );
  }

  if (report === 'products') {
    return (
      <ProductSalesReportPage
        onBack={() => setReport(null)}
      />
    );
  }

  if (report === 'inventory') {
    return <InventoryPage onBack={() => setReport(null)} />;
  }

  if (report === 'payment') {
    return <PaymentMethodReportPage onBack={() => setReport(null)} />;
  }

  if (report === 'center') {
    return <SalesByCenterReportPage onBack={() => setReport(null)} />;
  }

  if (report === 'user') {
    return <SalesByUserReportPage onBack={() => setReport(null)} />;
  }

  const reports = [
    {
      id: 'voided',
      icon: AlertTriangle,
      title: 'Anulados',
      desc: 'Productos anulados y reversiones',
      color: 'text-red-600',
      bg: 'bg-red-50'
    },
    {
      id: 'tips',
      icon: Receipt,
      title: 'Propinas',
      desc: 'Reporte de propinas',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      id: 'cxc',
      icon: FileText,
      title: 'Cuentas por Cobrar',
      desc: 'Clientes, estados de cuenta y pagos',
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    {
      id: 'inventory',
      icon: Package,
      title: 'Inventario',
      desc: 'Control de insumos y existencias',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      id: 'products',
      icon: Package,
      title: 'Ventas por Categoría',
      desc: 'Productos vendidos agrupados por categoría',
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      id: 'payment',
      icon: CreditCard,
      title: 'Forma de Pago',
      desc: 'Ventas desglosadas por método de pago',
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      id: 'center',
      icon: Building2,
      title: 'Ventas por Centro',
      desc: 'Comparar ventas entre centros y productos exclusivos',
      color: 'text-cyan-600',
      bg: 'bg-cyan-50'
    },
    {
      id: 'user',
      icon: Users,
      title: 'Ventas por Usuario',
      desc: 'Desempeño por empleado y comparación de productos',
      color: 'text-rose-600',
      bg: 'bg-rose-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Reportes</h1>
        </div>
      </header>

      <div className="p-4">
        <p className="text-gray-500 text-sm mb-4">Selecciona un reporte</p>
        <div className="grid gap-3">
          {reports.map((r, i) => (
            <motion.button
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setReport(r.id)}
              className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4 text-left hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 ${r.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <r.icon className={`w-6 h-6 ${r.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{r.title}</p>
                <p className="text-sm text-gray-500">{r.desc}</p>
              </div>
              <div className="text-gray-300">
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

function VoidedReportPage({ onBack }) {
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

function TipsReportPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState([]);
  const [waiters, setWaiters] = useState([]);
  const [data, setData] = useState(null);
  const toast = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(); firstDay.setDate(1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today);
  const [filterWaiterId, setFilterWaiterId] = useState('');
  const [filterCenterId, setFilterCenterId] = useState('');

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const boot = await api.bootstrap();
      setCenters(boot.centers || []);
      setWaiters(boot.waiters || []);
    } catch (e) {
      console.error('Error loading filters:', e);
    }
  };

  const handleSearch = async () => {
    if (!startDate || !endDate) { toast.error('Selecciona rango de fechas'); return; }
    setLoading(true);
    try {
      const result = await api.getWaiterTips({
        startDate,
        endDate,
        waiterId: filterWaiterId || undefined,
        centerId: filterCenterId || undefined,
      });
      setData(result);
    } catch (error) {
      toast.error(error.message || 'Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n, dec = 2) => Number(n || 0).toFixed(dec);
  const formatMoney = (n) => fmt(n);
  const formatQ = (n) => fmt(n);

  const handleExportExcel = () => {
    if (!data) return;
    const centerName = centers.find(c => c.id === Number(filterCenterId))?.name || 'Todos los centros';
    const waiterName = waiters.find(w => w.id === Number(filterWaiterId))?.full_name || 'Todos los meseros';
    const grandTips = data.summary.reduce((a, b) => a + b.totalTips, 0);
    const grandTotal = data.summary.reduce((a, b) => a + b.totalGeneral, 0);
    const grandEligible = data.summary.reduce((a, b) => a + b.eligibleCount, 0);

    exportToExcel({
      sheets: [{
        name: 'Propinas',
        title: 'SamaPos - Reporte de Propinas',
        subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName} | Mesero: ${waiterName}`,
        headers: [
          { label: 'Mesero', width: 18 },
          { label: 'Centro', width: 14 },
          { label: 'Cuentas', width: 9, type: 'center' },
          { label: 'Con Prop.', width: 10, type: 'center' },
          { label: 'Subtotal', width: 12, type: 'money' },
          { label: 'Descuentos', width: 12, type: 'money' },
          { label: 'Propinas', width: 12, type: 'money' },
          { label: 'Total General', width: 13, type: 'money' },
        ],
        rows: data.summary.map(s => [
          { value: s.waiterName, type: 'bold' },
          { value: s.centerName },
          { value: Number(s.accountCount || 0), type: 'center' },
          { value: `${Number(s.eligibleCount || 0)}/${Number(s.accountCount || 0)}`, type: 'center' },
          { value: parseFloat(Number(s.totalSubtotal || 0).toFixed(2)), type: 'money' },
          { value: parseFloat(Number(s.totalDiscounts || 0).toFixed(2)), type: 'money' },
          { value: parseFloat(Number(s.totalTips || 0).toFixed(2)), type: 'money' },
          { value: parseFloat(Number(s.totalGeneral || 0).toFixed(2)), type: 'money' },
        ]),
        grandTotals: [
          { value: 'TOTAL GENERAL', type: 'bold' },
          { value: '' },
          { value: data.details.length, type: 'boldCenter' },
          { value: `${grandEligible}/${data.details.length}`, type: 'boldCenter' },
          { value: parseFloat(Number(data.summary.reduce((a, b) => a + (b.totalSubtotal || 0), 0)).toFixed(2)), type: 'money' },
          { value: parseFloat(Number(data.summary.reduce((a, b) => a + (b.totalDiscounts || 0), 0)).toFixed(2)), type: 'money' },
          { value: parseFloat(Number(grandTips).toFixed(2)), type: 'money' },
          { value: parseFloat(Number(grandTotal).toFixed(2)), type: 'money' },
        ],
      }],
    });
  };

  const handleExportPDF = () => {
    if (!data) return;
    const centerName = centers.find(c => c.id === Number(filterCenterId))?.name || 'Todos los centros';
    const waiterName = waiters.find(w => w.id === Number(filterWaiterId))?.full_name || 'Todos los meseros';
    const grandTips = data.summary.reduce((a, b) => a + b.totalTips, 0);
    const grandTotal = data.summary.reduce((a, b) => a + b.totalGeneral, 0);
    const grandEligible = data.summary.reduce((a, b) => a + b.eligibleCount, 0);

    exportToPDF({
      title: 'Reporte de Propinas',
      subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName} | Mesero: ${waiterName}`,
      tables: [
        {
          sectionTitle: 'Resumen por Mesero',
          headers: ['Mesero', 'Centro', 'Cuentas', 'Con Prop.', 'Subtotal', 'Descuentos', 'Propinas', 'Total General'],
          rows: data.summary.map(s => [
            { value: s.waiterName, type: 'bold' },
            { value: s.centerName },
            { value: s.accountCount, type: 'center' },
            { value: `${s.eligibleCount}/${s.accountCount}`, type: 'center' },
            { value: `Q${formatQ(s.totalSubtotal)}`, type: 'money' },
            { value: `Q${formatQ(s.totalDiscounts)}`, type: 'money' },
            { value: `Q${formatQ(s.totalTips)}`, type: 'money' },
            { value: `Q${formatQ(s.totalGeneral)}`, type: 'money' },
          ]),
          totals: [
            { value: 'TOTALES', type: 'bold' },
            { value: '' },
            { value: data.details.length, type: 'center' },
            { value: grandEligible, type: 'center' },
            { value: `Q${formatQ(data.summary.reduce((a, b) => a + b.totalSubtotal, 0))}`, type: 'money' },
            { value: `Q${formatQ(data.summary.reduce((a, b) => a + b.totalDiscounts, 0))}`, type: 'money' },
            { value: `Q${grandTips.toFixed(2)}`, type: 'money' },
            { value: `Q${grandTotal.toFixed(2)}`, type: 'money' },
          ],
        },
        {
          sectionTitle: 'Detalle por Cuenta',
          headers: ['Mesero', 'Centro', '# Cuenta', 'Método', 'Prop.', 'Subtotal', 'Desc.', '%', 'Propina', 'Total'],
          rows: data.details.map(d => [
            { value: d.waiterName },
            { value: d.centerName },
            { value: d.checkNumber, type: 'center' },
            { value: (d.paymentMethods || []).join('/ ').toUpperCase(), type: 'center' },
            { value: d.tipEligible ? '✓' : '✗', type: 'center' },
            { value: `Q${formatQ(d.subtotal)}`, type: 'money' },
            { value: `Q${formatQ(d.discountTotal)}`, type: 'money' },
            { value: `${d.tipPercent}%`, type: 'center' },
            { value: `Q${formatQ(d.tipAmount)}`, type: 'money' },
            { value: `Q${formatQ(d.total)}`, type: 'money' },
          ]),
        },
      ],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Propinas</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Filtros */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-3">Filtros</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha inicio</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha fin</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Mesero</label>
              <select value={filterWaiterId} onChange={e => setFilterWaiterId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
                <option value="">Todos</option>
                {waiters.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Centro</label>
              <select value={filterCenterId} onChange={e => setFilterCenterId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
                <option value="">Todos</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="w-full py-2.5 bg-primary-600 text-white font-medium rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {loading ? 'Consultando...' : 'Generar Reporte'}
          </button>
        </div>

        {/* Resultados */}
        {data && (
          <div className="space-y-4">
            {/* Botones de acción */}
            <div className="flex gap-2">
              <button onClick={handleExportPDF}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-red-700 transition-colors">
                <Printer className="w-4 h-4" /> PDF
              </button>
              <button onClick={handleExportExcel}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
            </div>

            {/* Resumen por mesero */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                <h3 className="text-white font-semibold text-sm">Resumen por Mesero</h3>
                <p className="text-blue-200 text-xs mt-0.5">Configuración global de propina: {data.globalTipPercent}% | Métodos excluidos: {(data.excludedMethods||[]).join(', ').toUpperCase() || 'ninguno'}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-xs">
                      <th className="text-left px-4 py-3">Mesero</th>
                      <th className="text-left px-4 py-3">Centro</th>
                      <th className="text-center px-4 py-3">Cuentas</th>
                      <th className="text-center px-4 py-3">Con Prop.</th>
                      <th className="text-right px-4 py-3">Subtotal</th>
                      <th className="text-right px-4 py-3">Desc.</th>
                      <th className="text-right px-4 py-3">Propinas</th>
                      <th className="text-right px-4 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.summary.map((s, i) => (
                      <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.waiterName}</td>
                        <td className="px-4 py-3 text-gray-600">{s.centerName}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{s.accountCount}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.eligibleCount === s.accountCount ? 'bg-green-100 text-green-700' : s.eligibleCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {s.eligibleCount}/{s.accountCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatMoney(s.totalSubtotal)}</td>
                        <td className="px-4 py-3 text-right text-red-500">{formatMoney(s.totalDiscounts)}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatMoney(s.totalTips)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatMoney(s.totalGeneral)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold text-sm">
                      <td colSpan={2} className="px-4 py-3 text-gray-900">TOTALES</td>
                      <td className="px-4 py-3 text-center text-gray-900">{data.details.length}</td>
                      <td className="px-4 py-3 text-center text-gray-900">{data.summary.reduce((a, b) => a + b.eligibleCount, 0)}/{data.details.length}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatMoney(data.summary.reduce((a, b) => a + b.totalSubtotal, 0))}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatMoney(data.summary.reduce((a, b) => a + b.totalDiscounts, 0))}</td>
                      <td className="px-4 py-3 text-right text-green-700">{formatMoney(data.summary.reduce((a, b) => a + b.totalTips, 0))}</td>
                      <td className="px-4 py-3 text-right text-gray-900">{formatMoney(data.summary.reduce((a, b) => a + b.totalGeneral, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Detalle por cuenta */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-3">
                <h3 className="text-white font-semibold text-sm">Detalle por Cuenta</h3>
                <p className="text-gray-400 text-xs mt-0.5">{data.details.length} cuentas en total</p>
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-xs sticky top-0">
                      <th className="text-left px-4 py-3">Mesero</th>
                      <th className="text-left px-4 py-3">Centro</th>
                      <th className="text-center px-4 py-3">#</th>
                      <th className="text-center px-4 py-3">Método</th>
                      <th className="text-center px-4 py-3">Prop.</th>
                      <th className="text-right px-4 py-3">Subtotal</th>
                      <th className="text-right px-4 py-3">Desc.</th>
                      <th className="text-center px-4 py-3">%</th>
                      <th className="text-right px-4 py-3">Propina</th>
                      <th className="text-right px-4 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.details.map((d, i) => (
                      <tr key={i} className={`border-t border-gray-100 ${d.tipEligible ? 'hover:bg-green-50' : 'bg-red-50 hover:bg-red-100'}`}>
                        <td className="px-4 py-2.5 text-gray-900">{d.waiterName}</td>
                        <td className="px-4 py-2.5 text-gray-600">{d.centerName}</td>
                        <td className="px-4 py-2.5 text-center font-mono text-gray-600">{d.checkNumber}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-xs font-mono text-gray-500">{(d.paymentMethods||[]).join(', ').toUpperCase()}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {d.tipEligible
                            ? <CheckCircle className="w-4 h-4 text-green-600 inline" />
                            : <XCircle className="w-4 h-4 text-red-500 inline" />
                          }
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{formatMoney(d.subtotal)}</td>
                        <td className="px-4 py-2.5 text-right text-red-500">{formatMoney(d.discountTotal)}</td>
                        <td className="px-4 py-2.5 text-center text-gray-600">{d.tipPercent}%</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${d.tipEligible ? 'text-green-600' : 'text-red-400'}`}>{formatMoney(d.tipAmount)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatMoney(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!data && (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Selecciona filtros y genera el reporte</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductSalesReportPage({ onBack }) {
  const toast = useToast();
  const [centers, setCenters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [centerId, setCenterId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productName, setProductName] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // Product autocomplete
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [searchingProd, setSearchingProd] = useState(false);
  const [showProdDrop, setShowProdDrop] = useState(false);

  useEffect(() => {
    api.bootstrap().then(boot => {
      setCenters(boot.centers || []);
      setCategories(boot.categories || []);
    }).catch(() => {});
  }, []);

  // Debounced product search
  useEffect(() => {
    if (prodSearch.trim().length < 2) { setProdResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingProd(true);
      try {
        const prods = await api.getProducts(categoryId || undefined, centerId || undefined);
        const filtered = (prods || []).filter(p =>
          p.name.toLowerCase().includes(prodSearch.toLowerCase())
        ).slice(0, 20);
        setProdResults(filtered);
        if (filtered.length > 0) setShowProdDrop(true);
      } catch (_) { setProdResults([]); }
      finally { setSearchingProd(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [prodSearch, categoryId, centerId]);

  const selectProduct = (p) => {
    setProductName(p.name);
    setProdSearch('');
    setProdResults([]);
    setShowProdDrop(false);
  };

  const clearProduct = () => {
    setProductName('');
    setProdSearch('');
    setProdResults([]);
    setShowProdDrop(false);
  };

  const handleSearch = async () => {
    if (!startDate || !endDate) { toast.error('Selecciona rango de fechas'); return; }
    setLoading(true);
    try {
      const result = await api.getProductSales({
        startDate, endDate,
        centerId: centerId || undefined,
        categoryId: categoryId || undefined,
        productName: productName || undefined,
      });
      setCategories(result.categories || []);
      setData(result);
      if (!result.rows?.length) toast.error('Sin resultados');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // formatMoney returns "Q123.45" (string), formatNum returns Number
  const fmt = (n) => `Q${Number(n || 0).toFixed(2)}`;
  const formatMoney = (n) => fmt(n);
  const formatNum = (n) => Number(n || 0);

  const handleExportExcel = () => {
    if (!data?.rows?.length) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    const { rows, totals } = data;
    const catGroups = [];
    let prevCat = '';
    const groupedRows = [];
    rows.forEach(r => {
      if (r.category_name !== prevCat) {
        catGroups.push({ category: r.category_name, startIdx: groupedRows.length });
        prevCat = r.category_name;
      }
      groupedRows.push(r);
    });

    const excelRows = [];
    rows.forEach(r => {
      excelRows.push([
        { value: r.category_name, type: 'bold' },
        { value: r.product_name },
        { value: Number(r.total_qty || 0), type: 'center' },
        { value: parseFloat(Number(r.total_sales || 0).toFixed(2)), type: 'money' },
        { value: Number(r.account_count || 0), type: 'center' },
      ]);
    });

    exportToExcel({
      sheets: [{
        name: 'Ventas',
        title: 'SamaPos - Ventas por Categoría',
        subtitle: `${centerName} | Del ${startDate} al ${endDate}`,
        headers: [
          { label: 'Categoría', width: 18 },
          { label: 'Producto', width: 30 },
          { label: 'Cantidad', width: 10, type: 'center' },
          { label: 'Total', width: 13, type: 'money' },
          { label: 'Cuentas', width: 9, type: 'center' },
        ],
        rows: excelRows,
        grandTotals: [
          { value: 'TOTAL GENERAL', type: 'bold' },
          { value: '' },
          { value: Number(totals.grand_qty || 0), type: 'boldCenter' },
          { value: parseFloat(Number(totals.grand_total || 0).toFixed(2)), type: 'money' },
          { value: Number(totals.total_accounts || 0), type: 'boldCenter' },
        ],
      }],
    });
  };

  const handleExportPDF = () => {
    if (!data?.rows?.length) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    const { rows, totals } = data;

    exportToPDF({
      title: 'Ventas por Categoría',
      subtitle: `${centerName} | Del ${startDate} al ${endDate}`,
      tables: [{
        headers: ['Categoría', 'Producto', 'Cantidad', 'Total', 'Cuentas'],
        rows: rows.map(r => [
          { value: r.category_name, type: 'bold' },
          { value: r.product_name },
          { value: Number(r.total_qty || 0), type: 'center' },
          { value: formatMoney(r.total_sales), type: 'money' },
          { value: Number(r.account_count || 0), type: 'center' },
        ]),
        grandTotals: [
          { value: 'TOTAL GENERAL', type: 'bold' },
          { value: '' },
          { value: Number(totals.grand_qty || 0), type: 'boldCenter' },
          { value: formatMoney(totals.grand_total), type: 'money' },
          { value: Number(totals.total_accounts || 0), type: 'boldCenter' },
        ],
      }],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Ventas por Categoría</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Desde</label>
              <input type="date" value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Hasta</label>
              <input type="date" value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Centro</label>
              <select value={centerId} onChange={e => setCenterId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
                <option value="">Todos los centros</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
                <option value="">Todas las categorías</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="relative">
            <label className="text-xs text-gray-500 mb-1 block">Producto (opcional)</label>
            <div className="relative">
              <input
                type="text" value={prodSearch}
                onChange={e => { setProdSearch(e.target.value); if (!e.target.value) { setProductName(''); setShowProdDrop(false); } }}
                onFocus={() => { if (prodResults.length > 0) setShowProdDrop(true); }}
                onBlur={() => setTimeout(() => setShowProdDrop(false), 200)}
                placeholder="Escribe para buscar producto..."
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm pr-8" />
              {searchingProd && (
                <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
              )}
              {productName && (
                <button onClick={clearProduct}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded">
                  <XCircle className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            {showProdDrop && prodResults.length > 0 && (
              <div className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 w-full max-h-48 overflow-y-auto">
                {prodResults.map(p => (
                  <button key={p.id}
                    onMouseDown={() => selectProduct(p)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors">
                    <span className="font-medium text-gray-800">{p.name}</span>
                    {p.category_name && <span className="text-xs text-gray-400 ml-2">({p.category_name})</span>}
                  </button>
                ))}
              </div>
            )}
            {showProdDrop && prodSearch.length >= 2 && !searchingProd && prodResults.length === 0 && (
              <div className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 w-full px-4 py-3 text-sm text-gray-400 text-center">
                Sin coincidencias
              </div>
            )}
            {productName && (
              <p className="text-xs text-blue-600 mt-1 ml-1">✓ {productName}</p>
            )}
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="w-full py-3 bg-blue-500 text-white rounded-xl flex items-center justify-center gap-2 font-medium disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5" /> Generar Reporte</>}
          </button>
        </div>

        {data && data.rows?.length > 0 && (() => {
          const { rows, totals } = data;
          let prevCat = '';
          return (
            <div className="bg-white rounded-xl border border-gray-100">
              <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {totals.total_accounts} cuentas · {formatNum(totals.grand_qty).toLocaleString('es-GT')} productos · {formatMoney(totals.grand_total)}
                </span>
                <div className="flex gap-1.5">
                  <button onClick={handleExportPDF}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-red-100 transition-colors">
                    <Printer className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button onClick={handleExportExcel}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-emerald-100 transition-colors">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {rows.map((r, i) => {
                  const isNewCat = r.category_name !== prevCat;
                  prevCat = r.category_name;
                  return (
                    <div key={i}>
                      {isNewCat && (
                        <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-700">{r.category_name}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-4 py-2.5 pl-10">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-900">{r.product_name}</span>
                          <span className="text-xs text-gray-400 ml-2">{r.account_count} cuenta{r.account_count !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500 w-16 text-right">{formatNum(r.total_qty).toLocaleString('es-GT')}</span>
                          <span className="font-semibold text-gray-900 w-24 text-right">{formatMoney(r.total_sales)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-3 bg-gray-900 text-white flex items-center justify-between rounded-b-xl">
                <span className="font-bold text-sm">TOTALES</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="w-16 text-right">{formatNum(totals.grand_qty).toLocaleString('es-GT')}</span>
                  <span className="font-bold w-24 text-right text-emerald-400">{formatMoney(totals.grand_total)}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {data && !data.rows?.length && (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Sin resultados para los filtros seleccionados</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PAYMENT METHOD REPORT PAGE
// ============================================================
function PaymentMethodReportPage({ onBack }) {
  const [centers, setCenters] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filterMethod, setFilterMethod] = useState('');
  const [expandedMethod, setExpandedMethod] = useState(null);
  const toast = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(); firstDay.setDate(1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today);
  const [centerId, setCenterId] = useState('');

  useEffect(() => {
    api.bootstrap().then(boot => {
      setCenters(boot.centers || []);
      setPaymentMethods(boot.paymentMethods || []);
    }).catch(() => {});
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setExpandedMethod(null);
    try {
      const result = await api.getSalesByPaymentMethod({
        startDate,
        endDate,
        centerId: centerId || undefined,
        method: filterMethod || undefined,
      });
      setData(result);
      if (!result.payment_details?.length && !result.methods?.length) toast.error('Sin resultados');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `Q${Number(n || 0).toFixed(2)}`;

  const getMethodIcon = (method) => {
    const key = String(method || '').toLowerCase();
    if (key === 'cash') return '💵';
    if (key === 'card') return '💳';
    if (key === 'transfer') return '🏦';
    return '💰';
  };

  const getMethodLabel = (code) => {
    const found = paymentMethods.find(m => m.code === code);
    return found ? found.label : String(code || '').toUpperCase();
  };

  const handleExportExcel = () => {
    const details = data?.payment_details || [];
    if (!details.length && !data?.methods?.length) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    const filterLabel = filterMethod ? ` | Filtro: ${getMethodLabel(filterMethod)}` : '';
    exportToExcel({
      sheets: [{
        name: 'FormaPago',
        title: 'SamaPos - Ventas por Forma de Pago',
        subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}${filterLabel}`,
        headers: [
          { label: 'Método', width: 18 },
          { label: 'Cuenta', width: 14 },
          { label: 'Centro', width: 14 },
          { label: 'Fecha', width: 18 },
          { label: 'Monto', width: 14, type: 'money' },
          { label: 'Total Cuenta', width: 14, type: 'money' },
          { label: 'Referencia', width: 16 },
        ],
        rows: details.map(p => [
          { value: getMethodLabel(p.method) },
          { value: p.check_number },
          { value: p.center_name || '-' },
          { value: p.created_at ? new Date(p.created_at).toLocaleString('es-GT') : '-' },
          { value: parseFloat(Number(p.amount || 0).toFixed(2)), type: 'money' },
          { value: parseFloat(Number(p.account_total || 0).toFixed(2)), type: 'money' },
          { value: p.reference_no || '-' },
        ]),
        grandTotals: [
          { value: 'TOTAL GENERAL', type: 'bold' },
          { value: '' },
          { value: '' },
          { value: '' },
          { value: parseFloat(Number(data.grand_total || 0).toFixed(2)), type: 'money' },
          { value: '' },
          { value: '' },
        ],
      }],
    });
  };

  const handleExportPDF = () => {
    const details = data?.payment_details || [];
    if (!details.length && !data?.methods?.length) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    const filterLabel = filterMethod ? ` | Filtro: ${getMethodLabel(filterMethod)}` : '';
    exportToPDF({
      title: 'Ventas por Forma de Pago',
      subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}${filterLabel}`,
      tables: [{
        headers: ['Método', 'Cuenta', 'Centro', 'Fecha', 'Monto', 'Total Cuenta'],
        rows: details.map(p => [
          { value: getMethodLabel(p.method) },
          { value: p.check_number },
          { value: p.center_name || '-' },
          { value: p.created_at ? new Date(p.created_at).toLocaleString('es-GT') : '-' },
          { value: fmt(p.amount), type: 'money' },
          { value: fmt(p.account_total), type: 'money' },
        ]),
        grandTotals: [
          { value: 'TOTAL GENERAL', type: 'bold' },
          { value: '' },
          { value: '' },
          { value: '' },
          { value: fmt(data.grand_total), type: 'money' },
          { value: '' },
        ],
      }],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Forma de Pago</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Filtros */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Desde</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Hasta</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Centro</label>
              <select value={centerId} onChange={e => setCenterId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
                <option value="">Todos</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Forma de Pago</label>
              <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
                <option value="">Todas</option>
                {paymentMethods.map(m => <option key={m.code} value={m.code}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="w-full py-2.5 bg-purple-600 text-white font-medium rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Consultando...' : 'Generar Reporte'}
          </button>
        </div>

        {data && (
          <>
            {/* Resumen */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {filterMethod ? getMethodLabel(filterMethod) : 'Resumen por Forma de Pago'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Total recaudo: <span className="font-bold text-gray-800">{fmt(data.grand_total)}</span>
                    {data.methods.length > 0 && !filterMethod && (
                      <span className="ml-2 text-gray-400">· {data.methods.length} método{data.methods.length !== 1 ? 's' : ''}</span>
                    )}
                    {data.payment_details?.length > 0 && (
                      <span className="ml-2 text-gray-400">· {data.payment_details.length} pago{data.payment_details.length !== 1 ? 's' : ''}</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={handleExportPDF}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-red-100">
                    <Printer className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button onClick={handleExportExcel}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-emerald-100">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                  </button>
                </div>
              </div>

              {/* Resumen por método */}
              {!filterMethod && data.methods.length > 0 && (
                <div>
                  <div className="divide-y divide-gray-100">
                    {data.methods.map((m, i) => {
                      const pct = ((Number(m.total_amount || 0) / Number(data.grand_total || 1)) * 100).toFixed(1);
                      return (
                        <div key={m.method} onClick={() => setExpandedMethod(expandedMethod === m.method ? null : m.method)}
                          className={`px-4 py-3 cursor-pointer transition-colors ${expandedMethod === m.method ? 'bg-purple-50' : i % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getMethodIcon(m.method)}</span>
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">{getMethodLabel(m.method)}</p>
                                <p className="text-xs text-gray-500">{Number(m.transaction_count || 0)} pago{Number(m.transaction_count || 0) !== 1 ? 's' : ''}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">{fmt(m.total_amount)}</p>
                              <p className={`text-xs font-medium ${Number(pct) >= 40 ? 'text-green-600' : Number(pct) >= 20 ? 'text-blue-600' : 'text-gray-500'}`}>{pct}%</p>
                            </div>
                          </div>
                          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-4 py-3 bg-gray-900 text-white flex items-center justify-between rounded-b-xl">
                    <span className="font-bold text-sm">TOTAL RECAUDADO</span>
                    <span className="font-bold text-sm">{fmt(data.grand_total)}</span>
                  </div>
                </div>
              )}

              {/* Detalle de pagos */}
              {data.payment_details && data.payment_details.length > 0 && (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-purple-600 text-white text-xs sticky top-0">
                        <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Forma de Pago</th>
                        <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Cuenta</th>
                        <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Centro</th>
                        <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Fecha</th>
                        <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">Monto Pagado</th>
                        <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">Total Cuenta</th>
                        <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Referencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payment_details.map((p, i) => (
                        <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-purple-50`}>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{getMethodIcon(p.method)}</span>
                              <span className="font-medium text-gray-800 text-xs">{getMethodLabel(p.method)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-gray-700 text-xs">{p.check_number}</td>
                          <td className="px-3 py-2.5 text-gray-600 text-xs">{p.center_name || '-'}</td>
                          <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                            {p.created_at ? new Date(p.created_at).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-purple-700 text-xs">{fmt(p.amount)}</td>
                          <td className="px-3 py-2.5 text-right text-gray-500 text-xs">{fmt(p.account_total)}</td>
                          <td className="px-3 py-2.5 text-gray-400 text-xs font-mono">{p.reference_no || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {data.methods.length === 0 && (!data.payment_details || data.payment_details.length === 0) && (
                <div className="text-center py-8 text-gray-400 text-sm">Sin pagos en el período seleccionado</div>
              )}
            </div>
          </>
        )}

        {!data && (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Selecciona fechas y genera el reporte</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SALES BY CENTER REPORT PAGE
// ============================================================
function SalesByCenterReportPage({ onBack }) {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('detail');
  const toast = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(); firstDay.setDate(1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today);
  const [centerId, setCenterId] = useState('');
  const [productName, setProductName] = useState('');

  // Product autocomplete
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [searchingProd, setSearchingProd] = useState(false);
  const [showProdDrop, setShowProdDrop] = useState(false);

  useEffect(() => {
    api.bootstrap().then(boot => setCenters(boot.centers || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (prodSearch.trim().length < 2) { setProdResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingProd(true);
      try {
        const prods = await api.getProducts(undefined, centerId || undefined);
        const filtered = (prods || []).filter(p =>
          p.name.toLowerCase().includes(prodSearch.toLowerCase())
        ).slice(0, 20);
        setProdResults(filtered);
        if (filtered.length > 0) setShowProdDrop(true);
      } catch (_) { setProdResults([]); }
      finally { setSearchingProd(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [prodSearch, centerId]);

  const selectProduct = (p) => {
    setProductName(p.name);
    setProdSearch('');
    setProdResults([]);
    setShowProdDrop(false);
  };

  const clearProduct = () => {
    setProductName('');
    setProdSearch('');
    setProdResults([]);
    setShowProdDrop(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const result = await api.getSalesByCenter({
        startDate, endDate,
        centerId: centerId || undefined,
        productName: productName || undefined,
      });
      setData(result);
      if (!result.products?.length) toast.error('Sin resultados');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `Q${Number(n || 0).toFixed(2)}`;

  const centerBadge = (name) => {
    const n = String(name || '').toLowerCase();
    if (n.includes('deck')) return 'bg-orange-100 text-orange-700';
    if (n.includes('vaquero')) return 'bg-blue-100 text-blue-700';
    if (n.includes('bar')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  const handleExportExcel = () => {
    if (!data?.detail_rows?.length && !data?.products?.length) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    exportToExcel({
      sheets: [
        // Sheet 1: Detalle completo
        {
          name: 'Detalle',
          title: 'SamaPos - Ventas por Centro (Detalle)',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}`,
          headers: [
            { label: 'Centro', width: 16 },
            { label: 'Categoría', width: 18 },
            { label: 'Producto', width: 30 },
            { label: 'Cuenta', width: 12 },
            { label: 'Fecha', width: 14 },
            { label: 'Mesero', width: 20 },
            { label: 'Cant.', width: 8, type: 'center' },
            { label: 'Total', width: 14, type: 'money' },
          ],
          rows: (data.detail_rows || []).map(r => [
            { value: r.center_name || '-' },
            { value: r.category_name },
            { value: r.product_name },
            { value: r.check_number || '-' },
            { value: r.closed_at ? new Date(r.closed_at).toLocaleDateString('es-GT') : '-' },
            { value: r.waiter_name || '-' },
            { value: Number(r.qty || 0), type: 'center' },
            { value: parseFloat(Number(r.line_total || 0).toFixed(2)), type: 'money' },
          ]),
          grandTotals: [
            { value: 'TOTAL', type: 'bold' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: Number(data.grand_qty), type: 'boldCenter' },
            { value: parseFloat(Number(data.grand_total).toFixed(2)), type: 'money' },
          ],
        },
        // Sheet 2: Resumen por producto
        {
          name: 'Resumen',
          title: 'SamaPos - Ventas por Centro (Resumen)',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}`,
          headers: [
            { label: 'Tipo', width: 12 },
            { label: 'Producto', width: 30 },
            { label: 'Categoría', width: 18 },
            { label: 'Centro(s)', width: 20 },
            { label: 'Cantidad', width: 10, type: 'center' },
            { label: 'Total', width: 14, type: 'money' },
          ],
          rows: [
            ...(data.exclusive_products || []).map(p => [
              { value: 'EXCLUSIVO' },
              { value: p.product_name },
              { value: p.category_name },
              { value: p.centers[0]?.center_name || '-' },
              { value: Number(p.total_qty), type: 'center' },
              { value: parseFloat(Number(p.total_sales).toFixed(2)), type: 'money' },
            ]),
            ...(data.shared_products || []).map(p => [
              { value: 'COMPARTIDO' },
              { value: p.product_name },
              { value: p.category_name },
              { value: p.centers.map(c => c.center_name).join(' / ') },
              { value: Number(p.total_qty), type: 'center' },
              { value: parseFloat(Number(p.total_sales).toFixed(2)), type: 'money' },
            ]),
          ],
          grandTotals: [
            { value: 'TOTAL', type: 'bold' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: Number(data.grand_qty), type: 'boldCenter' },
            { value: parseFloat(Number(data.grand_total).toFixed(2)), type: 'money' },
          ],
        },
        // Sheet 3: Cuentas unidas
        ...((data.merged_accounts || []).length > 0 ? [{
          name: 'Unidas',
          title: 'SamaPos - Cuentas Unidas',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}`,
          headers: [
            { label: 'Centro', width: 16 },
            { label: 'Mesero', width: 20 },
            { label: 'Cuenta Original', width: 16 },
            { label: 'Fecha', width: 14 },
            { label: 'Unida a Cuenta', width: 16 },
            { label: 'Total', width: 14, type: 'money' },
          ],
          rows: (data.merged_accounts || []).map(ma => [
            { value: ma.center_name || '-' },
            { value: ma.waiter_name || '-' },
            { value: ma.check_number || `#${ma.account_id}` },
            { value: ma.closed_at ? new Date(ma.closed_at).toLocaleDateString('es-GT') : '-' },
            { value: `#${ma.merged_into_account_id}`, type: 'bold' },
            { value: 0, type: 'money' },
          ]),
          grandTotals: [
            { value: `${(data.merged_accounts || []).length} CUENTA(S) UNIDA(S)`, type: 'bold' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: 0, type: 'money' },
          ],
        }] : []),
      ],
    });
  };

  const handleExportPDF = () => {
    if (!data?.detail_rows?.length && !data?.products?.length) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    exportToPDF({
      title: 'Ventas por Centro',
      subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}`,
      tables: [
        {
          sectionTitle: 'Detalle de Productos Vendidos',
          headers: ['Centro', 'Categoría', 'Producto', 'Cuenta', 'Fecha', 'Cant.', 'Total'],
          rows: (data.detail_rows || []).map(r => [
            { value: r.center_name || '-' },
            { value: r.category_name },
            { value: r.product_name },
            { value: r.check_number || '-' },
            { value: r.closed_at ? new Date(r.closed_at).toLocaleDateString('es-GT') : '-' },
            { value: Number(r.qty || 0), type: 'center' },
            { value: fmt(r.line_total), type: 'money' },
          ]),
        },
        {
          sectionTitle: 'Resumen - Exclusivos',
          headers: ['Centro', 'Producto', 'Categoría', 'Cantidad', 'Total'],
          rows: (data.exclusive_products || []).flatMap(p =>
            p.centers.map(c => [
              { value: c.center_name, type: 'bold' },
              { value: p.product_name },
              { value: p.category_name },
              { value: c.qty, type: 'center' },
              { value: fmt(c.sales), type: 'money' },
            ])
          ),
        },
        {
          sectionTitle: 'Resumen - Compartidos',
          headers: ['Producto', 'Categoría', 'Centros', 'Cantidad', 'Total'],
          rows: (data.shared_products || []).map(p => [
            { value: p.product_name, type: 'bold' },
            { value: p.category_name },
            { value: p.centers.map(c => `${c.center_name} (${c.qty})`).join(', ') },
            { value: p.total_qty, type: 'center' },
            { value: fmt(p.total_sales), type: 'money' },
          ]),
        },
      ],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Ventas por Centro</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Desde</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Hasta</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Centro</label>
            <select value={centerId} onChange={e => setCenterId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
              <option value="">Todos los centros</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="relative">
            <label className="text-xs text-gray-500 mb-1 block">Producto (opcional)</label>
            <div className="relative">
              <input
                type="text" value={prodSearch}
                onChange={e => { setProdSearch(e.target.value); if (!e.target.value) { setProductName(''); setShowProdDrop(false); } }}
                onFocus={() => { if (prodResults.length > 0) setShowProdDrop(true); }}
                onBlur={() => setTimeout(() => setShowProdDrop(false), 200)}
                placeholder="Buscar producto..."
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm pr-8" />
              {searchingProd && (
                <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
              )}
              {productName && (
                <button onClick={clearProduct}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded">
                  <XCircle className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            {showProdDrop && prodResults.length > 0 && (
              <div className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 w-full max-h-48 overflow-y-auto">
                {prodResults.map(p => (
                  <button key={p.id}
                    onMouseDown={() => selectProduct(p)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-cyan-50 border-b border-gray-50 last:border-0 transition-colors">
                    <span className="font-medium text-gray-800">{p.name}</span>
                    {p.category_name && <span className="text-xs text-gray-400 ml-2">({p.category_name})</span>}
                  </button>
                ))}
              </div>
            )}
            {showProdDrop && prodSearch.length >= 2 && !searchingProd && prodResults.length === 0 && (
              <div className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 w-full px-4 py-3 text-sm text-gray-400 text-center">
                Sin coincidencias
              </div>
            )}
            {productName && (
              <p className="text-xs text-cyan-600 mt-1 ml-1">✓ {productName}</p>
            )}
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="w-full py-2.5 bg-cyan-600 text-white font-medium rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Consultando...' : 'Generar Reporte'}
          </button>
        </div>

        {data && (
          <>
            {/* Totales por centro */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-800">
                <h3 className="text-white font-semibold text-sm">Totales por Centro</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {data.center_totals.map((ct, i) => (
                  <div key={ct.center_id} className={`px-4 py-3 flex items-center justify-between ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-cyan-600" />
                      <span className="font-medium text-gray-800 text-sm">{ct.center_name}</span>
                      <span className="text-xs text-gray-400">{Number(ct.account_count || 0)} cuentas</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">{Number(ct.total_qty || 0).toLocaleString('es-GT')} pzs</span>
                      <span className="font-semibold text-gray-900">{fmt(ct.total_sales)}</span>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-3 bg-gray-900 text-white flex items-center justify-between rounded-b-xl">
                  <span className="font-bold text-sm">TOTAL GENERAL</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{Number(data.grand_qty || 0).toLocaleString('es-GT')} pzs</span>
                    <span className="font-bold">{fmt(data.grand_total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs: Detallado / Exclusivos / Compartidos */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100">
                <button onClick={() => setActiveTab('detail')}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${activeTab === 'detail' ? 'text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  Detalle ({data.detail_rows.length})
                </button>
                <button onClick={() => setActiveTab('exclusive')}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${activeTab === 'exclusive' ? 'text-red-600 border-b-2 border-red-600 bg-red-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  Exclusivos ({data.exclusive_products.length})
                </button>
                <button onClick={() => setActiveTab('shared')}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${activeTab === 'shared' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  Compartidos ({data.shared_products.length})
                </button>
              </div>

              {/* Detalle tab */}
              {activeTab === 'detail' && (
                <>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Listado completo de productos vendidos</p>
                    <div className="flex gap-1.5">
                      <button onClick={handleExportPDF}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-red-100">
                        <Printer className="w-3.5 h-3.5" /> PDF
                      </button>
                      <button onClick={handleExportExcel}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-emerald-100">
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                      </button>
                    </div>
                  </div>

                  {/* Cuentas unidas */}
                  {data.merged_accounts && data.merged_accounts.length > 0 && (
                    <div className="mx-4 my-2 border border-red-200 rounded-xl overflow-hidden bg-red-50">
                      <div className="px-3 py-2 bg-red-100 flex items-center gap-2">
                        <span className="text-red-600 text-xs font-semibold uppercase tracking-wider">⚠ Cuentas Unidas ({data.merged_accounts.length})</span>
                      </div>
                      {data.merged_accounts.map((ma, i) => (
                        <div key={ma.account_id} className={`flex items-center justify-between px-3 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-red-50/50'}`}>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${centerBadge(ma.center_name)}`}>
                              {ma.center_name || 'Sin centro'}
                            </span>
                            <span className="font-mono text-xs text-gray-600">{ma.check_number || `#${ma.account_id}`}</span>
                            {ma.waiter_name && <span className="text-xs text-gray-400">· {ma.waiter_name}</span>}
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-gray-400">Unida a</span>
                            <span className="font-bold text-red-600 font-mono">#{ma.merged_into_account_id}</span>
                            <span className="font-bold text-gray-400 w-16 text-right">Q0.00</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-cyan-600 text-white sticky top-0">
                          <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Centro</th>
                          <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Categoría</th>
                          <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Producto</th>
                          <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">Cuenta</th>
                          <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">Fecha</th>
                          <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">Cant.</th>
                          <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.detail_rows.map((row, i) => (
                          <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-cyan-50`}>
                            <td className="px-3 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${centerBadge(row.center_name)}`}>
                                {row.center_name || 'Sin centro'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{row.category_name}</td>
                            <td className="px-3 py-2 font-medium text-gray-800">{row.product_name}</td>
                            <td className="px-3 py-2 text-center font-mono text-gray-600">
                              {row.merged_into_account_id ? (
                                <span className="flex items-center justify-center gap-1">
                                  <span className="line-through text-gray-400">{row.check_number}</span>
                                  <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded font-bold" title={`Unida a #${row.merged_into_account_id}`}>U</span>
                                </span>
                              ) : row.check_number}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-500 whitespace-nowrap">
                              {row.closed_at ? new Date(row.closed_at).toLocaleDateString('es-GT') : '-'}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-600">{Number(row.qty || 0)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(row.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Exclusivos tab */}
              {activeTab === 'exclusive' && (
                <>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Productos vendidos solo en un centro</p>
                    <div className="flex gap-1.5">
                      <button onClick={handleExportPDF}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-red-100">
                        <Printer className="w-3.5 h-3.5" /> PDF
                      </button>
                      <button onClick={handleExportExcel}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-emerald-100">
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                    {data.exclusive_products.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">Sin productos exclusivos</div>
                    ) : (
                      data.exclusive_products.map((p, i) => (
                        <div key={p.product_id} className={`px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${centerBadge(p.centers[0]?.center_name)}`}>
                                  {p.centers[0]?.center_name || 'Sin centro'}
                                </span>
                                <span className="text-xs text-gray-400">{p.category_name}</span>
                              </div>
                              <p className="font-medium text-gray-900 text-sm">{p.product_name}</p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <p className="font-bold text-gray-900">{fmt(p.total_sales)}</p>
                              <p className="text-xs text-gray-400">{p.total_qty} pzs</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* Compartidos tab */}
              {activeTab === 'shared' && (
                <>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs text-gray-500">Productos vendidos en más de un centro</p>
                    <div className="flex gap-1.5">
                      <button onClick={handleExportPDF}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-red-100">
                        <Printer className="w-3.5 h-3.5" /> PDF
                      </button>
                      <button onClick={handleExportExcel}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-emerald-100">
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                    {data.shared_products.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">Sin productos compartidos</div>
                    ) : (
                      data.shared_products.map((p, i) => (
                        <div key={p.product_id} className={`px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm mb-1">{p.product_name}</p>
                              <p className="text-xs text-gray-400 mb-1.5">{p.category_name}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {p.centers.map(c => (
                                  <span key={c.center_id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${centerBadge(c.center_name)}`}>
                                    {c.center_name}: {c.qty} pzs
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <p className="font-bold text-gray-900">{fmt(p.total_sales)}</p>
                              <p className="text-xs text-gray-400">{p.total_qty} pzs</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {!data && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Selecciona fechas y genera el reporte</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SALES BY USER REPORT PAGE
// ============================================================
function SalesByUserReportPage({ onBack }) {
  const [centers, setCenters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const toast = useToast();

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(); firstDay.setDate(1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(today);
  const [centerId, setCenterId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productName, setProductName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Product autocomplete
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [searchingProd, setSearchingProd] = useState(false);
  const [showProdDrop, setShowProdDrop] = useState(false);

  useEffect(() => {
    api.bootstrap().then(boot => {
      setCenters(boot.centers || []);
      setCategories(boot.categories || []);
      setUsers(boot.waiters || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (prodSearch.trim().length < 2) { setProdResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingProd(true);
      try {
        const prods = await api.getProducts(categoryId || undefined, centerId || undefined);
        const filtered = (prods || []).filter(p =>
          p.name.toLowerCase().includes(prodSearch.toLowerCase())
        ).slice(0, 20);
        setProdResults(filtered);
        if (filtered.length > 0) setShowProdDrop(true);
      } catch (_) { setProdResults([]); }
      finally { setSearchingProd(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [prodSearch, categoryId, centerId]);

  const selectProduct = (p) => {
    setProductName(p.name);
    setProdSearch('');
    setProdResults([]);
    setShowProdDrop(false);
  };

  const clearProduct = () => {
    setProductName('');
    setProdSearch('');
    setProdResults([]);
    setShowProdDrop(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    setActiveTab('users');
    try {
      const result = await api.getSalesByUser({
        startDate,
        endDate,
        centerId: centerId || undefined,
        categoryId: categoryId || undefined,
        productName: productName || undefined,
        userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      });
      setData(result);
      if (!result.detail_rows?.length && !result.users?.length) toast.error('Sin resultados');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `Q${Number(n || 0).toFixed(2)}`;

  const toggleUser = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleExportExcel = () => {
    if (!data) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    const userFilter = selectedUserIds.length > 0
      ? ` | Usuarios: ${selectedUserIds.map(id => users.find(u => u.id === id)?.full_name || id).join(', ')}`
      : '';

    exportToExcel({
      sheets: [
        // Sheet 1: Resumen por usuario
        {
          name: 'PorUsuario',
          title: 'SamaPos - Ventas por Usuario',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}${userFilter}`,
          headers: [
            { label: '#', width: 5, type: 'center' },
            { label: 'Usuario', width: 22 },
            { label: 'Rol', width: 14 },
            { label: 'Centro', width: 16 },
            { label: 'Productos', width: 12, type: 'center' },
            { label: 'Cantidad', width: 10, type: 'center' },
            { label: 'Total Vendido', width: 15, type: 'money' },
          ],
          rows: data.users.map((u, i) => [
            { value: i + 1, type: 'center' },
            { value: u.user_name, type: 'bold' },
            { value: u.user_role || '-' },
            { value: u.center_name || '-' },
            { value: Number(u.product_count || 0), type: 'center' },
            { value: Number(u.total_qty || 0), type: 'center' },
            { value: parseFloat(Number(u.total_sales || 0).toFixed(2)), type: 'money' },
          ]),
          grandTotals: [
            { value: 'TOTAL GENERAL', type: 'bold' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: Number(data.grand_qty || 0), type: 'boldCenter' },
            { value: parseFloat(Number(data.grand_total || 0).toFixed(2)), type: 'money' },
          ],
        },
        // Sheet 2: Comparación de productos
        {
          name: 'Comparacion',
          title: 'SamaPos - Comparación por Producto',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}${userFilter}`,
          headers: [
            { label: 'Producto', width: 28 },
            { label: 'Categoría', width: 18 },
            { label: 'Vendido por', width: 20 },
            { label: 'Cantidad', width: 10, type: 'center' },
            { label: 'Total', width: 14, type: 'money' },
          ],
          rows: (data.product_comparison || []).map(p => {
            const topSeller = [...p.sellers].sort((a, b) => b.qty - a.qty)[0];
            const sellerCount = p.sellers.length;
            return [
              { value: p.product_name, type: 'bold' },
              { value: p.category_name },
              { value: sellerCount === 1 ? topSeller?.user_name || '-' : `${sellerCount} vendedores` },
              { value: Number(p.total_qty || 0), type: 'center' },
              { value: parseFloat(Number(p.total_sales || 0).toFixed(2)), type: 'money' },
            ];
          }),
          grandTotals: [
            { value: 'TOTAL', type: 'bold' },
            { value: '' },
            { value: '' },
            { value: Number(data.grand_qty || 0), type: 'boldCenter' },
            { value: parseFloat(Number(data.grand_total || 0).toFixed(2)), type: 'money' },
          ],
        },
        // Sheet 3: Detalle
        {
          name: 'Detalle',
          title: 'SamaPos - Detalle de Ventas',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}${userFilter}`,
          headers: [
            { label: 'Usuario', width: 20 },
            { label: 'Centro', width: 14 },
            { label: 'Categoría', width: 16 },
            { label: 'Producto', width: 28 },
            { label: 'Cuenta', width: 12 },
            { label: 'Fecha', width: 14 },
            { label: 'Cant.', width: 8, type: 'center' },
            { label: 'Total', width: 14, type: 'money' },
          ],
          rows: (data.detail_rows || []).map(r => [
            { value: r.user_name || '-' },
            { value: r.center_name || '-' },
            { value: r.category_name },
            { value: r.product_name },
            { value: r.check_number || '-' },
            { value: r.closed_at ? new Date(r.closed_at).toLocaleDateString('es-GT') : '-' },
            { value: Number(r.qty || 0), type: 'center' },
            { value: parseFloat(Number(r.line_total || 0).toFixed(2)), type: 'money' },
          ]),
          grandTotals: [
            { value: 'TOTAL', type: 'bold' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: Number(data.grand_qty || 0), type: 'boldCenter' },
            { value: parseFloat(Number(data.grand_total || 0).toFixed(2)), type: 'money' },
          ],
        },
        // Sheet 4: Cuentas unidas
        ...((data.merged_accounts || []).length > 0 ? [{
          name: 'Unidas',
          title: 'SamaPos - Cuentas Unidas',
          subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}${userFilter}`,
          headers: [
            { label: 'Usuario', width: 20 },
            { label: 'Centro', width: 14 },
            { label: 'Cuenta Original', width: 16 },
            { label: 'Fecha', width: 14 },
            { label: 'Unida a Cuenta', width: 16 },
            { label: 'Total', width: 14, type: 'money' },
          ],
          rows: (data.merged_accounts || []).map(ma => [
            { value: ma.user_name || '-' },
            { value: ma.center_name || '-' },
            { value: ma.check_number || `#${ma.account_id}` },
            { value: ma.closed_at ? new Date(ma.closed_at).toLocaleDateString('es-GT') : '-' },
            { value: `#${ma.merged_into_account_id}`, type: 'bold' },
            { value: 0, type: 'money' },
          ]),
          grandTotals: [
            { value: `${(data.merged_accounts || []).length} CUENTA(S) UNIDA(S)`, type: 'bold' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: '' },
            { value: 0, type: 'money' },
          ],
        }] : []),
      ],
    });
  };

  const handleExportPDF = () => {
    if (!data) return;
    const centerName = centers.find(c => c.id === Number(centerId))?.name || 'Todos los centros';
    exportToPDF({
      title: 'Ventas por Usuario',
      subtitle: `Del ${startDate} al ${endDate} | Centro: ${centerName}`,
      tables: [
        {
          sectionTitle: 'Resumen por Usuario',
          headers: ['#', 'Usuario', 'Rol', 'Centro', 'Prod.', 'Cant.', 'Total'],
          rows: data.users.map((u, i) => [
            { value: i + 1, type: 'center' },
            { value: u.user_name, type: 'bold' },
            { value: u.user_role || '-' },
            { value: u.center_name || '-' },
            { value: u.product_count, type: 'center' },
            { value: Number(u.total_qty || 0), type: 'center' },
            { value: fmt(u.total_sales), type: 'money' },
          ]),
        },
        {
          sectionTitle: 'Comparación de Productos',
          headers: ['Producto', 'Categoría', '# Vend.', 'Cantidad', 'Total'],
          rows: (data.product_comparison || []).map(p => [
            { value: p.product_name, type: 'bold' },
            { value: p.category_name },
            { value: p.sellers.length, type: 'center' },
            { value: Number(p.total_qty || 0), type: 'center' },
            { value: fmt(p.total_sales), type: 'money' },
          ]),
        },
      ],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Ventas por Usuario</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Filtros */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Desde</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Hasta</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Centro</label>
              <select value={centerId} onChange={e => setCenterId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
                <option value="">Todos</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm">
                <option value="">Todas</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="relative">
            <label className="text-xs text-gray-500 mb-1 block">Producto (opcional)</label>
            <div className="relative">
              <input
                type="text" value={prodSearch}
                onChange={e => { setProdSearch(e.target.value); if (!e.target.value) { setProductName(''); setShowProdDrop(false); } }}
                onFocus={() => { if (prodResults.length > 0) setShowProdDrop(true); }}
                onBlur={() => setTimeout(() => setShowProdDrop(false), 200)}
                placeholder="Escribe para buscar producto..."
                className="w-full border border-gray-200 rounded-xl p-2.5 text-sm pr-8" />
              {searchingProd && (
                <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
              )}
              {productName && (
                <button onClick={clearProduct}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded">
                  <XCircle className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            {showProdDrop && prodResults.length > 0 && (
              <div className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 w-full max-h-48 overflow-y-auto">
                {prodResults.map(p => (
                  <button key={p.id}
                    onMouseDown={() => selectProduct(p)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-rose-50 border-b border-gray-50 last:border-0 transition-colors">
                    <span className="font-medium text-gray-800">{p.name}</span>
                    {p.category_name && <span className="text-xs text-gray-400 ml-2">({p.category_name})</span>}
                  </button>
                ))}
              </div>
            )}
            {showProdDrop && prodSearch.length >= 2 && !searchingProd && prodResults.length === 0 && (
              <div className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 w-full px-4 py-3 text-sm text-gray-400 text-center">
                Sin coincidencias
              </div>
            )}
            {productName && (
              <p className="text-xs text-rose-600 mt-1 ml-1">✓ {productName}</p>
            )}
          </div>
          {/* Usuarios */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Usuarios ({selectedUserIds.length > 0 ? `${selectedUserIds.length} seleccionado${selectedUserIds.length !== 1 ? 's' : ''}` : 'todos'})
            </label>
            <div className="border border-gray-200 rounded-xl p-2 max-h-28 overflow-y-auto space-y-1">
              {users.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-1">Cargando...</p>
              )}
              {users.map(u => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <label key={u.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={isSelected}
                      onChange={() => toggleUser(u.id)}
                      className="w-3.5 h-3.5 accent-rose-600" />
                    <span className="text-xs text-gray-700">{u.full_name}</span>
                    {u.role && <span className="text-xs text-gray-400">({u.role})</span>}
                  </label>
                );
              })}
            </div>
            {selectedUserIds.length > 0 && (
              <button onClick={() => setSelectedUserIds([])}
                className="mt-1 text-xs text-rose-500 hover:text-rose-700 font-medium">
                Limpiar selección
              </button>
            )}
          </div>
          <button onClick={handleSearch} disabled={loading}
            className="w-full py-2.5 bg-rose-600 text-white font-medium rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Consultando...' : 'Generar Reporte'}
          </button>
        </div>

        {data && (
          <>
            {/* Totales resumen */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 bg-gray-800 flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Resumen General</h3>
                <div className="flex gap-1.5">
                  <button onClick={handleExportPDF}
                    className="px-3 py-1.5 bg-red-500 bg-opacity-20 text-red-300 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-opacity-30">
                    <Printer className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button onClick={handleExportExcel}
                    className="px-3 py-1.5 bg-emerald-500 bg-opacity-20 text-emerald-300 rounded-lg flex items-center gap-1.5 text-xs font-medium hover:bg-opacity-30">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-0.5">Usuarios</p>
                  <p className="font-bold text-gray-900 text-lg">{data.users?.length || 0}</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-0.5">Productos Vendidos</p>
                  <p className="font-bold text-gray-900 text-lg">{Number(data.grand_qty || 0).toLocaleString('es-GT')}</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-500 mb-0.5">Total Vendido</p>
                  <p className="font-bold text-rose-600 text-lg">{fmt(data.grand_total)}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100">
                <button onClick={() => setActiveTab('users')}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${activeTab === 'users' ? 'text-rose-600 border-b-2 border-rose-600 bg-rose-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  Por Usuario ({data.users?.length || 0})
                </button>
                <button onClick={() => setActiveTab('products')}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${activeTab === 'products' ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  Comparación ({data.product_comparison?.length || 0})
                </button>
                <button onClick={() => setActiveTab('detail')}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${activeTab === 'detail' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  Detalle ({data.detail_rows?.length || 0})
                </button>
              </div>

              {/* Por Usuario tab */}
              {activeTab === 'users' && (
                <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                  {data.users?.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Sin datos</div>
                  ) : (
                    data.users.map((u, i) => (
                      <div key={u.user_id} className={`px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-rose-50 transition-colors`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{u.user_name}</p>
                              <p className="text-xs text-gray-400">
                                {u.user_role || 'Empleado'} · {u.center_name || 'Sin centro'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <p className="font-bold text-rose-600 text-sm">{fmt(u.total_sales)}</p>
                            <p className="text-xs text-gray-400">{Number(u.total_qty || 0).toLocaleString('es-GT')} pzs</p>
                          </div>
                        </div>
                        {/* Barra de progreso */}
                        {data.grand_total > 0 && (
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 rounded-full"
                              style={{ width: `${Math.min(100, (Number(u.total_sales || 0) / Number(data.grand_total || 1)) * 100)}%` }} />
                          </div>
                        )}
                        {/* Productos que vendió */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {u.products?.slice(0, 5).map(p => (
                            <span key={p.product_id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {p.product_name} <span className="font-medium">×{p.qty}</span>
                            </span>
                          ))}
                          {u.products?.length > 5 && (
                            <span className="text-xs text-gray-400 px-2 py-0.5">+{u.products.length - 5} más</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Comparación de productos tab */}
              {activeTab === 'products' && (
                <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                  {data.product_comparison?.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Sin datos</div>
                  ) : (
                    data.product_comparison.map((p, i) => {
                      const topSeller = [...p.sellers].sort((a, b) => b.qty - a.qty)[0];
                      return (
                        <div key={p.product_id} className={`px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                {i === 0 && <span className="text-xs bg-amber-400 text-white px-1.5 py-0.5 rounded font-bold">#1</span>}
                                <p className="font-semibold text-gray-900 text-sm">{p.product_name}</p>
                              </div>
                              <p className="text-xs text-gray-400">{p.category_name} · {p.sellers.length} vendedor{p.sellers.length !== 1 ? 'es' : ''}</p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <p className="font-bold text-gray-900 text-sm">{fmt(p.total_sales)}</p>
                              <p className="text-xs text-gray-400">{Number(p.total_qty || 0).toLocaleString('es-GT')} pzs</p>
                            </div>
                          </div>
                          {/* Ranking de vendedores por producto */}
                          <div className="space-y-1.5">
                            {[...p.sellers].sort((a, b) => b.qty - a.qty).map((s, si) => (
                              <div key={s.user_id} className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">{si + 1}.</span>
                                <span className={`text-xs font-medium w-5 text-center flex-shrink-0 ${si === 0 ? 'text-amber-500' : 'text-gray-500'}`}>
                                  {si === 0 ? '🥇' : si === 1 ? '🥈' : si === 2 ? '🥉' : ''}
                                </span>
                                <span className="text-xs text-gray-700 flex-1 truncate">{s.user_name}</span>
                                <span className="text-xs text-gray-500">{Number(s.qty || 0).toLocaleString('es-GT')} pzs</span>
                                <span className="text-xs font-medium text-gray-700 w-20 text-right">{fmt(s.sales)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Detalle tab */}
              {activeTab === 'detail' && (
                <>
                  {/* Cuentas unidas */}
                  {data.merged_accounts && data.merged_accounts.length > 0 && (
                    <div className="mx-4 my-2 border border-red-200 rounded-xl overflow-hidden bg-red-50">
                      <div className="px-3 py-2 bg-red-100 flex items-center gap-2">
                        <span className="text-red-600 text-xs font-semibold uppercase tracking-wider">⚠ Cuentas Unidas ({data.merged_accounts.length})</span>
                      </div>
                      {data.merged_accounts.map((ma, i) => (
                        <div key={ma.account_id} className={`flex items-center justify-between px-3 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-red-50/50'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{ma.user_name || '-'}</span>
                            <span className="text-gray-300">·</span>
                            <span className="font-mono text-xs text-gray-600">{ma.check_number || `#${ma.account_id}`}</span>
                            <span className="text-xs text-gray-400">{ma.center_name || ''}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-gray-400">Unida a</span>
                            <span className="font-bold text-red-600 font-mono">#{ma.merged_into_account_id}</span>
                            <span className="font-bold text-gray-400 w-16 text-right">Q0.00</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-blue-600 text-white sticky top-0">
                          <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Usuario</th>
                          <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Centro</th>
                          <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Categoría</th>
                          <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">Producto</th>
                          <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">Cuenta</th>
                          <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">Fecha</th>
                          <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">Cant.</th>
                          <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.detail_rows?.map((r, i) => (
                          <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                            <td className="px-3 py-2 font-medium text-gray-800">{r.user_name || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{r.center_name || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{r.category_name}</td>
                            <td className="px-3 py-2 font-medium text-gray-800">{r.product_name}</td>
                            <td className="px-3 py-2 text-center font-mono text-gray-600">
                              {r.merged_into_account_id ? (
                                <span className="flex items-center justify-center gap-1">
                                  <span className="line-through text-gray-400">{r.check_number || '-'}</span>
                                  <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded font-bold" title={`Unida a #${r.merged_into_account_id}`}>U</span>
                                </span>
                              ) : r.check_number || '-'}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-500 whitespace-nowrap">
                              {r.closed_at ? new Date(r.closed_at).toLocaleDateString('es-GT') : '-'}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-600">{Number(r.qty || 0)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(r.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 bg-gray-900 text-white flex items-center justify-between rounded-b-xl">
                    <span className="font-bold text-sm">TOTAL</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span>{Number(data.grand_qty || 0).toLocaleString('es-GT')} pzs</span>
                      <span className="font-bold">{fmt(data.grand_total)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {!data && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Selecciona filtros y genera el reporte</p>
          </div>
        )}
      </div>
    </div>
  );
}
