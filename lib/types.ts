export type Category =
  | "pantry"
  | "fresh"
  | "drinks"
  | "snacks"
  | "household"
  | "frozen";

export interface Product {
  id: string;
  name: string;
  category: Category;
  priceEUR: number;
  unit: string;
  emoji: string;
}

export type LaundryServiceId =
  | "wash_fold"
  | "wash_iron"
  | "dry_clean"
  | "iron_only"
  | "delicates";

export interface LaundryService {
  id: LaundryServiceId;
  name: string;
  description: string;
  priceEUR: number;
  unit: string;
  emoji: string;
}

export interface CartItem {
  kind: "product" | "laundry";
  id: string;
  name: string;
  priceEUR: number;
  quantity: number;
  emoji: string;
  unit: string;
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
    phone: string;
    dorm: string;
    room: string;
    notes?: string;
    slot: string;
  };
  kind: "auchan" | "laundry" | "mixed";
  status: "pending_payment" | "paid" | "in_progress" | "delivered";
}
