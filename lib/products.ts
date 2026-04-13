import type { Product, Category } from "./types";

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "pantry", label: "Despensa", emoji: "🥫" },
  { id: "fresh", label: "Frescos", emoji: "🥬" },
  { id: "drinks", label: "Bebidas", emoji: "🥤" },
  { id: "snacks", label: "Snacks", emoji: "🍪" },
  { id: "household", label: "Hogar", emoji: "🧼" },
  { id: "frozen", label: "Congelados", emoji: "🧊" },
];

export const PRODUCTS: Product[] = [
  // Despensa
  { id: "p-pasta", name: "Pasta Barilla 500g", category: "pantry", priceEUR: 1.5, unit: "paquete", emoji: "🍝" },
  { id: "p-rice", name: "Arroz Taureau Ailé 1kg", category: "pantry", priceEUR: 2.2, unit: "paquete", emoji: "🍚" },
  { id: "p-oil", name: "Aceite de oliva Puget 75cl", category: "pantry", priceEUR: 6.9, unit: "botella", emoji: "🫒" },
  { id: "p-tomato", name: "Tomate triturado Mutti 400g", category: "pantry", priceEUR: 1.8, unit: "lata", emoji: "🍅" },
  { id: "p-bread", name: "Baguette tradición", category: "pantry", priceEUR: 1.2, unit: "unidad", emoji: "🥖" },
  { id: "p-cereal", name: "Muesli Jordans 500g", category: "pantry", priceEUR: 4.2, unit: "caja", emoji: "🥣" },
  { id: "p-peanut", name: "Mantequilla de maní 340g", category: "pantry", priceEUR: 3.9, unit: "tarro", emoji: "🥜" },
  { id: "p-nutella", name: "Nutella 400g", category: "pantry", priceEUR: 3.5, unit: "tarro", emoji: "🍫" },

  // Frescos
  { id: "f-milk", name: "Leche semidesnatada Lactel 1L", category: "fresh", priceEUR: 1.1, unit: "botella", emoji: "🥛" },
  { id: "f-eggs", name: "Huevos camperos x6", category: "fresh", priceEUR: 2.6, unit: "caja", emoji: "🥚" },
  { id: "f-cheese", name: "Emmental rallado 200g", category: "fresh", priceEUR: 2.9, unit: "bolsa", emoji: "🧀" },
  { id: "f-yogurt", name: "Yogur natural Danone x4", category: "fresh", priceEUR: 2.1, unit: "pack", emoji: "🥄" },
  { id: "f-chicken", name: "Pechuga de pollo 500g", category: "fresh", priceEUR: 6.5, unit: "bandeja", emoji: "🍗" },
  { id: "f-banana", name: "Plátanos 1kg", category: "fresh", priceEUR: 1.9, unit: "kg", emoji: "🍌" },
  { id: "f-apple", name: "Manzanas Gala 1kg", category: "fresh", priceEUR: 2.4, unit: "kg", emoji: "🍎" },
  { id: "f-salad", name: "Ensalada lista 200g", category: "fresh", priceEUR: 2.2, unit: "bolsa", emoji: "🥗" },

  // Bebidas
  { id: "d-water", name: "Agua Evian 1.5L x6", category: "drinks", priceEUR: 4.5, unit: "pack", emoji: "💧" },
  { id: "d-coke", name: "Coca-Cola 1.5L", category: "drinks", priceEUR: 2.3, unit: "botella", emoji: "🥤" },
  { id: "d-orange", name: "Zumo de naranja Tropicana 1L", category: "drinks", priceEUR: 3.5, unit: "botella", emoji: "🧃" },
  { id: "d-coffee", name: "Café Carte Noire molido 250g", category: "drinks", priceEUR: 4.9, unit: "paquete", emoji: "☕" },
  { id: "d-tea", name: "Té Lipton English Breakfast x25", category: "drinks", priceEUR: 2.8, unit: "caja", emoji: "🫖" },
  { id: "d-beer", name: "Heineken 33cl x6", category: "drinks", priceEUR: 6.9, unit: "pack", emoji: "🍺" },
  { id: "d-wine", name: "Vino tinto Côtes du Rhône", category: "drinks", priceEUR: 7.5, unit: "botella", emoji: "🍷" },

  // Snacks
  { id: "s-chips", name: "Lay's clásicas 150g", category: "snacks", priceEUR: 2.1, unit: "bolsa", emoji: "🍟" },
  { id: "s-cookies", name: "Galletas Prince 300g", category: "snacks", priceEUR: 2.5, unit: "paquete", emoji: "🍪" },
  { id: "s-chocolate", name: "Tableta Milka 100g", category: "snacks", priceEUR: 1.8, unit: "tableta", emoji: "🍫" },
  { id: "s-kinder", name: "Kinder Bueno x3", category: "snacks", priceEUR: 2.2, unit: "pack", emoji: "🍬" },
  { id: "s-nuts", name: "Almendras tostadas 200g", category: "snacks", priceEUR: 4.5, unit: "bolsa", emoji: "🌰" },

  // Hogar
  { id: "h-detergent", name: "Detergente Ariel 1.5L", category: "household", priceEUR: 8.9, unit: "botella", emoji: "🧴" },
  { id: "h-softener", name: "Suavizante Soupline 1L", category: "household", priceEUR: 3.9, unit: "botella", emoji: "🧺" },
  { id: "h-paper", name: "Papel higiénico Lotus x12", category: "household", priceEUR: 6.5, unit: "pack", emoji: "🧻" },
  { id: "h-shampoo", name: "Champú Head & Shoulders 400ml", category: "household", priceEUR: 4.8, unit: "botella", emoji: "🧴" },
  { id: "h-toothpaste", name: "Pasta de dientes Colgate 75ml", category: "household", priceEUR: 2.4, unit: "tubo", emoji: "🪥" },
  { id: "h-trash", name: "Bolsas de basura 30L x20", category: "household", priceEUR: 3.2, unit: "rollo", emoji: "🗑️" },

  // Congelados
  { id: "fr-pizza", name: "Pizza Buitoni 4 quesos", category: "frozen", priceEUR: 4.5, unit: "unidad", emoji: "🍕" },
  { id: "fr-fries", name: "Patatas fritas McCain 1kg", category: "frozen", priceEUR: 3.2, unit: "bolsa", emoji: "🍟" },
  { id: "fr-icecream", name: "Helado Ben & Jerry's 465ml", category: "frozen", priceEUR: 6.9, unit: "tarrina", emoji: "🍦" },
  { id: "fr-vegetables", name: "Verduras salteadas 1kg", category: "frozen", priceEUR: 3.5, unit: "bolsa", emoji: "🥦" },
];
