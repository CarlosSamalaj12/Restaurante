// src/modules/digital_menu/culinary_translator.js
// Motor inteligente de traducción culinaria (Español -> Inglés) con respaldo fuera de línea

const CULINARY_DICTIONARY = {
  // Categorías principales
  entradas: "Appetizers",
  "platos fuertes": "Main Courses",
  "plato fuerte": "Main Course",
  pastas: "Pastas",
  "pastas y arroces": "Pastas & Rice",
  bebidas: "Beverages",
  "bebidas frias": "Cold Drinks",
  "bebidas calientes": "Hot Drinks",
  postres: "Desserts",
  "postres y dulces": "Desserts & Sweets",
  cafeteria: "Coffee & Tea",
  ensaladas: "Salads",
  carnes: "Meats & Steaks",
  "cortes y carnes": "Steaks & Meats",
  mariscos: "Seafood",
  sopas: "Soups",
  pizzas: "Pizzas",
  hamburguesas: "Burgers",
  tacos: "Tacos",
  desayunos: "Breakfasts",
  cocteles: "Cocktails",
  licores: "Spirits & Liquors",
  cervezas: "Beers",
  vinos: "Wines",
  combos: "Combos & Specials",

  // Platillos comunes
  "cafe americano": "American Coffee",
  "cafe con leche": "Coffee with Milk",
  "cafe latte": "Café Latte",
  capuchino: "Cappuccino",
  "te verde": "Green Tea",
  "te negro": "Black Tea",
  "chocolate caliente": "Hot Chocolate",
  "limonada fresca": "Fresh Lemonade",
  "naranjada con soda": "Orange Soda",
  "jugo de naranja": "Orange Juice",
  "papas fritas": "French Fries",
  "aros de cebolla": "Onion Rings",
  "alitas de pollo": "Chicken Wings",
  "dedos de queso": "Mozzarella Sticks",
  "ensalada cesar": "Caesar Salad",
  "ensalada mixta": "Mixed Salad",
  "sopa del dia": "Soup of the Day",
  "tacos al pastor": "Pastor Tacos (Pork & Pineapple)",
  "hamburguesa clasica": "Classic Burger",
  "hamburguesa con queso": "Cheeseburger",
  "pechuga a la plancha": "Grilled Chicken Breast",
  "filete de res": "Beef Tenderloin",
  "costillas bbq": "BBQ Ribs",
  "ceviche de pescado": "Fish Ceviche",
  "ceviche mixto": "Mixed Seafood Ceviche",
  "flan de caramelo": "Caramel Flan",
  "pastel de chocolate": "Chocolate Cake",
  "cheesecake de fresa": "Strawberry Cheesecake",
};

// Términos culinarios recurrentes para reemplazo por diccionario
const TERM_REPLACEMENTS = [
  [/\bcon queso cheddar\b/gi, "with cheddar cheese"],
  [/\bcon queso\b/gi, "with cheese"],
  [/\bcon tocino\b/gi, "with bacon"],
  [/\bcon papas fritas\b/gi, "with french fries"],
  [/\bcon arroz\b/gi, "with rice"],
  [/\bcon ensalada\b/gi, "with salad"],
  [/\bservido con\b/gi, "served with"],
  [/\bacompañado de\b/gi, "accompanied by"],
  [/\ba la parrilla\b/gi, "grilled"],
  [/\bal horno\b/gi, "baked"],
  [/\ba la plancha\b/gi, "grilled"],
  [/\bahumado\b/gi, "smoked"],
  [/\bfrito\b/gi, "fried"],
  [/\bartesanal\b/gi, "artisanal"],
  [/\bhecho en casa\b/gi, "homemade"],
  [/\bcarne de res\b/gi, "beef"],
  [/\bpechuga de pollo\b/gi, "chicken breast"],
  [/\bcarne de cerdo\b/gi, "pork"],
  [/\bcamarones\b/gi, "shrimp"],
  [/\bcamaron\b/gi, "shrimp"],
  [/\bpescado fresco\b/gi, "fresh fish"],
  [/\baguacate\b/gi, "avocado"],
  [/\bcebolla\b/gi, "onion"],
  [/\btomate\b/gi, "tomato"],
  [/\blechuga\b/gi, "lettuce"],
  [/\bsalsa especial\b/gi, "special sauce"],
  [/\bsin gluten\b/gi, "gluten-free"],
  [/\bvegano\b/gi, "vegan"],
  [/\bvegetariano\b/gi, "vegetarian"],
];

function normalizeStr(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Traduce un texto al inglés usando API en línea con fallback de diccionario
 */
async function translateText(text = "") {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();
  if (!trimmed) return "";

  // 1. Verificar coincidencia directa en diccionario gastronómico
  const normalized = normalizeStr(trimmed);
  if (CULINARY_DICTIONARY[normalized]) {
    return CULINARY_DICTIONARY[normalized];
  }

  // 2. Intentar traducción vía servicio en línea rápido
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2s timeout
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q=${encodeURIComponent(
      trimmed
    )}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((item) => item[0]).join("");
        if (translated && translated.trim()) {
          return translated.trim();
        }
      }
    }
  } catch (_) {
    // Si falla o no hay conexión a internet, recurre al diccionario
  }

  // 3. Fallback inteligente usando reemplazos culinarios locales
  let fallback = trimmed;
  for (const [regex, replacement] of TERM_REPLACEMENTS) {
    fallback = fallback.replace(regex, replacement);
  }

  return fallback;
}

module.exports = {
  translateText,
  CULINARY_DICTIONARY,
};
