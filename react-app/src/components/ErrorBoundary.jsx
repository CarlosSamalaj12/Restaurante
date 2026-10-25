import React, { useState, useEffect } from 'react';
import {
  WifiOff,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  Terminal,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ShieldCheck,
  ServerOff,
  Radio,
  Lightbulb
} from 'lucide-react';

function ErrorFallbackUI({ error, onReset }) {
  const [retrying, setRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => {
    const d = new Date();
    return d.toTimeString().substring(0, 5);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(d.toTimeString().substring(0, 5));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const errorMessage = error?.message || (typeof error === 'string' ? error : 'Error desconocido al cargar módulo');
  const isNetworkOrChunk =
    !navigator.onLine ||
    errorMessage.toLowerCase().includes('failed to fetch') ||
    errorMessage.toLowerCase().includes('dynamically imported module') ||
    errorMessage.toLowerCase().includes('network') ||
    errorMessage.toLowerCase().includes('chunk') ||
    errorMessage.toLowerCase().includes('timeout');

  const handleReload = () => {
    setRetrying(true);
    setTimeout(() => {
      // Forzar recarga completa evitando caché local de chunks rotos
      window.location.reload();
    }, 800);
  };

  const handleReset = () => {
    try {
      localStorage.removeItem('v1.auth.token');
    } catch (_) {}
    window.location.href = '/';
  };

  const handleCopyLogs = () => {
    const logData = [
      `[SAMA POS Error Log]`,
      `Fecha/Hora: ${new Date().toISOString()}`,
      `Online: ${navigator.onLine ? 'Sí' : 'No'}`,
      `Mensaje: ${errorMessage}`,
      `Stack: ${error?.stack || 'N/A'}`
    ].join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(logData).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Barra superior de estado de terminal */}
      <header className="w-full max-w-3xl mx-auto flex items-center justify-between py-2.5 px-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-bold tracking-wide text-white uppercase text-[11px] sm:text-xs">
            Terminal POS • Diagnóstico del Sistema
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium text-[11px]">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>{isNetworkOrChunk ? 'Sin Conexión' : 'Excepción de Pantalla'}</span>
          </div>
          <span className="text-slate-400 font-mono text-xs hidden sm:inline">{currentTime}</span>
        </div>
      </header>

      {/* Tarjeta central POS */}
      <main className="w-full max-w-3xl mx-auto my-auto py-6">
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Header de la tarjeta */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-700/70">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                {isNetworkOrChunk ? <WifiOff className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7 text-red-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Alerta del Terminal
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {isNetworkOrChunk ? 'NETWORK_OFFLINE' : 'RUNTIME_ERROR'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-0.5">
                  {isNetworkOrChunk ? 'Conexión interrumpida' : 'Algo salió mal'}
                </h1>
              </div>
            </div>

            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-700 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Espera activa</span>
            </div>
          </div>

          {/* Subtítulo descriptivo */}
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {isNetworkOrChunk
              ? 'No se pudo cargar la pantalla porque el terminal perdió la conexión a Internet o el enlace con el servidor local del restaurante.'
              : 'Se produjo un error inesperado al intentar renderizar la vista actual.'}
          </p>

          {/* Mini estado de diagnóstico */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">Red del Terminal</div>
                <div className="text-xs font-bold text-slate-200 truncate">
                  {!navigator.onLine ? 'Desconectado' : 'Sin enlace estable'}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <ServerOff className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">Servidor POS</div>
                <div className="text-xs font-bold text-slate-200 truncate">Esperando respuesta</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">Datos Locales</div>
                <div className="text-xs font-bold text-emerald-400 truncate">Comandas protegidas</div>
              </div>
            </div>
          </div>

          {/* Sección de detalles técnicos colapsables */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-700/80 overflow-hidden">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/90 hover:bg-slate-900 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-slate-200">Detalles técnicos del incidente</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>{showDetails ? 'Ocultar' : 'Ver detalle'}</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showDetails && (
              <div className="p-4 border-t border-slate-800 space-y-3 font-mono text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-red-300 break-words leading-relaxed max-h-36 overflow-y-auto">
                  {errorMessage}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleCopyLogs}
                    className="inline-flex items-center gap-1.5 text-[11px] font-sans px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado al portapapeles' : 'Copiar detalle para soporte'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción con la paleta de la aplicación */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <button
              onClick={handleReload}
              disabled={retrying}
              className="py-3.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-md active:scale-[0.98] transition-colors disabled:opacity-70 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
              <span>{retrying ? 'Reconectando...' : 'Reintentar conexión'}</span>
            </button>

            <button
              onClick={handleReload}
              className="py-3.5 px-5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2.5 border border-slate-600 active:scale-[0.98] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Recargar terminal</span>
            </button>

            <button
              onClick={handleReset}
              className="py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm flex items-center justify-center gap-2.5 border border-slate-700 active:scale-[0.98] transition-colors cursor-pointer"
            >
              <span>Reiniciar sesión</span>
            </button>
          </div>

          {/* Consejo de sala para el personal */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/80 text-slate-400">
            <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="text-slate-200">Consejo de sala:</strong> Verifica el cable Ethernet o la señal Wi-Fi.{' '}
              <span className="text-emerald-400 font-medium">
                Tus comandas y ventas locales continúan protegidas. No apagues bruscamente el terminal.
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Pie de página */}
      <footer className="w-full max-w-3xl mx-auto text-center text-xs text-slate-500 py-2">
        Restaurante POS • Sistema de Punto de Venta
      </footer>
    </div>
  );
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
  }

  handleResetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallbackUI error={this.state.error} onReset={this.handleResetError} />;
    }

    return this.props.children;
  }
}

