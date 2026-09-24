import React from 'react';
import {
  CreditCard
} from 'lucide-react';

export function PaymentsSection({ methods }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Formas de Pago
      </h2>
      <div className="space-y-2">
        {methods.map(method => (
          <div
            key={method.code}
            className="bg-white rounded-xl p-4 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{method.label}</p>
              <p className="text-sm text-gray-500">{method.code}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              method.is_active !== false
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {method.is_active !== false ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

