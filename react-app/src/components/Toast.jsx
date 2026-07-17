import { useToast } from '../hooks/useToast';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function Toast() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  const getStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-800 text-white';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${getStyles(toast.type)} px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 pointer-events-auto animate-slide-up`}
        >
          {getIcon(toast.type)}
          <span className="flex-1 font-medium">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
