import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useCxcData } from '../hooks/useCxcData';
import { ClientsTab } from '../components/cxc/ClientsTab';
import { PendingTab } from '../components/cxc/PendingTab';
import { AreasTab } from '../components/cxc/AreasTab';
import { AccountDetailModal } from '../components/cxc/AccountDetailModal';
import { GlobalPayModal } from '../components/cxc/GlobalPayModal';
import { StatementModal } from '../components/cxc/StatementModal';
import { PendingSummaryModal } from '../components/cxc/PendingSummaryModal';
import { ArrowLeft, Loader2 } from 'lucide-react';

export function CXCPage({ onBack }) {
  const [activeTab, setActiveTab] = useState('clients');
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [globalPayClient, setGlobalPayClient] = useState(null);
  const [statementClient, setStatementClient] = useState(null);
  const [showPendingSummary, setShowPendingSummary] = useState(false);

  const {
    clients,
    pending,
    areas,
    loading,
    loadData
  } = useCxcData();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Cuentas por Cobrar</h1>
        </div>

        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'clients' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Clientes
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'pending' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Por Cobrar ({pending.length})
          </button>
          <button
            onClick={() => setActiveTab('areas')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === 'areas' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Áreas
          </button>
          <button
            onClick={() => setShowPendingSummary(true)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
          >
            Reporte General
          </button>
        </div>
      </header>

      <div className="p-4">
        {activeTab === 'clients' && (
          <ClientsTab
            clients={clients}
            areas={areas}
            onRefresh={loadData}
            onAccountClick={setSelectedAccountId}
            onGlobalPay={setGlobalPayClient}
            onStatement={setStatementClient}
          />
        )}
        {activeTab === 'pending' && (
          <PendingTab pending={pending} onRefresh={loadData} />
        )}
        {activeTab === 'areas' && (
          <AreasTab areas={areas} onRefresh={loadData} />
        )}
      </div>

      <AnimatePresence>
        {selectedAccountId && (
          <AccountDetailModal
            key="account-detail"
            accountId={selectedAccountId}
            onClose={() => setSelectedAccountId(null)}
            onRefresh={loadData}
          />
        )}
        {globalPayClient && (
          <GlobalPayModal
            key="global-pay"
            client={globalPayClient}
            onClose={() => setGlobalPayClient(null)}
            onRefresh={loadData}
          />
        )}
        {statementClient && (
          <StatementModal
            key="statement"
            client={statementClient}
            onClose={() => setStatementClient(null)}
          />
        )}
        {showPendingSummary && (
          <PendingSummaryModal
            key="pending-summary"
            onClose={() => setShowPendingSummary(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default CXCPage;