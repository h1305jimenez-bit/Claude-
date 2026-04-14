import type { Product, Category, Store } from "./types";

/**
 * Catalog curated for the two Auchan stores near HEC Paris:
 *
 * - **Jouy-en-Josas** (Supermarché Auchan, 50 Av. Jean Jaurès, 78350) —
 *   walkable from the campus, smaller selection focused on daily staples.
 * - **Saclay** (Hypermarché Auchan Val d'Europe / Saclay) — a full-size
 *   hypermarket with international aisles, larger packs and more variety.
 *
 * Set `store` on each product so we know where it can be sourced.
 *
 * ## Product photos
 *
 * Drop a photo named `{id}.jpg` into `public/products/` and it shows up
 * automatically — no code change needed. See `public/products/README.md`
 * for the full workflow. You can also set `imageUrl` here for a remote
 * URL (e.g. Auchan's own CDN).
 */

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "pantry", label: "Pantry", emoji: "🥫" },
  { id: "fresh", label: "Fresh", emoji: "🥬" },
  { id: "bakery", label: "Bakery", emoji: "🥖" },
  { id: "meat", label: "Meat", emoji: "🍗" },
  { id: "drinks", label: "Drinks", emoji: "🥤" },
  { id: "snacks", label: "Snacks", emoji: "🍪" },
  { id: "frozen", label: "Frozen", emoji: "🧊" },
  { id: "international", label: "International", emoji: "🌍" },
  { id: "household", label: "Household", emoji: "🧼" },
  { id: "health", label: "Health & Beauty", emoji: "💊" },
  { id: "babycare", label: "Baby care", emoji: "🍼" },
];

export const STORES: { id: Store; label: string; shortLabel: string }[] = [
  { id: "jouy", label: "Auchan Jouy-en-Josas", shortLabel: "Jouy" },
  { id: "saclay", label: "Auchan Saclay", shortLabel: "Saclay" },
  { id: "both", label: "Both stores", shortLabel: "Both" },
];

// To add product photos: drop `{id}.jpg` into `public/products/` and they
// show up automatically. See `public/products/README.md`. You can also set
// an explicit `imageUrl` on any product for a remote URL.

export const PRODUCTS: Product[] = [
  // ---------------- PANTRY ----------------
  { id: "p-pasta-barilla", name: "Barilla spaghetti n°5 500g", category: "pantry", priceEUR: 1.5, unit: "pack", emoji: "🍝", store: "both" },
  { id: "p-pasta-penne", name: "Panzani penne 500g", category: "pantry", priceEUR: 1.3, unit: "pack", emoji: "🍝", store: "both" },
  { id: "p-rice-basmati", name: "Taureau Ailé basmati rice 1kg", category: "pantry", priceEUR: 3.9, unit: "pack", emoji: "🍚", store: "both" },
  { id: "p-rice-long", name: "Long-grain rice 1kg", category: "pantry", priceEUR: 2.2, unit: "pack", emoji: "🍚", store: "both" },
  { id: "p-oil-olive", name: "Puget extra virgin olive oil 75cl", category: "pantry", priceEUR: 6.9, unit: "bottle", emoji: "🫒", store: "both" },
  { id: "p-oil-sunflower", name: "Auchan sunflower oil 1L", category: "pantry", priceEUR: 2.8, unit: "bottle", emoji: "🌻", store: "both" },
  { id: "p-tomato", name: "Mutti crushed tomatoes 400g", category: "pantry", priceEUR: 1.8, unit: "can", emoji: "🍅", store: "both" },
  { id: "p-sugar", name: "White sugar 1kg", category: "pantry", priceEUR: 1.4, unit: "pack", emoji: "🧂", store: "both" },
  { id: "p-flour", name: "Francine all-purpose flour 1kg", category: "pantry", priceEUR: 1.5, unit: "pack", emoji: "🌾", store: "both" },
  { id: "p-cereal", name: "Jordans crunchy muesli 500g", category: "pantry", priceEUR: 4.2, unit: "box", emoji: "🥣", store: "both" },
  { id: "p-cornflakes", name: "Kellogg's Corn Flakes 500g", category: "pantry", priceEUR: 3.5, unit: "box", emoji: "🥣", store: "both" },
  { id: "p-peanut", name: "Peanut butter smooth 340g", category: "pantry", priceEUR: 3.9, unit: "jar", emoji: "🥜", store: "both" },
  { id: "p-nutella", name: "Nutella 400g", category: "pantry", priceEUR: 3.5, unit: "jar", emoji: "🍫", store: "both" },
  { id: "p-nutella-big", name: "Nutella 750g family jar", category: "pantry", priceEUR: 5.9, unit: "jar", emoji: "🍫", store: "saclay" },
  { id: "p-jam", name: "Bonne Maman strawberry jam 370g", category: "pantry", priceEUR: 3.2, unit: "jar", emoji: "🍓", store: "both" },
  { id: "p-honey", name: "Lune de Miel acacia honey 375g", category: "pantry", priceEUR: 5.5, unit: "jar", emoji: "🍯", store: "saclay" },
  { id: "p-tuna", name: "Petit Navire tuna in olive oil 160g", category: "pantry", priceEUR: 2.5, unit: "can", emoji: "🐟", store: "both" },
  { id: "p-beans", name: "Kidney beans 400g", category: "pantry", priceEUR: 1.2, unit: "can", emoji: "🫘", store: "both" },
  { id: "p-lentils", name: "Green lentils 500g", category: "pantry", priceEUR: 2.4, unit: "pack", emoji: "🫘", store: "saclay" },
  { id: "p-soy", name: "Kikkoman soy sauce 250ml", category: "pantry", priceEUR: 3.5, unit: "bottle", emoji: "🥢", store: "saclay" },
  { id: "p-mayo", name: "Amora mayonnaise 385g", category: "pantry", priceEUR: 2.8, unit: "jar", emoji: "🥚", store: "both" },
  { id: "p-ketchup", name: "Heinz ketchup 460g", category: "pantry", priceEUR: 2.9, unit: "bottle", emoji: "🍅", store: "both" },

  // ---------------- BAKERY ----------------
  { id: "b-baguette", name: "Traditional baguette", category: "bakery", priceEUR: 1.2, unit: "unit", emoji: "🥖", store: "both" },
  { id: "b-bread-sliced", name: "Harrys 100% mie sliced bread", category: "bakery", priceEUR: 2.4, unit: "pack", emoji: "🍞", store: "both" },
  { id: "b-croissant", name: "Butter croissant x4", category: "bakery", priceEUR: 3.5, unit: "pack", emoji: "🥐", store: "both" },
  { id: "b-painchoc", name: "Pain au chocolat x4", category: "bakery", priceEUR: 3.9, unit: "pack", emoji: "🥐", store: "both" },
  { id: "b-brioche", name: "Brioche tressée 500g", category: "bakery", priceEUR: 3.2, unit: "unit", emoji: "🍞", store: "saclay" },

  // ---------------- FRESH ----------------
  { id: "f-milk", name: "Lactel semi-skimmed milk 1L", category: "fresh", priceEUR: 1.1, unit: "bottle", emoji: "🥛", store: "both" },
  { id: "f-milk-whole", name: "Candia whole milk 1L", category: "fresh", priceEUR: 1.2, unit: "bottle", emoji: "🥛", store: "both" },
  { id: "f-oat-milk", name: "Alpro oat milk 1L", category: "fresh", priceEUR: 2.5, unit: "carton", emoji: "🥛", store: "saclay" },
  { id: "f-eggs", name: "Free-range eggs x6", category: "fresh", priceEUR: 2.6, unit: "box", emoji: "🥚", store: "both" },
  { id: "f-eggs-12", name: "Free-range eggs x12", category: "fresh", priceEUR: 4.8, unit: "box", emoji: "🥚", store: "saclay" },
  { id: "f-butter", name: "Président butter 250g", category: "fresh", priceEUR: 3.1, unit: "pack", emoji: "🧈", store: "both" },
  { id: "f-cheese-emmental", name: "Grated Emmental 200g", category: "fresh", priceEUR: 2.9, unit: "bag", emoji: "🧀", store: "both" },
  { id: "f-cheese-brie", name: "Président Brie 200g", category: "fresh", priceEUR: 3.5, unit: "wheel", emoji: "🧀", store: "both" },
  { id: "f-cheese-goat", name: "Chavroux goat cheese 150g", category: "fresh", priceEUR: 3.2, unit: "log", emoji: "🧀", store: "saclay" },
  { id: "f-yogurt", name: "Danone natural yogurt x4", category: "fresh", priceEUR: 2.1, unit: "pack", emoji: "🥄", store: "both" },
  { id: "f-yogurt-greek", name: "Fage Greek yogurt 500g", category: "fresh", priceEUR: 3.8, unit: "tub", emoji: "🥣", store: "saclay" },
  { id: "f-hummus", name: "Hummus 200g", category: "fresh", priceEUR: 2.8, unit: "tub", emoji: "🫛", store: "both" },
  { id: "f-banana", name: "Bananas 1kg", category: "fresh", priceEUR: 1.9, unit: "kg", emoji: "🍌", store: "both" },
  { id: "f-apple", name: "Gala apples 1kg", category: "fresh", priceEUR: 2.4, unit: "kg", emoji: "🍎", store: "both" },
  { id: "f-strawberry", name: "Strawberries 250g", category: "fresh", priceEUR: 3.9, unit: "box", emoji: "🍓", store: "both" },
  { id: "f-blueberry", name: "Blueberries 125g", category: "fresh", priceEUR: 3.5, unit: "box", emoji: "🫐", store: "saclay" },
  { id: "f-avocado", name: "Ripe avocado", category: "fresh", priceEUR: 1.5, unit: "unit", emoji: "🥑", store: "both" },
  { id: "f-tomato", name: "Vine tomatoes 500g", category: "fresh", priceEUR: 2.4, unit: "pack", emoji: "🍅", store: "both" },
  { id: "f-salad", name: "Ready-to-eat mixed salad 200g", category: "fresh", priceEUR: 2.2, unit: "bag", emoji: "🥗", store: "both" },
  { id: "f-carrot", name: "Carrots 1kg", category: "fresh", priceEUR: 1.5, unit: "kg", emoji: "🥕", store: "both" },
  { id: "f-onion", name: "Yellow onions 1kg", category: "fresh", priceEUR: 1.6, unit: "kg", emoji: "🧅", store: "both" },
  { id: "f-potato", name: "Potatoes 2kg", category: "fresh", priceEUR: 2.9, unit: "bag", emoji: "🥔", store: "both" },
  { id: "f-lemon", name: "Lemons 500g", category: "fresh", priceEUR: 1.9, unit: "pack", emoji: "🍋", store: "both" },

  // ---------------- MEAT ----------------
  { id: "m-chicken", name: "Chicken breast 500g", category: "meat", priceEUR: 6.5, unit: "tray", emoji: "🍗", store: "both" },
  { id: "m-ham", name: "Fleury Michon ham x4 slices", category: "meat", priceEUR: 3.2, unit: "pack", emoji: "🥓", store: "both" },
  { id: "m-salami", name: "Italian salami 100g", category: "meat", priceEUR: 3.5, unit: "pack", emoji: "🥓", store: "saclay" },
  { id: "m-beef", name: "Ground beef 5% 500g", category: "meat", priceEUR: 6.9, unit: "tray", emoji: "🥩", store: "both" },
  { id: "m-salmon", name: "Fresh salmon fillet 250g", category: "meat", priceEUR: 7.9, unit: "tray", emoji: "🐟", store: "saclay" },

  // ---------------- DRINKS ----------------
  { id: "d-water", name: "Evian water 1.5L x6", category: "drinks", priceEUR: 4.5, unit: "pack", emoji: "💧", store: "both" },
  { id: "d-water-cristaline", name: "Cristaline water 1.5L x6", category: "drinks", priceEUR: 2.4, unit: "pack", emoji: "💧", store: "both" },
  { id: "d-sparkling", name: "Perrier sparkling water 1L x4", category: "drinks", priceEUR: 4.9, unit: "pack", emoji: "🫧", store: "both" },
  { id: "d-coke", name: "Coca-Cola 1.5L", category: "drinks", priceEUR: 2.3, unit: "bottle", emoji: "🥤", store: "both" },
  { id: "d-coke-zero", name: "Coca-Cola Zero 1.5L", category: "drinks", priceEUR: 2.3, unit: "bottle", emoji: "🥤", store: "both" },
  { id: "d-sprite", name: "Sprite 1.5L", category: "drinks", priceEUR: 2.2, unit: "bottle", emoji: "🥤", store: "both" },
  { id: "d-orange", name: "Tropicana orange juice 1L", category: "drinks", priceEUR: 3.5, unit: "bottle", emoji: "🧃", store: "both" },
  { id: "d-apple", name: "Apple juice 1L", category: "drinks", priceEUR: 2.1, unit: "bottle", emoji: "🍎", store: "both" },
  { id: "d-coffee-ground", name: "Carte Noire ground coffee 250g", category: "drinks", priceEUR: 4.9, unit: "pack", emoji: "☕", store: "both" },
  { id: "d-coffee-nespresso", name: "Nespresso capsules Arpeggio x10", category: "drinks", priceEUR: 4.5, unit: "pack", emoji: "☕", store: "saclay" },
  { id: "d-tea", name: "Lipton English Breakfast tea x25", category: "drinks", priceEUR: 2.8, unit: "box", emoji: "🫖", store: "both" },
  { id: "d-redbull", name: "Red Bull 25cl", category: "drinks", priceEUR: 1.9, unit: "can", emoji: "⚡", store: "both" },
  { id: "d-beer-heineken", name: "Heineken beer 33cl x6", category: "drinks", priceEUR: 6.9, unit: "pack", emoji: "🍺", store: "both" },
  { id: "d-wine-red", name: "Bordeaux red wine 75cl", category: "drinks", priceEUR: 6.5, unit: "bottle", emoji: "🍷", store: "both" },

  // ---------------- SNACKS ----------------
  { id: "s-chips-lays", name: "Lay's classic chips 150g", category: "snacks", priceEUR: 2.1, unit: "bag", emoji: "🍟", store: "both" },
  { id: "s-chips-pringles", name: "Pringles Original 175g", category: "snacks", priceEUR: 2.9, unit: "tube", emoji: "🥔", store: "both" },
  { id: "s-cookies-prince", name: "Prince chocolate cookies 300g", category: "snacks", priceEUR: 2.5, unit: "pack", emoji: "🍪", store: "both" },
  { id: "s-cookies-oreo", name: "Oreo 154g", category: "snacks", priceEUR: 2.2, unit: "pack", emoji: "🍪", store: "both" },
  { id: "s-cookies-lu", name: "LU Petit Beurre 200g", category: "snacks", priceEUR: 1.8, unit: "pack", emoji: "🍪", store: "both" },
  { id: "s-chocolate-milka", name: "Milka chocolate bar 100g", category: "snacks", priceEUR: 1.8, unit: "bar", emoji: "🍫", store: "both" },
  { id: "s-chocolate-lindt", name: "Lindt Excellence 70% dark 100g", category: "snacks", priceEUR: 2.9, unit: "bar", emoji: "🍫", store: "both" },
  { id: "s-kinder", name: "Kinder Bueno x3", category: "snacks", priceEUR: 2.2, unit: "pack", emoji: "🍬", store: "both" },
  { id: "s-kitkat", name: "KitKat 4 fingers x5", category: "snacks", priceEUR: 3.2, unit: "pack", emoji: "🍫", store: "both" },
  { id: "s-haribo", name: "Haribo Tagada 300g", category: "snacks", priceEUR: 2.9, unit: "bag", emoji: "🍬", store: "both" },
  { id: "s-nuts", name: "Roasted almonds 200g", category: "snacks", priceEUR: 4.5, unit: "bag", emoji: "🌰", store: "both" },
  { id: "s-popcorn", name: "Microwave popcorn x3", category: "snacks", priceEUR: 2.8, unit: "pack", emoji: "🍿", store: "saclay" },

  // ---------------- FROZEN ----------------
  { id: "fr-pizza-4cheese", name: "Buitoni 4-cheese pizza", category: "frozen", priceEUR: 4.5, unit: "unit", emoji: "🍕", store: "both" },
  { id: "fr-pizza-peppe", name: "Dr. Oetker Ristorante pepperoni", category: "frozen", priceEUR: 4.2, unit: "unit", emoji: "🍕", store: "both" },
  { id: "fr-fries", name: "McCain French fries 1kg", category: "frozen", priceEUR: 3.2, unit: "bag", emoji: "🍟", store: "both" },
  { id: "fr-nuggets", name: "Chicken nuggets 500g", category: "frozen", priceEUR: 4.9, unit: "bag", emoji: "🍗", store: "both" },
  { id: "fr-icecream-bj", name: "Ben & Jerry's Cookie Dough 465ml", category: "frozen", priceEUR: 6.9, unit: "tub", emoji: "🍦", store: "both" },
  { id: "fr-icecream-haagen", name: "Häagen-Dazs vanilla 460ml", category: "frozen", priceEUR: 6.5, unit: "tub", emoji: "🍨", store: "saclay" },
  { id: "fr-vegetables", name: "Stir-fry vegetables 1kg", category: "frozen", priceEUR: 3.5, unit: "bag", emoji: "🥦", store: "both" },
  { id: "fr-lasagna", name: "Lasagna bolognese 600g", category: "frozen", priceEUR: 4.9, unit: "tray", emoji: "🍱", store: "saclay" },

  // ---------------- INTERNATIONAL (Saclay exclusive) ----------------
  { id: "i-ramen", name: "Nissin Cup Noodles x4", category: "international", priceEUR: 5.2, unit: "pack", emoji: "🍜", store: "saclay" },
  { id: "i-tortilla", name: "Old El Paso tortilla wraps x8", category: "international", priceEUR: 2.9, unit: "pack", emoji: "🌮", store: "saclay" },
  { id: "i-salsa", name: "Old El Paso salsa mild 300g", category: "international", priceEUR: 2.5, unit: "jar", emoji: "🌶️", store: "saclay" },
  { id: "i-sriracha", name: "Sriracha hot sauce 435ml", category: "international", priceEUR: 4.5, unit: "bottle", emoji: "🌶️", store: "saclay" },
  { id: "i-curry", name: "Thai green curry paste 115g", category: "international", priceEUR: 3.2, unit: "jar", emoji: "🥘", store: "saclay" },
  { id: "i-coconut", name: "Coconut milk 400ml", category: "international", priceEUR: 2.2, unit: "can", emoji: "🥥", store: "saclay" },
  { id: "i-miso", name: "Miso soup instant x4", category: "international", priceEUR: 3.9, unit: "pack", emoji: "🍲", store: "saclay" },
  { id: "i-nori", name: "Nori seaweed sheets x10", category: "international", priceEUR: 3.5, unit: "pack", emoji: "🍙", store: "saclay" },

  // ---------------- HOUSEHOLD ----------------
  { id: "h-detergent", name: "Ariel laundry detergent 1.5L", category: "household", priceEUR: 8.9, unit: "bottle", emoji: "🧴", store: "both" },
  { id: "h-pods", name: "Ariel Pods x30", category: "household", priceEUR: 10.9, unit: "box", emoji: "🧺", store: "saclay" },
  { id: "h-softener", name: "Soupline fabric softener 1L", category: "household", priceEUR: 3.9, unit: "bottle", emoji: "🧺", store: "both" },
  { id: "h-dishwash", name: "Fairy washing-up liquid 750ml", category: "household", priceEUR: 3.2, unit: "bottle", emoji: "🍽️", store: "both" },
  { id: "h-dishwasher", name: "Finish dishwasher tabs x40", category: "household", priceEUR: 11.9, unit: "box", emoji: "🍽️", store: "saclay" },
  { id: "h-paper", name: "Lotus toilet paper x12", category: "household", priceEUR: 6.5, unit: "pack", emoji: "🧻", store: "both" },
  { id: "h-kitchen-roll", name: "Kitchen paper towels x6", category: "household", priceEUR: 5.9, unit: "pack", emoji: "🧻", store: "both" },
  { id: "h-trash", name: "Trash bags 30L x20", category: "household", priceEUR: 3.2, unit: "roll", emoji: "🗑️", store: "both" },
  { id: "h-tinfoil", name: "Aluminium foil 30m", category: "household", priceEUR: 2.9, unit: "roll", emoji: "🥫", store: "both" },
  { id: "h-battery", name: "Duracell AA batteries x8", category: "household", priceEUR: 7.9, unit: "pack", emoji: "🔋", store: "saclay" },
  { id: "h-bulb", name: "LED bulb E27 60W", category: "household", priceEUR: 4.5, unit: "unit", emoji: "💡", store: "saclay" },

  // ---------------- HEALTH & BEAUTY ----------------
  { id: "hb-shampoo", name: "Head & Shoulders shampoo 400ml", category: "health", priceEUR: 4.8, unit: "bottle", emoji: "🧴", store: "both" },
  { id: "hb-conditioner", name: "L'Oréal conditioner 400ml", category: "health", priceEUR: 4.9, unit: "bottle", emoji: "🧴", store: "both" },
  { id: "hb-shower", name: "Dove shower gel 500ml", category: "health", priceEUR: 3.5, unit: "bottle", emoji: "🧼", store: "both" },
  { id: "hb-deodorant", name: "Nivea deodorant 150ml", category: "health", priceEUR: 3.2, unit: "can", emoji: "🧴", store: "both" },
  { id: "hb-toothpaste", name: "Colgate toothpaste 75ml", category: "health", priceEUR: 2.4, unit: "tube", emoji: "🪥", store: "both" },
  { id: "hb-toothbrush", name: "Oral-B toothbrush medium", category: "health", priceEUR: 3.5, unit: "unit", emoji: "🪥", store: "both" },
  { id: "hb-razor", name: "Gillette Fusion5 blades x4", category: "health", priceEUR: 13.9, unit: "pack", emoji: "🪒", store: "saclay" },
  { id: "hb-paracetamol", name: "Paracetamol 500mg x16", category: "health", priceEUR: 2.4, unit: "box", emoji: "💊", store: "both" },
  { id: "hb-condoms", name: "Durex Classic x12", category: "health", priceEUR: 9.9, unit: "box", emoji: "🛡️", store: "saclay" },
  { id: "hb-tampons", name: "Tampax tampons x32", category: "health", priceEUR: 6.9, unit: "box", emoji: "🩸", store: "both" },

  // ---------------- BABY CARE (Saclay exclusive) ----------------
  { id: "bc-diapers", name: "Pampers Baby-Dry size 4 x44", category: "babycare", priceEUR: 13.9, unit: "pack", emoji: "🍼", store: "saclay" },
  { id: "bc-wipes", name: "Baby wipes x72", category: "babycare", priceEUR: 2.9, unit: "pack", emoji: "🍼", store: "saclay" },
  { id: "bc-formula", name: "Gallia baby formula 800g", category: "babycare", priceEUR: 22.9, unit: "box", emoji: "🍼", store: "saclay" },
];
