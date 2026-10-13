import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { useToast } from '../../hooks/useToast';
import {
  Wallet,
  FileText,
  ChevronDown,
  ChevronUp,
  Edit2,
  Phone,
  Building2,
  Receipt,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  UserCheck
} from 'lucide-react';

export function ClientsTab({
  clients = [],
  areas = [],
  viewMode = 'cards',
  onRefresh,
  onAccountClick,
  onGlobalPay,
  onStatement,
  onEditClient
}) {
  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
          <UserCheck className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No se encontraron clientes</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No hay clientes registrados o ninguno coincide con los filtros aplicados.
        </p>
      </div>
    );
  }

  if (viewMode === 'table') {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-3">Área / Institución</th>
                <th className="py-3.5 px-3 text-right">Límite</th>
                <th className="py-3.5 px-3 text-right">Saldo Deudor</th>
                <th className="py-3.5 px-3 text-right">Disponible</th>
                <th className="py-3.5 px-3 text-center">% Consumo</th>
                <th className="py-3.5 px-3 text-center">Estado</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {clients.map((client) => {
                const balance = Number(client.current_balance || 0);
                const limit = Number(client.credit_limit || 0);
                const available = Math.max(0, limit - balance);
                const pct = limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : balance > 0 ? 100 : 0;
                const isOverLimit = limit > 0 && balance > limit;
                const isNearLimit = limit > 0 && balance >= limit * 0.8 && !isOverLimit;

                return (
                  <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Cliente */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-100/80 shrink-0">
                          {client.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{client.full_name}</p>
                          {client.phone ? (
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{client.phone}</span>
                            </p>
                          ) : (
                            <span className="text-[10px] text-slate-300">Sin teléfono</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Area */}
                    <td className="py-3 px-3">
                      {client.area_name ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                          <Building2 className="w-3 h-3" />
                          {client.area_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Particular</span>
                      )}
                    </td>

                    {/* Límite */}
                    <td className="py-3 px-3 text-right font-semibold text-slate-700">
                      Q{limit.toFixed(2)}
                    </td>

                    {/* Saldo Deudor */}
                    <td className="py-3 px-3 text-right">
                      <span className={`font-bold ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        Q{balance.toFixed(2)}
                      </span>
                    </td>

                    {/* Disponible */}
                    <td className="py-3 px-3 text-right font-medium text-slate-600">
                      Q{available.toFixed(2)}
                    </td>

                    {/* % Consumo */}
                    <td className="py-3 px-3">
                      <div className="w-24 mx-auto space-y-1">
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOverLimit
                                ? 'bg-rose-600'
                                : isNearLimit
                                ? 'bg-amber-500'
                                : balance > 0
                                ? 'bg-indigo-600'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-center font-bold text-slate-500">{pct}%</p>
                      </div>
                    </td>

                    {/* Estado Badge */}
                    <td className="py-3 px-3 text-center">
                      {balance === 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Al Día
                        </span>
                      ) : isOverLimit ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Excedido
                        </span>
                      ) : isNearLimit ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          En Riesgo
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Con Saldo
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onGlobalPay(client)}
                          disabled={balance <= 0}
                          title="Abonar al saldo"
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Abonar</span>
                        </button>

                        <button
                          onClick={() => onStatement(client)}
                          title="Estado de cuenta"
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors cursor-pointer border border-indigo-200/60"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onEditClient(client)}
                          title="Editar cliente"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Cards View (Default)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {clients.map((client) => (
        <ClientCard
          key={client.id}
          client={client}
          onAccountClick={onAccountClick}
          onGlobalPay={onGlobalPay}
          onStatement={onStatement}
          onEditClient={onEditClient}
        />
      ))}
    </div>
  );
}

function ClientCard({ client, onAccountClick, onGlobalPay, onStatement, onEditClient }) {
  const [expanded, setExpanded] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const toast = useToast();

  const balance = Number(client.current_balance || 0);
  const limit = Number(client.credit_limit || 0);
  const available = Math.max(0, limit - balance);
  const pct = limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : balance > 0 ? 100 : 0;
  const isOverLimit = limit > 0 && balance > limit;
  const isNearLimit = limit > 0 && balance >= limit * 0.8 && !isOverLimit;

  const toggleAccounts = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setLoadingAccounts(true);
    try {
      const data = await api.cxc.getClientAccounts(client.id);
      setAccounts(data || []);
      setExpanded(true);
    } catch (error) {
      toast.error('Error al cargar comandas del cliente');
    } finally {
      setLoadingAccounts(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
      {/* Top Header Card */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-sm shrink-0 shadow-2xs">
              {client.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-slate-900 text-base leading-tight">
                  {client.full_name}
                </h4>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {client.area_name ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    <Building2 className="w-3 h-3" />
                    {client.area_name}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Particular</span>
                )}
                {client.phone && (
                  <a
                    href={`tel:${client.phone}`}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 transition-colors font-medium"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{client.phone}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick Edit */}
          <button
            onClick={() => onEditClient(client)}
            title="Editar cliente"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {/* Credit Progress Bar */}
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-2 mb-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              Consumo de Crédito
            </span>
            <div className="flex items-center gap-1.5">
              {balance === 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Al Día
                </span>
              ) : isOverLimit ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Excedido
                </span>
              ) : isNearLimit ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  En Riesgo ({pct}%)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                  {pct}% Utilizado
                </span>
              )}
            </div>
          </div>

          {/* Progress bar track */}
          <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-400 ${
                isOverLimit
                  ? 'bg-rose-600'
                  : isNearLimit
                  ? 'bg-amber-500'
                  : balance > 0
                  ? 'bg-indigo-600'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Financial 3-column stats */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-2xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Límite</p>
              <p className="text-xs font-extrabold text-slate-800 mt-0.5">
                Q{limit.toFixed(0)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-2xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo Deudor</p>
              <p className={`text-xs font-extrabold mt-0.5 ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                Q{balance.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-2xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disponible</p>
              <p className="text-xs font-extrabold text-slate-700 mt-0.5">
                Q{available.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="p-4 pt-0">
        <div className="flex items-center gap-2">
          {/* Primary Abonar Button */}
          <button
            onClick={() => onGlobalPay(client)}
            disabled={balance <= 0}
            className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-600/15"
          >
            <Wallet className="w-4 h-4 stroke-[2.2]" />
            <span>Abonar Saldo</span>
          </button>

          {/* Estado de Cuenta */}
          <button
            onClick={() => onStatement(client)}
            className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-indigo-200/80 shadow-2xs"
            title="Ver / Imprimir Estado de Cuenta"
          >
            <FileText className="w-4 h-4 stroke-[2.2]" />
            <span className="hidden sm:inline">Estado de Cuenta</span>
          </button>

          {/* Expand Comandas */}
          <button
            onClick={toggleAccounts}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border ${
              expanded
                ? 'bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Ver comandas y cuentas individuales"
          >
            {loadingAccounts ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            ) : expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span className="hidden sm:inline">Ocultar</span>
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Comandas</span>
              </>
            )}
          </button>
        </div>

        {/* Accordion Content for Individual Accounts */}
        <AnimatePresence>
          {expanded && (
            <m.div
              layout
              initial={{ opacity: 0, scaleY: 0.95 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.95 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden pt-3 space-y-2 border-t border-slate-100 mt-3 origin-top"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                <span className="font-bold uppercase tracking-wider text-[10px]">
                  Cuentas Registradas ({accounts.length})
                </span>
                <span className="text-[10px] text-slate-400">Clic para ver detalle de comanda</span>
              </div>

              {accounts.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                  No hay cuentas históricas registradas para este cliente.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => onAccountClick(acc.id)}
                      className="w-full bg-slate-50 hover:bg-indigo-50/70 p-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-[11px] group-hover:border-indigo-300">
                          #{acc.check_number || acc.id}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                            {acc.check_number ? `Folio ${acc.check_number}` : `Cuenta #${acc.id}`}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(acc.created_at).toLocaleDateString()} {acc.waiter_name ? `· ${acc.waiter_name}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`text-xs font-bold ${Number(acc.balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          Q{Number(acc.balance || 0).toFixed(2)}
                        </p>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            acc.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : acc.status === 'partial'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {acc.status === 'paid' ? 'Pagada' : acc.status === 'partial' ? 'Parcial' : 'Pendiente'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
