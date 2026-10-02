import React from 'react';
import { m } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

/**
 * BackButton - Botón de regreso universal de alto impacto visual y respuesta táctil.
 * Diseñado con gradiente vibrante, caja de icono con micro-interacción hacia la izquierda,
 * feedback háptico en pantallas táctiles y efecto de hundimiento/resorte (spring) al presionar.
 */
export function BackButton({
  onClick,
  label = 'Volver',
  title = 'Volver',
  variant = 'primary', // 'primary' | 'emerald' | 'amber' | 'slate' | 'rose' | 'subtle'
  size = 'md',        // 'sm' | 'md' | 'lg'
  iconOnly = false,
  className = '',
  disabled = false,
  ...props
}) {
  const handleClick = (e) => {
    if (disabled) return;
    // Vibración háptica en dispositivos táctiles / tablets POS
    try {
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(15);
      }
    } catch (_) {
      // Ignorar si no está soportado
    }
    if (onClick) onClick(e);
  };

  // Paleta de gradientes con contrastes ricos y bordes luminosos
  const variants = {
    primary:
      'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 text-white shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40 border border-blue-400/30 ring-blue-400/40 active:ring-4 active:ring-blue-300/50',
    emerald:
      'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-600 text-white shadow-md shadow-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/40 border border-emerald-400/30 ring-emerald-400/40 active:ring-4 active:ring-emerald-300/50',
    amber:
      'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:via-orange-400 hover:to-amber-500 text-white shadow-md shadow-amber-500/30 hover:shadow-lg hover:shadow-amber-500/40 border border-amber-300/30 ring-amber-400/40 active:ring-4 active:ring-amber-300/50',
    rose:
      'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 hover:from-rose-500 hover:via-pink-500 hover:to-rose-600 text-white shadow-md shadow-rose-500/30 hover:shadow-lg hover:shadow-rose-500/40 border border-rose-400/30 ring-rose-400/40 active:ring-4 active:ring-rose-300/50',
    slate:
      'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 hover:from-slate-600 hover:via-slate-700 hover:to-slate-800 text-white shadow-md shadow-slate-900/30 hover:shadow-lg border border-slate-600/40 ring-slate-400/40 active:ring-4 active:ring-slate-400/50',
    subtle:
      'bg-white hover:bg-blue-50/90 text-blue-700 border-2 border-blue-200 hover:border-blue-400 shadow-sm hover:shadow-md shadow-blue-500/10 ring-blue-300/40 active:ring-4 active:ring-blue-300/50'
  };

  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm rounded-xl gap-2',
    lg: 'px-4 py-2.5 text-sm sm:text-base rounded-2xl gap-2.5'
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const iconBoxSizes = {
    sm: 'w-5 h-5 rounded-md',
    md: 'w-6 h-6 rounded-lg',
    lg: 'w-7 h-7 rounded-lg'
  };

  const currentVariant = variants[variant] || variants.primary;
  const currentSize = sizes[size] || sizes.md;
  const iconSize = iconSizes[size] || iconSizes.md;
  const iconBoxSize = iconBoxSizes[size] || iconBoxSizes.md;

  return (
    <m.button
      type="button"
      whileHover={{ scale: 1.04, x: -1 }}
      whileTap={{ scale: 0.90 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      onClick={handleClick}
      disabled={disabled}
      title={title || label || 'Volver'}
      aria-label={title || label || 'Volver'}
      className={`group relative inline-flex items-center justify-center font-bold tracking-tight cursor-pointer select-none transition-all duration-150 active:scale-90 active:translate-y-0.5 active:brightness-90 active:shadow-inner focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${currentVariant} ${currentSize} ${className}`}
      {...props}
    >
      {/* Icono con desplazamiento animado a la izquierda al hacer hover y tap */}
      <span
        className={`flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:-translate-x-1 group-active:-translate-x-1.5 ${
          variant === 'subtle' ? 'bg-blue-100 text-blue-700' : 'bg-white/20 text-white shadow-2xs'
        } ${iconBoxSize}`}
      >
        <ArrowLeft className={`${iconSize} stroke-[2.5]`} />
      </span>

      {/* Texto descriptivo del botón */}
      {!iconOnly && label && (
        <span className="font-semibold tracking-tight whitespace-nowrap leading-none drop-shadow-2xs">
          {label}
        </span>
      )}
    </m.button>
  );
}

export default BackButton;
