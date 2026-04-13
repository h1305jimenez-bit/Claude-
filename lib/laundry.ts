import type { LaundryService } from "./types";

export const LAUNDRY_SERVICES: LaundryService[] = [
  {
    id: "wash_fold",
    name: "Wash & fold",
    description: "We pick up your laundry, wash it, dry it and return it folded within 24–48 h.",
    priceEUR: 12,
    unit: "6 kg bag",
    emoji: "🧺",
  },
  {
    id: "wash_iron",
    name: "Wash & iron",
    description: "Full wash plus ironing of shirts, pants and t-shirts.",
    priceEUR: 18,
    unit: "6 kg bag",
    emoji: "👔",
  },
  {
    id: "dry_clean",
    name: "Dry cleaning",
    description: "Dry cleaning for suits, coats and delicate garments.",
    priceEUR: 9,
    unit: "garment",
    emoji: "🧥",
  },
  {
    id: "iron_only",
    name: "Ironing only",
    description: "Professional ironing, no washing.",
    priceEUR: 2.5,
    unit: "garment",
    emoji: "🔥",
  },
  {
    id: "delicates",
    name: "Delicates",
    description: "Special care wash for wool, silk and fine lingerie.",
    priceEUR: 6,
    unit: "garment",
    emoji: "🧶",
  },
];

export const PICKUP_SLOTS = [
  "Today 6:00 – 7:00 PM",
  "Today 7:00 – 8:00 PM",
  "Tomorrow 8:00 – 9:00 AM",
  "Tomorrow 12:00 – 1:00 PM",
  "Tomorrow 6:00 – 7:00 PM",
];

export const HEC_DORMS = [
  "T1 – Expansiel",
  "T2 – Expansiel",
  "T3 – Expansiel",
  "T4 – Expansiel",
  "T5 – Expansiel",
  "Résidence du Parc",
  "Pavillon",
  "Château",
  "Off-campus (Jouy-en-Josas)",
];
