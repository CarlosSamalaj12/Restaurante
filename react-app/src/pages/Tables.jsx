import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowLeft,
  Users,
  Plus,
  Loader2,
  CheckCircle,
  Clock,
  Circle,
  LayoutGrid,
  UtensilsCrossed
} from 'lucide-react';

export function Tables({ onBack, onSelectTable, centers }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const toast = useToast();
  const { user, selectedTerminal, restaurantName, logoUrl } = useAuth();

  useEffect(() => {
    if (selectedTerminal?.operation_center_id && !selectedCenter) {
      setSelectedCenter(selectedTerminal.operation_center_id);
    } else if (user?.operation_center_id && !selectedCenter) {
      setSelectedCenter(user.operation_center_id);
    }
  }, [user, selectedTerminal]);

  useEffect(() => {
    loadTables();
  }, [selectedCenter]);

  const loadTables = async () => {
    setLoading(true);
    try {
      const data = await api.getTables(selectedCenter);
      setTables(data);
    } catch (error) {
      toast.error('Error al cargar mesas');
    } finally {
      setLoading(false);
    }
  };

  const handleTablePress = async (table) => {
    setSelectedTable(table);
    try {
      const accts = await api.getAccounts(table.id);
      setAccounts(accts);
      setShowNewAccount(true);
    } catch (error) {
      toast.error('Error al cargar cuentas');
    }
  };

  const handleCreateAccount = async () => {
    if (!selectedTable) return;
    
    try {
      const result = await api.createAccount(selectedTable.id, {
        waiterId: user?.id || 1,
        guestCount: selectedTable.seats,
        centerId: selectedCenter
      });
      toast.success(`Cuenta ${result.checkNumber} creada`);
      setShowNewAccount(false);
      setSelectedTable(null);
      loadTables();
      onSelectTable(result.accountId, selectedTable.code, selectedTable.id);
    } catch (error) {
      toast.error(error.message || 'Error al crear cuenta');
    }
  };

  const handleSelectAccount = (account) => {
    setShowNewAccount(false);
    onSelectTable(account.id, selectedTable.code, selectedTable.id);
  };

  // Group tables by area
  const tablesByArea = tables.reduce((acc, table) => {
    const areaKey = `${table.area_id || 'unknown'}-${table.area_name || 'Sin área'}`;
    const areaName = table.area_name || 'Sin área';
    if (!acc[areaKey]) acc[areaKey] = { name: areaName, tables: [] };
    acc[areaKey].tables.push(table);
    return acc;
  }, {});

  const freeTables = tables.filter(t => t.open_accounts === 0).length;
  const busyTables = tables.filter(t => t.open_accounts > 0).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </motion.button>
            <div className="flex-1">
              <h1 className="font-semibold text-gray-900">Mesas</h1>
              <p className="text-xs text-gray-500">
                {tables.length} mesas · {busyTables} ocupadas
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary-500 to-primary-600 shadow-sm">
              {logoUrl ? (
                <img src={logoUrl} alt={restaurantName} className="w-full h-full object-contain p-1" />
              ) : (
                <UtensilsCrossed className="w-5 h-5 text-white" />
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-4 pb-3 flex gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-xs font-medium text-emerald-700">{freeTables} libres</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-xs font-medium text-red-700">{busyTables} ocupadas</span>
          </div>
        </div>

        {/* Center Filter */}
        {centers?.length > 0 && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCenter(null)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                ${selectedCenter === null
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600'
                }
              `}
            >
              Todas
            </motion.button>
            {centers.map(center => (
              <motion.button
                key={center.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCenter(center.id)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                  ${selectedCenter === center.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}
              >
                {center.name}
              </motion.button>
            ))}
          </div>
        )}
      </header>

      {/* Tables Grid */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {Object.entries(tablesByArea).map(([areaKey, { name: areaName, tables: areaTables }]) => (
              <motion.div
                key={areaKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-6"
              >
                {/* Area Header */}
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {areaName}
                  </h2>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">{areaTables.length} mesas</span>
                </div>

                {/* Tables Grid */}
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                  {areaTables.map((table, index) => {
                    const isBusy = table.open_accounts > 0;
                    const hasMultipleAccounts = table.open_accounts > 1;
                    
                    return (
                      <motion.button
                        key={table.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: index * 0.03, type: "spring", stiffness: 200 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleTablePress(table)}
                        className={`
                          relative flex flex-col items-center justify-center p-4 rounded-2xl
                          transition-all duration-300 shadow-sm hover:shadow-lg
                          ${isBusy
                            ? 'bg-red-50 border-2 border-red-300 shadow-red-200'
                            : 'bg-gradient-to-b from-emerald-100 via-emerald-50 to-green-100 border-2 border-emerald-300 shadow-emerald-200'
                          }
                        `}
                      >
                        {/* Table Visual Shape */}
                        <div className={`
                          w-14 h-10 rounded-lg flex items-center justify-center mb-2
                          ${isBusy
                            ? 'bg-red-400 shadow-md'
                            : 'bg-gradient-to-br from-emerald-300 to-green-400 shadow-md'
                          }
                        `}>
                          <div className="w-10 h-1 bg-white/60 rounded-full mb-1" />
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                            <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                            <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                          </div>
                        </div>
                        
                        {/* Table Code */}
                        <span className={`
                          text-lg font-bold tracking-wide
                          ${isBusy ? 'text-red-700' : 'text-emerald-700'}
                        `}>
                          {table.code}
                        </span>
                        
                        {/* Seats */}
                        <div className={`
                          flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs
                          ${isBusy ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}
                        `}>
                          <Users className="w-3 h-3" />
                          <span className="font-medium">{table.seats}</span>
                        </div>

                        {/* Waiter name for busy tables */}
                        {isBusy && table.waiter_name && (
                          <div className="mt-2 pt-2 border-t border-red-200/50 w-full">
                            <p className="text-[10px] text-red-600 font-medium truncate text-center">
                              {table.waiter_name}
                            </p>
                          </div>
                        )}

                        {/* Multiple accounts badge */}
                        {hasMultipleAccounts && (
                          <div className={`
                            absolute -top-2 -right-2 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center shadow-lg
                            ${isBusy ? 'animate-bounce' : ''}
                          `}>
                            <span className="text-[10px] font-bold text-white">
                              {table.open_accounts}
                            </span>
                          </div>
                        )}

                        {/* Status indicator */}
                        <div className={`
                          absolute -bottom-1 w-3 h-3 rounded-full border-2 border-white
                          ${isBusy ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}
                        `} />
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Empty state */}
        {!loading && tables.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LayoutGrid className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Sin mesas</h3>
            <p className="text-sm text-gray-500">No hay mesas configuradas para este centro</p>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2">
        <div className="flex justify-around">
          <button 
            onClick={() => onBack()}
            className="flex flex-col items-center gap-0.5 p-2 text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-medium">Inicio</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 p-2 text-primary-600">
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-medium">Mesas</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 p-2 text-gray-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[10px] font-medium">Caja</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 p-2 text-gray-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-medium">Config</span>
          </button>
        </div>
      </nav>

      {/* Account Selection Modal */}
      <AnimatePresence>
        {showNewAccount && selectedTable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowNewAccount(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[70vh] overflow-hidden"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-700">{selectedTable.code}</span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Mesa {selectedTable.code}</h2>
                    <p className="text-sm text-gray-500">{selectedTable.area_name} · {selectedTable.seats} asientos</p>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 space-y-3 max-h-[40vh] overflow-y-auto">
                {/* Existing Accounts */}
                {accounts.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Cuentas Abiertas
                    </h3>
                    {accounts.map(account => (
                      <motion.button
                        key={account.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectAccount(account)}
                        className="w-full p-3 bg-amber-50 rounded-xl flex items-center justify-between mb-2 border border-amber-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-900 text-sm">{account.check_number}</p>
                            <p className="text-xs text-gray-500">{account.guest_count} invitados</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-amber-600">Q {account.totals?.total?.toFixed(2) || '0.00'}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* New Account Button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateAccount}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Cuenta
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
