// react-app/src/components/public_menu/ProductDetailModal.jsx
// Modal / Bottom Sheet con diseño difuminado Midnight Glow (Imagen 2)

import React, { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { X, Star, Clock, Plus, Minus, Send, CheckCircle2, ShoppingBag, Sparkles, Flame, Compass } from 'lucide-react';
import { ModifierWizard } from './ModifierWizard';
import api from '../../api';

export function ProductDetailModal({ product: initialProduct, onClose, onAddToCart, sessionToken, tableCode }) {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden select-none">
      <m.div
        initial={{ y: '100%', opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="w-full max-w-lg bg-[#0D1322] rounded-t-[2.5rem] sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800/80 flex flex-col max-h-[92vh] sm:max-h-[88vh] relative"
      >
        {/* Manija superior táctil estilo bottom-sheet */}
        <div className="w-12 h-1 bg-slate-700/60 rounded-full mx-auto mt-3 mb-1 shrink-0 sm:hidden" />

        {/* Barra superior de estado (Mesa y Botón Cerrar) */}
        <div className="px-5 pt-3 pb-1 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-slate-900/90 border border-slate-800 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Mesa {tableCode || '04'} • En comanda</span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-90"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ENCABEZADO: COMPACTO CUANDO ESTÁ PERSONALIZANDO, COMPLETO SI ESTÁ EN DETALLES O RESEÑAS */}
        {activeTab === 'customize' ? (
          <div className="px-5 py-2.5 shrink-0 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 flex items-center justify-center relative shadow-md">
                {product.image_url && !modalImgError ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={() => setModalImgError(true)}
                  />
                ) : (
                  <span className="text-xl">🍽️</span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black text-white leading-tight truncate">
                  {product.name}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-black text-amber-400 font-mono">
                    Q{unitPrice.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    (Base: Q{Number(product.base_price || 0).toFixed(2)})
                  </span>
                </div>
              </div>
            </div>

            {/* Selector de Pestañas Compacto */}
            <div className="flex gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                Detalles
              </button>
              <button
                type="button"
                className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 text-white rounded-lg shadow-sm cursor-pointer"
              >
                Personalizar
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Fila de Badges */}
            <div className="px-5 pt-2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-sm">
                <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{product.badge_text || 'Especialidad'}</span>
              </div>

              {product.estimated_prep_min && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-900/80 border border-slate-800 text-slate-300 shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{product.estimated_prep_min} min prep.</span>
                </div>
              )}
            </div>

            {/* Zona de Imagen con Halo Difuminado */}
            <div className="relative w-full h-48 sm:h-56 flex items-center justify-center overflow-hidden my-1 shrink-0">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-600/30 via-indigo-950/20 to-transparent blur-3xl pointer-events-none scale-125" />
              <div className="absolute w-40 h-40 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />

              {product.image_url && !modalImgError ? (
                <m.img
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  src={product.image_url}
                  alt={product.name}
                  className="relative z-10 max-h-44 sm:max-h-52 max-w-[85%] object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)]"
                  loading="eager"
                  decoding="async"
                  onError={() => setModalImgError(true)}
                />
              ) : (
                <div className="relative z-10 w-28 h-28 rounded-3xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-4xl shadow-2xl">
                  🍽️
                </div>
              )}
            </div>

            {/* Encabezado: Título del Platillo y Precio Base */}
            <div className="px-5 pb-2 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                    {product.name}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mt-1">
                    <Compass className="w-3.5 h-3.5 text-blue-400" />
                    <span>100% Calidad de Autor • Ingredientes Frescos</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    <span className="text-base font-bold text-amber-400 mr-1">Q</span>
                    {unitPrice.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Precio base
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                {product.description || 'Especialidad preparada al momento con granos seleccionados de altura e ingredientes frescos de la más alta calidad.'}
              </p>

              {/* Selector de Pestañas Segmented Tabs */}
              <div className="flex gap-2 mt-4 p-1 rounded-2xl bg-slate-900/90 border border-slate-800/80">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                    activeTab === 'details'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Detalles
                </button>

                {hasModifiers && (
                  <button
                    onClick={() => setActiveTab('customize')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                      activeTab === 'customize'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Personalizar</span>
                    {selectedModifiers.length > 0 && (
                      <span className="w-4 h-4 rounded-full bg-white text-slate-950 text-[10px] font-black flex items-center justify-center">
                        {selectedModifiers.length}
                      </span>
                    )}
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                    activeTab === 'reviews'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Reseñas ({product.reviews?.length || product.rating_count || 1})
                </button>
              </div>
            </div>
          </>
        )}

        {/* Contenido Dinámico con Scroll Interior */}
        <div className="px-5 pt-2 pb-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300 font-semibold">Prep: ~{product.estimated_prep_min || 15} min</span>
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
                  className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 flex items-center justify-between cursor-pointer transition group"
                >
                  <span className="text-xs text-slate-300">
                    Este platillo cuenta con opciones de personalización (temperatura, término, guarnición o extras)
                  </span>
                  <span className="text-xs font-bold text-blue-400 group-hover:underline whitespace-nowrap ml-2">
                    Elegir opciones →
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
            />
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-3">
              {/* Resumen de Calificación y Botón Dejar Opinión */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-amber-400 font-black text-base">
                    <Star className="w-5 h-5 fill-amber-400" />
                    <span>{rating}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    ({salesCount} pedidos registrados)
                  </span>
                </div>

                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
                >
                  {showReviewForm ? 'Cancelar' : '+ Dejar Opinión'}
                </button>
              </div>

              {/* Formulario de Nueva Reseña */}
              {showReviewForm && (
                <form
                  onSubmit={handleSubmitReview}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-blue-500/40 space-y-3 text-xs"
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
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Comentario:</label>
                    <textarea
                      rows={2}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="¿Qué te pareció el sabor, presentación o porción?"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
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
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
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
                    className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs space-y-1.5"
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

        {/* Sticky Footer con Selector de Cantidad [- 1 +] y Botón Añadir Azul (Imagen 2) */}
        <div className="sticky bottom-0 bg-[#0B101B]/95 backdrop-blur-md border-t border-slate-800/80 p-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-slate-900/90 rounded-2xl p-1 border border-slate-800">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition active:scale-90"
              aria-label="Disminuir cantidad"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-black text-sm w-6 text-center text-white">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition active:scale-90"
              aria-label="Aumentar cantidad"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAdd}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm flex items-center justify-between shadow-xl shadow-blue-600/40 active:scale-98 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span>Añadir al Carrito</span>
            </div>
            <span className="bg-blue-700/60 px-3 py-1 rounded-xl text-xs font-black">
              Q{totalPrice.toFixed(2)}
            </span>
          </button>
        </div>
      </m.div>
    </div>
  );
}
