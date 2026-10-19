// react-app/src/pages/PublicMenuPage.jsx
// Aplicación interactiva de Menú Digital, Auto-Comanda (QR/NFC) y Kiosco para comensales

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  BellRing,
  Search,
  Users,
  PlusCircle,
  ExternalLink,
  Instagram,
  Facebook,
  Phone,
  Compass,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  Wifi,
  UtensilsCrossed,
  SlidersHorizontal
} from 'lucide-react';
import { HeroCarousel } from '../components/public_menu/HeroCarousel';
import { ProductCard } from '../components/public_menu/ProductCard';
import { ProductDetailModal } from '../components/public_menu/ProductDetailModal';
import { CartDrawer } from '../components/public_menu/CartDrawer';
import { IdleScreensaver } from '../components/public_menu/IdleScreensaver';
import { useToast } from '../hooks/useToast';
import api from '../api';

export function PublicMenuPage({ isKiosk = false }) {
  const toast = useToast();
  // Extraer slug de la ruta URL (ej: /m/menu-principal o /kiosk/totem-entrada)
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

  // Sesión persistente de dispositivo en mesa
  const [sessionData, setSessionData] = useState(() => {
    try {
      const saved = localStorage.getItem(`sama_diner_session_${slug}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Modal para comensal: "¿Unirte a cuenta existente o abrir propia?"
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [guestAliasInput, setGuestAliasInput] = useState('');
  const [accountClosedNotice, setAccountClosedNotice] = useState(false);
  const wasActiveRef = useRef(false);

  // Monitorear si la cuenta de la mesa fue cerrada en el POS (pagada)
  useEffect(() => {
    if (!sessionData?.sessionToken) return;
    const interval = setInterval(async () => {
      try {
        const status = await api.digitalMenu.checkSessionStatus(sessionData.sessionToken);
        const isActive = Boolean(status?.active ?? status?.valid);
        if (isActive) {
          wasActiveRef.current = true;
        } else if (wasActiveRef.current) {
          // Solo si la cuenta estuvo activa en esta sesión y ahora fue cerrada en el POS
          setAccountClosedNotice(true);
          localStorage.removeItem(`sama_diner_session_${slug}`);
          setSessionData(null);
          setCart([]);
          wasActiveRef.current = false;
        } else {
          // Si era una sesión expirada previa, limpiar en silencio sin interrumpir al comensal
          localStorage.removeItem(`sama_diner_session_${slug}`);
          setSessionData(null);
        }
      } catch (e) {
        // En caso de corte momentáneo de red, no hacer nada
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [sessionData?.sessionToken, slug]);

  // Kiosk Idle Screensaver
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef(null);

  // Guardar carrito en local storage
  useEffect(() => {
    localStorage.setItem(`sama_cart_${slug}`, JSON.stringify(cart));
  }, [cart, slug]);

  // Carga de datos del Menú
  const loadMenuData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.digitalMenu.getPublicMenu(slug, tableToken);
      setMenu(res.menu);
      setCategories(res.categories || []);
      setProducts(res.products || []);
      setPromotions(res.promotions || []);
      setTableInfo(res.table || null);

      // Inyectar theming dinámico en variables CSS
      if (res.menu) {
        const root = document.documentElement;
        root.style.setProperty('--menu-primary', res.menu.primary_color || '#E63946');
        root.style.setProperty('--menu-secondary', res.menu.secondary_color || '#1D3557');
        root.style.setProperty('--menu-bg', res.menu.bg_color || '#0B0F19');
        root.style.setProperty('--menu-text', res.menu.text_color || '#F8FAFC');
        root.style.setProperty('--menu-font', res.menu.font_family || 'Inter, sans-serif');
      }

      // Si hay mesa y no hay sesión previa, evaluar apertura/unión de cuenta
      if (res.table && !sessionData?.sessionToken) {
        if (res.table.hasOpenAccounts) {
          setShowJoinModal(true);
        } else {
          // Mesa vacía: auto-vincular creando cuenta nueva
          autoBindSession(res.table.tableId, null);
        }
      }
    } catch (err) {
      setError(err.message || 'Error cargando menú digital');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuData();
  }, [slug, tableToken]);

  // Generador / extractor de fingerprint persistente de dispositivo
  const getDeviceFingerprint = () => {
    let fp = localStorage.getItem('sama_diner_device_fp');
    if (!fp) {
      fp = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('sama_diner_device_fp', fp);
    }
    return fp;
  };

  // Vinculación automática o manual de sesión de dispositivo
  const autoBindSession = async (tableId, joinAccountId = null, alias = 'Comensal') => {
    try {
      const fp = getDeviceFingerprint();
      const res = await api.digitalMenu.bindDeviceSession(
        {
          tableId,
          deviceFingerprint: fp,
          guestAlias: alias,
          joinAccountId,
          menuId: menu?.id || 1,
        },
        tableToken
      );
      setSessionData(res);
      localStorage.setItem(`sama_diner_session_${slug}`, JSON.stringify(res));
      setShowJoinModal(false);
    } catch (err) {
      console.warn('Error vinculando sesión:', err.message);
    }
  };

  // Kiosk Idle Screensaver Reset
  const resetIdleTimer = () => {
    if (!isKiosk) return;
    setIsIdle(false);
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
      setCart([]);
      setSelectedProduct(null);
    }, 60000);
  };

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
  }, [isKiosk]);

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

  // Filtrado de productos por categoría y buscador
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

  // Resetear contador visible al cambiar de filtro o búsqueda
  useEffect(() => {
    setVisibleCount(20);
  }, [selectedCategory, searchQuery]);

  // Lista de platillos recortada para renderizado incremental fluido
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  // Observer para carga progresiva automática por scroll
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
    <div
      className="min-h-screen text-[var(--menu-text,#F8FAFC)] bg-[#0B101B] selection:bg-blue-600 font-[var(--menu-font,sans-serif)] flex flex-col justify-between relative overflow-x-hidden"
    >
      {/* Glow difuminado ambiental de fondo */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/15 via-transparent to-transparent pointer-events-none z-0" />

      {/* Protector de Pantalla en Kiosco */}
      {isKiosk && isIdle && (
        <IdleScreensaver
          logoUrl={menu?.logo_url}
          bannerUrl={menu?.banner_url}
          onWakeUp={() => setIsIdle(false)}
        />
      )}

      {/* 1. Barra Superior de Estado (Imagen 1) */}
      <div className="relative z-30 w-full bg-[#070B13]/90 backdrop-blur-md border-b border-slate-800/60 px-4 py-2 flex items-center justify-between text-[11px] font-bold select-none">
        <div className="flex items-center gap-2 text-amber-400 font-extrabold tracking-wider">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>
            {tableInfo?.tableCode
              ? `MESA ${tableInfo.tableCode} • COMANDA ACTIVA`
              : 'CARTA DIGITAL • ACTIVA'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-400/90 font-medium text-[11px]">
          <Wifi className="w-3.5 h-3.5 text-amber-400" />
          <span>Conectado</span>
        </div>
      </div>

      {/* 2. Cabecera Principal con Squircle e Icono de Menú */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0B101B]/90 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {menu?.logo_url ? (
            <div className="w-10 h-10 rounded-2xl bg-slate-900/90 border border-slate-700/60 p-1.5 flex items-center justify-center shadow-inner">
              <img src={menu.logo_url} alt={menu.name} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 shadow-inner">
              <UtensilsCrossed className="w-5 h-5 text-slate-300" />
            </div>
          )}
          <div>
            <h1 className="font-black text-base sm:text-lg leading-tight text-white tracking-tight">
              {menu?.name || 'Menú Principal'}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Carta Digital Interactiva</p>
          </div>
        </div>

      </header>

      {/* Portada Panorámica / Banner del Restaurante (si existe banner personalizado) */}
      {menu?.banner_url && (
        <div className="relative w-full h-36 sm:h-52 overflow-hidden bg-slate-950">
          <img
            src={menu.banner_url}
            alt={menu.name}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B101B] via-[#0B101B]/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div className="flex items-center gap-3">
              {menu?.logo_url && (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 p-1.5 shadow-2xl flex items-center justify-center">
                  <img src={menu.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-white drop-shadow-md">{menu.name}</h2>
                {menu.description && (
                  <p className="text-xs text-slate-200 line-clamp-1 drop-shadow">{menu.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Carrusel Hero Promocional */}
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

      {/* 4. Buscador Rápido y Selector Horizontal de Categorías (Imagen 1) */}
      <div className="sticky top-[61px] z-20 backdrop-blur-xl bg-[#0B101B]/95 border-b border-slate-800/60 py-2.5 px-4 space-y-2.5 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar platillos o bebidas..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#131B2E]/90 border border-slate-800/90 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 shadow-inner transition"
            />
          </div>
          <button
            type="button"
            className="p-2.5 rounded-2xl bg-[#131B2E]/90 border border-slate-800/90 text-slate-400 hover:text-white hover:border-slate-700 transition active:scale-95 shadow-inner"
            title="Filtros"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Categorías con pills estilo Imagen 1 */}
        <nav className="max-w-7xl mx-auto flex gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/30'
                : 'bg-[#121929]/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Todo ({products.length})</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                Number(selectedCategory) === Number(cat.id)
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/30'
                  : 'bg-[#121929]/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 5. Encabezado de Sección: Platillos Populares / Favoritos (Imagen 1) */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between w-full">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
            {selectedCategory === 'all'
              ? 'Platillos Populares'
              : categories.find((c) => Number(c.id) === Number(selectedCategory))?.name || 'Platillos'}
          </h2>
          <p className="text-[11px] text-slate-400 font-medium">
            Los favoritos de nuestra cocina hoy
          </p>
        </div>
        {tableInfo?.tableCode && (
          <span className="text-[11px] font-black tracking-widest text-slate-500 uppercase">
            MESA #{tableInfo.tableCode}
          </span>
        )}
      </div>

      {/* 6. Grid de Productos Adaptativo con Carga Progresiva */}
      <main className="max-w-7xl mx-auto p-4 flex-1 w-full">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-xs">
            No se encontraron platillos en esta categoría o búsqueda.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {displayedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={(prod) => setSelectedProduct(prod)}
                />
              ))}
            </div>

            {/* Sentinel invisible para scroll infinito progresivo */}
            {visibleCount < filteredProducts.length && (
              <div ref={loadMoreRef} className="py-6 flex items-center justify-center">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span>Cargando más especialidades...</span>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* 7. Asistencia en Mesa ("¿Necesitas algo en tu mesa?" - Imagen 1) */}
      {tableInfo?.tableCode && (
        <div className="max-w-7xl mx-auto px-4 py-2 w-full">
          <div className="p-3.5 sm:p-4 rounded-3xl bg-[#111726]/90 border border-slate-800/80 backdrop-blur-md flex items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-amber-400 shadow-inner">
                <BellRing className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-white">¿Necesitas algo en tu mesa?</h4>
                <p className="text-[11px] text-slate-400">Un mesero asistirá a la Mesa {tableInfo.tableCode}</p>
              </div>
            </div>
            <button
              onClick={handleCallWaiter}
              className="px-4 py-2 rounded-xl bg-[#1D263B] hover:bg-[#25324D] text-slate-200 border border-slate-700/60 text-xs font-black transition active:scale-95 shadow"
            >
              Llamar
            </button>
          </div>
        </div>
      )}

      {/* Footer con Redes Sociales Oficiales */}
      <footer className="border-t border-white/10 bg-black/40 backdrop-blur p-6 text-center text-xs text-slate-400 space-y-3">
        <div className="flex items-center justify-center gap-4">
          {menu?.social_links?.instagram && (
            <a
              href={menu.social_links.instagram}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-pink-400 transition"
              title="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
          )}
          {menu?.social_links?.facebook && (
            <a
              href={menu.social_links.facebook}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-blue-400 transition"
              title="Facebook"
            >
              <Facebook className="w-5 h-5" />
            </a>
          )}
          {menu?.social_links?.whatsapp && (
            <a
              href={menu.social_links.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-emerald-400 transition"
              title="WhatsApp"
            >
              <Phone className="w-5 h-5" />
            </a>
          )}
          {menu?.social_links?.maps && (
            <a
              href={menu.social_links.maps}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-amber-400 transition"
              title="Cómo llegar"
            >
              <Compass className="w-5 h-5" />
            </a>
          )}
        </div>
        <p className="text-[11px] text-slate-500">
          Powered by SamaPOS · Sistema de Menú Digital y Auto-Comanda
        </p>
      </footer>

      {/* Modal Detalle de Producto con Curva 3D y Wizard */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            sessionToken={sessionData?.sessionToken}
            tableCode={tableInfo?.tableCode}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={(customizedItem) => {
              setCart((prev) => [...prev, customizedItem]);
              if (navigator.vibrate) navigator.vibrate(15);
              setSelectedProduct(null);
              toast.success(`✓ ${customizedItem.name} añadido a tu orden`);
            }}
          />
        )}
      </AnimatePresence>

      {/* Botón Flotante Circular del Carrito (FAB) Abajo a la Derecha */}
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

        {/* Medalla Numérica Amarilla de Items */}
        {cartItemCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg ring-3 ring-[#0B101B] animate-in zoom-in-50 duration-200">
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

      {/* Modal de Selección al Escanear: "¿Unirte a cuenta existente o abrir tu cuenta propia?" */}
      {showJoinModal && tableInfo?.hasOpenAccounts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
          <div className="bg-[#101726] border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--menu-primary)]/20 border border-[var(--menu-primary)]/40 text-[var(--menu-primary)] flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-white">Mesa {tableInfo.tableCode}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ya existe una cuenta abierta en esta mesa. ¿Deseas unirte a la cuenta grupal o abrir tu propia cuenta individual?
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  const firstAccountId = tableInfo.openAccounts[0]?.accountId;
                  autoBindSession(tableInfo.tableId, firstAccountId, 'Comensal');
                }}
                className="w-full py-3 px-4 rounded-xl bg-[var(--menu-primary)] text-white text-xs font-bold shadow-lg"
              >
                Unirme a la Cuenta de la Mesa (#{tableInfo.openAccounts[0]?.checkNumber})
              </button>

              <button
                onClick={() => {
                  autoBindSession(tableInfo.tableId, null, 'Comensal Individual');
                }}
                className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold"
              >
                Abrir Mi Cuenta Separada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Despedida cuando la Cuenta se Cierra en el POS */}
      {accountClosedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-300">
          <div className="bg-[#101726] border border-emerald-500/30 rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-4 shadow-2xl text-center">
            {menu?.logo_url ? (
              <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 p-2 mx-auto flex items-center justify-center shadow-lg">
                <img
                  src={menu.logo_url}
                  alt={menu?.name || 'Logo'}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-3xl">
                ✨
              </div>
            )}
            <div>
              <h3 className="text-xl font-black text-white">¡Gracias por tu visita!</h3>
              {menu?.name && (
                <p className="text-xs font-bold text-[var(--menu-primary,#3B82F6)] mt-0.5">
                  {menu.name}
                </p>
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
