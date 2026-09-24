import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ToastActionContext = createContext(null);
const ToastStateContext = createContext([]);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const success = useCallback((msg) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg) => addToast(msg, 'error'), [addToast]);
  const info = useCallback((msg) => addToast(msg, 'info'), [addToast]);

  // Actions are completely stable and never change reference when toasts change
  const actions = useMemo(() => ({ success, error, info }), [success, error, info]);

  return (
    <ToastActionContext.Provider value={actions}>
      <ToastStateContext.Provider value={toasts}>
        {children}
      </ToastStateContext.Provider>
    </ToastActionContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastActionContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function useToastState() {
  return useContext(ToastStateContext);
}

