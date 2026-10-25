// react-app/src/components/public_menu/ProductDetailModal.jsx
// Modal / Pantalla Completa con estética iOS para personalización de modificadores y detalles

import React, { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import {
  X,
  Star,
  Clock,
  Plus,
  Minus,
  Send,
  CheckCircle2,
  ShoppingBag,
  Sparkles,
  Flame,
  Compass,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { ModifierWizard } from './ModifierWizard';
import api from '../../api';
import { t, getLocalizedName, getLocalizedDescription } from '../../utils/menuTranslations';

export function ProductDetailModal({ product: initialProduct, onClose, onAddToCart, sessionToken, tableCode, lang = 'es' }) {
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'customize' | 'reviews'
  const [qty, setQty] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [notes, setNotes] = useState('');

  // Estados para formulario de reseña
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewName, setReviewName] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [modalImgError, setModalImgError] = useState(false);

  // Cargar detalle completo (modificadores y reseñas) desde el backend
  useEffect(() => {
    let cancelled = false;
    if (initialProduct?.id) {
      setLoading(true);
      api.digitalMenu
        .getProductDetail(initialProduct.id)
        .then((detail) => {
          if (!cancelled && detail) {
            setProduct(detail);
            // Si el platillo tiene modificadores obligatorios, abrir tab customize por defecto
            const hasRequired = (detail.modifier_groups || []).some((g) => Number(g.min_select) > 0);
            if (hasRequired) {
              setActiveTab('customize');
            }
          }
        })
        .catch((err) => console.error('Error cargando detalle de platillo:', err))
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [initialProduct?.id]);

  const hasModifiers = product.modifier_groups && product.modifier_groups.length > 0;

  // Cálculo de precio dinámico en tiempo real
  const modifiersCost = selectedModifiers.reduce((acc, m) => acc + Number(m.price_delta || 0), 0);
  const unitPrice = Number(product.base_price || 0) + modifiersCost;
  const totalPrice = unitPrice * qty;

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewRating) return;
    setSubmittingReview(true);
    try {
      await api.digitalMenu.createReview({
        productId: product.id,
        sessionToken,
        rating: reviewRating,
        comment: reviewComment,
        dinerName: reviewName.trim() || 'Comensal',
      });
      setReviewSuccess(true);
      const newReview = {
        id: Date.now(),
        diner_name: reviewName.trim() || 'Tú',
        rating: reviewRating,
        comment: reviewComment,
      };
      setProduct((prev) => ({
        ...prev,
        reviews: [newReview, ...(prev.reviews || [])],
        rating_count: (prev.rating_count || 0) + 1,
      }));
      setReviewComment('');
      setTimeout(() => {
        setShowReviewForm(false);
        setReviewSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Error enviando reseña:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAdd = () => {
    onAddToCart({
      productId: product.id,
      name: product.name,
      name_en: product.name_en,
      basePrice: Number(product.base_price),
      unitPrice,
      qty,
      modifiers: selectedModifiers,
      notes,
    });
  };

  const rating = Number(product.rating_avg || 4.5).toFixed(1);
  const salesCount = product.sales_count ?? product.rating_count ?? 15;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl overflow-hidden select-none">
      <m.div
        initial={{ y: '100%', opacity: 0.9 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl lg:max-w-3xl bg-slate-950 sm:bg-slate-900/95 sm:backdrop-blur-2xl rounded-none sm:rounded-3xl overflow-hidden shadow-2xl border-0 sm:border sm:border-white/10 flex flex-col relative"
      >
        {/* Barra Superior estilo iOS con Navegación y Estado */}
        <header className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-900/90 sm:bg-slate-900/60 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between shrink-0 z-20">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center border border-white/10 transition active:scale-90 cursor-pointer shadow-sm"
            aria-label="Cerrar modal"
          >
            <ArrowLeft className="w-4 h-4 sm:hidden" />
            <X className="w-4 h-4 hidden sm:block" />
          </button>

          {/* Estado de mesa y orden en píldora iOS */}
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-slate-850 border border-white/10 text-slate-300 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Mesa {tableCode || '04'} • Auto-Comanda</span>
          </div>

          {/* Selector de Pestañas Compacto estilo Segmented Control iOS */}
          <div className="flex gap-1 p-1 rounded-xl bg-slate-800/90 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'en' ? 'Details' : 'Detalles'}
            </button>
            {hasModifiers && (
              <button
                type="button"
                onClick={() => setActiveTab('customize')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  activeTab === 'customize'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{lang === 'en' ? 'Options' : 'Opciones'}</span>
                {selectedModifiers.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-slate-950 text-[10px] font-black flex items-center justify-center">
                    {selectedModifiers.length}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'reviews'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'en' ? 'Reviews' : 'Opiniones'}
            </button>
          </div>
        </header>

        {/* ENCABEZADO RESUMIDO CUANDO ESTÁ PERSONALIZANDO (MÁXIMO ESPACIO PARA MODIFICADORES) */}
        {activeTab === 'customize' ? (
          <div className="px-4 py-3 sm:px-6 bg-gradient-to-r from-slate-900/90 via-slate-850/80 to-slate-900/90 border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shrink-0 flex items-center justify-center relative shadow-md">
                {product.image_url && !modalImgError ? (
                  <img
                    src={product.image_url}
                    alt={getLocalizedName(product, lang)}
                    className="w-full h-full object-cover"
                    onError={() => setModalImgError(true)}
                  />
                ) : (
                  <span className="text-xl">🍽️</span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
                  {getLocalizedName(product, lang)}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-black text-amber-400 font-mono">
                    Q{unitPrice.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    ({lang === 'en' ? 'Base' : 'Base'}: Q{Number(product.base_price || 0).toFixed(2)})
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full border border-white/5">
              <span>Personaliza tu orden a tu gusto</span>
            </div>
          </div>
        ) : (
          <div className="shrink-0 bg-gradient-to-b from-slate-900/60 to-transparent">
            {/* Zona de Imagen con Halo Difuminado */}
            <div className="relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden my-2">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-600/15 via-slate-900/10 to-transparent blur-2xl pointer-events-none" />

              {product.image_url && !modalImgError ? (
                <m.img
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  src={product.image_url}
                  alt={product.name}
                  className="relative z-10 max-h-44 sm:max-h-52 max-w-[85%] object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)]"
                  loading="eager"
                  decoding="async"
                  onError={() => setModalImgError(true)}
                />
              ) : (
                <div className="relative z-10 w-28 h-28 rounded-3xl bg-slate-900/80 border border-white/10 flex items-center justify-center text-4xl shadow-xl">
                  🍽️
                </div>
              )}
            </div>

            {/* Encabezado: Título y Precio */}
            <div className="px-4 pb-2 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {product.badge_text && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                        {product.badge_text}
                      </span>
                    )}
                    {product.estimated_prep_min && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 flex items-center gap-1 border border-white/5">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        {product.estimated_prep_min} min prep.
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight truncate">
                    {getLocalizedName(product, lang)}
                  </h2>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    <span className="text-base font-bold text-amber-400 mr-0.5">Q</span>
                    {unitPrice.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                    {lang === 'en' ? 'Base price' : 'Precio base'}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                {getLocalizedDescription(product, lang) ||
                  (lang === 'en'
                    ? 'Specialty prepared fresh to order with selected ingredients.'
                    : 'Especialidad preparada al momento con ingredientes frescos seleccionados.')}
              </p>
            </div>
          </div>
        )}

        {/* CONTENIDO PRINCIPAL CON SCROLL EXTENDIDO Y PANTALLA COMPLETA */}
        <div className="px-4 py-4 sm:px-6 overflow-y-auto flex-1 space-y-4 no-scrollbar">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300 font-semibold">Prep: ~{product.estimated_prep_min || 15} min</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300 font-semibold">100% Calidad de Autor</span>
                </div>
                {product.dietary_tags?.includes('vegano') && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2 font-semibold">
                    <span>🌱 100% Vegano</span>
                  </div>
                )}
                {product.dietary_tags?.includes('sin_gluten') && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-2 font-semibold">
                    <span>🌾 Sin Gluten</span>
                  </div>
                )}
              </div>

              {hasModifiers && (
                <div
                  onClick={() => setActiveTab('customize')}
                  className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/15 via-slate-900/90 to-slate-900/80 border border-blue-500/30 hover:border-blue-500/60 flex items-center justify-between cursor-pointer transition group shadow-sm"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">
                      Personalizar este platillo
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Elige opciones de temperatura, término, acompañamientos o extras.
                    </span>
                  </div>
                  <span className="text-xs font-bold text-blue-400 group-hover:underline flex items-center gap-1 shrink-0 ml-2">
                    Personalizar <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'customize' && hasModifiers && (
            <ModifierWizard
              groups={product.modifier_groups}
              selectedModifiers={selectedModifiers}
              onChangeModifiers={setSelectedModifiers}
              notes={notes}
              onChangeNotes={setNotes}
              lang={lang}
            />
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-3.5">
              {/* Resumen de Calificación */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-white/5">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-amber-400 font-bold text-base">
                    <Star className="w-5 h-5 fill-amber-400" />
                    <span>{rating}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    ({salesCount} órdenes registradas)
                  </span>
                </div>

                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
                >
                  {showReviewForm ? 'Cancelar' : '+ Dejar Opinión'}
                </button>
              </div>

              {/* Formulario de Reseña */}
              {showReviewForm && (
                <form
                  onSubmit={handleSubmitReview}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-blue-500/40 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300">Tu Calificación:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="p-1 hover:scale-110 transition active:scale-95"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= reviewRating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Tu Nombre / Alias (Opcional):</label>
                    <input
                      type="text"
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      placeholder="Ej: Carlos S."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Comentario:</label>
                    <textarea
                      rows={2}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="¿Qué te pareció el sabor, presentación o porción?"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  {reviewSuccess && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>¡Gracias! Tu reseña ha sido publicada.</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingReview ? 'Enviando...' : 'Publicar Reseña'}</span>
                  </button>
                </form>
              )}

              {/* Lista de Reseñas */}
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>{rev.diner_name}</span>
                      <span className="text-amber-400 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" /> {rev.rating}
                      </span>
                    </div>
                    {rev.comment && <p className="text-slate-400 leading-relaxed">"{rev.comment}"</p>}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Aún no hay reseñas registradas para este platillo. ¡Sé el primero en calificarlo!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer estilo Barra Flotante iOS */}
        <footer className="sticky bottom-0 bg-slate-900/95 sm:bg-slate-900/90 backdrop-blur-2xl border-t border-white/[0.08] p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0 z-20">
          {/* Stepper iOS [- 1 +] */}
          <div className="flex items-center gap-1.5 bg-slate-850 rounded-2xl p-1 border border-white/10 shadow-inner">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 transition active:scale-90 cursor-pointer"
              aria-label="Disminuir cantidad"
            >
              <Minus className="w-4 h-4 stroke-[2.5]" />
            </button>
            <span className="font-bold text-sm w-7 text-center text-white font-mono">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 transition active:scale-90 cursor-pointer"
              aria-label="Aumentar cantidad"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Botón Principal estilo iOS con Degradado Azul Suave */}
          <button
            onClick={handleAdd}
            className="flex-1 h-12 sm:h-14 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-between shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all cursor-pointer border border-white/10"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
              <span className="tracking-wide">{lang === 'en' ? 'Add to Order' : 'Añadir a la Orden'}</span>
            </div>
            <span className="bg-black/25 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-bold font-mono">
              Q{totalPrice.toFixed(2)}
            </span>
          </button>
        </footer>
      </m.div>
    </div>
  );
}

