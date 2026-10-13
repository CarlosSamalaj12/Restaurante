import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import {
  Loader2,
  Monitor,
  ArrowRight,
  Delete,
  Trash2,
  Lock,
  Check,
  Laptop
} from 'lucide-react';
import api from '../api';
import { InstallPwaButton } from '../components/InstallPwaButton';

const PIN_LENGTH = 6;

export function Login() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('pin');
  const [terminals, setTerminals] = useState([]);
  const [activeKey, setActiveKey] = useState(null);
  const [restaurantName, setRestaurantName] = useState('Mi Restaurante');
  const [logoUrl, setLogoUrl] = useState('');
  const [loginBgUrl, setLoginBgUrl] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const { login, selectTerminal } = useAuth();
  const toast = useToast();
  const containerRef = useRef(null);

  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const submitPin = async (pinValue) => {
    const clean = String(pinValue || '').trim();
    if (clean.length !== PIN_LENGTH) {
      toast.error(`Ingresa los ${PIN_LENGTH} dígitos`);
      return;
    }

    setLoading(true);
    try {
      await login(clean);
      setStep('terminal');
      toast.success('Bienvenido');
    } catch (error) {
      toast.error(error.message || 'PIN inválido');
      setPin('');
    } finally {
      setLoading(false);
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

    const nextPin = pin + key;
    setPin(nextPin);

    // Auto-submit al completar el 6to dígito
    if (nextPin.length === PIN_LENGTH) {
      setTimeout(() => submitPin(nextPin), 60);
    }
  }, [loading, pin]);

  const handleKeyDown = useCallback((e) => {
    if (loading) return;
    if (step !== 'pin') return;

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      if (pin.length >= PIN_LENGTH) return;
      const nextPin = pin + e.key;
      setPin(nextPin);
      setActiveKey(e.key);
      setTimeout(() => setActiveKey(null), 100);

      // Auto-submit al completar el 6to dígito
      if (nextPin.length === PIN_LENGTH) {
        setTimeout(() => submitPin(nextPin), 60);
      }
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      setPin(prev => prev.slice(0, -1));
      setActiveKey('backspace');
      setTimeout(() => setActiveKey(null), 100);
      return;
    }

    if (e.key === 'Delete' || e.key === 'Escape') {
      e.preventDefault();
      setPin('');
      setActiveKey('clear');
      setTimeout(() => setActiveKey(null), 100);
      return;
    }

    if (e.key === 'Enter' || e.key === 'Return') {
      e.preventDefault();
      if (pin.length === PIN_LENGTH) {
        submitPin(pin);
      }
      return;
    }
  }, [loading, pin, step]);

  const handleSelectTerminal = (terminal) => {
    selectTerminal(terminal);
    toast.success(`Terminal: ${terminal.name}`);
  };

  const onKeyClick = (key) => {
    setActiveKey(key);
    setTimeout(() => setActiveKey(null), 100);
    handleKey(key);
  };

  // Cálculo de hora, turno y fecha para la tarjeta izquierda
  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const timeString = `${hours}:${minutes}`;

  const getShiftName = (h) => {
    if (h >= 6 && h < 12) return 'SERVICIO MAÑANA';
    if (h >= 12 && h < 18) return 'SERVICIO ALMUERZO';
    return 'SERVICIO NOCHE';
  };
  const shiftName = getShiftName(currentTime.getHours());

  const dateString = currentTime.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).toUpperCase();

  // Pantalla de selección de terminal
  if (step === 'terminal') {
    const grouped = terminals.reduce((acc, t) => {
      if (!acc[t.operation_center_id]) {
        acc[t.operation_center_id] = { name: t.center_name, terminals: [] };
      }
      acc[t.operation_center_id].terminals.push(t);
      return acc;
    }, {});

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 flex flex-col text-slate-100 select-none">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold text-white mb-1.5 tracking-tight font-mono">SamaPos</h1>
            <p className="text-slate-400 text-sm">Selecciona la terminal de trabajo para continuar</p>
          </div>

          <div className="w-full max-w-md space-y-4">
            {Object.entries(grouped).map(([centerId, group]) => (
              <div key={centerId} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{group.name}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {group.terminals.map(terminal => (
                    <button
                      key={terminal.id}
                      onClick={() => handleSelectTerminal(terminal)}
                      className="bg-[#1c222b] border border-white/10 rounded-xl p-3.5 flex flex-col items-center gap-2 hover:border-emerald-500 hover:bg-[#252c38] transition-all shadow-md group cursor-pointer"
                    >
                      <Monitor className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                      <span className="text-white text-xs font-semibold text-center line-clamp-1">
                        {terminal.name.includes(' - ') ? terminal.name.split(' - ')[1] : terminal.name}
                      </span>
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

  const bgImage = loginBgUrl || '/cocktail-bar-bg.jpg';

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="min-h-screen w-full flex select-none outline-none bg-[#090c10] text-slate-100 overflow-hidden font-sans"
    >
      {/* ======================================================== */}
      {/* 1. PANEL IZQUIERDO (SPLIT SCREEN CON FOTO DE COCTEL/BAR) */}
      {/* ======================================================== */}
      <div
        className="hidden md:flex md:w-[54%] lg:w-[58%] xl:w-[62%] relative flex-col justify-between p-8 lg:p-12 overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundPosition: 'center 40%',
        }}
      >
        {/* Velo sutil ambiental para dar profundidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60 pointer-events-none" />

        {/* Top-Left: Badge de Terminal y Sucursal */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-200">
              TERMINAL ACTIVO
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">
              #04
            </span>
          </div>
          <span className="text-xs text-slate-200/90 font-medium drop-shadow-md">
            Sucursal Principal
          </span>
        </div>

        {/* Bottom-Left: Tarjeta Glassmorphism con Hora, Turno, Fecha y SamaPos */}
        <div className="relative z-10 max-w-sm">
          <div className="bg-black/45 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight font-mono">
                {timeString}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {shiftName}
              </span>
            </div>
            <div className="text-[11px] lg:text-xs font-semibold uppercase tracking-wider text-slate-300 mt-1 mb-3">
              {dateString}
            </div>
            <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
              <span className="text-white font-extrabold text-base tracking-wide font-mono">
                SamaPos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. PANEL DERECHO (TECLADO NUMÉRICO Y CÓDIGO DE ACCESO)   */}
      {/* ======================================================== */}
      <div className="w-full md:w-[46%] lg:w-[42%] xl:w-[38%] bg-[#0b0e14] flex flex-col justify-between items-center py-6 px-4 sm:px-8 relative z-10 min-h-screen overflow-y-auto">
        {/* Barra superior con instalador PWA */}
        <div className="w-full flex justify-end mb-2">
          <InstallPwaButton variant="login" />
        </div>

        {/* Cabecera / Logo / Nombre de Restaurante */}
        <div className="w-full flex flex-col items-center text-center mt-1 sm:mt-2">
          {/* Logo Card estilo {cs} */}
          <div className="w-15 h-15 sm:w-16 sm:h-16 rounded-2xl bg-white shadow-xl shadow-black/60 flex items-center justify-center p-2 mb-3 transition-transform hover:scale-105">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={restaurantName}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="font-bold text-slate-950 text-2xl font-mono tracking-tighter">
                &#123;cs&#125;
              </div>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {restaurantName || 'Mi Restaurante'}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Sistema de Administración
          </p>

          {/* Pill con icono de candado */}
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161a22] border border-white/10 text-slate-300 text-xs">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Ingresa tu código de acceso</span>
          </div>
        </div>

        {/* Sección de PIN y Teclado Numérico */}
        <div className="w-full max-w-[320px] flex flex-col items-center my-auto py-3">
          {/* 6 Casillas de PIN con cursor parpadeante estilo referencia */}
          <div className="flex justify-center gap-1.5 sm:gap-2 mb-2 w-full">
            {[...Array(PIN_LENGTH)].map((_, i) => {
              const isFilled = i < pin.length;
              const isCurrent = i === pin.length;

              return (
                <div
                  key={i}
                  className={`
                    w-11 h-14 sm:w-12 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-150
                    ${isFilled
                      ? 'bg-[#18202d] border-2 border-white/40 shadow-md shadow-black/40 scale-102'
                      : isCurrent
                      ? 'bg-[#141a24] border-2 border-white/50 shadow-sm'
                      : 'bg-[#12161f] border border-white/10'
                    }
                  `}
                >
                  {isFilled ? (
                    <span className="w-3 h-3 rounded-full bg-white shadow-sm shadow-white/80" />
                  ) : isCurrent ? (
                    <span className="text-white/80 animate-pulse font-mono text-xl sm:text-2xl font-light">
                      |
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Leyendas informativas */}
          <div className="text-center mb-4">
            <p className="text-slate-400 text-xs font-medium">
              {pin.length === 0 && 'Mínimo 6 dígitos'}
              {pin.length > 0 && pin.length < PIN_LENGTH && (
                <span>Faltan {PIN_LENGTH - pin.length} dígitos</span>
              )}
              {pin.length === PIN_LENGTH && (
                <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Verificando código...
                </span>
              )}
            </p>
            <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[11px] mt-1">
              <Laptop className="w-3 h-3 text-slate-400" />
              <span>Usa el teclado físico o la pantalla táctil</span>
            </div>
          </div>

          {/* Teclado numérico 3x4 */}
          <div className="grid grid-cols-3 gap-2.5 w-full">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onKeyClick(num);
                }}
                disabled={loading}
                className={`
                  h-13 sm:h-14 rounded-2xl text-xl font-bold transition-all duration-100 select-none cursor-pointer
                  bg-[#191f2b] hover:bg-[#232b3b] active:bg-[#2b3548] text-white border border-white/5 shadow-sm active:scale-95
                  ${activeKey === num ? 'scale-95 bg-[#2b3548] ring-2 ring-white/30' : ''}
                  ${loading ? 'opacity-50 pointer-events-none' : ''}
                `}
              >
                {num}
              </button>
            ))}

            {/* Fila 4: Limpiar, 0, Borrar */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onKeyClick('clear');
              }}
              disabled={loading || pin.length === 0}
              className={`
                h-13 sm:h-14 rounded-2xl text-xs font-semibold transition-all duration-100 select-none cursor-pointer flex items-center justify-center gap-1.5
                bg-[#151a24] hover:bg-[#1d2432] text-slate-300 border border-white/5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
                ${activeKey === 'clear' ? 'scale-95 bg-[#252d3d]' : ''}
              `}
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Limpiar</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onKeyClick('0');
              }}
              disabled={loading}
              className={`
                h-13 sm:h-14 rounded-2xl text-xl font-bold transition-all duration-100 select-none cursor-pointer
                bg-[#191f2b] hover:bg-[#232b3b] active:bg-[#2b3548] text-white border border-white/5 shadow-sm active:scale-95
                ${activeKey === '0' ? 'scale-95 bg-[#2b3548] ring-2 ring-white/30' : ''}
                ${loading ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              0
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onKeyClick('backspace');
              }}
              disabled={loading || pin.length === 0}
              className={`
                h-13 sm:h-14 rounded-2xl text-sm font-semibold transition-all duration-100 select-none cursor-pointer flex items-center justify-center
                bg-[#151a24] hover:bg-[#1d2432] text-slate-300 border border-white/5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
                ${activeKey === 'backspace' ? 'scale-95 bg-[#252d3d]' : ''}
              `}
              title="Borrar dígito"
            >
              <Delete className="w-5 h-5 text-slate-300" />
            </button>
          </div>

          {/* Botón Entrar */}
          <div className="w-full mt-3">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                submitPin(pin);
              }}
              disabled={loading || pin.length < PIN_LENGTH}
              className={`
                w-full h-12 sm:h-13 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-150 border
                ${pin.length === PIN_LENGTH && !loading
                  ? 'bg-[#222938] hover:bg-[#2c3547] text-white border-white/20 shadow-lg cursor-pointer active:scale-[0.98]'
                  : 'bg-[#141822] text-slate-500 border-white/5 cursor-not-allowed'
                }
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer: ¿Olvidaste tu PIN? y Servidor Online */}
        <div className="w-full max-w-[320px] flex items-center justify-between text-xs text-slate-400 py-2 border-t border-white/5">
          <button
            type="button"
            onClick={() => toast.info('Si olvidaste tu código de acceso, contacta al administrador del sistema.')}
            className="hover:text-slate-200 transition-colors text-xs font-normal"
          >
            ¿Olvidaste tu PIN?
          </button>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span>Servidor Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
