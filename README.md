# 🎓 HEC Campus Delivery

Mobile-first web app for **HEC Paris** students. It lets you:

- 🛒 Order groceries from the **Auchan Supermarché Jouy-en-Josas**
  (50 Av. Jean Jaurès, right across from the main campus entrance).
- 🧺 Book **laundry service** with pickup in your building — wash at
  3 €/kg and/or dry at 2 €/kg, plus a flat service fee.
- 🔐 Sign in with your **@hec.edu** email (we send a 6-digit code).
- 📧 Receive an **order confirmation by email** automatically.
- 💳 Pay with **Revolut** (`revolut.me/hecparis2026`) in one tap.

Designed for phones — installable as a PWA (Add to Home Screen).

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router)
- TypeScript · Tailwind CSS
- [`jose`](https://github.com/panva/jose) for signed cookies (email OTP
  + session) — stateless, no database required.
- [Resend](https://resend.com) for transactional emails.
- React Context + `localStorage` for cart and order history.

## Step-by-step setup (you don't need any backend experience)

### 1 · Install Node.js and clone the repo

```bash
git clone <this-repo-url>
cd hec-delivery
npm install
```

### 2 · Sign up at Resend (free) for email sending

1. Go to <https://resend.com/signup> and create an account — no credit
   card needed. Free tier is 3 000 emails/month.
2. In the dashboard → **API Keys** → **Create API Key**. Copy it.
3. While testing you can send from the default address
   `onboarding@resend.dev`. When you're ready to go live, verify your
   own domain in the Resend dashboard (DNS records) and update
   `RESEND_FROM`.

### 3 · Generate an auth secret

This is a long random string that signs cookies so no one can forge a
login session. Run in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output.

### 4 · Create `.env.local`

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```
NEXT_PUBLIC_REVOLUT_USERNAME=hecparis2026
AUTH_SECRET=<paste the long random string from step 3>
RESEND_API_KEY=<paste your Resend key from step 2>
RESEND_FROM=HEC Campus Delivery <onboarding@resend.dev>
```

> Without `RESEND_API_KEY`, the app still works locally — it just prints
> the login code in the server console instead of emailing it. Handy
> for quick tests.

### 5 · Run it

```bash
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login`. Enter
your @hec.edu email, wait for the code in your inbox (or look at the
terminal if you skipped step 2), type it, and you're in.

### 6 · Deploy on Vercel (2 minutes)

1. Push this branch to GitHub.
2. Go to <https://vercel.com/new> → Import the repo.
3. Add the same environment variables (Settings → Environment
   Variables): `NEXT_PUBLIC_REVOLUT_USERNAME`, `AUTH_SECRET`,
   `RESEND_API_KEY`, `RESEND_FROM`.
4. Click **Deploy**.

## User flow

1. Student signs in with `first.last@hec.edu` → enters the 6-digit code
   emailed to them.
2. Home screen — picks **Auchan groceries** or **Campus laundry**.
3. Adds products or books laundry by kilogram.
4. Cart — confirms name, phone, **building letter** + **room number**
   and pickup/delivery slot. Email is auto-filled from the session.
5. Tap **Confirm & pay with Revolut** → app generates a Revolut link
   pre-filled with the amount and reference `HEC-XXXX` AND emails a
   confirmation to the student.
6. Operator sees the Revolut payment land, confirms the order and
   delivers.

## How the Revolut payment works

Pay link pattern:

```
https://revolut.me/hecparis2026?amount=<total>&currency=EUR&reference=<orderId>
```

Opens Revolut with the amount and reference pre-filled. Zero-fee
transfers between Revolut accounts. When volume grows, migrate to the
[Revolut Merchant API](https://developer.revolut.com/docs/merchant/overview)
for automatic reconciliation via webhooks.

## Project structure

```
app/
  layout.tsx              Root layout, reads session from cookie
  page.tsx                Home with service picker
  login/page.tsx          @hec.edu email + 6-digit code login
  auchan/page.tsx         Auchan product catalog
  laundry/page.tsx        Laundry (wash 3 €/kg, dry 2 €/kg)
  cart/page.tsx           Cart + delivery form (building letter + room)
  orders/[id]/page.tsx    Confirmation + Revolut pay button
  api/
    auth/request-code     POST — send OTP email, set signed OTP cookie
    auth/verify-code      POST — verify code, set signed session cookie
    auth/logout           POST — clear session cookie
    auth/me               GET  — return signed-in email
    orders/confirm        POST — email order confirmation to the student
components/
  CartProvider.tsx        Cart context with localStorage persistence
  Header.tsx              Header with cart badge, avatar and logout menu
  ProductCard.tsx         Auchan product card
  LaundryCard.tsx         Laundry service card (per-kg)
lib/
  products.ts             Auchan Jouy-en-Josas mock catalog
  laundry.ts              Wash / dry services + pickup slots
  revolut.ts              Revolut.me pay link builder (hecparis2026)
  auth.ts                 JWT sign/verify + OTP helpers (jose)
  email.ts                Resend client + branded email templates
  types.ts                Shared types
middleware.ts             Redirects unauthenticated users to /login
```

## Roadmap

- [ ] Real DB (Supabase/Postgres) + operator dashboard.
- [ ] Revolut Merchant API with webhooks (auto payment confirmation).
- [ ] WhatsApp notifications (Twilio) when the courier is on the way.
- [ ] Restrict OTP delivery by rate-limiting per IP/email.
- [ ] Referral credits for students.
