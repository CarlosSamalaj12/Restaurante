import { Banknote, CreditCard, Smartphone, BedDouble } from 'lucide-react';

export const DEFAULT_METHODS = [
  { code: 'cash', label: 'Efectivo', icon: Banknote, color: 'bg-emerald-600', activeBorder: 'border-emerald-500', lightBg: 'bg-emerald-50 text-emerald-800' },
  { code: 'card', label: 'Tarjeta', icon: CreditCard, color: 'bg-blue-600', activeBorder: 'border-blue-500', lightBg: 'bg-blue-50 text-blue-800' },
  { code: 'transfer', label: 'Transferencia', icon: Smartphone, color: 'bg-violet-600', activeBorder: 'border-violet-500', lightBg: 'bg-violet-50 text-violet-800' },
  { code: 'cxc', label: 'Crédito Folio', icon: CreditCard, color: 'bg-amber-600', activeBorder: 'border-amber-500', lightBg: 'bg-amber-50 text-amber-800' },
  { code: 'room_charge', label: 'Cargo a Habitación', icon: BedDouble, color: 'bg-teal-600', activeBorder: 'border-teal-500', lightBg: 'bg-teal-50 text-teal-800' },
];

export const BILLS = [5, 10, 20, 50, 100, 200];
export const COINS = [0.25, 0.50, 1.00];
