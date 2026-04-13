import type { LaundryService } from "./types";

export const LAUNDRY_SERVICES: LaundryService[] = [
  {
    id: "wash",
    name: "Wash",
    description: "We pick up your laundry, wash it and return it clean to your dorm.",
    priceEUR: 3,
    unit: "kg",
    emoji: "🧺",
  },
  {
    id: "dry",
    name: "Dry",
    description: "Tumble dry your clean laundry so it's ready to wear.",
    priceEUR: 2,
    unit: "kg",
    emoji: "💨",
  },
];

export const PICKUP_SLOTS = [
  "Today 6:00 – 7:00 PM",
  "Today 7:00 – 8:00 PM",
  "Tomorrow 8:00 – 9:00 AM",
  "Tomorrow 12:00 – 1:00 PM",
  "Tomorrow 6:00 – 7:00 PM",
];
