import type { LaundryService } from "./types";

export const LAUNDRY_SERVICES: LaundryService[] = [
  {
    id: "wash_fold",
    name: "Lavado y doblado",
    description: "Recogemos tu ropa, la lavamos, secamos y la devolvemos doblada en 24–48 h.",
    priceEUR: 12,
    unit: "bolsa de 6 kg",
    emoji: "🧺",
  },
  {
    id: "wash_iron",
    name: "Lavado y planchado",
    description: "Lavado completo + planchado de camisas, pantalones y camisetas.",
    priceEUR: 18,
    unit: "bolsa de 6 kg",
    emoji: "👔",
  },
  {
    id: "dry_clean",
    name: "Tintorería",
    description: "Limpieza en seco para trajes, abrigos y prendas delicadas.",
    priceEUR: 9,
    unit: "prenda",
    emoji: "🧥",
  },
  {
    id: "iron_only",
    name: "Solo planchado",
    description: "Planchado profesional, sin lavado.",
    priceEUR: 2.5,
    unit: "prenda",
    emoji: "🔥",
  },
  {
    id: "delicates",
    name: "Prendas delicadas",
    description: "Lavado especial para lana, seda y lencería fina.",
    priceEUR: 6,
    unit: "prenda",
    emoji: "🧶",
  },
];

export const PICKUP_SLOTS = [
  "Hoy 18:00 – 19:00",
  "Hoy 19:00 – 20:00",
  "Mañana 08:00 – 09:00",
  "Mañana 12:00 – 13:00",
  "Mañana 18:00 – 19:00",
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
