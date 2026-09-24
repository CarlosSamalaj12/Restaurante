import { useState } from 'react';
import { m } from 'framer-motion';
import {
  ArrowLeft,
  AlertTriangle,
  Receipt,
  FileText,
  Package,
  Building2,
  CreditCard,
  Users,
} from 'lucide-react';
import { CXCPage } from './CXC';
import { InventoryPage } from './InventoryPage';
import { VoidedReportPage } from '../components/reports/VoidedReportPage';
import { TipsReportPage } from '../components/reports/TipsReportPage';
import { ProductSalesReportPage } from '../components/reports/ProductSalesReportPage';
import { PaymentMethodReportPage } from '../components/reports/PaymentMethodReportPage';
import { SalesByCenterReportPage } from '../components/reports/SalesByCenterReportPage';
import { SalesByUserReportPage } from '../components/reports/SalesByUserReportPage';

export function ReportsPage({ onBack }) {
  const [report, setReport] = useState(null);

  if (report === 'cxc') {
    return <CXCPage onBack={() => setReport(null)} />;
  }

  if (report === 'voided') {
    return <VoidedReportPage onBack={() => setReport(null)} />;
  }

  if (report === 'tips') {
    return <TipsReportPage onBack={() => setReport(null)} />;
  }

  if (report === 'products') {
    return <ProductSalesReportPage onBack={() => setReport(null)} />;
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
            <m.button
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
            </m.button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
