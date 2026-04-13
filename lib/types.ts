export type Category =
  | "pantry"
  | "fresh"
  | "drinks"
  | "snacks"
  | "household"
  | "frozen"
  | "bakery"
  | "meat"
  | "international"
  | "babycare"
  | "health";

/** Which Auchan store the product is available at. */
export type Store = "jouy" | "saclay" | "both";

export interface Product {
  id: string;
  name: string;
  category: Category;
  priceEUR: number;
  unit: string;
  emoji: string;
  /** Optional product photo URL (Open Food Facts, Auchan CDN, etc.). */
  imageUrl?: string;
  /** Which store(s) stock this product. Defaults to "both". */
  store?: Store;
}

export type LaundryServiceId = "wash" | "dry";

export interface LaundryService {
  id: LaundryServiceId;
  name: string;
  description: string;
  priceEUR: number;
  unit: string;
  emoji: string;
}

export interface CartItem {
  /** "product" = catalog item · "laundry" = laundry service · "custom" = free-text request */
  kind: "product" | "laundry" | "custom";
  id: string;
  name: string;
  priceEUR: number;
  quantity: number;
  emoji: string;
  unit: string;
  /** Free-text description for "custom" items. */
  note?: string;
}

export interface OrderDetails {
  id: string;
  createdAt: string;
  items: CartItem[];
  subtotalEUR: number;
  serviceFeeEUR: number;
  totalEUR: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    building: string;
    room: string;
    notes?: string;
    slot: string;
  };
  kind: "auchan" | "laundry" | "mixed";
  status: "pending_payment" | "paid" | "in_progress" | "delivered";
}
