// react-app/src/components/public_menu/ProductDetailModal.jsx
// Modal / Bottom Sheet con diseño de cabecera en curva orgánica, imagen .webp 3D, tabs y sticky footer

import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Star, Clock, Plus, Minus, MessageSquare, Utensils, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';
import { ModifierWizard } from './ModifierWizard';
import api from '../../api';

export function ProductDetailModal({ product: initialProduct, onClose, onAddToCart, sessionToken }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm overflow-hidden select-none">
      <m.div
        initial={{ y: '100%', opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        className="w-full max-w-lg bg-[#0F141F] rounded-t-[2.5rem] sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[92vh] sm:max-h-[85vh]"
      >
        {/* Cabecera con Fondo de Color Primario y Recorte Curvo Orgánico */}
        <div className="relative h-56 sm:h-64 bg-[var(--menu-primary)] flex items-center justify-center overflow-visible">
          {/* Botón Cerrar Flotante */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition active:scale-90"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Recorte Curvo Orgánico Inferior (Arco semicircular inverso) */}
          <div
            className="absolute -bottom-1 inset-x-0 h-14 bg-[#0F141F]"
            style={{ borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }}
          />

          {/* Imagen .webp con fondo transparente sobresaliendo del arco (Efecto de profundidad 3D) */}
          {product.image_url ? (
            <m.img
              initial={{ scale: 0.75, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              src={product.image_url}
              alt={product.name}
              className="relative z-10 w-48 sm:w-56 h-48 sm:h-56 object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.55)] -bottom-3"
              loading="eager"
            />
          ) : (
            <div className="relative z-10 w-28 h-28 rounded-3xl bg-black/20 backdrop-blur-md flex items-center justify-center text-4xl shadow-lg -bottom-2">
              🍽️
            </div>
          )}

          {/* Badges Glassmorphism Flotantes en la esquina inferior izquierda */}
          <div className="absolute bottom-5 left-5 z-20 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-black/50 backdrop-blur-md border border-white/20 text-amber-300 flex items-center gap-1.5 shadow-md">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {Number(product.rating_avg || 4.0).toFixed(1)}
              <span className="text-slate-300 font-normal text-[11px]">
                ({product.sales_count ?? product.rating_count ?? 0} {(product.sales_count ?? product.rating_count ?? 0) === 1 ? 'pedido' : 'pedidos'})
              </span>
            </span>
          </div>
        </div>

        {/* Título y Selector de Tabs Estilo Pills */}
        <div className="p-5 pb-2 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {product.name}
            </h2>
            <span className="text-lg font-black text-[var(--menu-primary)] whitespace-nowrap">
              Q{unitPrice.toFixed(2)}
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {product.description || 'Especialidad preparada al momento con ingredientes frescos de la más alta calidad.'}
          </p>

          {/* Selector de Pestañas Estilo Pills */}
          <div className="flex gap-2 mt-4 p-1 rounded-2xl bg-white/5 border border-white/5">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
                activeTab === 'details'
                  ? 'bg-[var(--menu-primary)] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Detalles
            </button>
            {hasModifiers && (
              <button
                onClick={() => setActiveTab('customize')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'customize'
                    ? 'bg-[var(--menu-primary)] text-white shadow'
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
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
                activeTab === 'reviews'
                  ? 'bg-[var(--menu-primary)] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Reseñas ({product.reviews?.length || product.rating_count || 0})
            </button>
          </div>
        </div>

        {/* Contenido Dinámico de la Pestaña Activa */}
        <div className="p-5 pt-2 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">Prep: ~{product.estimated_prep_min || 15} min</span>
                </div>
                {product.dietary_tags?.includes('vegano') && (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
                    <span>🌱 100% Vegano</span>
                  </div>
                )}
                {product.dietary_tags?.includes('sin_gluten') && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-2">
                    <span>🌾 Sin Gluten</span>
                  </div>
                )}
              </div>

              {hasModifiers && (
                <div
                  onClick={() => setActiveTab('customize')}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/10 transition"
                >
                  <span className="text-xs text-slate-300">
                    Este platillo cuenta con opciones de personalización (término, guarnición, extras)
                  </span>
                  <span className="text-xs font-bold text-[var(--menu-primary)] underline whitespace-nowrap ml-2">
                    Elegir extras
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
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-amber-400 font-black text-base">
                    <Star className="w-5 h-5 fill-amber-400" />
                    <span>{Number(product.rating_avg || 4.0).toFixed(1)}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    ({product.sales_count ?? product.rating_count ?? 0} pedidos registrados)
                  </span>
                </div>

                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-3 py-1.5 rounded-xl bg-[var(--menu-primary)] text-white text-xs font-bold transition shadow-sm active:scale-95"
                >
                  {showReviewForm ? 'Cancelar' : '+ Dejar Opinión'}
                </button>
              </div>

              {/* Formulario de Nueva Reseña */}
              {showReviewForm && (
                <form
                  onSubmit={handleSubmitReview}
                  className="p-4 rounded-2xl bg-white/5 border border-[var(--menu-primary)]/40 space-y-3 text-xs"
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
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--menu-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Comentario:</label>
                    <textarea
                      rows={2}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="¿Qué te pareció el sabor, presentación o porción?"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[var(--menu-primary)] resize-none"
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
                    className="w-full py-2.5 rounded-xl bg-[var(--menu-primary)] text-white font-extrabold flex items-center justify-center gap-2 shadow-md hover:brightness-110 transition disabled:opacity-50"
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
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs space-y-1.5"
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

        {/* Sticky Footer con Selector de Cantidad y Botón de Añadir */}
        <div className="sticky bottom-0 bg-[#0A0E17] border-t border-white/10 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-1 border border-white/10">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-white transition active:scale-90"
              aria-label="Disminuir cantidad"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold text-base w-7 text-center text-white">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-white transition active:scale-90"
              aria-label="Aumentar cantidad"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAdd}
            className="flex-1 py-4 px-5 rounded-2xl bg-[var(--menu-primary)] hover:brightness-110 text-white font-extrabold text-sm flex items-center justify-between shadow-lg shadow-[var(--menu-primary)]/30 active:scale-98 transition"
          >
            <span>Añadir al Carrito</span>
            <span>Q{totalPrice.toFixed(2)}</span>
          </button>
        </div>
      </m.div>
    </div>
  );
}
