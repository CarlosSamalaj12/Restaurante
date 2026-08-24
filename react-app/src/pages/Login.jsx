import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Loader2, Monitor, UtensilsCrossed } from 'lucide-react';
import api from '../api';

const PIN_LENGTH = 4;

export function Login() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('pin');
  const [terminals, setTerminals] = useState([]);
  const [loadingTerminals, setLoadingTerminals] = useState(false);
  const [activeKey, setActiveKey] = useState(null);
  const [restaurantName, setRestaurantName] = useState('SamaPos');
  const [logoUrl, setLogoUrl] = useState('');
  const [loginBgUrl, setLoginBgUrl] = useState('');
  const { login, selectTerminal, user } = useAuth();
  const toast = useToast();
  const containerRef = useRef(null);

  useEffect(() => {
    loadBootstrap();
    const timer = setTimeout(() => containerRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (step === 'terminal') {
      const timer = setTimeout(() => containerRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const loadBootstrap = async () => {
    try {
      const config = await api.bootstrap();
      setTerminals(config.terminals || []);
      if (config.restaurantName) setRestaurantName(config.restaurantName);
      if (config.logoUrl) setLogoUrl(config.logoUrl);
      if (config.loginBgUrl) setLoginBgUrl(config.loginBgUrl);
    } catch (error) {
      console.error('Error loading bootstrap:', error);
    }
  };

  const handleKey = useCallback((key) => {
    if (loading) return;

    if (key === 'clear') {
      setPin('');
      return;
    }

    if (key === 'backspace') {
      setPin(prev => prev.slice(0, -1));
      return;
    }

    if (pin.length >= PIN_LENGTH) return;

    setPin(prev => prev + key);
  }, [loading, pin.length]);

  const handleKeyDown = useCallback((e) => {
    if (loading) return;
    if (step !== 'pin') return;

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      if (pin.length >= PIN_LENGTH) return;
      setPin(prev => prev + e.key);
      setActiveKey(e.key);
      setTimeout(() => setActiveKey(null), 100);
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      setPin(prev => prev.slice(0, -1));
      setActiveKey('backspace');
      setTimeout(() => setActiveKey(null), 100);
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      setPin('');
      setActiveKey('clear');
      setTimeout(() => setActiveKey(null), 100);
      return;
    }

    if (e.key === 'Enter' || e.key === 'Return') {
      e.preventDefault();
      handleSubmit();
      return;
    }
  }, [loading, pin.length, step]);

  const handleSubmit = async () => {
    if (pin.length < PIN_LENGTH) {
      toast.error('Ingresa los 4 dígitos');
      return;
    }

    setLoading(true);
    try {
      await login(pin);
      setStep('terminal');
      toast.success('Bienvenido');
    } catch (error) {
      toast.error(error.message || 'PIN inválido');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTerminal = (terminal) => {
    selectTerminal(terminal);
    toast.success(`Terminal: ${terminal.name}`);
  };

  const onKeyClick = (key) => {
    setActiveKey(key);
    setTimeout(() => setActiveKey(null), 100);
    handleKey(key);
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'];

  if (step === 'terminal') {
    const grouped = terminals.reduce((acc, t) => {
      if (!acc[t.operation_center_id]) {
        acc[t.operation_center_id] = { name: t.center_name, terminals: [] };
      }
      acc[t.operation_center_id].terminals.push(t);
      return acc;
    }, {});

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">SamaPos</h1>
            <p className="text-gray-400">Selecciona la terminal</p>
          </div>

          <div className="w-full max-w-md space-y-4">
            {Object.entries(grouped).map(([centerId, group]) => (
              <div key={centerId}>
                <h3 className="text-sm font-medium text-gray-400 mb-2">{group.name}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {group.terminals.map(terminal => (
                    <button
                      key={terminal.id}
                      onClick={() => handleSelectTerminal(terminal)}
                      className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-blue-500 transition-colors"
                    >
                      <Monitor className="w-6 h-6 text-blue-400" />
                      <span className="text-white text-sm font-medium">{terminal.name.split(' - ')[1]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const bgStyle = loginBgUrl
    ? { backgroundImage: `url(${loginBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="min-h-screen flex flex-col select-none outline-none relative"
      style={bgStyle}
      onTouchStart={(e) => e.preventDefault()}
    >
      {/* Dark overlay for readability */}
      <div className={`absolute inset-0 ${loginBgUrl ? 'bg-gradient-to-b from-black/70 via-black/60 to-black/80' : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'}`} />

      {/* Background decorations (only when no custom bg) */}
      {!loginBgUrl && (
        <>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
        </>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Logo */}
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-black/30 rounded-2xl blur-xl" />
          <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg shadow-black/30 ring-1 ring-white/15 overflow-hidden bg-black/30 backdrop-blur-sm">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={restaurantName}
                className="w-full h-full object-contain p-3"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <UtensilsCrossed className="w-9 h-9 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-0.5 tracking-tight">{restaurantName}</h1>
          <p className="text-gray-400 text-sm">Sistema de Administración</p>
          <p className="text-gray-500 text-xs mt-1">Ingresa tu código de acceso</p>
        </div>

        {/* PIN Display */}
        <div className="mb-6">
          <div className="flex justify-center gap-4">
            {[...Array(PIN_LENGTH)].map((_, i) => (
              <div
                key={i}
                className={`
                  w-12 h-14 rounded-xl flex items-center justify-center text-lg font-bold transition-all duration-200 backdrop-blur-sm
                  ${i < pin.length
                    ? 'bg-blue-500/30 border-2 border-blue-400 shadow-lg shadow-blue-500/20 scale-105'
                    : i === pin.length
                    ? 'bg-white/10 border-2 border-white/30 animate-pulse'
                    : 'bg-white/5 border-2 border-white/10'
                  }
                `}
              >
                {i < pin.length && (
                  <span className="text-blue-300 text-2xl leading-none">●</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-gray-400 text-xs mt-4 h-5 font-medium">
            {pin.length === 0 && 'Mínimo 4 dígitos'}
            {pin.length > 0 && pin.length < PIN_LENGTH && (
              <span>Faltan {PIN_LENGTH - pin.length} dígito{PIN_LENGTH - pin.length !== 1 ? 's' : ''}</span>
            )}
            {pin.length === PIN_LENGTH && (
              <span className="text-green-400">✓ Código completo</span>
            )}
          </p>
        </div>

        {/* Keyboard hint */}
        <div className="text-center mb-4">
          <span className="text-white/30 text-xs">Usa el teclado físico o la pantalla táctil</span>
        </div>
      </div>

      {/* Keypad */}
      <div className="bg-black/40 backdrop-blur-2xl rounded-t-3xl px-6 py-5 border-t border-white/10 relative z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onKeyClick(key);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onKeyClick(key);
              }}
              disabled={loading}
              className={`
                h-14 rounded-xl text-lg font-semibold transition-all duration-100 select-none
                ${key === 'clear' || key === 'backspace'
                  ? 'bg-white/5 text-gray-400 hover:bg-white/10 active:bg-white/20'
                  : 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30 shadow-sm shadow-black/20'
                }
                ${activeKey === key ? 'scale-95 brightness-125' : ''}
                ${key === '0' ? 'col-span-1' : ''}
                ${loading ? 'opacity-50 pointer-events-none' : 'cursor-pointer active:scale-95'}
              `}
            >
              {key === 'clear' ? (
                <div className="flex items-center justify-center gap-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12h18M12 5l7 7-7 7" />
                  </svg>
                  <span className="text-xs font-medium">Limpiar</span>
                </div>
              ) : key === 'backspace' ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                  <line x1="18" y1="9" x2="12" y2="15" />
                  <line x1="12" y1="9" x2="18" y2="15" />
                </svg>
              ) : (
                key
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          disabled={loading || pin.length < PIN_LENGTH}
          className={`
            w-full max-w-xs mx-auto mt-4 h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200
            ${pin.length >= PIN_LENGTH && !loading
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:from-blue-500 hover:to-blue-400 active:scale-[0.98]'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
            }
          `}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              Entrar
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
