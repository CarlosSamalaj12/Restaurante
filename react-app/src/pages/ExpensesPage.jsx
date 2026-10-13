import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Building2, 
  Tag, 
  TrendingUp, 
  RefreshCw, 
  WalletCards,
  Coins
} from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { ExpensesListTab } from '../components/expenses/ExpensesListTab';
import { SuppliersTab } from '../components/expenses/SuppliersTab';
import { ExpenseCategoriesTab } from '../components/expenses/ExpenseCategoriesTab';
import { ProfitLossTab } from '../components/expenses/ProfitLossTab';
import api from '../api';
import { useToast } from '../hooks/useToast';

export function ExpensesPage({ onBack }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'suppliers' | 'categories' | 'profit_loss'
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const loadData = async () => {
    try {
      const [cats, sups] = await Promise.all([
        api.expenses.getCategories(),
        api.expenses.getSuppliers(),
      ]);
      setCategories(cats || []);
      setSuppliers(sups || []);
    } catch (err) {
      toast.show('Error al cargar datos base de gastos: ' + (err.message || 'Error'), { type: 'error' });
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tabs = [
    { id: 'expenses', label: 'Gastos Operativos', icon: Receipt },
    { id: 'suppliers', label: 'Proveedores (CXP)', icon: Building2 },
    { id: 'categories', label: 'Categorías', icon: Tag },
    { id: 'profit_loss', label: 'Balance & Ganancias', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navigation Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <BackButton onClick={onBack} label="Dashboard" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <WalletCards className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                    <span>Gastos & Proveedores (CXP)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Finanzas
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400">
                    Control de egresos, cuentas por pagar y rentabilidad en tiempo real
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60 overflow-x-auto">
              {tabs.map((t) => {
                const IconComponent = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'expenses' && (
          <ExpensesListTab
            categories={categories}
            suppliers={suppliers}
            onReload={loadData}
          />
        )}

        {activeTab === 'suppliers' && (
          <SuppliersTab
            suppliers={suppliers}
            onReload={loadData}
          />
        )}

        {activeTab === 'categories' && (
          <ExpenseCategoriesTab
            categories={categories}
            onReload={loadData}
          />
        )}

        {activeTab === 'profit_loss' && (
          <ProfitLossTab />
        )}
      </main>
    </div>
  );
}

export default ExpensesPage;
