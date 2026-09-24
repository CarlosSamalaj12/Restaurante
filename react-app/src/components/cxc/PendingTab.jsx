import React from 'react';
import { useToast } from '../../hooks/useToast';
import {
  Users,
  DollarSign
} from 'lucide-react';

export function PendingTab({ pending, onRefresh }) {
  const toast = useToast();

  return (
    <div className="space-y-3">
      {pending.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay cuentas por cobrar</p>
        </div>
      ) : (
        pending.map(item => (
          <div key={item.client_id} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.full_name}</p>
                <p className="text-sm text-gray-500">
                  {item.pending_accounts} cuenta(s) pendiente(s)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-xs text-gray-500">Límite</p>
                <p className="font-semibold">Q{Number(item.credit_limit || 0).toFixed(0)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-xs text-gray-500">Saldo</p>
                <p className="font-semibold text-amber-600">Q{Number(item.current_balance || 0).toFixed(0)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-xs text-gray-500">Disponible</p>
                <p className="font-semibold text-green-600">Q{Number(item.available_credit || 0).toFixed(0)}</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

