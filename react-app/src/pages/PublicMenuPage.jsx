// react-app/src/pages/PublicMenuPage.jsx
// Orquestador modular del Menú Digital, Auto-Comanda (QR/NFC) y Kiosco interactivo

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, ShoppingBag } from 'lucide-react';
import { HeroCarousel } from '../components/public_menu/HeroCarousel';
import { ProductDetailModal } from '../components/public_menu/ProductDetailModal';
import { CartDrawer } from '../components/public_menu/CartDrawer';
import { IdleScreensaver } from '../components/public_menu/IdleScreensaver';
import { MenuHeader } from '../components/public_menu/MenuHeader';
import { MenuFilters } from '../components/public_menu/MenuFilters';
import { ProductGrid } from '../components/public_menu/ProductGrid';
import { JoinAccountModal } from '../components/public_menu/JoinAccountModal';
import { useDigitalMenuSession } from '../hooks/useDigitalMenuSession';
import { useToast } from '../hooks/useToast';
import api from '../api';
import '../components/public_menu/public_menu.css';

export function PublicMenuPage({ isKiosk = false }) {
  const toast = useToast();
  const pathname = window.location.pathname;
  const pathParts = pathname.split('/').filter(Boolean);
  const slug = pathParts[1] || 'default';
  const tableToken = new URLSearchParams(window.location.search).get('t') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [menu, setMenu] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [tableInfo, setTableInfo] = useState(null);

  // Estados de navegación interna del comensal
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef(null);

  // Carrito de compras
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(`sama_cart_${slug}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Hook especializado para sesiones y huella de dispositivo
  const {
    sessionData,
    setSessionData,
    bindSession,
    accountClosedNotice,
    setAccountClosedNotice,
  } = useDigitalMenuSession(slug, tableToken);

  // Modal para unirse a cuenta en mesa ocupada
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [guestAliasInput, setGuestAliasInput] = useState('');

  // Kiosk Idle Screensaver
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef(null);

  // Guardar carrito en local storage
  useEffect(() => {
    localStorage.setItem(`sama_cart_${slug}`, JSON.stringify(cart));
  }, [cart, slug]);

  // Referencia estable para evitar bucles de renderizado con bindSession
  const bindSessionRef = useRef(bindSession);
  useEffect(() => {
    bindSessionRef.current = bindSession;
  }, [bindSession]);

  // Carga de datos del Menú con inyección de variables CSS
  const loadMenuData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.digitalMenu.getPublicMenu(slug, tableToken);
      setMenu(res.menu);
      setCategories(res.categories || []);
      setProducts(res.products || []);
      setPromotions(res.promotions || []);
      setTableInfo(res.table || null);

      if (res.menu) {
        const root = document.documentElement;
        root.style.setProperty('--menu-primary', res.menu.primary_color || '#E63946');
        root.style.setProperty('--menu-secondary', res.menu.secondary_color || '#1D3557');
        root.style.setProperty('--menu-bg', res.menu.bg_color || '#0B0F19');
        root.style.setProperty('--menu-text', res.menu.text_color || '#F8FAFC');
        root.style.setProperty('--menu-font', res.menu.font_family || 'Inter, sans-serif');
      }

      // Si hay mesa y no hay sesión previa, evaluar apertura de cuenta
      const savedSession = localStorage.getItem(`sama_diner_session_${slug}`);
      if (res.table && !savedSession) {
        if (res.table.hasOpenAccounts) {
          setShowJoinModal(true);
        } else {
          try {
            await bindSessionRef.current({
              tableId: res.table.tableId,
              joinAccountId: null,
              alias: 'Comensal',
              menuId: res.menu?.id || 1,
            });
          } catch (_) {}
        }
      }
    } catch (err) {
      setError(err.message || 'Error cargando menú digital');
    } finally {
      setLoading(false);
    }
  }, [slug, tableToken]);

  useEffect(() => {
    loadMenuData();
  }, [slug, tableToken, loadMenuData]);

  // Kiosk Idle Screensaver Reset
  const resetIdleTimer = useCallback(() => {
    if (!isKiosk) return;
    setIsIdle(false);
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
      setCart([]);
      setSelectedProduct(null);
    }, 60000);
  }, [isKiosk]);

  useEffect(() => {
    if (isKiosk) {
      window.addEventListener('touchstart', resetIdleTimer);
      window.addEventListener('click', resetIdleTimer);
      resetIdleTimer();
      return () => {
        window.removeEventListener('touchstart', resetIdleTimer);
        window.removeEventListener('click', resetIdleTimer);
        clearTimeout(idleTimerRef.current);
      };
    }
  }, [isKiosk, resetIdleTimer]);

  // Llamar al mesero
  const handleCallWaiter = async () => {
    if (!sessionData?.sessionToken && !tableInfo) return;
    try {
      await api.digitalMenu.callWaiter(
        { sessionToken: sessionData?.sessionToken, reason: 'Asistencia en mesa' },
        tableToken
      );
      if (navigator.vibrate) navigator.vibrate(50);
      toast.success('¡Llamado enviado! Un mesero se acercará a tu mesa en unos instantes.');
    } catch (err) {
      toast.error(err.message || 'Error al llamar al mesero');
    }
  };

  // Filtrado reactivo de productos por categoría y buscador
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'all' || Number(p.category_id) === Number(selectedCategory);
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  useEffect(() => {
    setVisibleCount(20);
  }, [selectedCategory, searchQuery]);

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  // Carga progresiva automática por scroll
  useEffect(() => {
    if (visibleCount >= filteredProducts.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 16, filteredProducts.length));
        }
      },
      { rootMargin: '350px' }
    );
    const target = loadMoreRef.current;
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [visibleCount, filteredProducts.length]);

  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-[var(--menu-primary,#E63946)] animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-400">Cargando Menú...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">No se pudo abrir el Menú</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">{error}</p>
        <button
          onClick={loadMenuData}
          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[var(--menu-text,#F8FAFC)] bg-[#0B101B] selection:bg-blue-600 font-[var(--menu-font,sans-serif)] flex flex-col justify-between relative overflow-x-hidden">
      {/* Resplandor ambiental de fondo */}
      <div className="menu-glow-background" />

      {/* Protector de Pantalla en Kiosco */}
      {isKiosk && isIdle && (
        <IdleScreensaver
          logoUrl={menu?.logo_url}
          bannerUrl={menu?.banner_url}
          onWakeUp={() => setIsIdle(false)}
        />
      )}

      {/* Cabecera Principal y Barra de Estado */}
      <MenuHeader
        menu={menu}
        tableInfo={tableInfo}
        onCallWaiter={handleCallWaiter}
        cartItemCount={cartItemCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Carrusel Hero Promocional */}
      <HeroCarousel
        promotions={promotions}
        onSelectPromotion={(promo) => {
          if (promo.target_id) {
            const found = products.find((p) => p.id === Number(promo.target_id));
            if (found) {
              setSelectedProduct(found);
              return;
            }
          }
          const menuSection = document.querySelector('main');
          if (menuSection) {
            menuSection.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />

      {/* Filtros: Buscador Rápido y Categorías */}
      <MenuFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        totalProductsCount={products.length}
      />

      {/* Rejilla de Platillos con Carga Incremental */}
      <ProductGrid
        products={filteredProducts}
        displayedProducts={displayedProducts}
        onSelectProduct={setSelectedProduct}
        loadMoreRef={loadMoreRef}
        hasMore={visibleCount < filteredProducts.length}
        searchQuery={searchQuery}
        onClearSearch={() => setSearchQuery('')}
      />

      {/* Modal de Detalle de Platillo y Modificadores */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={(item) => {
              setCart((prev) => {
                const existingIdx = prev.findIndex(
                  (i) => i.productId === item.productId && JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers)
                );
                if (existingIdx > -1) {
                  const updated = [...prev];
                  updated[existingIdx].qty += item.qty;
                  return updated;
                }
                return [...prev, item];
              });
              setSelectedProduct(null);
              setIsCartOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Botón Flotante Circular del Carrito (FAB) */}
      <m.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-500 text-white flex items-center justify-center shadow-2xl shadow-blue-600/40 border border-white/20 cursor-pointer transition-shadow hover:shadow-blue-500/60"
        title="Ver Carrito de Compras"
        aria-label="Ver Carrito de Compras"
      >
        <ShoppingBag className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
        {cartItemCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg ring-3 ring-[#0B101B]">
            {cartItemCount > 99 ? '99+' : cartItemCount}
          </span>
        )}
      </m.button>

      {/* Carrito Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        setCart={setCart}
        tableCode={tableInfo?.tableCode}
        menuMode={menu?.mode}
        isKiosk={isKiosk}
        sessionData={sessionData}
        onOrderSuccess={(res) => {
          setSessionData((prev) => ({ ...prev, accountId: res.accountId, checkNumber: res.checkNumber }));
        }}
      />

      {/* Modal de Selección al Escanear en Mesa Ocupada */}
      <JoinAccountModal
        isOpen={showJoinModal}
        tableInfo={tableInfo}
        guestAliasInput={guestAliasInput}
        onGuestAliasChange={setGuestAliasInput}
        onJoinAccount={async (targetAccId) => {
          try {
            await bindSession({
              tableId: tableInfo.tableId,
              joinAccountId: targetAccId,
              alias: guestAliasInput.trim() || 'Comensal',
              menuId: menu?.id || 1,
            });
            setShowJoinModal(false);
          } catch (e) {
            toast.error(e.message || 'Error al unirse a la cuenta');
          }
        }}
        onCreateNewAccount={async () => {
          try {
            await bindSession({
              tableId: tableInfo.tableId,
              joinAccountId: null,
              alias: guestAliasInput.trim() || 'Comensal Individual',
              menuId: menu?.id || 1,
            });
            setShowJoinModal(false);
          } catch (e) {
            toast.error(e.message || 'Error al crear cuenta individual');
          }
        }}
      />

      {/* Modal de Agradecimiento cuando la Cuenta se Cierra en el POS */}
      {accountClosedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
          <div className="bg-[#101726] border border-emerald-500/30 rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-4 shadow-2xl text-center">
            {menu?.logo_url ? (
              <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 p-2 mx-auto flex items-center justify-center shadow-lg">
                <img src={menu.logo_url} alt={menu?.name || 'Logo'} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-3xl">
                ✨
              </div>
            )}
            <div>
              <h3 className="text-xl font-black text-white">¡Gracias por tu visita!</h3>
              {menu?.name && (
                <p className="text-xs font-bold text-[var(--menu-primary,#3B82F6)] mt-0.5">{menu.name}</p>
              )}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              La cuenta de tu mesa ha sido cerrada y procesada con éxito. Esperamos que hayas disfrutado tu comida y verte pronto de nuevo.
            </p>
            <button
              onClick={() => {
                setAccountClosedNotice(false);
                loadMenuData();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-[var(--menu-primary)] text-white text-xs font-black shadow-lg shadow-[var(--menu-primary)]/25 hover:brightness-110 transition active:scale-95"
            >
              Volver a la Carta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublicMenuPage;
