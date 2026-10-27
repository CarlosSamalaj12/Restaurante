import { Check } from 'lucide-react';

export function PaymentSuccessView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg">
        <Check className="w-10 h-10 stroke-[3]" />
      </div>
      <div>
        <h3 className="text-2xl font-black text-slate-900">¡Cobro Registrado Exitosamente!</h3>
        <p className="text-sm text-slate-500 mt-1">La comanda ha sido liquidada en el sistema.</p>
      </div>
    </div>
  );
}
