# 🎓 HEC Campus Delivery

Mobile-first web app for **HEC Paris** students. It lets you:

- 🛒 Order groceries from **Auchan Supermarché Jouy-en-Josas**
  (50 Av. Jean Jaurès, across from campus) **and Auchan Saclay**
  hypermarket (bigger selection, international aisles, baby care, etc.).
- 📝 **Request anything** not in the catalog via a free-text order.
- 🧺 Book **laundry service** with pickup in your building — wash at
  3 €/kg and/or dry at 2 €/kg, plus a flat service fee.
- 🔐 Sign in with your **@hec.edu** email (we send a 6-digit code).
- 📧 Student receives an **order confirmation by email** automatically.
- 🔔 Operator receives every order by **email** (`OPERATOR_EMAIL`) **and
  WhatsApp** (via CallMeBot).
- 👀 Operator dashboard at **`/admin/orders`** (password-protected) to
  browse recent orders, check items, totals and delivery slots.
- 💳 Student pays with **Revolut** (`revolut.me/hecparis2026`) in one tap.

Designed for phones — installable as a PWA (Add to Home Screen).

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router)
- TypeScript · Tailwind CSS
- [`jose`](https://github.com/panva/jose) for signed cookies (email OTP,
  student session, admin session) — stateless, no database required.
- [Resend](https://resend.com) for transactional emails.
- [CallMeBot](https://www.callmebot.com/) for WhatsApp push to the operator.
- [Open Food Facts](https://world.openfoodfacts.org/) CDN for product photos.
- React Context + `localStorage` for student-side cart and order history.
- In-memory store (`lib/orders-store.ts`) for the operator dashboard.

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

> ⚠️ Note: Resend's free tier can only email the address you signed up
> with until you verify a domain. For testing, use your own email.

### 3 · Activate CallMeBot so you get a WhatsApp for each order

CallMeBot is a free service that sends a WhatsApp message to your
phone through a simple HTTP call. One-time setup (about 2 minutes):

1. On your phone, save **+34 644 51 95 23** as a contact called
   **CallMeBot**.
2. Send a WhatsApp message to that contact with this exact text:
   ```
   I allow callmebot to send me messages
   ```
3. Wait a minute. CallMeBot will reply with your **personal API key**
   — a string of letters and numbers.
4. Write that key down — you'll paste it into `.env.local` in step 6.

More info: <https://www.callmebot.com/blog/free-api-whatsapp-messages/>

### 4 · Generate an auth secret

A long random string that signs cookies so no one can forge a login
session. Run in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output.

### 5 · Pick an admin password

Anyone who knows this will be able to see every order at
`/admin/orders`. Pick something strong (e.g. another
`crypto.randomBytes` string or a long passphrase).

### 6 · Create `.env.local`

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```
NEXT_PUBLIC_REVOLUT_USERNAME=hecparis2026
AUTH_SECRET=<paste the long random string from step 4>
ADMIN_PASSWORD=<the admin password from step 5>

RESEND_API_KEY=<paste your Resend key from step 2>
RESEND_FROM=HEC Campus Delivery <onboarding@resend.dev>
OPERATOR_EMAIL=h_1305@hotmail.com

CALLMEBOT_PHONE=525534660384
CALLMEBOT_API_KEY=<paste the key CallMeBot sent you in step 3>
```

> Without `RESEND_API_KEY`, the app still works locally — it just prints
> the login code in the server console instead of emailing it, and
> skips the operator/student emails. Handy for quick tests.
>
> Without `CALLMEBOT_API_KEY`, WhatsApp alerts are skipped silently
> (check the server console to see the warning).

### 7 · Run it

```bash
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login`. Enter
your @hec.edu email, wait for the code in your inbox (or look at the
terminal if you skipped step 2), type it, and you're in.

To see the **operator dashboard**, open
<http://localhost:3000/admin/orders> and enter the `ADMIN_PASSWORD` you
picked in step 5.

### 8 · Deploy on Vercel (2 minutes)

1. Push this branch to GitHub.
2. Go to <https://vercel.com/new> → Import the repo.
3. Add the same environment variables (Settings → Environment
   Variables): `NEXT_PUBLIC_REVOLUT_USERNAME`, `AUTH_SECRET`,
   `ADMIN_PASSWORD`, `RESEND_API_KEY`, `RESEND_FROM`,
   `OPERATOR_EMAIL`, `CALLMEBOT_PHONE`, `CALLMEBOT_API_KEY`.
4. Click **Deploy**.

> ⚠️ On Vercel (serverless), the in-memory dashboard list may reset
> between deployments or when a new function instance spins up. The
> emails to `OPERATOR_EMAIL` are the **reliable** record of every
> order. When you outgrow this, swap `lib/orders-store.ts` for Vercel
> KV, Upstash Redis, or a Postgres table — the function signatures
> (`saveOrder`, `listOrders`) are the only things to match.

## Where do I check orders?

Three places, in order of reliability:

1. **Email inbox** — every order is emailed to `OPERATOR_EMAIL`
   (default: `h_1305@hotmail.com`). This is the source of truth.
2. **WhatsApp** — instant push to the number in `CALLMEBOT_PHONE`
   (default: +52 55 3466 0384).
3. **Web dashboard** at `/admin/orders` — convenient list view with
   expandable cards, status filter and totals. Protected by
   `ADMIN_PASSWORD`. Best-effort only (see Vercel note above).

## User flow

1. Student signs in with `first.last@hec.edu` → enters the 6-digit code
   emailed to them.
2. Home screen — picks **Auchan groceries** or **Campus laundry**.
3. Adds products (filters by category and by store: Jouy / Saclay /
   Both) or books laundry by kilogram. If something isn't in the menu,
   they can type a **custom request** at the bottom of the Auchan page.
4. Cart — confirms name, phone, **building letter** + **room number**
   and pickup/delivery slot. Email is auto-filled from the session.
5. Tap **Confirm & pay with Revolut** → app generates a Revolut link
   pre-filled with the amount and reference `HEC-XXXX`, emails the
   student a confirmation, emails the operator, and pings the operator
   on WhatsApp.
6. Operator sees the Revolut payment land, confirms the order in
   `/admin/orders` and delivers.

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
  auchan/page.tsx         Auchan catalog (Jouy + Saclay, custom requests)
  laundry/page.tsx        Laundry (wash 3 €/kg, dry 2 €/kg)
  cart/page.tsx           Cart + delivery form (building letter + room)
  orders/[id]/page.tsx    Confirmation + Revolut pay button
  admin/orders/page.tsx   Operator dashboard (password protected)
  api/
    auth/request-code     POST — send OTP email, set signed OTP cookie
    auth/verify-code      POST — verify code, set signed session cookie
    auth/logout           POST — clear session cookie
    auth/me               GET  — return signed-in email
    admin/login           POST/DELETE — admin dashboard auth
    orders/confirm        POST — save order, email student & operator,
                          ping WhatsApp via CallMeBot
components/
  CartProvider.tsx        Cart context with localStorage persistence
  Header.tsx              Header with cart badge, avatar and logout
  ProductCard.tsx         Auchan product card with photo + emoji fallback
  LaundryCard.tsx         Laundry service card (per-kg)
lib/
  products.ts             Auchan Jouy-en-Josas + Saclay catalog with photos
  laundry.ts              Wash / dry services + pickup slots
  revolut.ts              Revolut.me pay link builder (hecparis2026)
  auth.ts                 JWT sign/verify + OTP helpers (jose)
  admin.ts                Admin session cookie verification
  email.ts                Resend client + branded email templates
                          (student confirmation + operator alert)
  whatsapp.ts             CallMeBot client for WhatsApp push
  orders-store.ts         In-memory order store for the dashboard
  types.ts                Shared types
middleware.ts             Redirects unauthenticated students to /login
```

## Roadmap

- [ ] Real DB (Supabase/Postgres or Vercel KV) + persistent dashboard.
- [ ] Revolut Merchant API with webhooks (auto payment confirmation).
- [ ] Restrict OTP delivery by rate-limiting per IP/email.
- [ ] Product photos for the remaining catalog items (operator form).
- [ ] Referral credits for students.
