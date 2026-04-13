# 🎓 HEC Campus Delivery

Mobile-first web app for **HEC Paris** students. It lets you:

- 🛒 Order groceries from **Auchan Vélizy** and get them dropped off at
  your dorm.
- 🧺 Book **laundry service** with pickup in your room (wash, iron, dry
  clean, delicates).
- 💳 Pay with **Revolut** in one tap (`revolut.me` link pre-filled with
  the amount and order reference).

Designed for phones — installable as a PWA (Add to Home Screen).

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router)
- TypeScript
- Tailwind CSS
- React Context + `localStorage` for cart and orders

## Local development

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_REVOLUT_USERNAME
npm run dev
```

Open <http://localhost:3000>.

## Environment variables

| Variable | Description |
| -------- | ----------- |
| `NEXT_PUBLIC_REVOLUT_USERNAME` | Your Revolut.me username (without `@`) that receives payments. |

## User flow

1. **Home** – pick "Auchan groceries" or "Campus laundry".
2. **Catalog** – add items or services to the cart.
3. **Cart** – enter name, residence, **building letter**, room number,
   phone and a time slot.
4. **Confirmation** – the app generates a `HEC-XXXX` reference and a
   Revolut link pre-filled with the total and reference. The student
   taps "Open Revolut & pay" and completes the payment inside the
   Revolut app.
5. The operator marks the order as paid in their dashboard (to be built)
   and handles the delivery or pickup.

## How the Revolut payment works

We use **Revolut.me** (public pay link) because:

- No Revolut Business account required to start.
- Zero friction for the student: Revolut is already installed on almost
  every phone on campus.
- Instant, free between Revolut accounts.

The link is built like this:

```
https://revolut.me/<username>?amount=<total>&currency=EUR&reference=<orderId>
```

When volume grows, swap this for the
[Revolut Merchant API](https://developer.revolut.com/docs/merchant/overview)
(`POST /orders` + webhooks) to automate reconciliation.

## Suggested roadmap

- [ ] Backend with a real DB (Supabase / Postgres) and operator dashboard.
- [ ] WhatsApp notifications (Twilio) on new orders and delivery updates.
- [ ] Revolut Merchant API with webhooks for automatic payment confirmation.
- [ ] Courier panel for in-route orders.
- [ ] `@hec.edu` email sign-in to keep the app student-only.
- [ ] Referral program and credits.

## Project structure

```
app/
  layout.tsx              Root layout + header + CartProvider
  page.tsx                Home with service picker
  auchan/page.tsx         Auchan product catalog
  laundry/page.tsx        Laundry services
  cart/page.tsx           Cart + delivery form (incl. building letter)
  orders/[id]/page.tsx    Confirmation + Revolut pay button
components/
  CartProvider.tsx        Cart context with localStorage persistence
  Header.tsx              Header with cart badge
  ProductCard.tsx         Auchan product card
  LaundryCard.tsx         Laundry service card
lib/
  products.ts             Auchan mock catalog
  laundry.ts              Laundry services, dorms, pickup slots
  revolut.ts              Revolut.me pay link builder
  types.ts                Shared types
```
