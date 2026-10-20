// react-app/src/components/public_menu/JoinAccountModal.jsx
// Modal para vincular comensal a cuenta existente en mesa o abrir cuenta individual

import React from 'react';
import { Users, PlusCircle, Clock } from 'lucide-react';

export function JoinAccountModal({
  isOpen,
  tableInfo,
  guestAliasInput,
  onGuestAliasChange,
  onJoinAccount,
  onCreateNewAccount,
}) {
  if (!isOpen || !tableInfo?.hasOpenAccounts) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#111726] border border-slate-700/80 p-5 shadow-2xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="text-base font-black text-white mb-1">
          Mesa {tableInfo.tableCode} Ocupada
        </h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Hay cuentas abiertas en esta mesa. Puedes unirte a la cuenta de tu grupo o abrir tu propia comanda individual.
        </p>

        <div className="mb-4 text-left">
          <label className="text-[11px] font-bold text-slate-300 block mb-1">
            Tu nombre o alias:
          </label>
          <input
            type="text"
            value={guestAliasInput}
            onChange={(e) => onGuestAliasChange(e.target.value)}
            placeholder="Ej: Carlos S."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto no-scrollbar">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left px-1">
            Cuentas en la mesa:
          </div>
          {tableInfo.openAccounts?.map((acc) => (
            <button
              key={acc.accountId}
              onClick={() => onJoinAccount(acc.accountId)}
              className="w-full p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left flex items-center justify-between transition group"
            >
              <div>
                <p className="text-xs font-black text-white group-hover:text-blue-400 transition">
                  Cuenta #{acc.checkNumber || acc.accountId}
                </p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>Abierta {new Date(acc.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </p>
              </div>
              <span className="text-[11px] font-bold text-blue-400 group-hover:translate-x-0.5 transition">
                Unirme →
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onCreateNewAccount}
          className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Abrir Cuenta Nueva Individual</span>
        </button>
      </div>
    </div>
  );
}
