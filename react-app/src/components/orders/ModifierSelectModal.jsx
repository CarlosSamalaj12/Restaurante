import React, { useState, useEffect, useMemo, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  X,
  FileText,
  Pencil,
  Sparkles,
  Layers,
  ChefHat
} from 'lucide-react';
import { ProductIconBadge } from '../../utils/productIcons';

const QUICK_NOTES = [
  'Sin cebolla',
  'Salsa aparte',
  'Término medio',
  'Bien cocido',
  'Sin picante',
  'Para llevar'
];

export function ModifierSelectModal({
  isOpen,
  selectedProduct,
  selectedModifiers = {},
  handleModifierToggle,
  itemNotes = '',
  setItemNotes,
  handleConfirmModifiers,
  addingItem = false,
  currencySymbol = 'Q',
  quickNotes = [],
  onClose
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const autoAdvanceTimerRef = useRef(null);

  const availableQuickNotes = useMemo(() => {
    if (Array.isArray(quickNotes) && quickNotes.length > 0) {
      return quickNotes
        .filter(n => typeof n === 'string' || n.is_active !== 0)
        .map(n => typeof n === 'string' ? n : n.label)
        .filter(Boolean);
    }
    return QUICK_NOTES;
  }, [quickNotes]);

  const groups = useMemo(() => {
    return Array.isArray(selectedProduct?.modifiers) ? selectedProduct.modifiers : [];
  }, [selectedProduct]);

  // Total de pasos = grupos de modificadores + 1 paso final de resumen y notas
  const totalSteps = groups.length + 1;
  const isLastStep = currentStep === groups.length;
  const currentGroup = !isLastStep ? groups[currentStep] : null;

  // Reiniciar paso al abrir o cambiar de producto
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setDirection(1);
    }
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, [isOpen, selectedProduct?.id]);

  // Cálculo de precio base y extras acumulados
  const basePrice = Number(selectedProduct?.base_price || 0);

  const extraPrice = useMemo(() => {
    let sum = 0;
    if (!groups.length) return 0;

    for (const group of groups) {
      const selectedIds = selectedModifiers[group.groupId] || [];
      for (const optId of selectedIds) {
        const opt = group.options?.find(o => o.id === optId);
        if (opt && opt.price_delta) {
          sum += Number(opt.price_delta);
        }
      }
    }
    return sum;
  }, [groups, selectedModifiers]);

  const totalPrice = basePrice + extraPrice;

  // Validación de cumplimiento por grupo
  const isGroupSatisfied = (group) => {
    if (!group) return true;
    const min = Number(group.minSelect || 0);
    if (min <= 0) return true;
    const selected = selectedModifiers[group.groupId] || [];
    return selected.length >= min;
  };

  // Validación global de obligatorios
  const missingRequiredGroups = useMemo(() => {
    return groups.filter(g => !isGroupSatisfied(g));
  }, [groups, selectedModifiers]);

  const canSubmit = missingRequiredGroups.length === 0;

  // Estado del paso actual
  const currentGroupSelectedIds = currentGroup ? selectedModifiers[currentGroup.groupId] || [] : [];
  const currentGroupMin = Number(currentGroup?.minSelect || 0);
  const currentGroupMax = Number(currentGroup?.maxSelect || 0);
  const currentGroupIsSingle = currentGroupMax === 1;
  const currentGroupIsSatisfied = currentGroup ? isGroupSatisfied(currentGroup) : true;

  // Navegación
  const goToStep = (targetStep) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    setDirection(targetStep > currentStep ? 1 : -1);
    setCurrentStep(targetStep);
  };

  const handleNext = () => {
    if (currentStep < groups.length) {
      goToStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    } else {
      onClose();
    }
  };

  // Manejo de clic en una opción con avance automático para selección única
  const handleOptionClick = (groupId, optionId, maxSelect) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }

    handleModifierToggle(groupId, optionId);

    // Si es selección única (radio button), avanzar automáticamente con microtransición suave
    if (maxSelect === 1 && currentStep < groups.length) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        setDirection(1);
        setCurrentStep(prev => Math.min(prev + 1, groups.length));
      }, 190);
    }
  };

  // Agregar nota rápida
  const handleAddQuickNote = (note) => {
    if (!setItemNotes) return;
    const current = itemNotes.trim();
    if (!current) {
      setItemNotes(note);
    } else if (current.includes(note)) {
      // Toggle off si ya está
      const regex = new RegExp(`(^|,\\s*)${note}(,\\s*|$)`, 'gi');
      const updated = current.replace(regex, ', ').replace(/^,\s*|,\s*$/g, '').trim();
      setItemNotes(updated);
    } else {
      setItemNotes(`${current}, ${note}`);
    }
  };

  if (!isOpen || !selectedProduct) return null;

  // Variantes de animación de pasos (slide horizontal según dirección)
  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 35 : -35,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.22, ease: 'easeOut' }
    },
    exit: (dir) => ({
      x: dir > 0 ? -35 : 35,
      opacity: 0,
      transition: { duration: 0.18, ease: 'easeIn' }
    })
  };

  // Progreso porcentual
  const progressPercentage = Math.round(((currentStep + 1) / totalSteps) * 100);

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <m.div
          initial={{ y: '100%', opacity: 0.9 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full sm:max-w-xl md:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100"
        >
          {/* Barra de progreso superior continua */}
          <div className="w-full h-1.5 bg-gray-100 relative overflow-hidden">
            <m.div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Encabezado del Modal */}
          <div className="px-5 pt-4 pb-3 border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <ProductIconBadge
                  productName={selectedProduct.name}
                  categoryName={selectedProduct.category_name}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-extrabold text-gray-900 text-base sm:text-lg leading-tight truncate">
                      {selectedProduct.name}
                    </h2>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Paso {currentStep + 1} de {totalSteps}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {isLastStep ? 'Resumen y notas especiales' : currentGroup?.name}
                  </p>
                </div>
              </div>

              {/* Precio en vivo + Botón cerrar */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-xs text-gray-400 block font-medium leading-none">Total</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base sm:text-lg font-black text-emerald-600">
                      {currencySymbol}{totalPrice.toFixed(2)}
                    </span>
                    {extraPrice > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                        +{currencySymbol}{extraPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stepper de navegación interactivo con chips */}
            <div className="flex gap-2 overflow-x-auto pt-3 pb-1 scrollbar-hide">
              {groups.map((grp, idx) => {
                const isDone = idx < currentStep && isGroupSatisfied(grp);
                const isActive = idx === currentStep;
                const isSatisfied = isGroupSatisfied(grp);
                const isClickable = idx < currentStep || (idx > currentStep && groups.slice(0, idx).every(isGroupSatisfied));

                return (
                  <button
                    key={grp.groupId}
                    type="button"
                    disabled={!isClickable && !isActive}
                    onClick={() => isClickable && goToStep(idx)}
                    className={`
                      px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0
                      ${isActive
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20'
                        : isDone
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                        : isClickable
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                        : 'bg-gray-100 text-gray-400 opacity-60 cursor-not-allowed'
                      }
                    `}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? 'bg-white text-emerald-700' : isDone ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-700'
                    }`}>
                      {isDone ? <Check className="w-2.5 h-2.5" /> : idx + 1}
                    </span>
                    <span>{grp.name}</span>
                  </button>
                );
              })}

              {/* Chip del paso final (Resumen) */}
              <button
                type="button"
                disabled={!canSubmit && currentStep !== groups.length}
                onClick={() => canSubmit && goToStep(groups.length)}
                className={`
                  px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0
                  ${isLastStep
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20'
                    : canSubmit
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                    : 'bg-gray-100 text-gray-400 opacity-60 cursor-not-allowed'
                  }
                `}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isLastStep ? 'bg-white text-emerald-700' : 'bg-gray-300 text-gray-700'
                }`}>
                  <FileText className="w-2.5 h-2.5" />
                </span>
                <span>Resumen</span>
              </button>
            </div>
          </div>

          {/* Cuerpo del Wizard con animación fluida entre pasos */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-[300px] bg-slate-50/50">
            <AnimatePresence mode="wait" custom={direction}>
              {!isLastStep && currentGroup ? (
                /* ================= PANTALLA DE GRUPO DE MODIFICADORES ================= */
                <m.div
                  key={`group-${currentGroup.groupId}`}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4"
                >
                  {/* Encabezado del grupo */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-base">{currentGroup.name}</h3>
                        {currentGroupIsSingle ? (
                          <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                            Opción única
                          </span>
                        ) : currentGroupMax > 0 ? (
                          <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                            Hasta {currentGroupMax} opciones
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {currentGroupIsSingle
                          ? 'Toca una opción para seleccionarla y avanzar de inmediato'
                          : currentGroupMin > 0
                          ? `Selecciona al menos ${currentGroupMin} opción${currentGroupMin > 1 ? 'es' : ''}`
                          : 'Opcional: puedes seleccionar o continuar sin elegir'}
                      </p>
                    </div>

                    {/* Badge de estado del grupo */}
                    <div className="shrink-0 flex items-center gap-2">
                      {currentGroupMin > 0 ? (
                        currentGroupIsSatisfied ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Completado ({currentGroupSelectedIds.length}/{currentGroupMin})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100/90 px-3 py-1 rounded-full border border-amber-200 animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            Requerido ({currentGroupSelectedIds.length}/{currentGroupMin})
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                          Opcional ({currentGroupSelectedIds.length} seleccionada{currentGroupSelectedIds.length === 1 ? '' : 's'})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cuadrícula de opciones del grupo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentGroup.options?.map((option) => {
                      const isSelected = currentGroupSelectedIds.includes(option.id);
                      const delta = Number(option.price_delta || 0);

                      return (
                        <m.button
                          key={option.id}
                          type="button"
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleOptionClick(currentGroup.groupId, option.id, currentGroupMax)}
                          className={`
                            p-3.5 rounded-2xl border-2 text-left transition-all relative flex items-center justify-between gap-3 cursor-pointer group
                            ${isSelected
                              ? 'border-emerald-600 bg-emerald-50/70 shadow-sm text-emerald-950 ring-2 ring-emerald-500/20'
                              : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-gray-50/60 text-gray-800'
                            }
                          `}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Indicador Radio o Checkbox */}
                            <span
                              className={`w-5 h-5 rounded-${currentGroupIsSingle ? 'full' : 'lg'} border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-gray-300 bg-white group-hover:border-emerald-400'
                              }`}
                            >
                              {isSelected && (
                                currentGroupIsSingle ? (
                                  <span className="w-2 h-2 rounded-full bg-white" />
                                ) : (
                                  <Check className="w-3 h-3 text-white stroke-[3]" />
                                )
                              )}
                            </span>

                            <div className="min-w-0">
                              <span className={`text-sm font-bold block truncate leading-snug ${isSelected ? 'text-emerald-950' : 'text-gray-900'}`}>
                                {option.name}
                              </span>
                              {delta === 0 ? (
                                <span className="text-[11px] font-medium text-gray-400">Incluido</span>
                              ) : null}
                            </div>
                          </div>

                          {/* Delta de precio */}
                          {delta !== 0 && (
                            <span
                              className={`text-xs font-black shrink-0 px-2 py-0.5 rounded-md ${
                                isSelected
                                  ? 'text-emerald-800 bg-emerald-100/90'
                                  : delta > 0
                                  ? 'text-emerald-700 bg-emerald-50'
                                  : 'text-amber-700 bg-amber-50'
                              }`}
                            >
                              {delta > 0 ? `+${currencySymbol}${delta.toFixed(2)}` : `-${currencySymbol}${Math.abs(delta).toFixed(2)}`}
                            </span>
                          )}
                        </m.button>
                      );
                    })}
                  </div>
                </m.div>
              ) : (
                /* ================= PANTALLA FINAL: RESUMEN Y NOTAS ================= */
                <m.div
                  key="final-summary-step"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-4"
                >
                  {/* Desglose de selecciones */}
                  <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <h3 className="font-bold text-gray-900 text-sm">Resumen de tu personalización</h3>
                      </div>
                      <span className="text-xs font-bold text-gray-500">
                        Base: {currencySymbol}{basePrice.toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {groups.map((grp, idx) => {
                        const selectedIds = selectedModifiers[grp.groupId] || [];
                        const selectedOptions = grp.options?.filter(o => selectedIds.includes(o.id)) || [];
                        const isSatisfied = isGroupSatisfied(grp);

                        return (
                          <div
                            key={grp.groupId}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                              !isSatisfied
                                ? 'bg-amber-50/70 border-amber-200'
                                : selectedOptions.length > 0
                                ? 'bg-slate-50 border-gray-200/80'
                                : 'bg-gray-50/40 border-dashed border-gray-200'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-gray-700">{grp.name}:</span>
                                {!isSatisfied && (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                                    Requerido
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5">
                                {selectedOptions.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {selectedOptions.map(opt => (
                                      <span
                                        key={opt.id}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded-md"
                                      >
                                        {opt.name}
                                        {Number(opt.price_delta) !== 0 && (
                                          <span className="text-[10px] text-emerald-700 font-bold">
                                            ({opt.price_delta > 0 ? '+' : ''}{currencySymbol}{Number(opt.price_delta).toFixed(2)})
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">
                                    {Number(grp.minSelect || 0) > 0 ? 'Falta seleccionar' : 'Sin extras seleccionados'}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => goToStep(idx)}
                              className="px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-gray-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Cambiar</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Observaciones especiales */}
                  <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <ChefHat className="w-4 h-4 text-emerald-600" />
                        Observaciones para cocina (opcional)
                      </label>
                      <span className="text-[11px] text-gray-400">Atajos rápidos abajo</span>
                    </div>

                    {/* Chips de atajos rápidos */}
                    <div className="flex flex-wrap gap-1.5">
                      {availableQuickNotes.map(note => {
                        const isIncluded = itemNotes.includes(note);
                        return (
                          <button
                            key={note}
                            type="button"
                            onClick={() => handleAddQuickNote(note)}
                            className={`
                              px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border
                              ${isIncluded
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                              }
                            `}
                          >
                            {isIncluded ? '✓ ' : '+ '}
                            {note}
                          </button>
                        );
                      })}
                    </div>

                    <textarea
                      value={itemNotes}
                      onChange={(e) => setItemNotes?.(e.target.value)}
                      placeholder="Ej: Salsa aparte, bien caliente, sin cebolla, etc."
                      rows={2}
                      className="w-full p-3 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-gray-50/50"
                    />
                  </div>

                  {/* Resumen final de costo */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 p-3.5 rounded-2xl border border-emerald-100/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">Total a comandar</span>
                      <span className="text-[11px] text-emerald-700">1x {selectedProduct.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-emerald-700">
                        {currencySymbol}{totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Barra de navegación inferior */}
          <div className="px-5 py-3.5 border-t border-gray-100 bg-white flex items-center justify-between gap-3">
            {/* Botón Atrás / Cancelar */}
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-3 rounded-xl font-bold text-xs sm:text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{currentStep === 0 ? 'Cancelar' : 'Atrás'}</span>
            </button>

            {/* Botón Siguiente u Omitir o Confirmar */}
            {!isLastStep ? (
              <div className="flex items-center gap-2">
                {/* Botón de omitir si es opcional y no tiene seleccionadas */}
                {currentGroupMin === 0 && currentGroupSelectedIds.length === 0 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-3.5 py-3 rounded-xl font-semibold text-xs sm:text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Omitir
                  </button>
                )}

                <m.button
                  type="button"
                  whileTap={{ scale: currentGroupIsSatisfied ? 0.98 : 1 }}
                  onClick={handleNext}
                  disabled={!currentGroupIsSatisfied}
                  className={`
                    px-5 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md cursor-pointer
                    ${currentGroupIsSatisfied
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                      : 'bg-gray-100 text-gray-400 border border-gray-200 shadow-none cursor-not-allowed'
                    }
                  `}
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </m.button>
              </div>
            ) : (
              <m.button
                type="button"
                whileTap={{ scale: canSubmit ? 0.98 : 1 }}
                onClick={handleConfirmModifiers}
                disabled={addingItem || !canSubmit}
                className={`
                  flex-1 sm:flex-initial px-6 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md
                  ${canSubmit
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 cursor-pointer'
                    : 'bg-gray-100 text-gray-400 border border-gray-200 shadow-none cursor-not-allowed'
                  }
                `}
              >
                {addingItem ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Agregando...</span>
                  </>
                ) : canSubmit ? (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Agregar a la orden · {currencySymbol}{totalPrice.toFixed(2)}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span>Faltan opciones requeridas</span>
                  </>
                )}
              </m.button>
            )}
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}

export default ModifierSelectModal;
