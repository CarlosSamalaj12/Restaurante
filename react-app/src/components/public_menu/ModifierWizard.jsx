// react-app/src/components/public_menu/ModifierWizard.jsx
// Wizard interactivo de modificadores: Cuadrícula táctil de 2 columnas, auto-avance y notas de comanda optimizadas

import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Coffee,
  Flame,
  Snowflake,
  Utensils,
  ChefHat
} from 'lucide-react';

const QUICK_NOTES = [
  'Sin cebolla',
  'Salsa aparte',
  'Término medio',
  'Bien cocido',
  'Poco picante',
  'Sin picante',
  'Para llevar',
  'Extra servilletas'
];

export function ModifierWizard({ groups = [], selectedModifiers = [], onChangeModifiers, notes = '', onChangeNotes }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const autoAdvanceTimerRef = useRef(null);

  // Limpiar temporizador al desmontar
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  if (!groups || groups.length === 0) return null;

  const currentGroup = groups[currentStep] || groups[0];
  const min = Math.max(0, Number(currentGroup.min_select || 0));
  const max = Math.max(1, Number(currentGroup.max_select || 1));
  const isSingle = max === 1;

  const currentGroupSelected = selectedModifiers.filter((m) => m.group_id === currentGroup.id);
  const count = currentGroupSelected.length;
  const isStepValid = count >= min;
  const isStepComplete = isSingle ? count === 1 : count === max;

  // Disparador de auto-avance suave al siguiente paso
  const triggerAutoAdvance = () => {
    if (currentStep < groups.length - 1) {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      autoAdvanceTimerRef.current = setTimeout(() => {
        setCurrentStep((prev) => Math.min(prev + 1, groups.length - 1));
      }, 230);
    }
  };

  const toggleOption = (option) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }

    if (isSingle) {
      const next = selectedModifiers.filter((m) => m.group_id !== currentGroup.id);
      onChangeModifiers([...next, { ...option, group_id: currentGroup.id }]);
      triggerAutoAdvance();
    } else {
      const alreadySelected = selectedModifiers.some((m) => m.id === option.id);
      if (alreadySelected) {
        onChangeModifiers(selectedModifiers.filter((m) => m.id !== option.id));
      } else {
        if (count < max) {
          const next = [...selectedModifiers, { ...option, group_id: currentGroup.id }];
          onChangeModifiers(next);
          // Si al agregar esta opción se completa el tope máximo permitido, auto-avanzar
          if (count + 1 === max) {
            triggerAutoAdvance();
          }
        }
      }
    }
  };

  const goToStep = (step) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    setCurrentStep(step);
  };

  // Agregar / remover atajo rápido de comanda
  const toggleQuickNote = (noteText) => {
    if (!onChangeNotes) return;
    const current = (notes || '').trim();
    if (!current) {
      onChangeNotes(noteText);
    } else if (current.includes(noteText)) {
      const regex = new RegExp(`(^|,\\s*)${noteText}(,\\s*|$)`, 'gi');
      const updated = current.replace(regex, ', ').replace(/^,\s*|,\s*$/g, '').trim();
      onChangeNotes(updated);
    } else {
      onChangeNotes(`${current}, ${noteText}`);
    }
  };

  // Helper para mostrar ícono sugerido según nombre de la opción
  const getOptionIcon = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('caliente') || lower.includes('hot') || lower.includes('café')) {
      return <Coffee className="w-4 h-4" />;
    }
    if (lower.includes('frío') || lower.includes('iced') || lower.includes('hielo') || lower.includes('helado')) {
      return <Snowflake className="w-4 h-4" />;
    }
    if (lower.includes('picante') || lower.includes('término') || lower.includes('asado') || lower.includes('carne')) {
      return <Flame className="w-4 h-4" />;
    }
    return <Utensils className="w-4 h-4" />;
  };

  return (
    <div className="space-y-3">
      {/* Encabezado del Paso con Contador Dinámico */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="min-w-0">
            <span className="text-white font-bold text-sm block truncate">
              Paso {currentStep + 1} de {groups.length}:{' '}
              <span className="text-blue-400 font-extrabold">{currentGroup.name}</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {isSingle ? 'Elige 1 sola opción' : `Selecciona hasta ${max} opciones`}
            </span>
          </div>

          {/* Badge interactivo en vivo: Mín, Máx y Seleccionados con cambio de color automático */}
          <div
            className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all duration-200 shadow-sm shrink-0 ${
              count < min
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-amber-500/10'
                : isStepComplete
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
                : 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-blue-500/10'
            }`}
          >
            {count < min ? (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span>
              <strong>{count}</strong> de <strong>{max}</strong>
              <span className="opacity-75 text-[10px] ml-1">
                (Mín: {min})
              </span>
            </span>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300 shadow-sm shadow-blue-500/50"
            style={{ width: `${((currentStep + 1) / groups.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Cuadrícula Táctil Ergonómica de 2 Columnas para Modificadores */}
      <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-0.5">
        {(currentGroup.options || []).map((option, optIdx) => {
          const isSelected = selectedModifiers.some((m) => m.id === option.id);
          const priceDelta = Number(option.price_delta || 0);
          const isRecommended = option.is_recommended || optIdx === 0;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleOption(option)}
              className={`p-3 rounded-2xl text-left flex flex-col justify-between transition-all duration-200 cursor-pointer min-h-[76px] relative active:scale-95 ${
                isSelected
                  ? 'border-2 border-blue-500 bg-blue-950/40 shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/30'
                  : 'border border-slate-800/90 bg-slate-900/70 hover:bg-slate-900 hover:border-slate-700/80'
              }`}
            >
              <div className="flex items-start justify-between gap-1.5 w-full">
                {/* Ícono representativo */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                      : 'bg-slate-800/80 text-slate-400'
                  }`}
                >
                  {getOptionIcon(option.name)}
                </div>

                {/* Selector circular o check */}
                <div className="shrink-0 pt-0.5">
                  {isSingle ? (
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-blue-600 border-2 border-blue-400 shadow-xs'
                          : 'border-2 border-slate-700 bg-transparent'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  ) : (
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-blue-600 border-2 border-blue-400 shadow-xs'
                          : 'border-2 border-slate-700 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </div>
                  )}
                </div>
              </div>

              {/* Nombre y Precio */}
              <div className="mt-2 min-w-0 w-full">
                <span className="font-bold text-xs sm:text-sm text-white block truncate leading-tight">
                  {option.name}
                </span>

                <div className="flex items-center justify-between mt-1 text-[11px]">
                  {priceDelta > 0 ? (
                    <span className="font-extrabold text-emerald-400 font-mono">
                      +Q{priceDelta.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[10px] font-medium">Incluido</span>
                  )}

                  {isRecommended && isSelected && (
                    <span className="text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1 rounded">
                      ★ Top
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sección de Notas estilo Comanda: Visible en último paso o desplegable */}
      {currentStep === groups.length - 1 || showNotes ? (
        <div className="pt-2.5 border-t border-slate-800/90 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <ChefHat className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instrucciones de cocina (opcional):</span>
            </label>
            {currentStep < groups.length - 1 && (
              <button
                type="button"
                onClick={() => setShowNotes(false)}
                className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                Ocultar
              </button>
            )}
          </div>

          {/* Chips de atajos rápidos estilo comanda */}
          <div className="flex flex-wrap gap-1">
            {QUICK_NOTES.map((qNote) => {
              const isIncluded = (notes || '').includes(qNote);
              return (
                <button
                  key={qNote}
                  type="button"
                  onClick={() => toggleQuickNote(qNote)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer border ${
                    isIncluded
                      ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                  }`}
                >
                  {isIncluded ? '✓ ' : '+ '}
                  {qNote}
                </button>
              );
            })}
          </div>

          {/* Campo de texto libre para instrucciones personalizadas */}
          <input
            type="text"
            value={notes || ''}
            onChange={(e) => onChangeNotes && onChangeNotes(e.target.value)}
            placeholder="Ej: Sin cebolla, término medio, aderezo aparte..."
            className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNotes(true)}
          className="w-full py-2 px-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center justify-between transition cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <ChefHat className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate">
              {notes ? `Nota: "${notes.slice(0, 30)}${notes.length > 30 ? '...' : ''}"` : '¿Alguna indicación para cocina? (opcional)'}
            </span>
          </span>
          <span className="text-blue-400 text-[11px] font-bold shrink-0">{notes ? 'Editar' : '+ Escribir'}</span>
        </button>
      )}

      {/* Controles de Navegación del Wizard */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {currentStep > 0 ? (
          <button
            type="button"
            onClick={() => goToStep(currentStep - 1)}
            className="py-2 px-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
        ) : (
          <div />
        )}

        {currentStep < groups.length - 1 ? (
          <button
            type="button"
            disabled={!isStepValid}
            onClick={() => goToStep(currentStep + 1)}
            className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              isStepValid
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/35 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Paso final</span>
          </div>
        )}
      </div>
    </div>
  );
}
