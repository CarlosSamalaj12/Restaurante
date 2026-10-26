// react-app/src/components/settings/DigitalMenuSection.jsx
// Panel administrativo para la gestión de Menús Digitales, Theming, Promociones y Códigos QR

import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Sparkles,
  Palette,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  RefreshCw,
  Check,
  Eye,
  Sliders,
  Image as ImageIcon,
  Layers,
  Lock,
  Unlock,
  AlertCircle,
  Copy,
  Download,
  Share2,
  Printer,
  Utensils,
  Smartphone,
  Globe,
  Instagram,
  Facebook,
  Phone,
  Compass,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Search,
  Camera,
  Clock,
  Filter,
  Languages,
  Save,
} from 'lucide-react';
import api from '../../api';
import { ConfirmDialog } from '../ConfirmDialog';
import { useToast } from '../../hooks/useToast';
import { ImageUploadField } from '../common/ImageUploadField';

export function DigitalMenuSection({ authUser }) {
  const isSuperadmin = String(authUser?.role || '').toLowerCase() === 'superadmin';
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [moduleEnabled, setModuleEnabled] = useState(false);
  const [togglingModule, setTogglingModule] = useState(false);

  // Estado para diálogo de confirmación moderno con diseño
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    itemName: '',
    itemDetail: '',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    variant: 'danger',
    loading: false,
    onConfirm: () => {},
  });

  const closeConfirm = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
  };

  const [activeTab, setActiveTab] = useState('menus'); // 'menus' | 'promotions' | 'qr-generator'
  const [menus, setMenus] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState(null);

  // Estados del editor de menú
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [menuForm, setMenuForm] = useState({
    id: null,
    name: '',
    slug: '',
    description: '',
    mode: 'interactive',
    primary_color: '#E63946',
    secondary_color: '#1D3557',
    bg_color: '#0F172A',
    text_color: '#F8FAFC',
    font_family: 'Inter, sans-serif',
    logo_url: '',
    banner_url: '',
    social_links: { instagram: '', facebook: '', tiktok: '', whatsapp: '' },
    categoryIds: [],
    productIds: [],
  });

  // Catálogo completo para selección granular y galería de fotos
  const [allCategories, setAllCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  // Estados para la pestaña de Fotos de Platillos
  const [dishPhotoFilter, setDishPhotoFilter] = useState('all'); // 'all' | 'without-photo' | 'with-photo'
  const [dishSearch, setDishSearch] = useState('');
  const [dishCategoryFilter, setDishCategoryFilter] = useState('');
  const [editingDish, setEditingDish] = useState(null);
  const [savingDish, setSavingDish] = useState(false);

  // Guardar cambios rápidos de multimedia y atributos de platillo
  const handleSaveDishInfo = async (e) => {
    e?.preventDefault();
    if (!editingDish) return;
    try {
      setSavingDish(true);
      await api.digitalMenu.updateProductInfo(editingDish.id, {
        image_url: editingDish.image_url,
        description: editingDish.description,
        estimated_prep_min: editingDish.estimated_prep_min,
      });
      setAllProducts((prev) =>
        prev.map((p) => (p.id === editingDish.id ? { ...p, ...editingDish } : p))
      );
      toast.success('Platillo actualizado para el Menú Digital');
      setEditingDish(null);
    } catch (err) {
      toast.error(err.message || 'Error al guardar platillo');
    } finally {
      setSavingDish(false);
    }
  };

  const handleQuickImageUpload = async (product, imageUrl) => {
    try {
      await api.digitalMenu.updateProductInfo(product.id, { image_url: imageUrl });
      setAllProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, image_url: imageUrl } : p))
      );
      toast.success(imageUrl ? `Foto actualizada para ${product.name}` : `Foto removida de ${product.name}`);
    } catch (err) {
      toast.error(err.message || 'Error al actualizar imagen del platillo');
    }
  };

  // Estados para la pestaña de Idiomas y Traducción Culinaria
  const [translationCatalog, setTranslationCatalog] = useState({ categories: [], products: [] });
  const [loadingTranslations, setLoadingTranslations] = useState(false);
  const [savingTranslations, setSavingTranslations] = useState(false);
  const [translatingAll, setTranslatingAll] = useState(false);
  const [translatingItemId, setTranslatingItemId] = useState(null);
  const [translationSearch, setTranslationSearch] = useState('');
  const [translationCategoryFilter, setTranslationCategoryFilter] = useState('');
  const [translationStatusFilter, setTranslationStatusFilter] = useState('all'); // 'all' | 'pending' | 'translated'
  const [translationSubTab, setTranslationSubTab] = useState('products'); // 'products' | 'categories'
  const [hasUnsavedTranslations, setHasUnsavedTranslations] = useState(false);

  const loadTranslations = async () => {
    try {
      setLoadingTranslations(true);
      const res = await api.digitalMenu.getTranslations();
      setTranslationCatalog({
        categories: res.categories || [],
        products: res.products || [],
      });
      setHasUnsavedTranslations(false);
    } catch (err) {
      console.error('Error cargando catálogo de traducciones:', err);
      toast.error('No se pudo cargar el catálogo de traducciones');
    } finally {
      setLoadingTranslations(false);
    }
  };

  const handleAutoTranslateAll = async (force = false) => {
    try {
      setTranslatingAll(true);
      const res = await api.digitalMenu.autoTranslate({
        categories: translationCatalog.categories,
        products: translationCatalog.products,
        force,
        persist: true,
      });
      if (res?.categories && res?.products) {
        setTranslationCatalog({
          categories: res.categories,
          products: res.products,
        });
      }
      setHasUnsavedTranslations(false);
      toast.success(
        force
          ? 'Todo el menú ha sido re-traducido al inglés con IA'
          : 'Platillos y categorías traducidos al inglés exitosamente'
      );
    } catch (err) {
      toast.error(err.message || 'Error al auto-traducir menú');
    } finally {
      setTranslatingAll(false);
    }
  };

  const handleTranslateSingleProduct = async (product) => {
    try {
      setTranslatingItemId(product.id);
      const res = await api.digitalMenu.autoTranslate({
        products: [product],
        force: true,
        persist: true,
      });
      const updatedProd = res?.products?.[0];
      if (updatedProd) {
        setTranslationCatalog((prev) => ({
          ...prev,
          products: prev.products.map((p) => (p.id === product.id ? { ...p, ...updatedProd } : p)),
        }));
        toast.success(`Traducción generada para "${product.name}"`);
      }
    } catch (err) {
      toast.error(err.message || 'Error al traducir platillo');
    } finally {
      setTranslatingItemId(null);
    }
  };

  const handleTranslateSingleCategory = async (category) => {
    try {
      setTranslatingItemId(`cat-${category.id}`);
      const res = await api.digitalMenu.autoTranslate({
        categories: [category],
        force: true,
        persist: true,
      });
      const updatedCat = res?.categories?.[0];
      if (updatedCat) {
        setTranslationCatalog((prev) => ({
          ...prev,
          categories: prev.categories.map((c) => (c.id === category.id ? { ...c, ...updatedCat } : c)),
        }));
        toast.success(`Traducción generada para categoría "${category.name}"`);
      }
    } catch (err) {
      toast.error(err.message || 'Error al traducir categoría');
    } finally {
      setTranslatingItemId(null);
    }
  };

  const handleSaveAllTranslations = async () => {
    try {
      setSavingTranslations(true);
      await api.digitalMenu.saveTranslations(translationCatalog);
      setHasUnsavedTranslations(false);
      toast.success('Todas las traducciones en inglés han sido guardadas');
    } catch (err) {
      toast.error(err.message || 'Error al guardar traducciones');
    } finally {
      setSavingTranslations(false);
    }
  };

  const handleProductTranslationChange = (id, field, value) => {
    setTranslationCatalog((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }));
    setHasUnsavedTranslations(true);
  };

  const handleCategoryTranslationChange = (id, value) => {
    setTranslationCatalog((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, name_en: value } : c)),
    }));
    setHasUnsavedTranslations(true);
  };

  // Estados de QR Tokens
  const [qrTokens, setQrTokens] = useState([]);
  const [loadingQr, setLoadingQr] = useState(false);
  const [regeneratingTableId, setRegeneratingTableId] = useState(null);

  // Estados de Promociones
  const [promotions, setPromotions] = useState([]);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [newPromo, setNewPromo] = useState({
    title: '',
    subtitle: '',
    badge_text: '',
    image_url: '',
    target_type: 'product',
    target_id: '',
  });

  // Cargar promociones del menú seleccionado
  const loadPromotions = async (menuId) => {
    if (!menuId) return;
    try {
      setLoadingPromos(true);
      const list = await api.digitalMenu.getPromotions(menuId);
      setPromotions(list || []);
    } catch (err) {
      console.error('Error cargando promociones:', err);
    } finally {
      setLoadingPromos(false);
    }
  };

  const handleCreatePromotion = async (e) => {
    e.preventDefault();
    if (!selectedMenu?.id) {
      toast.error('Selecciona un menú primero');
      return;
    }
    if (!newPromo.title || !newPromo.image_url) {
      toast.error('El título y la imagen del banner son obligatorios');
      return;
    }
    try {
      await api.digitalMenu.createPromotion({
        ...newPromo,
        menu_id: selectedMenu.id,
        target_id: newPromo.target_id ? Number(newPromo.target_id) : null,
      });
      toast.success('Banner promocional agregado exitosamente');
      setNewPromo({
        title: '',
        subtitle: '',
        badge_text: '',
        image_url: '',
        target_type: 'product',
        target_id: '',
      });
      setIsPromoModalOpen(false);
      loadPromotions(selectedMenu.id);
    } catch (err) {
      toast.error(err.message || 'Error al guardar el banner promocional');
    }
  };

  const handleDeletePromotion = (id, promoTitle) => {
    setConfirmDialog({
      isOpen: true,
      title: '¿Eliminar Banner Promocional?',
      message: 'Este banner se retirará inmediatamente del carrusel hero de los comensales.',
      itemName: promoTitle || 'Banner Promocional',
      itemDetail: selectedMenu ? `Menú: ${selectedMenu.name}` : '',
      variant: 'danger',
      confirmText: 'Eliminar Banner',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          await api.digitalMenu.deletePromotion(id);
          toast.success('Banner eliminado correctamente');
          if (selectedMenu?.id) loadPromotions(selectedMenu.id);
          closeConfirm();
        } catch (err) {
          toast.error(err.message || 'Error al eliminar el banner');
          closeConfirm();
        }
      },
    });
  };

  // Carga inicial
  const loadData = async () => {
    try {
      setLoading(true);
      const statusRes = await api.digitalMenu.getStatus();
      setModuleEnabled(statusRes.enabled);

      if (statusRes.enabled) {
        const [menusList, configData] = await Promise.all([
          api.digitalMenu.getMenus(),
          api.getConfigData().catch(() => ({})),
        ]);
        setMenus(menusList || []);
        setAllCategories(configData?.categories || []);
        setAllProducts(configData?.products || []);

        if (menusList?.length && !selectedMenu) {
          setSelectedMenu(menusList[0]);
        }
      }
    } catch (err) {
      console.error('Error cargando módulo de menú digital:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Cargar QR tokens, promociones o catálogo de traducciones al cambiar de menú o pestaña
  useEffect(() => {
    if (activeTab === 'qr-generator' && selectedMenu?.id) {
      loadQrTokens(selectedMenu.id);
    } else if (activeTab === 'promotions' && selectedMenu?.id) {
      loadPromotions(selectedMenu.id);
    } else if (activeTab === 'translations') {
      if (translationCatalog.products.length === 0) {
        loadTranslations();
      }
    }
  }, [activeTab, selectedMenu?.id]);

  const loadQrTokens = async (menuId) => {
    try {
      setLoadingQr(true);
      const tokens = await api.digitalMenu.getTableTokens(menuId);
      setQrTokens(tokens || []);
    } catch (err) {
      console.error('Error cargando tokens QR:', err);
    } finally {
      setLoadingQr(false);
    }
  };

  // Toggle de activación exclusiva de Superadmin con Diálogo Diseñado
  const handleToggleModule = () => {
    if (!isSuperadmin) return;
    const nextState = !moduleEnabled;
    setConfirmDialog({
      isOpen: true,
      title: nextState ? '¿Activar Módulo de Menú Digital?' : '¿Desactivar Módulo de Menú Digital?',
      message: nextState
        ? 'Se habilitará la licencia premium del Menú Digital, Auto-Comanda (QR/NFC) y Kiosco. Los administradores podrán gestionar cartas y los comensales ordenar desde sus mesas.'
        : 'Al desactivar el módulo, los comensales no podrán acceder a las cartas públicas ni generar pedidos por QR o Kiosco.',
      itemName: nextState ? 'Módulo: Menú Digital, Auto-Comanda & Kiosco' : 'Desactivación de Licencia',
      itemDetail: nextState ? 'Acceso: Superadmin, Administradores y Encargados' : 'Bloqueo para comensales en salón',
      variant: nextState ? 'success' : 'warning',
      confirmText: nextState ? 'Activar Módulo Ahora' : 'Desactivar Módulo',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          setTogglingModule(true);
          await api.digitalMenu.toggleModule(nextState);
          setModuleEnabled(nextState);
          toast.success(
            nextState
              ? 'Módulo de Menú Digital activado con éxito'
              : 'Módulo de Menú Digital desactivado'
          );
          if (nextState) loadData();
          closeConfirm();
        } catch (err) {
          toast.error(err.message || 'Error al actualizar estado del módulo');
          closeConfirm();
        } finally {
          setTogglingModule(false);
        }
      },
    });
  };

  // Abrir editor para crear o editar menú
  const handleOpenEditor = (menu = null) => {
    if (menu) {
      setMenuForm({
        id: menu.id,
        name: menu.name,
        slug: menu.slug,
        description: menu.description || '',
        mode: menu.mode || 'interactive',
        primary_color: menu.primary_color || '#E63946',
        secondary_color: menu.secondary_color || '#1D3557',
        bg_color: menu.bg_color || '#0F172A',
        text_color: menu.text_color || '#F8FAFC',
        font_family: menu.font_family || 'Inter, sans-serif',
        logo_url: menu.logo_url || '',
        banner_url: menu.banner_url || '',
        social_links: menu.social_links || { instagram: '', facebook: '', tiktok: '', whatsapp: '' },
        categoryIds: menu.categoryIds || allCategories.map((c) => c.id),
        productIds: menu.productIds || allProducts.map((p) => p.id),
      });
    } else {
      setMenuForm({
        id: null,
        name: '',
        slug: '',
        description: '',
        mode: 'interactive',
        primary_color: '#E63946',
        secondary_color: '#1D3557',
        bg_color: '#0F172A',
        text_color: '#F8FAFC',
        font_family: 'Inter, sans-serif',
        logo_url: '',
        banner_url: '',
        social_links: { instagram: '', facebook: '', tiktok: '', whatsapp: '' },
        categoryIds: allCategories.map((c) => c.id),
        productIds: allProducts.map((p) => p.id),
      });
    }
    setIsEditorOpen(true);
  };

  // Guardar Menú
  const handleSaveMenu = async (e) => {
    e.preventDefault();
    try {
      if (menuForm.id) {
        await api.digitalMenu.updateMenu(menuForm.id, menuForm);
        toast.success(`Menú "${menuForm.name}" actualizado`);
      } else {
        await api.digitalMenu.createMenu(menuForm);
        toast.success(`Menú "${menuForm.name}" creado`);
      }
      setIsEditorOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Error al guardar el menú');
    }
  };

  // Eliminar Menú con Diálogo Diseñado
  const handleDeleteMenu = (id) => {
    const targetMenu = menus.find((m) => m.id === id);
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Menú Digital',
      message: '¿Estás seguro de eliminar este menú digital? Se desvincularán sus categorías y códigos QR asociados.',
      itemName: targetMenu ? `${targetMenu.name}` : 'Menú Digital',
      itemDetail: targetMenu ? `Ruta pública: /m/${targetMenu.slug}` : '',
      variant: 'danger',
      confirmText: 'Eliminar Menú',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          await api.digitalMenu.deleteMenu(id);
          toast.success('Menú digital eliminado');
          loadData();
          closeConfirm();
        } catch (err) {
          toast.error(err.message || 'Error al eliminar el menú');
          closeConfirm();
        }
      },
    });
  };

  // Regenerar Token QR de Mesa con Diálogo Diseñado
  const handleRegenerateQr = (tableId) => {
    const table = qrTokens.find((t) => t.tableId === tableId);
    setConfirmDialog({
      isOpen: true,
      title: 'Renovar Código QR de Mesa',
      message: 'Se generará una nueva firma criptográfica HMAC anti-suplantación. El código QR físico anterior dejará de funcionar inmediatamente.',
      itemName: table ? `Mesa ${table.tableCode}` : 'Mesa del Restaurante',
      itemDetail: table ? `Área: ${table.areaName || 'Salón Principal'}` : '',
      variant: 'warning',
      confirmText: 'Renovar Código QR',
      loading: false,
      onConfirm: async () => {
        try {
          setConfirmDialog((prev) => ({ ...prev, loading: true }));
          setRegeneratingTableId(tableId);
          await api.digitalMenu.regenerateQRToken(tableId, selectedMenu.id);
          await loadQrTokens(selectedMenu.id);
          toast.success(`Código QR de Mesa ${table?.tableCode || ''} renovado`);
          closeConfirm();
        } catch (err) {
          toast.error(err.message || 'Error al regenerar token');
          closeConfirm();
        } finally {
          setRegeneratingTableId(null);
        }
      },
    });
  };

  // Imprimir fichas de QR para todas las mesas
  const handlePrintAllQrs = () => {
    if (!qrTokens.length) {
      toast.warning('No hay mesas configuradas para imprimir.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Fichas QR - ${selectedMenu?.name || 'Menú Digital'}</title>
          <style>
            @page { size: letter portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 12px; background: #fff; color: #111; }
            .header-banner { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
            .card { border: 2.5px dashed #cbd5e1; border-radius: 20px; padding: 20px; text-align: center; page-break-inside: avoid; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; }
            .table-badge { font-size: 24px; font-weight: 900; background: #0f172a; color: #fff; padding: 6px 20px; border-radius: 999px; margin-bottom: 6px; letter-spacing: 0.5px; }
            .area-name { font-size: 13px; color: #64748b; font-weight: 700; margin-bottom: 14px; text-transform: uppercase; }
            .qr-img { width: 190px; height: 190px; margin: 6px 0; border-radius: 16px; background: #fff; padding: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .cta { font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 10px; }
            .sub-cta { font-size: 11px; color: #64748b; margin-top: 4px; max-width: 200px; }
            .footer-url { font-size: 8px; font-family: monospace; color: #94a3b8; margin-top: 10px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <h1 style="margin:0; font-size: 22px; font-weight:900;">CÓDIGOS QR DE MESAS · AUTO-COMANDA</h1>
            <p style="margin:4px 0 0; font-size:12px; color:#64748b;">${selectedMenu?.name || 'Menú'} — Enlaces con firma criptográfica anti-suplantación</p>
          </div>
          <div class="grid">
            ${qrTokens
              .map((table) => {
                const fullUrl = `${window.location.origin}${table.url}`;
                const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                  fullUrl
                )}`;
                return `
                <div class="card">
                  <div class="table-badge">MESA ${table.tableCode}</div>
                  <div class="area-name">${table.areaName || 'Salón Principal'}</div>
                  <img class="qr-img" src="${qrImg}" alt="QR Mesa ${table.tableCode}" />
                  <div class="cta">📱 ESCANEA PARA ORDENAR</div>
                  <div class="sub-cta">Descubre el menú, ordena y pide la cuenta desde tu mesa</div>
                  <div class="footer-url">${fullUrl}</div>
                </div>
              `;
              })
              .join('')}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 600);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Vista de bloqueo si el módulo está inactivo
  if (!loading && !moduleEnabled) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center shadow-sm relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Módulo Premium Opcional
          </span>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Menú Digital, Auto-Comanda (QR/NFC) y Kiosco
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto text-sm mb-6 leading-relaxed">
            Permite a tus comensales ordenar directamente desde sus teléfonos en la mesa o totems táctiles, con personalización en Wizard, fotos en alta calidad, y sincronización en tiempo real con cocina.
          </p>

          {isSuperadmin ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-md mx-auto space-y-3">
              <span className="text-xs font-semibold text-slate-700 block">
                Acceso de Super Administrador detectado
              </span>
              <button
                disabled={togglingModule}
                onClick={handleToggleModule}
                className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 transition active:scale-[0.98]"
              >
                <Unlock className="w-4 h-4" />
                {togglingModule ? 'Activando módulo...' : 'Activar Módulo Premium Ahora'}
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-xs text-slate-600 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>Este módulo se encuentra desactivado. Solicita al Super Administrador su activación.</span>
            </div>
          )}
        </div>

        {/* Diálogo de Confirmación Moderno */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          itemName={confirmDialog.itemName}
          itemDetail={confirmDialog.itemDetail}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          variant={confirmDialog.variant}
          loading={confirmDialog.loading}
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeConfirm}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera del Módulo con Estado de Licencia */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shadow-xs">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Menús Digitales y Auto-Comanda</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                Premium Activo
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Personaliza cartas dinámicas, códigos QR y totems de auto-servicio para comensales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSuperadmin && (
            <button
              onClick={handleToggleModule}
              disabled={togglingModule}
              className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition shadow-2xs"
              title="Desactivar módulo para la cuenta"
            >
              Desactivar Módulo
            </button>
          )}
          <button
            onClick={() => handleOpenEditor()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-rose-500/20 active:scale-[0.98] transition"
          >
            <Plus className="w-4 h-4" /> Nuevo Menú
          </button>
        </div>
      </div>

      {/* Sub-navegación estilo Segmented Control */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab('menus')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'menus'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Palette className={`w-4 h-4 ${activeTab === 'menus' ? 'text-rose-600' : 'text-slate-400'}`} />
          <span>Mis Menús ({menus.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('dish-photos')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'dish-photos'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Utensils className={`w-4 h-4 ${activeTab === 'dish-photos' ? 'text-rose-600' : 'text-slate-400'}`} />
          <span>Fotos de Platillos ({allProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('promotions')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'promotions'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${activeTab === 'promotions' ? 'text-amber-500' : 'text-slate-400'}`} />
          <span>Banners & Promociones</span>
        </button>

        <button
          onClick={() => setActiveTab('qr-generator')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'qr-generator'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <QrCode className={`w-4 h-4 ${activeTab === 'qr-generator' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>Códigos QR & Tags NFC</span>
        </button>

        <button
          onClick={() => setActiveTab('translations')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
            activeTab === 'translations'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Languages className={`w-4 h-4 ${activeTab === 'translations' ? 'text-blue-600' : 'text-slate-400'}`} />
          <span>Idiomas & Traducción</span>
          {translationCatalog.products.some((p) => !p.name_en) && (
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block ml-0.5" title="Hay platillos pendientes de traducir" />
          )}
        </button>
      </div>

      {/* ─── PESTAÑA 1: LISTADO DE MENÚS Y THEMING ─── */}
      {activeTab === 'menus' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {menus.map((m) => (
            <div
              key={m.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-md flex flex-col group transition-all duration-200"
            >
              {/* Barra de colores temáticos representativa */}
              <div className="h-2 w-full flex">
                <div className="h-full flex-1" style={{ backgroundColor: m.primary_color }} />
                <div className="h-full flex-1" style={{ backgroundColor: m.secondary_color }} />
                <div className="h-full flex-1" style={{ backgroundColor: m.bg_color }} />
              </div>

              {/* Vista previa de Banner y Logo */}
              {m.banner_url ? (
                <div className="h-28 w-full relative overflow-hidden bg-slate-100 border-b border-slate-100">
                  <img
                    src={m.banner_url}
                    alt={m.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  {m.logo_url && (
                    <div className="absolute bottom-2 left-4 w-11 h-11 rounded-xl bg-white border border-slate-200 p-1 shadow-md flex items-center justify-center">
                      <img src={m.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                </div>
              ) : m.logo_url ? (
                <div className="px-5 pt-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shadow-xs">
                    <img src={m.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                </div>
              ) : null}

              <div className="p-5 flex-1 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-rose-600 transition">
                      {m.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                        /m/{m.slug}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.mode === 'interactive'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {m.mode === 'interactive' ? 'Auto-Comanda' : 'Solo Lectura'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2">
                  {m.description || 'Sin descripción configurada.'}
                </p>

                {/* Preview de Colores y Theming */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-[11px] text-slate-500">Paleta de color:</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300 shadow-xs"
                        style={{ backgroundColor: m.primary_color }}
                        title="Primario"
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300 shadow-xs"
                        style={{ backgroundColor: m.secondary_color }}
                        title="Secundario"
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300 shadow-xs"
                        style={{ backgroundColor: m.bg_color }}
                        title="Fondo"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 text-[11px]">
                    <span className="text-slate-500">Tipografía:</span>
                    <span className="font-mono text-slate-800">{m.font_family?.split(',')[0]}</span>
                  </div>
                </div>
              </div>

              {/* Acciones de la Tarjeta */}
              <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                <a
                  href={`/m/${m.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-600" /> Probar Menú
                </a>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditor(m)}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 transition"
                    title="Editar configuración"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMenu(m);
                      setActiveTab('qr-generator');
                    }}
                    className="p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
                    title="Ver Códigos QR"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  {menus.length > 1 && (
                    <button
                      onClick={() => handleDeleteMenu(m.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-white border border-transparent hover:border-slate-200 transition"
                      title="Eliminar menú"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── PESTAÑA 2: BANNERS PROMOCIONALES & CARRUSEL HERO ─── */}
      {activeTab === 'promotions' && (
        <div className="space-y-5">
          {/* Barra Superior con Selector de Menú y Botón de Nuevo Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600">Menú seleccionado:</span>
              <select
                value={selectedMenu?.id || ''}
                onChange={(e) => {
                  const m = menus.find((x) => x.id === Number(e.target.value));
                  setSelectedMenu(m);
                }}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-rose-500"
              >
                {menus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (/m/{m.slug})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsPromoModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm shadow-rose-500/20 transition active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Banner Promocional</span>
            </button>
          </div>

          {/* Listado de Banners Promocionales */}
          {loadingPromos ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
              <p className="text-xs font-semibold">Cargando banners del carrusel...</p>
            </div>
          ) : promotions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200/80 text-amber-500 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Sin Banners Promocionales</h3>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Agrega banners atractivos con ofertas, 2x1 o combos para captar la atención de tus clientes en la cabecera interactiva del menú.
              </p>
              <button
                onClick={() => setIsPromoModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-rose-500/20 transition active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" /> Crear Primer Banner
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-md flex flex-col group transition-all duration-200"
                >
                  {/* Imagen del Banner */}
                  <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                    <img
                      src={promo.image_url}
                      alt={promo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    {promo.badge_text && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white shadow-sm">
                        {promo.badge_text}
                      </span>
                    )}
                  </div>

                  {/* Información */}
                  <div className="p-4 flex-1 space-y-2">
                    <h4 className="font-bold text-base text-slate-900 group-hover:text-rose-600 transition">
                      {promo.title}
                    </h4>
                    {promo.subtitle && (
                      <p className="text-xs text-slate-500 line-clamp-2">{promo.subtitle}</p>
                    )}
                    <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {promo.target_type === 'product'
                          ? 'Abre detalle de platillo'
                          : promo.target_type === 'category'
                          ? 'Filtra categoría'
                          : 'Informativo'}
                      </span>
                      <button
                        onClick={() => handleDeletePromotion(promo.id, promo.title)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Eliminar banner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── PESTAÑA 3: GENERADOR Y ADMINISTRADOR DE QR/NFC POR MESA ─── */}
      {activeTab === 'qr-generator' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600">Menú seleccionado:</span>
              <select
                value={selectedMenu?.id || ''}
                onChange={(e) => {
                  const m = menus.find((x) => x.id === Number(e.target.value));
                  setSelectedMenu(m);
                }}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-rose-500"
              >
                {menus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (/m/{m.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 hidden md:inline">
                {qrTokens.length} mesas configuradas con firma criptográfica
              </span>
              <button
                onClick={handlePrintAllQrs}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-rose-500/20 transition active:scale-[0.98]"
                title="Genera hoja de impresión con fichas de todas las mesas"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Fichas (Todas)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {qrTokens.map((table) => {
              const fullUrl = `${window.location.origin}${table.url}`;
              const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                fullUrl
              )}`;

              return (
                <div
                  key={table.tableId}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 flex flex-col items-center text-center space-y-3 shadow-xs hover:shadow-md transition-all"
                >
                  <div className="w-full flex items-center justify-between text-xs font-bold">
                    <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                      Mesa {table.tableCode}
                    </span>
                    <span className="text-slate-500 font-normal">{table.areaName}</span>
                  </div>

                  {/* Imagen QR Generada */}
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-2xs my-1">
                    <img
                      src={qrApiUrl}
                      alt={`QR Mesa ${table.tableCode}`}
                      className="w-36 h-36 object-contain"
                      loading="lazy"
                    />
                  </div>

                  <div className="w-full space-y-1">
                    <div className="text-[11px] font-mono text-slate-600 truncate bg-slate-50 p-1.5 rounded-lg border border-slate-200/80">
                      {table.url}
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="w-full grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={qrApiUrl}
                      download={`QR_Mesa_${table.tableCode}.png`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" /> Descargar
                    </a>
                    <button
                      disabled={regeneratingTableId === table.tableId}
                      onClick={() => handleRegenerateQr(table.tableId)}
                      className="py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition"
                      title="Invalida el QR anterior y genera una nueva firma criptográfica"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-amber-500 ${
                          regeneratingTableId === table.tableId ? 'animate-spin' : ''
                        }`}
                      />
                      Renovar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── PESTAÑA 4: FOTOS Y MULTIMEDIA DE PLATILLOS (CONVERSIÓN WEBP) ─── */}
      {activeTab === 'dish-photos' && (() => {
        const dishesWithPhotoCount = allProducts.filter((p) => p.image_url && String(p.image_url).trim()).length;
        const dishesWithoutPhotoCount = allProducts.length - dishesWithPhotoCount;

        const filteredDishes = allProducts.filter((p) => {
          if (dishSearch.trim()) {
            const q = dishSearch.toLowerCase();
            const matchName = String(p.name || '').toLowerCase().includes(q);
            const matchCat = String(p.category_name || '').toLowerCase().includes(q);
            if (!matchName && !matchCat) return false;
          }
          if (dishCategoryFilter && Number(p.category_id) !== Number(dishCategoryFilter)) {
            return false;
          }
          const hasPhoto = Boolean(p.image_url && String(p.image_url).trim());
          if (dishPhotoFilter === 'without-photo' && hasPhoto) return false;
          if (dishPhotoFilter === 'with-photo' && !hasPhoto) return false;
          return true;
        });

        return (
          <div className="space-y-5">
            {/* Barra Superior con Contadores, Buscador y Filtros */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-rose-600" />
                    Fotos y Presencia de Platillos en el Menú Digital
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sube y gestiona fotos de tus productos. Todas las imágenes se convierten automáticamente a formato WebP para máxima velocidad y nitidez.
                  </p>
                </div>

                {/* Contadores / Badges de Estado */}
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                    Total: <strong>{allProducts.length}</strong>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    Con Foto: <strong>{dishesWithPhotoCount}</strong>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                    Sin Foto: <strong>{dishesWithoutPhotoCount}</strong>
                  </span>
                </div>
              </div>

              {/* Controles de Búsqueda y Filtro de Fotos */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
                {/* Filtros de foto: Todos / Sin Foto / Con Foto */}
                <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setDishPhotoFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      dishPhotoFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos ({allProducts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDishPhotoFilter('without-photo')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                      dishPhotoFilter === 'without-photo'
                        ? 'bg-amber-500 text-white shadow-xs font-bold'
                        : 'text-amber-700 hover:text-amber-800'
                    }`}
                  >
                    <span>⚠️ Sin Foto ({dishesWithoutPhotoCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDishPhotoFilter('with-photo')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      dishPhotoFilter === 'with-photo'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'text-emerald-700 hover:text-emerald-800'
                    }`}
                  >
                    ✓ Con Foto ({dishesWithPhotoCount})
                  </button>
                </div>

                {/* Selector de Categoría */}
                <select
                  value={dishCategoryFilter}
                  onChange={(e) => setDishCategoryFilter(e.target.value)}
                  className="w-full sm:w-48 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-rose-500"
                >
                  <option value="">Todas las categorías</option>
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Buscador de Platillos */}
                <div className="relative w-full sm:flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={dishSearch}
                    onChange={(e) => setDishSearch(e.target.value)}
                    placeholder="Buscar platillo por nombre..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Grilla de Platillos */}
            {filteredDishes.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-md mx-auto shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Utensils className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">No se encontraron platillos</h4>
                <p className="text-xs text-slate-500">
                  Prueba cambiando los filtros o el término de búsqueda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDishes.map((product) => {
                  const hasPhoto = Boolean(product.image_url && String(product.image_url).trim());
                  return (
                    <div
                      key={product.id}
                      className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
                    >
                      {/* Zona Visual de Foto */}
                      <div className="relative h-44 w-full bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100">
                        {hasPhoto ? (
                          <>
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              loading="lazy"
                            />
                            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-emerald-400 backdrop-blur-xs border border-white/20">
                              WebP Activo
                            </span>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mb-2 shadow-xs">
                              <Camera className="w-6 h-6" />
                            </div>
                            <span className="text-[11px] font-bold text-amber-700">Sin Foto Asignada</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">Haz clic abajo para subir</span>
                          </div>
                        )}

                        {/* Pill de Precio Flotante */}
                        <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-white/95 text-slate-900 shadow-sm border border-slate-200/80">
                          Q{Number(product.base_price || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Información del Platillo */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                              {product.category_name || 'General'}
                            </span>
                            {product.estimated_prep_min && (
                              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                                <Clock className="w-3 h-3 text-emerald-500" /> ~{product.estimated_prep_min}m
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 group-hover:text-rose-600 transition line-clamp-1">
                            {product.name}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                            {product.description || 'Sin descripción configurada para el menú.'}
                          </p>
                        </div>

                        {/* Botones de Acción */}
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingDish({ ...product })}
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>{hasPhoto ? 'Editar / Cambiar' : '+ Subir Foto'}</span>
                          </button>

                          {hasPhoto && (
                            <button
                              type="button"
                              onClick={() => handleQuickImageUpload(product, null)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                              title="Quitar foto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── PESTAÑA 5: IDIOMAS Y TRADUCCIÓN CULINARIA MULTILINGÜE ─── */}
      {activeTab === 'translations' && (() => {
        const products = translationCatalog.products || [];
        const categories = translationCatalog.categories || [];

        const translatedProductsCount = products.filter(
          (p) => p.name_en && String(p.name_en).trim()
        ).length;
        const pendingProductsCount = products.length - translatedProductsCount;

        const translatedCategoriesCount = categories.filter(
          (c) => c.name_en && String(c.name_en).trim()
        ).length;

        // Filtrado de Platillos
        const filteredProducts = products.filter((p) => {
          if (translationSearch.trim()) {
            const q = translationSearch.toLowerCase();
            const matchName = String(p.name || '').toLowerCase().includes(q);
            const matchNameEn = String(p.name_en || '').toLowerCase().includes(q);
            const matchCat = String(p.category_name || '').toLowerCase().includes(q);
            if (!matchName && !matchNameEn && !matchCat) return false;
          }
          if (translationCategoryFilter && Number(p.category_id) !== Number(translationCategoryFilter)) {
            return false;
          }
          const isTranslated = Boolean(p.name_en && String(p.name_en).trim());
          if (translationStatusFilter === 'pending' && isTranslated) return false;
          if (translationStatusFilter === 'translated' && !isTranslated) return false;
          return true;
        });

        // Filtrado de Categorías
        const filteredCategories = categories.filter((c) => {
          if (translationSearch.trim()) {
            const q = translationSearch.toLowerCase();
            const matchName = String(c.name || '').toLowerCase().includes(q);
            const matchNameEn = String(c.name_en || '').toLowerCase().includes(q);
            if (!matchName && !matchNameEn) return false;
          }
          return true;
        });

        return (
          <div className="space-y-5">
            {/* Cabecera Principal de Traducción */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shadow-xs">
                      <Languages className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        Idiomas y Traducción Culinaria (Español / Inglés)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Los comensales podrán cambiar de idioma en cualquier momento usando el botón{' '}
                        <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md">
                          [ 🇪🇸 ES | 🇺🇸 EN ]
                        </span>
                        . Las comandas a cocina siempre se imprimen y muestran en español.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Acciones Globales: Auto-traducir con IA y Guardar */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => loadTranslations()}
                    disabled={loadingTranslations}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                    title="Recargar catálogo de traducciones"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingTranslations ? 'animate-spin text-blue-600' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAutoTranslateAll(false)}
                    disabled={translatingAll || loadingTranslations}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-blue-500/20 active:scale-[0.98] transition disabled:opacity-50"
                    title="Traduce automáticamente los nombres y descripciones que aún no tengan versión en inglés"
                  >
                    <Sparkles className={`w-4 h-4 ${translatingAll ? 'animate-spin' : ''}`} />
                    <span>{translatingAll ? 'Traduciendo con IA...' : 'Auto-traducir Pendientes'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAutoTranslateAll(true)}
                    disabled={translatingAll || loadingTranslations}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                    title="Fuerza una nueva traducción con IA para todos los elementos del menú"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Re-traducir Todo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAllTranslations}
                    disabled={savingTranslations || loadingTranslations}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-sm active:scale-[0.98] ${
                      hasUnsavedTranslations
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingTranslations ? 'Guardando...' : hasUnsavedTranslations ? 'Guardar Cambios *' : 'Guardado'}</span>
                  </button>
                </div>
              </div>

              {/* Métricas / Badges Resumen */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  Total Platillos: <strong>{products.length}</strong>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  Traducidos al Inglés: <strong>{translatedProductsCount}</strong>
                </span>
                {pendingProductsCount > 0 ? (
                  <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                    Pendientes de Traducir: <strong>{pendingProductsCount}</strong>
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                    ✓ 100% Menú Traducido
                  </span>
                )}
                <span className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                  Categorías Traducidas: <strong>{translatedCategoriesCount}/{categories.length}</strong>
                </span>
              </div>
            </div>

            {/* Sub-selector: Platillos vs Categorías */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs w-fit">
                <button
                  type="button"
                  onClick={() => setTranslationSubTab('products')}
                  className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                    translationSubTab === 'products'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5 text-blue-600" />
                  <span>Platillos ({products.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTranslationSubTab('categories')}
                  className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                    translationSubTab === 'categories'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Categorías ({categories.length})</span>
                </button>
              </div>

              {/* Filtros para Platillos */}
              {translationSubTab === 'products' && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* Selector de Estado */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setTranslationStatusFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        translationStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setTranslationStatusFilter('pending')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                        translationStatusFilter === 'pending' ? 'bg-amber-500 text-white shadow-xs font-bold' : 'text-amber-700'
                      }`}
                    >
                      <span>⚠️ Pendientes ({pendingProductsCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTranslationStatusFilter('translated')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        translationStatusFilter === 'translated' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-emerald-700'
                      }`}
                    >
                      ✓ Traducidos
                    </button>
                  </div>

                  {/* Selector de Categoría */}
                  <select
                    value={translationCategoryFilter}
                    onChange={(e) => setTranslationCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Todas las categorías</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {/* Buscador */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={translationSearch}
                      onChange={(e) => setTranslationSearch(e.target.value)}
                      placeholder="Buscar platillo..."
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 w-44"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ─── VISTA 1: LISTADO DE PLATILLOS ─── */}
            {translationSubTab === 'products' && (
              <div>
                {loadingTranslations ? (
                  <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-xs font-semibold">Cargando catálogo para traducción...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-md mx-auto shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <Utensils className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mb-1">No se encontraron platillos</h4>
                    <p className="text-xs text-slate-500">Prueba cambiando los filtros o el término de búsqueda.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredProducts.map((p) => {
                      const isTranslatingThis = translatingItemId === p.id;
                      const hasTranslation = Boolean(p.name_en && String(p.name_en).trim());

                      return (
                        <div
                          key={p.id}
                          className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col gap-3"
                        >
                          {/* Fila Superior: Metadata del platillo */}
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                {p.category_name || 'Sin Categoría'}
                              </span>
                              <span className="text-xs font-semibold text-slate-600">
                                Q{Number(p.base_price || 0).toFixed(2)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  hasTranslation
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {hasTranslation ? '✓ En Inglés' : '⚠️ Sin traducir'}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleTranslateSingleProduct(p)}
                                disabled={isTranslatingThis}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                                title="Traducir este platillo con IA"
                              >
                                <Sparkles className={`w-3 h-3 ${isTranslatingThis ? 'animate-spin' : ''}`} />
                                <span>{isTranslatingThis ? 'Traduciendo...' : 'Auto-traducir'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Comparativa: Español (Oficial Cocina) vs Inglés (Comensales) */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Columna Izquierda: Español (Referencia) */}
                            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                  <span>🇪🇸</span> Español (Oficial Restaurante & Cocina):
                                </span>
                              </div>
                              <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                              <p className="text-xs text-slate-500 line-clamp-3">
                                {p.description || <span className="italic text-slate-400">Sin descripción en español</span>}
                              </p>
                            </div>

                            {/* Columna Derecha: Inglés (Editable) */}
                            <div className="bg-blue-50/30 p-3.5 rounded-xl border border-blue-200/70 space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                  <span>🇺🇸</span> Nombre en Inglés (English Name):
                                </label>
                              </div>
                              <input
                                type="text"
                                value={p.name_en || ''}
                                onChange={(e) => handleProductTranslationChange(p.id, 'name_en', e.target.value)}
                                placeholder="Ej: Crispy Fried Chicken Burger"
                                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                              />

                              <label className="text-[11px] font-bold text-slate-700 block">
                                Descripción en Inglés (English Description):
                              </label>
                              <textarea
                                rows={2}
                                value={p.description_en || ''}
                                onChange={(e) => handleProductTranslationChange(p.id, 'description_en', e.target.value)}
                                placeholder="Ej: Crispy marinated breast served with fresh lettuce, cheddar cheese and homemade fries..."
                                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─── VISTA 2: LISTADO DE CATEGORÍAS ─── */}
            {translationSubTab === 'categories' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCategories.map((c) => {
                  const isTranslatingThis = translatingItemId === `cat-${c.id}`;
                  const hasTranslation = Boolean(c.name_en && String(c.name_en).trim());

                  return (
                    <div
                      key={c.id}
                      className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">Categoría #{c.id}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            hasTranslation
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {hasTranslation ? '✓ En Inglés' : '⚠️ Sin traducir'}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                          🇪🇸 Nombre Oficial (Español):
                        </span>
                        <span className="text-sm font-bold text-slate-900">{c.name}</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                          <span>🇺🇸 Nombre en Inglés:</span>
                          <button
                            type="button"
                            onClick={() => handleTranslateSingleCategory(c)}
                            disabled={isTranslatingThis}
                            className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                          >
                            <Sparkles className={`w-3 h-3 ${isTranslatingThis ? 'animate-spin' : ''}`} />
                            <span>{isTranslatingThis ? 'Traduciendo...' : 'Auto-traducir'}</span>
                          </button>
                        </label>
                        <input
                          type="text"
                          value={c.name_en || ''}
                          onChange={(e) => handleCategoryTranslationChange(c.id, e.target.value)}
                          placeholder="Ej: Starters & Appetizers"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:bg-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── MODAL EDITOR DE MENÚ (THEMING DINÁMICO & PRODUCTOS) ─── */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Palette className="w-5 h-5 text-rose-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  {menuForm.id ? `Editar ${menuForm.name}` : 'Crear Nuevo Menú Digital'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="p-6 overflow-y-auto space-y-6 text-slate-700 text-xs">
              {/* Información Básica */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre del Menú:</label>
                  <input
                    type="text"
                    required
                    value={menuForm.name}
                    onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                    placeholder="Ej: Menú Desayunos, Terraza, Bar"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Slug (Ruta URL):</label>
                  <input
                    type="text"
                    required
                    value={menuForm.slug}
                    onChange={(e) => setMenuForm({ ...menuForm, slug: e.target.value })}
                    placeholder="ej: desayunos, terraza, bar"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
                  />
                </div>
              </div>

              {/* Selector de Modo */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-2">Modalidad de Operación:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMenuForm({ ...menuForm, mode: 'interactive' })}
                    className={`p-3.5 rounded-2xl border text-left text-xs font-semibold flex items-start gap-3 transition ${
                      menuForm.mode === 'interactive'
                        ? 'border-emerald-500 bg-emerald-50/60 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Auto-Comanda Interactiva</div>
                      <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                        Los clientes agregan al carrito, personalizan y envían comandas directamente a cocina.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMenuForm({ ...menuForm, mode: 'catalog' })}
                    className={`p-3.5 rounded-2xl border text-left text-xs font-semibold flex items-start gap-3 transition ${
                      menuForm.mode === 'catalog'
                        ? 'border-blue-500 bg-blue-50/60 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Solo Lectura / Catálogo</div>
                      <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                        Los clientes ven fotos, precios y descripciones, pero el mesero toma la orden en persona.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Theming Dinámico: Paleta de Colores */}
              <div className="space-y-3">
                <label className="block font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-rose-500" /> Theming Dinámico (Variables CSS del Menú):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">Color Primario:</span>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input
                        type="color"
                        value={menuForm.primary_color}
                        onChange={(e) => setMenuForm({ ...menuForm, primary_color: e.target.value })}
                        className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                      />
                      <span className="text-xs font-mono text-slate-700">{menuForm.primary_color}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">Color Secundario:</span>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input
                        type="color"
                        value={menuForm.secondary_color}
                        onChange={(e) => setMenuForm({ ...menuForm, secondary_color: e.target.value })}
                        className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                      />
                      <span className="text-xs font-mono text-slate-700">{menuForm.secondary_color}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">Fondo de Pantalla:</span>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input
                        type="color"
                        value={menuForm.bg_color}
                        onChange={(e) => setMenuForm({ ...menuForm, bg_color: e.target.value })}
                        className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                      />
                      <span className="text-xs font-mono text-slate-700">{menuForm.bg_color}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">Texto Principal:</span>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input
                        type="color"
                        value={menuForm.text_color}
                        onChange={(e) => setMenuForm({ ...menuForm, text_color: e.target.value })}
                        className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                      />
                      <span className="text-xs font-mono text-slate-700">{menuForm.text_color}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Identidad Visual y Multimedia: Logo y Banner */}
              <div className="space-y-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-rose-500" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Identidad Visual y Multimedia
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ImageUploadField
                    label="Logo del Menú / Restaurante"
                    value={menuForm.logo_url}
                    onChange={(val) => setMenuForm({ ...menuForm, logo_url: val })}
                    type="logos"
                    aspectRatio="square"
                    helperText="Recomendado: PNG o WebP transparente"
                  />

                  <ImageUploadField
                    label="Banner / Cabecera Panorámica"
                    value={menuForm.banner_url}
                    onChange={(val) => setMenuForm({ ...menuForm, banner_url: val })}
                    type="banners"
                    aspectRatio="banner"
                    helperText="Recomendado: 1200x400 px, JPG o WebP"
                  />
                </div>
              </div>

              {/* Redes Sociales y Contacto */}
              <div className="space-y-3">
                <label className="block font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-sky-500" /> Redes Sociales & Contacto en la Carta:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">Instagram (@usuario o URL):</span>
                    <input
                      type="text"
                      value={menuForm.social_links.instagram || ''}
                      onChange={(e) =>
                        setMenuForm({
                          ...menuForm,
                          social_links: { ...menuForm.social_links, instagram: e.target.value },
                        })
                      }
                      placeholder="https://instagram.com/mirestaurante"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">Facebook (Página o URL):</span>
                    <input
                      type="text"
                      value={menuForm.social_links.facebook || ''}
                      onChange={(e) =>
                        setMenuForm({
                          ...menuForm,
                          social_links: { ...menuForm.social_links, facebook: e.target.value },
                        })
                      }
                      placeholder="https://facebook.com/mirestaurante"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">WhatsApp (Número con código de país):</span>
                    <input
                      type="text"
                      value={menuForm.social_links.whatsapp || ''}
                      onChange={(e) =>
                        setMenuForm({
                          ...menuForm,
                          social_links: { ...menuForm.social_links, whatsapp: e.target.value },
                        })
                      }
                      placeholder="https://wa.me/50212345678"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-1">TikTok (@usuario):</span>
                    <input
                      type="text"
                      value={menuForm.social_links.tiktok || ''}
                      onChange={(e) =>
                        setMenuForm({
                          ...menuForm,
                          social_links: { ...menuForm.social_links, tiktok: e.target.value },
                        })
                      }
                      placeholder="https://tiktok.com/@mirestaurante"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Selección Granular de Categorías */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-2">
                  Categorías Incluidas en este Menú:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
                  {allCategories.map((cat) => {
                    const isChecked = menuForm.categoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          const next = isChecked
                            ? menuForm.categoryIds.filter((id) => id !== cat.id)
                            : [...menuForm.categoryIds, cat.id];
                          setMenuForm({ ...menuForm, categoryIds: next });
                        }}
                        className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 text-left transition ${
                          isChecked
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border transition ${
                            isChecked ? 'bg-rose-600 border-rose-600 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botones del Modal */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-semibold shadow-sm shadow-rose-500/20 active:scale-[0.98] transition"
                >
                  Guardar Menú
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL NUEVO BANNER PROMOCIONAL (CON SUBIDA DE IMAGEN PREMIUM) ─── */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-slate-900">Nuevo Banner Promocional</h3>
              </div>
              <button
                onClick={() => setIsPromoModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePromotion} className="p-6 space-y-4 text-xs text-slate-700">
              {/* Uploader de Banner Panorámico */}
              <ImageUploadField
                label="Imagen del Banner Promocional"
                value={newPromo.image_url}
                onChange={(val) => setNewPromo({ ...newPromo, image_url: val })}
                type="banners"
                aspectRatio="banner"
                helperText="Recomendado: 1200x500 px, formato JPG, PNG o WebP"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Título de la Oferta / Promo:</label>
                  <input
                    type="text"
                    required
                    value={newPromo.title}
                    onChange={(e) => setNewPromo({ ...newPromo, title: e.target.value })}
                    placeholder="Ej: 2x1 en Todas las Hamburguesas"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Badge / Etiqueta Destacada:</label>
                  <input
                    type="text"
                    value={newPromo.badge_text}
                    onChange={(e) => setNewPromo({ ...newPromo, badge_text: e.target.value })}
                    placeholder="Ej: 2x1, Nuevo, Imperdible"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subtítulo / Letra Pequeña:</label>
                <input
                  type="text"
                  value={newPromo.subtitle}
                  onChange={(e) => setNewPromo({ ...newPromo, subtitle: e.target.value })}
                  placeholder="Ej: Válido los jueves en horario de almuerzo"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
                />
              </div>

              {/* Acción al pulsar */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Platillo Vinculado (Opcional):</label>
                <select
                  value={newPromo.target_id || ''}
                  onChange={(e) =>
                    setNewPromo({ ...newPromo, target_type: 'product', target_id: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
                >
                  <option value="">Ninguno (Solo informativo)</option>
                  {allProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Q{Number(p.base_price).toFixed(2)})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Al pulsar el banner en el menú digital, se abrirá directamente el asistente de pedido de este platillo.
                </span>
              </div>

              {/* Botones */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-semibold shadow-sm shadow-rose-500/20 active:scale-[0.98] transition"
                >
                  Guardar Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL RÁPIDO PARA SUBIR FOTO Y EDITAR DETALLES DE PLATILLO ─── */}
      {editingDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{editingDish.name}</h3>
                  <span className="text-xs text-slate-500">
                    {editingDish.category_name} · Q{Number(editingDish.base_price || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDish(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDishInfo} className="p-6 space-y-4 overflow-y-auto text-xs">
              <ImageUploadField
                label="Foto del Platillo (Menú Digital)"
                value={editingDish.image_url || ''}
                onChange={(url) => setEditingDish({ ...editingDish, image_url: url })}
                type="products"
                aspectRatio="square"
                helperText="PNG, JPG o WebP. Se optimiza y convierte automáticamente en WebP."
              />

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Descripción para los Comensales:
                </label>
                <textarea
                  rows={3}
                  value={editingDish.description || ''}
                  onChange={(e) => setEditingDish({ ...editingDish, description: e.target.value })}
                  placeholder="Describe los ingredientes, presentación y sabor..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tiempo aprox. de preparación (minutos):
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={editingDish.estimated_prep_min || ''}
                  onChange={(e) => setEditingDish({ ...editingDish, estimated_prep_min: e.target.value })}
                  placeholder="Ej: 15"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDish(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDish}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-semibold flex items-center gap-1.5 shadow-sm shadow-rose-500/20 active:scale-[0.98] transition disabled:opacity-50"
                >
                  {savingDish ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmación Moderno con Diseño */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        itemName={confirmDialog.itemName}
        itemDetail={confirmDialog.itemDetail}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
