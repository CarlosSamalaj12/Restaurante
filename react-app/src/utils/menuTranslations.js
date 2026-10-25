// react-app/src/utils/menuTranslations.js
// Diccionario i18n y utilidades de localización para el Menú Digital (Español / Inglés)

export const MENU_TRANSLATIONS = {
  es: {
    // Cabecera superior y estado
    activeDigitalMenu: 'CARTA DIGITAL • ACTIVA',
    activeTableOrder: 'MESA {code} • COMANDA ACTIVA',
    connected: 'Conectado',
    callWaiter: 'Llamar al Mesero',
    callingWaiter: 'Llamando...',
    viewCart: 'Ver Carrito',
    accountActive: 'Cuenta Activa',
    guest: 'Comensal',
    switchLanguage: 'Cambiar idioma',

    // Buscador y Filtros
    searchPlaceholder: 'Buscar platillos o bebidas...',
    clearSearch: 'Borrar búsqueda',
    filterCategories: 'Filtrar por categorías',
    filtering: 'Filtrando:',
    clearFilter: 'Quitar filtro',

    // Modal de Categorías (iOS Sheet)
    menuCategories: 'Categorías del Menú',
    categoryCount: '{count} categorías',
    selectCategoryHint: 'Selecciona una categoría para explorar los platillos',
    allMenu: 'Todo el Menú',
    dishesCount: '{count} platillos',
    dishCountSingle: '1 platillo',
    viewDishes: 'Ver {count} platillos',
    viewDishSingle: 'Ver 1 platillo',
    resetToAll: 'Restablecer a todo el menú',

    // Tarjeta de Producto
    orderDetail: 'Pedir / Ver detalle',
    outOfStock: 'Agotado',
    minShort: 'min',
    reviews: 'reseñas',
    featured: 'Destacado',

    // Modal de Detalle y Modificadores
    customizeTitle: 'Personaliza tu orden',
    required: 'Requerido',
    optional: 'Opcional',
    selectMin: 'Selecciona al menos {count}',
    selectMax: 'Hasta {count} opciones',
    selectExact: 'Selecciona exactamente {count}',
    specialNotes: 'Notas o instrucciones especiales para cocina',
    notesPlaceholder: 'Ej: Término medio, sin cebolla, aderezo aparte...',
    addToCart: 'Agregar al Carrito',
    reviewsTab: 'Reseñas',
    detailsTab: 'Detalles',
    customizeTab: 'Personalizar',
    prepTime: 'Tiempo estimado de cocina',
    leaveReview: 'Dejar una reseña',
    writeReview: 'Escribe tu opinión sobre este platillo...',
    yourName: 'Tu nombre o alias',
    sendReview: 'Publicar Reseña',
    reviewSuccess: '¡Gracias! Tu reseña ha sido enviada.',

    // Carrito y Pedido
    yourOrder: 'Tu Comanda',
    cartEmpty: 'Tu carrito está vacío',
    cartEmptyHint: 'Explora nuestra carta digital y agrega tus platillos o bebidas favoritas.',
    confirmOrder: 'Confirmar Pedido a Cocina',
    sendingOrder: 'Enviando comanda a cocina...',
    subtotal: 'Subtotal',
    total: 'Total',
    requestBill: 'Pedir la Cuenta',
    requestingBill: 'Solicitando cuenta...',
    table: 'Mesa',
    choosePayment: '¿Cómo deseas pagar?',
    paymentCash: 'Efectivo',
    paymentCard: 'Tarjeta',
    orderSuccess: '¡Pedido enviado a cocina con éxito!',
    orderMore: 'Pedir más platillos',
  },

  en: {
    // Top Bar & State
    activeDigitalMenu: 'DIGITAL MENU • ACTIVE',
    activeTableOrder: 'TABLE {code} • ACTIVE ORDER',
    connected: 'Connected',
    callWaiter: 'Call Waiter',
    callingWaiter: 'Calling...',
    viewCart: 'View Cart',
    accountActive: 'Active Account',
    guest: 'Guest',
    switchLanguage: 'Switch language',

    // Search & Filters
    searchPlaceholder: 'Search dishes or drinks...',
    clearSearch: 'Clear search',
    filterCategories: 'Filter by categories',
    filtering: 'Filtering:',
    clearFilter: 'Clear filter',

    // Category Modal (iOS Sheet)
    menuCategories: 'Menu Categories',
    categoryCount: '{count} categories',
    selectCategoryHint: 'Select a category to explore dishes',
    allMenu: 'All Menu',
    dishesCount: '{count} dishes',
    dishCountSingle: '1 dish',
    viewDishes: 'View {count} dishes',
    viewDishSingle: 'View 1 dish',
    resetToAll: 'Reset to all menu',

    // Product Card
    orderDetail: 'Order / Details',
    outOfStock: 'Sold Out',
    minShort: 'min',
    reviews: 'reviews',
    featured: 'Featured',

    // Product Detail Modal & Modifiers
    customizeTitle: 'Customize your order',
    required: 'Required',
    optional: 'Optional',
    selectMin: 'Select at least {count}',
    selectMax: 'Up to {count} options',
    selectExact: 'Select exactly {count}',
    specialNotes: 'Cooking notes or special requests',
    notesPlaceholder: 'E.g., Medium rare, no onions, dressing on the side...',
    addToCart: 'Add to Cart',
    reviewsTab: 'Reviews',
    detailsTab: 'Details',
    customizeTab: 'Customize',
    prepTime: 'Estimated cooking time',
    leaveReview: 'Leave a review',
    writeReview: 'Share your feedback on this dish...',
    yourName: 'Your name or nickname',
    sendReview: 'Submit Review',
    reviewSuccess: 'Thank you! Your review has been submitted.',

    // Cart & Order
    yourOrder: 'Your Order',
    cartEmpty: 'Your cart is empty',
    cartEmptyHint: 'Explore our digital menu and add your favorite dishes or drinks.',
    confirmOrder: 'Confirm Order to Kitchen',
    sendingOrder: 'Sending order to kitchen...',
    subtotal: 'Subtotal',
    total: 'Total',
    requestBill: 'Request the Bill',
    requestingBill: 'Requesting bill...',
    table: 'Table',
    choosePayment: 'Payment method',
    paymentCash: 'Cash',
    paymentCard: 'Credit/Debit Card',
    orderSuccess: 'Order sent to the kitchen successfully!',
    orderMore: 'Order more items',
  },
};

/**
 * Obtiene el idioma preferido (es o en).
 * 1. Prioriza lo guardado en localStorage.
 * 2. Si es la primera vez, detecta el idioma del dispositivo o navegador del cliente.
 */
export function getInitialLanguage() {
  try {
    const saved = localStorage.getItem('sama_menu_lang');
    if (saved === 'es' || saved === 'en') return saved;
    const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (browserLang.startsWith('en')) return 'en';
  } catch (_) {}
  return 'es';
}

/**
 * Guarda el idioma seleccionado
 */
export function setSavedLanguage(lang) {
  try {
    if (lang === 'es' || lang === 'en') {
      localStorage.setItem('sama_menu_lang', lang);
    }
  } catch (_) {}
}

/**
 * Función de traducción rápida con interpolación de variables
 */
export function t(lang = 'es', key, vars = {}) {
  const dictionary = MENU_TRANSLATIONS[lang] || MENU_TRANSLATIONS.es;
  let text = dictionary[key] || MENU_TRANSLATIONS.es[key] || key;

  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }

  return text;
}

/**
 * Obtiene el nombre del platillo o categoría según el idioma activo con fallback al español
 */
export function getLocalizedName(item, lang = 'es') {
  if (!item) return '';
  if (lang === 'en' && item.name_en && item.name_en.trim()) {
    return item.name_en.trim();
  }
  return item.name || '';
}

/**
 * Obtiene la descripción del platillo según el idioma activo con fallback al español
 */
export function getLocalizedDescription(item, lang = 'es') {
  if (!item) return '';
  if (lang === 'en' && item.description_en && item.description_en.trim()) {
    return item.description_en.trim();
  }
  return item.description || '';
}
