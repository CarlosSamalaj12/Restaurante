// react-app/src/components/public_menu/ModifierWizard.jsx
// Wizard interactivo de modificadores: Diseño iOS táctil de alta fidelidad, auto-avance, notas y soporte bilingüe

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
  ChefHat,
  Sparkles,
} from 'lucide-react';
import { getLocalizedName } from '../../utils/menuTranslations';

const QUICK_NOTES_ES = [
  'Sin cebolla',
  'Salsa aparte',
  'Término medio',
  'Bien cocido',
  'Poco picante',
  'Sin picante',
  'Para llevar',
  'Extra servilletas',
];

const QUICK_NOTES_EN = [
  'No onions',
  'Sauce on side',
  'Medium rare',
  'Well done',
  'Mild spicy',
  'No spicy',
  'To go',
  'Extra napkins',
];

export function ModifierWizard({
  groups = [],
  selectedModifiers = [],
  onChangeModifiers,
  notes = '',
  onChangeNotes,
  lang = 'es',
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const autoAdvanceTimerRef = useRef(null);

  const quickNotes = lang === 'en' ? QUICK_NOTES_EN : QUICK_NOTES_ES;

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
      const withoutGroup = selectedModifiers.filter((m) => m.group_id !== currentGroup.id);
      const isAlreadySelected = selectedModifiers.some((m) => m.id === option.id);
      if (isAlreadySelected && min === 0) {
        onChangeModifiers(withoutGroup);
      } else {
        onChangeModifiers([
          ...withoutGroup,
          {
            id: option.id,
            group_id: currentGroup.id,
            name: option.name, // Keep Spanish name for kitchen
            name_en: option.name_en, // Keep English name for client
            price_delta: Number(option.price_delta || 0),
          },
        ]);
        triggerAutoAdvance();
      }
    } else {
      const exists = selectedModifiers.some((m) => m.id === option.id);
      if (exists) {
        onChangeModifiers(selectedModifiers.filter((m) => m.id !== option.id));
      } else {
        if (count < max) {
          onChangeModifiers([
            ...selectedModifiers,
            {
              id: option.id,
              group_id: currentGroup.id,
              name: option.name,
              name_en: option.name_en,
              price_delta: Number(option.price_delta || 0),
            },
          ]);
          if (count + 1 === max) {
            triggerAutoAdvance();
          }
        }
      }
    }
  };

  const handleQuickNote = (noteText) => {
    if (!notes) {
      onChangeNotes(noteText);
    } else if (!notes.includes(noteText)) {
      onChangeNotes(`${notes}, ${noteText}`);
    }
  };

  const getOptionIcon = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('frio') || n.includes('helado') || n.includes('ice') || n.includes('cold')) return <Snowflake className="w-4 h-4 text-blue-400" />;
    if (n.includes('caliente') || n.includes('picante') || n.includes('spicy') || n.includes('hot')) return <Flame className="w-4 h-4 text-amber-400" />;
    if (n.includes('cafe') || n.includes('leche') || n.includes('coffee') || n.includes('milk')) return <Coffee className="w-4 h-4 text-amber-500" />;
    if (n.includes('extra') || n.includes('queso') || n.includes('cheese') || n.includes('bacon')) return <Sparkles className="w-4 h-4 text-emerald-400" />;
    return <Utensils className="w-4 h-4 text-slate-400" />;
  };

  const currentGroupName = getLocalizedName(currentGroup, lang);

  return (
    <div className="space-y-4 select-none">
      {/* Selector de Pasos estilo Segmented Control iOS */}
      {groups.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {groups.map((grp, idx) => {
            const grpSelected = selectedModifiers.filter((m) => m.group_id === grp.id);
            const grpMin = Math.max(0, Number(grp.min_select || 0));
            const isValid = grpSelected.length >= grpMin;
            const isCurrent = idx === currentStep;

            return (
              <button
                key={grp.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`flex-1 min-w-[85px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer border ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40'
                    : isValid
                    ? 'bg-slate-900/80 text-emerald-400 border-emerald-500/30 hover:bg-slate-850'
                    : 'bg-slate-900/60 text-slate-400 border-white/5 hover:bg-slate-850 hover:text-slate-200'
                }`}
              >
                {isValid && !isCurrent ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[3]" />
                ) : (
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                      isCurrent ? 'bg-white text-blue-600' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                )}
                <span className="truncate">{getLocalizedName(grp, lang)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Cabecera del Paso Actual con Indicador de Estado iOS */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-850/80 border border-white/[0.08] shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                {lang === 'en'
                  ? `Step ${currentStep + 1} of ${groups.length}`
                  : `Paso ${currentStep + 1} de ${groups.length}`}
              </span>
              {min > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  {lang === 'en' ? 'Required' : 'Obligatorio'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                  {lang === 'en' ? 'Optional' : 'Opcional'}
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5 truncate">
              {currentGroupName}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isSingle
                ? (lang === 'en' ? 'Choose 1 option' : 'Elige 1 sola opción')
                : (lang === 'en'
                    ? `Select up to ${max} options (min. ${min})`
                    : `Selecciona hasta ${max} opciones (mínimo ${min})`)}
            </p>
          </div>

          {/* Badge interactivo estilo píldora iOS */}
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all duration-200 shadow-sm shrink-0 ${
              count < min
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : isStepComplete
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
            }`}
          >
            {count < min ? (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span>
              {count} / {max}
            </span>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
          <div
            className="bg-gradient-to-r from-blue-600 to-blue-400 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentStep + 1) / groups.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Cuadrícula Táctil Ergonómica de Opciones estilo iOS Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {(currentGroup.options || []).map((option, optIdx) => {
          const isSelected = selectedModifiers.some((m) => m.id === option.id);
          const priceDelta = Number(option.price_delta || 0);
          const isRecommended = option.is_recommended || optIdx === 0;
          const optionDisplayName = getLocalizedName(option, lang);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleOption(option)}
              className={`p-3.5 sm:p-4 rounded-2xl text-left flex items-center justify-between transition-all duration-150 cursor-pointer relative active:scale-[0.98] ${
                isSelected
                  ? 'border-2 border-blue-500 bg-gradient-to-r from-blue-600/20 via-blue-900/30 to-slate-900/90 shadow-md shadow-blue-600/15'
                  : 'border border-white/[0.08] bg-slate-900/70 hover:bg-slate-850 hover:border-slate-700/80'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Ícono representativo con cápsula iOS */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-800/80 text-slate-300 border border-white/5'
                  }`}
                >
                  {getOptionIcon(option.name || optionDisplayName)}
                </div>

                {/* Nombre y Precio */}
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white block truncate leading-tight">
                      {optionDisplayName}
                    </span>
                    {isRecommended && isSelected && (
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 rounded-md">
                        Top
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5">
                    {priceDelta > 0 ? (
                      <span className="font-bold text-xs text-emerald-400 font-mono">
                        +Q{priceDelta.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs font-medium">
                        {lang === 'en' ? 'Included' : 'Incluido'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Selector circular / checkmark estilo iOS */}
              <div className="shrink-0 pl-2">
                {isSingle ? (
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-blue-600 border-2 border-blue-400 shadow-sm'
                        : 'border-2 border-slate-700 bg-slate-800/40'
                    }`}
                  >
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white shadow" />}
                  </div>
                ) : (
                  <div
                    className={`w-6 h-6 rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-blue-600 border border-blue-400 shadow-sm'
                        : 'border-2 border-slate-700 bg-slate-800/40'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Navegación entre Pasos estilo iOS Stepper */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
            currentStep === 0
              ? 'opacity-30 cursor-not-allowed text-slate-500'
              : 'text-slate-300 hover:text-white bg-slate-900/80 border border-white/5 hover:bg-slate-850 active:scale-95'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{lang === 'en' ? 'Previous' : 'Anterior'}</span>
        </button>

        {currentStep < groups.length - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.min(groups.length - 1, prev + 1))}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 active:scale-95 transition cursor-pointer"
          >
            <span>{lang === 'en' ? 'Next step' : 'Siguiente paso'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>{lang === 'en' ? 'All options reviewed' : 'Opciones completas'}</span>
          </span>
        )}
      </div>

      {/* Acordeón táctil de Notas e Indicaciones para Cocina */}
      <div className="mt-4 pt-4 border-t border-white/[0.08]">
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          className="w-full flex items-center justify-between py-2 text-left group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition">
              <ChefHat className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {lang === 'en' ? 'Special cooking notes?' : '¿Notas o instrucciones para cocina?'}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {notes ? notes : (lang === 'en' ? 'Click to add preferences or allergy alerts' : 'Toca para agregar términos, sin cebolla, etc.')}
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-400 group-hover:underline">
            {showNotes ? (lang === 'en' ? 'Hide' : 'Ocultar') : (lang === 'en' ? 'Add note' : 'Agregar')}
          </span>
        </button>

        {showNotes && (
          <div className="mt-3 space-y-3 bg-slate-900/80 p-3.5 rounded-2xl border border-white/5 animate-in fade-in duration-200">
            {/* Chips Rápidos Predefinidos */}
            <div className="flex flex-wrap gap-1.5">
              {quickNotes.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleQuickNote(chip)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-white/5 active:scale-95 transition cursor-pointer"
                >
                  + {chip}
                </button>
              ))}
            </div>

            {/* Input de Texto Libre */}
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => onChangeNotes(e.target.value)}
              placeholder={
                lang === 'en'
                  ? 'Add any special request or allergy alert for the kitchen...'
                  : 'Escribe cualquier detalle o indicación especial para cocina...'
              }
              className="w-full p-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
