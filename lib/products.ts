import type { Product, Category } from "./types";

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "pantry", label: "Pantry", emoji: "🥫" },
  { id: "fresh", label: "Fresh", emoji: "🥬" },
  { id: "drinks", label: "Drinks", emoji: "🥤" },
  { id: "snacks", label: "Snacks", emoji: "🍪" },
  { id: "household", label: "Household", emoji: "🧼" },
  { id: "frozen", label: "Frozen", emoji: "🧊" },
];

export const PRODUCTS: Product[] = [
  // Pantry
  { id: "p-pasta", name: "Barilla pasta 500g", category: "pantry", priceEUR: 1.5, unit: "pack", emoji: "🍝" },
  { id: "p-rice", name: "Taureau Ailé rice 1kg", category: "pantry", priceEUR: 2.2, unit: "pack", emoji: "🍚" },
  { id: "p-oil", name: "Puget olive oil 75cl", category: "pantry", priceEUR: 6.9, unit: "bottle", emoji: "🫒" },
  { id: "p-tomato", name: "Mutti crushed tomatoes 400g", category: "pantry", priceEUR: 1.8, unit: "can", emoji: "🍅" },
  { id: "p-bread", name: "Traditional baguette", category: "pantry", priceEUR: 1.2, unit: "unit", emoji: "🥖" },
  { id: "p-cereal", name: "Jordans muesli 500g", category: "pantry", priceEUR: 4.2, unit: "box", emoji: "🥣" },
  { id: "p-peanut", name: "Peanut butter 340g", category: "pantry", priceEUR: 3.9, unit: "jar", emoji: "🥜" },
  { id: "p-nutella", name: "Nutella 400g", category: "pantry", priceEUR: 3.5, unit: "jar", emoji: "🍫" },

  // Fresh
  { id: "f-milk", name: "Lactel semi-skimmed milk 1L", category: "fresh", priceEUR: 1.1, unit: "bottle", emoji: "🥛" },
  { id: "f-eggs", name: "Free-range eggs x6", category: "fresh", priceEUR: 2.6, unit: "box", emoji: "🥚" },
  { id: "f-cheese", name: "Grated Emmental 200g", category: "fresh", priceEUR: 2.9, unit: "bag", emoji: "🧀" },
  { id: "f-yogurt", name: "Danone natural yogurt x4", category: "fresh", priceEUR: 2.1, unit: "pack", emoji: "🥄" },
  { id: "f-chicken", name: "Chicken breast 500g", category: "fresh", priceEUR: 6.5, unit: "tray", emoji: "🍗" },
  { id: "f-banana", name: "Bananas 1kg", category: "fresh", priceEUR: 1.9, unit: "kg", emoji: "🍌" },
  { id: "f-apple", name: "Gala apples 1kg", category: "fresh", priceEUR: 2.4, unit: "kg", emoji: "🍎" },
  { id: "f-salad", name: "Ready-to-eat salad 200g", category: "fresh", priceEUR: 2.2, unit: "bag", emoji: "🥗" },

  // Drinks
  { id: "d-water", name: "Evian water 1.5L x6", category: "drinks", priceEUR: 4.5, unit: "pack", emoji: "💧" },
  { id: "d-coke", name: "Coca-Cola 1.5L", category: "drinks", priceEUR: 2.3, unit: "bottle", emoji: "🥤" },
  { id: "d-orange", name: "Tropicana orange juice 1L", category: "drinks", priceEUR: 3.5, unit: "bottle", emoji: "🧃" },
  { id: "d-coffee", name: "Carte Noire ground coffee 250g", category: "drinks", priceEUR: 4.9, unit: "pack", emoji: "☕" },
  { id: "d-tea", name: "Lipton English Breakfast tea x25", category: "drinks", priceEUR: 2.8, unit: "box", emoji: "🫖" },
  { id: "d-beer", name: "Heineken 33cl x6", category: "drinks", priceEUR: 6.9, unit: "pack", emoji: "🍺" },
  { id: "d-wine", name: "Côtes du Rhône red wine", category: "drinks", priceEUR: 7.5, unit: "bottle", emoji: "🍷" },

  // Snacks
  { id: "s-chips", name: "Lay's classic chips 150g", category: "snacks", priceEUR: 2.1, unit: "bag", emoji: "🍟" },
  { id: "s-cookies", name: "Prince cookies 300g", category: "snacks", priceEUR: 2.5, unit: "pack", emoji: "🍪" },
  { id: "s-chocolate", name: "Milka chocolate bar 100g", category: "snacks", priceEUR: 1.8, unit: "bar", emoji: "🍫" },
  { id: "s-kinder", name: "Kinder Bueno x3", category: "snacks", priceEUR: 2.2, unit: "pack", emoji: "🍬" },
  { id: "s-nuts", name: "Roasted almonds 200g", category: "snacks", priceEUR: 4.5, unit: "bag", emoji: "🌰" },

  // Household
  { id: "h-detergent", name: "Ariel laundry detergent 1.5L", category: "household", priceEUR: 8.9, unit: "bottle", emoji: "🧴" },
  { id: "h-softener", name: "Soupline fabric softener 1L", category: "household", priceEUR: 3.9, unit: "bottle", emoji: "🧺" },
  { id: "h-paper", name: "Lotus toilet paper x12", category: "household", priceEUR: 6.5, unit: "pack", emoji: "🧻" },
  { id: "h-shampoo", name: "Head & Shoulders shampoo 400ml", category: "household", priceEUR: 4.8, unit: "bottle", emoji: "🧴" },
  { id: "h-toothpaste", name: "Colgate toothpaste 75ml", category: "household", priceEUR: 2.4, unit: "tube", emoji: "🪥" },
  { id: "h-trash", name: "Trash bags 30L x20", category: "household", priceEUR: 3.2, unit: "roll", emoji: "🗑️" },

  // Frozen
  { id: "fr-pizza", name: "Buitoni 4-cheese pizza", category: "frozen", priceEUR: 4.5, unit: "unit", emoji: "🍕" },
  { id: "fr-fries", name: "McCain French fries 1kg", category: "frozen", priceEUR: 3.2, unit: "bag", emoji: "🍟" },
  { id: "fr-icecream", name: "Ben & Jerry's ice cream 465ml", category: "frozen", priceEUR: 6.9, unit: "tub", emoji: "🍦" },
  { id: "fr-vegetables", name: "Stir-fry vegetables 1kg", category: "frozen", priceEUR: 3.5, unit: "bag", emoji: "🥦" },
];
