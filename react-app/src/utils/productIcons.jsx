// react-app/src/utils/productIcons.jsx
// Sistema unificado de íconos minimalistas y colores temáticos para productos, categorías y centros
import React from 'react';
import {
  Coffee,
  Wine,
  Beer,
  GlassWater,
  Utensils,
  UtensilsCrossed,
  ChefHat,
  Flame,
  Soup,
  Beef,
  Drumstick,
  Pizza,
  Sandwich,
  Salad,
  Fish,
  Egg,
  CakeSlice,
  Cookie,
  Croissant,
  IceCream,
  Store,
  Tag,
  Sparkles,
  Package,
  Sliders,
  Armchair
} from 'lucide-react';

/**
 * Normaliza cadenas quitando tildes y pasando a minúsculas
 */
function normalize(str = '') {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Resuelve el ícono y la paleta de colores para un producto o categoría
 */
export function getProductIconConfig(productName = '', categoryName = '') {
  const p = normalize(productName);
  const c = normalize(categoryName);
  const combined = `${p} ${c}`;

  // 1. Café y bebidas calientes
  if (
    combined.includes('cafe') ||
    combined.includes('latte') ||
    combined.includes('cappuccino') ||
    combined.includes('capuchino') ||
    combined.includes('espresso') ||
    combined.includes('expreso') ||
    combined.includes('moka') ||
    combined.includes('chocolate caliente') ||
    combined.includes('infusion') ||
    combined.includes('te ') ||
    combined.endsWith(' te') ||
    combined.includes('caliente')
  ) {
    return {
      icon: Coffee,
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200/80',
      accent: '#92400e',
    };
  }

  // 2. Bar, cerveza, vinos y coctelería
  if (
    combined.includes('cerveza') ||
    combined.includes('beer') ||
    combined.includes('chelada') ||
    combined.includes('michelada')
  ) {
    return {
      icon: Beer,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-300/80',
      accent: '#b45309',
    };
  }
  if (
    combined.includes('vino') ||
    combined.includes('wine') ||
    combined.includes('trago') ||
    combined.includes('licor') ||
    combined.includes('vodka') ||
    combined.includes('ron') ||
    combined.includes('tequila') ||
    combined.includes('whisky') ||
    combined.includes('gin') ||
    combined.includes('cocktail') ||
    combined.includes('coctel') ||
    combined.includes('margarita') ||
    combined.includes('mojito') ||
    combined.includes('bar')
  ) {
    return {
      icon: Wine,
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200/80',
      accent: '#4338ca',
    };
  }

  // 3. Bebidas frías, refrescos, jugos y aguas
  if (
    combined.includes('soda') ||
    combined.includes('gaseosa') ||
    combined.includes('coca') ||
    combined.includes('pepsi') ||
    combined.includes('jugo') ||
    combined.includes('licuado') ||
    combined.includes('limonada') ||
    combined.includes('naranjada') ||
    combined.includes('smoothie') ||
    combined.includes('agua') ||
    combined.includes('bebida') ||
    combined.includes('refresco')
  ) {
    return {
      icon: GlassWater,
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200/80',
      accent: '#0369a1',
    };
  }

  // 4. Hamburguesas y Sandwiches
  if (
    combined.includes('hamburguesa') ||
    combined.includes('burger') ||
    combined.includes('sandwich') ||
    combined.includes('panini') ||
    combined.includes('torta') ||
    combined.includes('sub') ||
    combined.includes('hot dog') ||
    combined.includes('hotdog')
  ) {
    return {
      icon: Sandwich,
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-300/80',
      accent: '#78350f',
    };
  }

  // 5. Pizzas y pastas
  if (
    combined.includes('pizza') ||
    combined.includes('pasta') ||
    combined.includes('lasagna') ||
    combined.includes('espagueti') ||
    combined.includes('fettuccine')
  ) {
    return {
      icon: Pizza,
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200/80',
      accent: '#c2410c',
    };
  }

  // 6. Pollo y aves
  if (
    combined.includes('pollo') ||
    combined.includes('alita') ||
    combined.includes('wings') ||
    combined.includes('pechuga') ||
    combined.includes('nugget') ||
    combined.includes('tender') ||
    combined.includes('chicken')
  ) {
    return {
      icon: Drumstick,
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-200/80',
      accent: '#9a3412',
    };
  }

  // 7. Carnes, asados, bistec y platos fuertes
  if (
    combined.includes('filete') ||
    combined.includes('carne') ||
    combined.includes('res') ||
    combined.includes('steak') ||
    combined.includes('churrasco') ||
    combined.includes('asado') ||
    combined.includes('puyazo') ||
    combined.includes('lomo') ||
    combined.includes('ribs') ||
    combined.includes('costilla') ||
    combined.includes('plato fuerte') ||
    combined.includes('platos fuertes')
  ) {
    return {
      icon: Beef,
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200/80',
      accent: '#9f1239',
    };
  }

  // 8. Ensaladas y opciones verdes/saludables
  if (
    combined.includes('ensalada') ||
    combined.includes('salad') ||
    combined.includes('vegetal') ||
    combined.includes('lechuga') ||
    combined.includes('cesar') ||
    combined.includes('verde')
  ) {
    return {
      icon: Salad,
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200/80',
      accent: '#065f46',
    };
  }

  // 9. Mariscos y pescados
  if (
    combined.includes('pescado') ||
    combined.includes('fish') ||
    combined.includes('marisco') ||
    combined.includes('camaron') ||
    combined.includes('ceviche') ||
    combined.includes('salmon') ||
    combined.includes('atun')
  ) {
    return {
      icon: Fish,
      bg: 'bg-cyan-50',
      text: 'text-cyan-800',
      border: 'border-cyan-200/80',
      accent: '#155e75',
    };
  }

  // 10. Sopas y caldos
  if (
    combined.includes('sopa') ||
    combined.includes('caldo') ||
    combined.includes('crema') ||
    combined.includes('consome')
  ) {
    return {
      icon: Soup,
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      border: 'border-yellow-200/80',
      accent: '#854d0e',
    };
  }

  // 11. Desayunos y huevos
  if (
    combined.includes('huevo') ||
    combined.includes('omelet') ||
    combined.includes('desayuno') ||
    combined.includes('pancake') ||
    combined.includes('panqueque') ||
    combined.includes('waffle')
  ) {
    return {
      icon: Egg,
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200/80',
      accent: '#92400e',
    };
  }

  // 12. Postres, repostería y helados
  if (
    combined.includes('cheesecake') ||
    combined.includes('pastel') ||
    combined.includes('postre') ||
    combined.includes('pie') ||
    combined.includes('flan') ||
    combined.includes('brownie') ||
    combined.includes('dulce') ||
    combined.includes('panaderia') ||
    combined.includes('reposteria')
  ) {
    return {
      icon: CakeSlice,
      bg: 'bg-pink-50',
      text: 'text-pink-700',
      border: 'border-pink-200/80',
      accent: '#be185d',
    };
  }
  if (combined.includes('helado') || combined.includes('ice cream') || combined.includes('nieve')) {
    return {
      icon: IceCream,
      bg: 'bg-fuchsia-50',
      text: 'text-fuchsia-700',
      border: 'border-fuchsia-200/80',
      accent: '#a21caf',
    };
  }

  // 13. Por defecto: Utensilios minimalistas elegantes
  return {
    icon: UtensilsCrossed,
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200/80',
    accent: '#334155',
  };
}

/**
 * Resuelve el ícono y color temático para centros de producción o consumo
 */
export function getCenterIconConfig(centerName = '') {
  const name = normalize(centerName);

  if (name.includes('cocina')) {
    return {
      icon: ChefHat,
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      border: 'border-orange-200',
      gradient: 'from-orange-500 to-amber-500',
    };
  }
  if (name.includes('bar') || name.includes('licor') || name.includes('bebida')) {
    return {
      icon: Wine,
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
      gradient: 'from-blue-500 to-indigo-500',
    };
  }
  if (name.includes('cafe') || name.includes('cafeteria')) {
    return {
      icon: Coffee,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      gradient: 'from-amber-500 to-yellow-600',
    };
  }
  if (name.includes('panaderia') || name.includes('reposteria') || name.includes('postre')) {
    return {
      icon: CakeSlice,
      bg: 'bg-pink-50',
      text: 'text-pink-600',
      border: 'border-pink-200',
      gradient: 'from-pink-500 to-rose-500',
    };
  }
  if (name.includes('parrilla') || name.includes('asador') || name.includes('grill')) {
    return {
      icon: Flame,
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-200',
      gradient: 'from-red-500 to-rose-600',
    };
  }
  if (name.includes('pizza') || name.includes('pizzeria')) {
    return {
      icon: Pizza,
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      border: 'border-orange-200',
      gradient: 'from-orange-500 to-red-500',
    };
  }

  return {
    icon: Store,
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    gradient: 'from-slate-600 to-gray-700',
  };
}

/**
 * Componente Badge minimalista para productos
 */
export function ProductIconBadge({ productName = '', categoryName = '', size = 'md', className = '' }) {
  const config = getProductIconConfig(productName, categoryName);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 border transition-all ${config.bg} ${config.text} ${config.border} ${sizeClasses[size] || sizeClasses.md} ${className}`}
      title={categoryName || productName}
    >
      <Icon className={`${iconSizes[size] || iconSizes.md} stroke-[2.2]`} />
    </div>
  );
}

/**
 * Componente Badge minimalista para Centros de Producción
 */
export function CenterIconBadge({ centerName = '', size = 'lg', className = '', variant = 'pastel' }) {
  const config = getCenterIconConfig(centerName);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (variant === 'gradient') {
    return (
      <div
        className={`flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${config.gradient} text-white shadow-xs ${sizeClasses[size] || sizeClasses.lg} ${className}`}
        title={centerName}
      >
        <Icon className={`${iconSizes[size] || iconSizes.lg} stroke-[2.2]`} />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 border ${config.bg} ${config.text} ${config.border} ${sizeClasses[size] || sizeClasses.lg} ${className}`}
      title={centerName}
    >
      <Icon className={`${iconSizes[size] || iconSizes.lg} stroke-[2.2]`} />
    </div>
  );
}

/**
 * Resuelve el ícono y color temático para grupos de modificadores
 */
export function getModifierGroupIconConfig(groupName = '') {
  const g = normalize(groupName);

  // Guarniciones / Acompañamientos / Ensaladas
  if (
    g.includes('guarnicion') ||
    g.includes('acompan') ||
    g.includes('arroz') ||
    g.includes('papas') ||
    g.includes('vegetal') ||
    g.includes('ensalada')
  ) {
    return {
      icon: UtensilsCrossed,
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200/80',
    };
  }

  // Salsas / Picantes / Aderezos
  if (
    g.includes('salsa') ||
    g.includes('picante') ||
    g.includes('chile') ||
    g.includes('aderezo') ||
    g.includes('dressing') ||
    g.includes('dip')
  ) {
    return {
      icon: Flame,
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200/80',
    };
  }

  // Leches / Bebidas / Café
  if (
    g.includes('leche') ||
    g.includes('milk') ||
    g.includes('cafe') ||
    g.includes('azucar') ||
    g.includes('sirope') ||
    g.includes('endulzante')
  ) {
    return {
      icon: Coffee,
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200/80',
    };
  }

  // Métodos de preparación / Términos de cocción
  if (
    g.includes('metodo') ||
    g.includes('preparacion') ||
    g.includes('termino') ||
    g.includes('coccion') ||
    g.includes('asado') ||
    g.includes('plancha')
  ) {
    return {
      icon: ChefHat,
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200/80',
    };
  }

  // Quesos / Extras / Toppings
  if (g.includes('queso') || g.includes('cheese') || g.includes('topping')) {
    return {
      icon: Sparkles,
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      border: 'border-yellow-200/80',
    };
  }

  // Panes / Tortillas
  if (g.includes('pan') || g.includes('tortilla')) {
    return {
      icon: Sandwich,
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-300/80',
    };
  }

  // Default: Modificadores / Ajustes
  return {
    icon: Sliders,
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200/80',
  };
}

/**
 * Componente Badge minimalista para Grupos de Modificadores
 */
export function ModifierGroupIconBadge({ name = '', size = 'md', className = '' }) {
  const config = getModifierGroupIconConfig(name);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 border transition-all ${config.bg} ${config.text} ${config.border} ${sizeClasses[size] || sizeClasses.md} ${className}`}
      title={name}
    >
      <Icon className={`${iconSizes[size] || iconSizes.md} stroke-[2.2]`} />
    </div>
  );
}

/**
 * Componente Badge minimalista para Mesas
 */
export function TableIconBadge({ seats = 4, size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs ${sizeClasses[size] || sizeClasses.md} ${className}`}
      title={`${seats} asientos`}
    >
      <Armchair className={`${iconSizes[size] || iconSizes.md} stroke-[2.2]`} />
    </div>
  );
}
