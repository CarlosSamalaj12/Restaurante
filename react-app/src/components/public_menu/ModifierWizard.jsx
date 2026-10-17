// react-app/src/components/public_menu/ModifierWizard.jsx
// Wizard paso a paso para modificadores y extras con validaciones y notas especiales

import React, { useState } from 'react';
import { Check, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';

export function ModifierWizard({ groups = [], selectedModifiers, onChangeModifiers, notes, onChangeNotes }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!groups || groups.length === 0) return null;

  const currentGroup = groups[currentStep] || groups[0];
  const min = Math.max(0, Number(currentGroup.min_select || 0));
  const max = Math.max(1, Number(currentGroup.max_select || 1));
  const isSingle = max === 1;

  const currentGroupSelected = selectedModifiers.filter((m) => m.group_id === currentGroup.id);
  const count = currentGroupSelected.length;
  const isStepValid = count >= min;

  const toggleOption = (option) => {
    if (isSingle) {
      // Reemplazo directo en selección única (Radio)
      const next = selectedModifiers.filter((m) => m.group_id !== currentGroup.id);
      onChangeModifiers([...next, { ...option, group_id: currentGroup.id }]);
    } else {
      // Selección múltiple con tope máximo
      const alreadySelected = selectedModifiers.some((m) => m.id === option.id);
      if (alreadySelected) {
        onChangeModifiers(selectedModifiers.filter((m) => m.id !== option.id));
      } else {
        if (count < max) {
          onChangeModifiers([...selectedModifiers, { ...option, group_id: currentGroup.id }]);
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Progreso Superior */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-white">
            Paso {currentStep + 1} de {groups.length}: <strong className="text-[var(--menu-primary)]">{currentGroup.name}</strong>
          </span>
          <span className="text-slate-400">
            {min > 0 ? (
              <span className="text-amber-400">
                Elige {min === max ? min : `${min} a ${max}`} ({count}/{max})
              </span>
            ) : (
              `Opcional (hasta ${max})`
            )}
          </span>
        </div>

        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[var(--menu-primary)] h-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / groups.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Listado de Opciones del Paso */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {(currentGroup.options || []).map((option) => {
          const isSelected = selectedModifiers.some((m) => m.id === option.id);
          const priceDelta = Number(option.price_delta || 0);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleOption(option)}
              className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between text-xs font-medium transition-all ${
                isSelected
                  ? 'border-[var(--menu-primary)] bg-[var(--menu-primary)]/15 text-white shadow-sm'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-${isSingle ? 'full' : 'md'} border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-[var(--menu-primary)] bg-[var(--menu-primary)] text-white'
                      : 'border-white/30'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="font-semibold">{option.name}</span>
              </div>

              {priceDelta > 0 && (
                <span className="font-extrabold text-emerald-400">+Q{priceDelta.toFixed(2)}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notas para Cocina en el último paso */}
      {currentStep === groups.length - 1 && (
        <div className="pt-2 border-t border-white/10">
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            Instrucciones especiales para cocina (opcional):
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="Ej: Sin cebolla, aderezo aparte, bien cocido..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--menu-primary)]"
          />
        </div>
      )}

      {/* Controles de Navegación del Wizard */}
      <div className="flex items-center justify-between gap-3 pt-2">
        {currentStep > 0 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((s) => s - 1)}
            className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold flex items-center gap-1 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
        ) : (
          <div />
        )}

        {currentStep < groups.length - 1 && (
          <button
            type="button"
            disabled={!isStepValid}
            onClick={() => setCurrentStep((s) => s + 1)}
            className={`py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              isStepValid
                ? 'bg-[var(--menu-primary)] text-white shadow-md active:scale-95'
                : 'bg-white/10 text-slate-500 cursor-not-allowed'
            }`}
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
