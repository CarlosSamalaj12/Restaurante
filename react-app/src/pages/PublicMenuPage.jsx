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
  Loader2
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
      className="min-h-screen text-[var(--menu-text,#F8FAFC)] bg-[var(--menu-bg,#0B0F19)] selection:bg-[var(--menu-primary)] font-[var(--menu-font,sans-serif)] flex flex-col justify-between"
      style={{ backgroundColor: menu?.bg_color || '#0B0F19' }}
    >
      {/* Protector de Pantalla en Kiosco */}
      {isKiosk && isIdle && (
        <IdleScreensaver
          logoUrl={menu?.logo_url}
          bannerUrl={menu?.banner_url}
          onWakeUp={() => setIsIdle(false)}
        />
      )}

      {/* Cabecera Principal */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[var(--menu-bg)]/85 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {menu?.logo_url ? (
            <img src={menu.logo_url} alt={menu.name} className="h-10 w-auto object-contain" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[var(--menu-primary)]/20 border border-[var(--menu-primary)]/40 flex items-center justify-center text-lg">
              🍽️
            </div>
          )}
          <div>
            <h1 className="font-black text-base sm:text-lg leading-tight text-white">{menu?.name}</h1>
            {tableInfo?.tableCode ? (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Mesa {tableInfo.tableCode} (Auto-Servicio)
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Carta Digital</span>
            )}
          </div>
        </div>

        {/* Acciones de Cabecera (Llamar mesero + Carrito) */}
        <div className="flex items-center gap-2">
          {tableInfo?.tableCode && (
            <button
              onClick={handleCallWaiter}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-amber-400 border border-white/10 transition active:scale-90"
              title="Llamar al Mesero"
            >
              <BellRing className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative px-3.5 py-2.5 rounded-2xl bg-[var(--menu-primary)] text-white font-extrabold flex items-center gap-2 shadow-lg shadow-[var(--menu-primary)]/30 active:scale-95 transition"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="hidden sm:inline text-xs font-black">Q{cartTotal.toFixed(2)}</span>
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-slate-950 text-[10px] w-5 h-5 rounded-full font-black flex items-center justify-center shadow-md">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Portada Panorámica / Banner del Restaurante */}
      {menu?.banner_url && (
        <div className="relative w-full h-36 sm:h-52 overflow-hidden bg-slate-950">
          <img
            src={menu.banner_url}
            alt={menu.name}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--menu-bg,#0B0F19)] via-[var(--menu-bg,#0B0F19)]/40 to-transparent" />
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
          // Si la promoción es informativa o general, desplazamiento suave hacia los platillos
          const menuSection = document.querySelector('main');
          if (menuSection) {
            menuSection.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />

      {/* Buscador Rápido y Selector Horizontal de Categorías */}
      <div className="sticky top-[61px] z-20 backdrop-blur-md bg-[var(--menu-bg)]/90 border-b border-white/5 py-2 px-4 space-y-2">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar platillos o bebidas..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[var(--menu-primary)]"
            />
          </div>
        </div>

        <nav className="max-w-7xl mx-auto flex gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-[var(--menu-primary)] text-white shadow-md'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            Todo ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                Number(selectedCategory) === Number(cat.id)
                  ? 'bg-[var(--menu-primary)] text-white shadow-md'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Grid de Productos Adaptativo */}
      <main className="max-w-7xl mx-auto p-4 flex-1 w-full">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-xs">
            No se encontraron platillos en esta categoría o búsqueda.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={(prod) => setSelectedProduct(prod)}
              />
            ))}
          </div>
        )}
      </main>

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
