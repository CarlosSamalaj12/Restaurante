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
  Package
} from 'lucide-react';
import { CXCPage } from './CXC';
import { InventoryPage } from './InventoryPage';

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

  if (report === 'inventory') {
    return <InventoryPage onBack={() => setReport(null)} />;
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
            .row { display: flex; justify-content: space-between; gap: 8px; }
            .bold { font-weight: bold; }
            .sep { border-top: 1px dashed #000; margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2>REVERSIÓN DE COMANDA</h2>
          </div>
          <div class="sep"></div>
          <p><strong>Item:</strong> ${item.product_name}</p>
          <p><strong>Razón:</strong> ${item.void_reason || 'Sin especificar'}</p>
          <p><strong>Fecha:</strong> ${item.voided_at ? new Date(item.voided_at).toLocaleString() : '-'}</p>
          <div class="sep"></div>
          <p><strong>Check:</strong> ${item.check_number || '-'}</p>
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
          <h1 className="font-bold text-gray-900 text-lg">Anulados</h1>
        </div>
      </header>

      <div className="p-4">
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
          <div className="space-y-3">
            {voidedItems.map(item => (
              <div key={item.id} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      <p className="text-sm text-gray-500">
                        Check: {item.check_number || `#${item.id}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePrint(item)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Imprimir reversión"
                  >
                    <Printer className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                {item.void_reason && (
                  <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {item.void_reason}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.voided_at ? new Date(item.voided_at).toLocaleString() : '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TipsReportPage({ onBack }) {
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
      <div className="p-4">
        <div className="text-center py-12">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Reporte de propinas en desarrollo</p>
          <p className="text-sm text-gray-400 mt-1">Próximamente disponible</p>
        </div>
      </div>
    </div>
  );
}
