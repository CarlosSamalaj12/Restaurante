import { useState, useRef, useEffect, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { 
  Store, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  LayoutGrid, 
  Search, 
  CheckCircle2, 
  X,
  Coffee,
  Waves,
  Wine,
  Sun,
  UtensilsCrossed,
  Sparkles,
  ArrowRight
} from 'lucide-react';

// Paleta curada de colores armoniosos y vibrantes para los centros
const PALETTES = [
  {
    bg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
    activeBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-600',
    ring: 'ring-emerald-500/20',
    dot: 'bg-emerald-500',
    glow: 'shadow-emerald-500/25'
  },
  {
    bg: 'bg-blue-50 text-blue-600 border-blue-200/80',
    activeBg: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-600',
    ring: 'ring-blue-500/20',
    dot: 'bg-blue-500',
    glow: 'shadow-blue-500/25'
  },
  {
    bg: 'bg-purple-50 text-purple-600 border-purple-200/80',
    activeBg: 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-purple-600',
    ring: 'ring-purple-500/20',
    dot: 'bg-purple-500',
    glow: 'shadow-purple-500/25'
  },
  {
    bg: 'bg-amber-50 text-amber-600 border-amber-200/80',
    activeBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-600',
    ring: 'ring-amber-500/20',
    dot: 'bg-amber-500',
    glow: 'shadow-amber-500/25'
  },
  {
    bg: 'bg-rose-50 text-rose-600 border-rose-200/80',
    activeBg: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white border-rose-600',
    ring: 'ring-rose-500/20',
    dot: 'bg-rose-500',
    glow: 'shadow-rose-500/25'
  },
  {
    bg: 'bg-cyan-50 text-cyan-600 border-cyan-200/80',
    activeBg: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-cyan-600',
    ring: 'ring-cyan-500/20',
    dot: 'bg-cyan-500',
    glow: 'shadow-cyan-500/25'
  },
  {
    bg: 'bg-teal-50 text-teal-600 border-teal-200/80',
    activeBg: 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white border-teal-600',
    ring: 'ring-teal-500/20',
    dot: 'bg-teal-500',
    glow: 'shadow-teal-500/25'
  },
];

// Asignación inteligente de icono y color temático según el nombre o índice del centro
function getCenterTheme(center, index = 0) {
  const name = (center.name || '').toLowerCase();
  
  if (name.includes('piscina') || name.includes('playa') || name.includes('aqua')) {
    return {
      Icon: Waves,
      palette: {
        bg: 'bg-cyan-50 text-cyan-600 border-cyan-200/80',
        activeBg: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-cyan-600',
        ring: 'ring-cyan-500/20',
        dot: 'bg-cyan-500',
        glow: 'shadow-cyan-500/30'
      }
    };
  }
  if (name.includes('cafeteria') || name.includes('cafe') || name.includes('coffee')) {
    return {
      Icon: Coffee,
      palette: {
        bg: 'bg-amber-50 text-amber-600 border-amber-200/80',
        activeBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-600',
        ring: 'ring-amber-500/20',
        dot: 'bg-amber-500',
        glow: 'shadow-amber-500/30'
      }
    };
  }
  if (name.includes('bar') || name.includes('lounge') || name.includes('trago')) {
    return {
      Icon: Wine,
      palette: {
        bg: 'bg-purple-50 text-purple-600 border-purple-200/80',
        activeBg: 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-purple-600',
        ring: 'ring-purple-500/20',
        dot: 'bg-purple-500',
        glow: 'shadow-purple-500/30'
      }
    };
  }
  if (name.includes('terraza') || name.includes('jardin') || name.includes('aire libre') || name.includes('patio')) {
    return {
      Icon: Sun,
      palette: {
        bg: 'bg-orange-50 text-orange-600 border-orange-200/80',
        activeBg: 'bg-gradient-to-br from-orange-500 to-amber-600 text-white border-orange-600',
        ring: 'ring-orange-500/20',
        dot: 'bg-orange-500',
        glow: 'shadow-orange-500/30'
      }
    };
  }
  if (name.includes('principal') || name.includes('central') || name.includes('salon')) {
    return {
      Icon: UtensilsCrossed,
      palette: {
        bg: 'bg-indigo-50 text-indigo-600 border-indigo-200/80',
        activeBg: 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white border-indigo-600',
        ring: 'ring-indigo-500/20',
        dot: 'bg-indigo-500',
        glow: 'shadow-indigo-500/30'
      }
    };
  }
  if (name.includes('vip') || name.includes('reservado')) {
    return {
      Icon: Sparkles,
      palette: {
        bg: 'bg-violet-50 text-violet-600 border-violet-200/80',
        activeBg: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white border-violet-600',
        ring: 'ring-violet-500/20',
        dot: 'bg-violet-500',
        glow: 'shadow-violet-500/30'
      }
    };
  }
  if (name.includes('lado a') || name.includes('zona a')) {
    return {
      Icon: Store,
      palette: {
        bg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
        activeBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-600',
        ring: 'ring-emerald-500/20',
        dot: 'bg-emerald-500',
        glow: 'shadow-emerald-500/30'
      }
    };
  }
  if (name.includes('lado b') || name.includes('zona b')) {
    return {
      Icon: Store,
      palette: {
        bg: 'bg-blue-50 text-blue-600 border-blue-200/80',
        activeBg: 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-blue-600',
        ring: 'ring-blue-500/20',
        dot: 'bg-blue-500',
        glow: 'shadow-blue-500/30'
      }
    };
  }

  // Fallback por índice para que cada centro tenga un color propio y nunca sean grises
  const p = PALETTES[index % PALETTES.length];
  return {
    Icon: Store,
    palette: {
      bg: p.bg,
      activeBg: p.activeBg,
      ring: p.ring,
      dot: p.dot,
      glow: p.glow
    }
  };
}

export function CenterSelectorBar({ centers = [], selectedCenter, onSelectCenter }) {
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Encontrar centro seleccionado actual
  const currentCenter = useMemo(() => {
    return centers.find(c => c.id === selectedCenter) || centers[0];
  }, [centers, selectedCenter]);

  // Verificar si hay desbordamiento para mostrar flechas de scroll
  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [centers]);

  // Soporte de scroll horizontal fluido con la rueda del ratón (mouse wheel)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        checkScroll();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [centers]);

  // Auto-scroll para centrar el botón del centro activo cuando cambia
  useEffect(() => {
    if (!scrollRef.current || !selectedCenter) return;
    const activeBtn = scrollRef.current.querySelector(`[data-center-id="${selectedCenter}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [selectedCenter]);

  // Cerrar menú desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleScroll = (direction) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction * 180,
      behavior: 'smooth'
    });
    setTimeout(checkScroll, 200);
  };

  const handleSelect = (id) => {
    if (onSelectCenter) onSelectCenter(id);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Filtrado para el modal / dropdown de todos los centros
  const filteredCenters = useMemo(() => {
    if (!searchQuery.trim()) return centers;
    const q = searchQuery.toLowerCase();
    return centers.filter(c => (c.name || '').toLowerCase().includes(q));
  }, [centers, searchQuery]);

  if (!centers || centers.length === 0) return null;

  const currentTheme = getCenterTheme(currentCenter, centers.findIndex(c => c.id === currentCenter?.id));
  const CurrentIcon = currentTheme.Icon;

  return (
    <div ref={containerRef} className="relative flex items-center min-w-0 max-w-full">
      {/* ─── VISTA COMPACTA PARA PANTALLAS PEQUEÑAS (MÓVIL / TABLET VERTICAL) ─── */}
      <div className="md:hidden flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="group inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl border border-slate-200/90 text-xs font-bold shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <span className={`w-5 h-5 rounded-lg flex items-center justify-center border shadow-2xs ${currentTheme.palette.bg}`}>
            <CurrentIcon className="w-3 h-3" />
          </span>
          <span className="truncate max-w-[130px]">{currentCenter?.name || 'Seleccionar'}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/60">
            {centers.length}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ─── VISTA CARROUSEL FLUIDO PARA PANTALLAS MEDIANAS Y GRANDES ─── */}
      <div className="hidden md:flex items-center max-w-[420px] lg:max-w-[560px] xl:max-w-[720px] bg-slate-100/90 rounded-2xl border border-slate-200/70 p-1 shadow-inner relative">
        {/* Flecha Scroll Izquierda con Degradado Suave */}
        {canScrollLeft && (
          <div className="absolute left-0 inset-y-0 z-10 flex items-center pl-1 pr-3 bg-gradient-to-r from-slate-100 via-slate-100/95 to-transparent rounded-l-2xl pointer-events-none">
            <button
              type="button"
              onClick={() => handleScroll(-1)}
              className="p-1.5 rounded-lg bg-white shadow-2xs hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/80 transition-all hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto"
              title="Ver centros anteriores"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Pista de Centros con Scroll Horizontal Invisible */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none scrollbar-hide no-scrollbar scroll-smooth px-1 py-0.5 min-w-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {centers.map((center, idx) => {
            const isSelected = selectedCenter === center.id;
            const theme = getCenterTheme(center, idx);
            const IconComp = theme.Icon;

            return (
              <button
                key={center.id}
                data-center-id={center.id}
                onClick={() => handleSelect(center.id)}
                className={`
                  group shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer border
                  ${isSelected 
                    ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md shadow-slate-900/25 border-slate-800 font-bold scale-[1.02]' 
                    : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 border-slate-200/60 hover:border-slate-300 shadow-2xs hover:shadow-xs hover:scale-[1.03] active:scale-95'
                  }
                `}
              >
                {/* Contenedor del Icono con Color Específico */}
                <span className={`
                  w-5 h-5 rounded-lg flex items-center justify-center border transition-transform duration-200 group-hover:scale-110 shadow-2xs shrink-0
                  ${isSelected 
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' 
                    : `${theme.palette.bg}`
                  }
                `}>
                  <IconComp className="w-3 h-3" />
                </span>

                <span>{center.name}</span>

                {/* Dot activo con micro-pulso */}
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Flecha Scroll Derecha con Degradado Suave */}
        {canScrollRight && (
          <div className="absolute right-12 inset-y-0 z-10 flex items-center pr-1 pl-3 bg-gradient-to-l from-slate-100 via-slate-100/95 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => handleScroll(1)}
              className="p-1.5 rounded-lg bg-white shadow-2xs hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/80 transition-all hover:scale-110 active:scale-95 cursor-pointer pointer-events-auto"
              title="Ver siguientes centros"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Separador y Botón "Ver Todos" / Dropdown Rápido */}
        <div className="flex items-center shrink-0 pl-1.5 border-l border-slate-200/80 ml-1">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`
              group px-2.5 py-1.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-2xs hover:scale-105 active:scale-95
              ${isOpen 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500/20' 
                : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/90'
              }
            `}
            title="Ver todos los centros de consumo"
          >
            <LayoutGrid className={`w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-12 ${isOpen ? 'text-white' : 'text-indigo-600'}`} />
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${isOpen ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'}`}>
              {centers.length}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'text-slate-400 group-hover:text-slate-700'}`} />
          </button>
        </div>
      </div>

      {/* ─── MENÚ DESPLEGABLE / MODAL FLOTANTE DE TODOS LOS CENTROS ─── */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 md:left-auto md:right-0 md:translate-x-0 w-80 sm:w-96 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-950/20 border border-slate-200/90 p-4 z-50 overflow-hidden"
          >
            {/* Cabecera con Gradiente Suave y Badge */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 ring-2 ring-indigo-50">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm leading-tight">Centros de Consumo</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {centers.length} salones y áreas activas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                title="Cerrar ventana"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Buscador Rápido con Icono y Halo de Foco */}
            {centers.length > 4 && (
              <div className="my-3 relative">
                <Search className="w-4 h-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar salón o centro..."
                  className="w-full pl-10 pr-8 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Listado en Tarjetas con Efectos y Colores Individuales */}
            <div className="mt-2 space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {filteredCenters.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">Sin coincidencias</p>
                  <p className="text-[11px] text-slate-400">Prueba con otro término de búsqueda</p>
                </div>
              ) : (
                filteredCenters.map((center, idx) => {
                  const isSelected = selectedCenter === center.id;
                  const theme = getCenterTheme(center, idx);
                  const IconComp = theme.Icon;

                  return (
                    <button
                      key={center.id}
                      type="button"
                      onClick={() => handleSelect(center.id)}
                      className={`
                        group relative w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer
                        ${isSelected 
                          ? 'bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-purple-50/50 border-indigo-300/90 shadow-xs ring-1 ring-indigo-500/20' 
                          : 'bg-white hover:bg-slate-50/90 border-slate-100 hover:border-slate-200 shadow-2xs hover:shadow-xs hover:scale-[1.01]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Contenedor Cuadrado con Icono Minimalista a Color */}
                        <div className={`
                          w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-300 shadow-2xs
                          group-hover:scale-110 group-hover:rotate-3
                          ${isSelected 
                            ? `${theme.palette.activeBg} shadow-md ${theme.palette.glow}` 
                            : `${theme.palette.bg}`
                          }
                        `}>
                          <IconComp className="w-5 h-5" />
                        </div>

                        {/* Nombre y Detalle */}
                        <div className="truncate">
                          <p className={`text-xs font-bold truncate transition-colors ${isSelected ? 'text-indigo-950 font-black' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                            {center.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Centro #{center.id}
                          </p>
                        </div>
                      </div>

                      {/* Insignia de Activo / Flecha de Selección */}
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-indigo-700 bg-white border border-indigo-200/90 px-2.5 py-1 rounded-xl shadow-2xs shrink-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Activo</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                        </span>
                      ) : (
                        <div className="w-7 h-7 rounded-xl bg-slate-100/80 group-hover:bg-indigo-50 group-hover:text-indigo-600 text-slate-400 flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 shadow-2xs shrink-0">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
