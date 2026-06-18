# 🛒 Telovendo

**Crea la página y tienda en línea de tu negocio en segundos** — o sube tu
producto a nuestro marketplace y **nosotros lo vendemos por ti**.

Plataforma para pymes mexicanas inspirada en T1, con el diferenciador de
**generación de contenido con IA** y un **marketplace con logística propia**.

> Dominio objetivo: **telovendo.mx** 🇲🇽

## Los dos caminos

1. **Tu propia tienda (builder):** el negocio elige su giro y estilo, describe
   qué vende y la plataforma arma su página profesional (textos, secciones,
   diseño y catálogo) en segundos. Vende bajo su marca con botón de WhatsApp y
   pagos en línea.
2. **Marketplace ("te lo vendo"):** el negocio sube su producto a la tienda
   general de Telovendo. Nosotros lo mostramos, cobramos y **lo enviamos por
   ti** (fulfillment/consignación). El vendedor solo recibe su dinero.

## Estado actual — Fase 1 (MVP navegable)

Ya implementado:

- 🏠 **Landing** de Telovendo explicando ambos caminos.
- ✨ **Asistente de creación** (`/crear`): giro → estilo → datos → genera el
  sitio. Hoy usa un **generador demo** (sin IA); la firma ya está lista para
  conectar Claude.
- 🎨 **Editor con vista previa en vivo** (`/dashboard/[id]`): edita portada,
  estilo, productos y secciones; guarda automático.
- 🌐 **Página pública** del negocio (`/sitio/[slug]`) con WhatsApp.
- 📦 **Marketplace** (`/marketplace`) que junta los productos marcados para
  venta por Telovendo.
- 💾 Persistencia en **localStorage** (mapeable a Supabase sin cambiar las
  pantallas).

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router) · TypeScript · Tailwind CSS
- Persistencia: `localStorage` (MVP) → **Supabase** (siguientes fases)
- IA: **Claude** (`@anthropic-ai/sdk`) — se conecta en la fase de IA
- Pagos: **Mercado Pago** (tarjetas, SPEI, OXXO) — Fase 3
- Notificaciones: email + WhatsApp — Fase 2

## Correr en local

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>. Crea un sitio en `/crear`, edítalo en el
dashboard y míralo en `/sitio/<slug>`. Marca productos para el marketplace y
aparecerán en `/marketplace`.

> Nota: como el MVP guarda en `localStorage`, los sitios viven en el navegador
> donde los creaste. La persistencia en la nube llega con Supabase (Fase 2).

## Estructura

```
app/
  page.tsx                 Landing de Telovendo
  crear/page.tsx           Asistente de creación (wizard)
  dashboard/page.tsx       Lista "Mis sitios"
  dashboard/[id]/page.tsx  Editor con vista previa en vivo
  sitio/[slug]/page.tsx    Página pública del negocio
  marketplace/page.tsx     Marketplace de Telovendo
components/
  Navbar.tsx               Navegación de marketing
  SiteRenderer.tsx         Renderiza un sitio (tema + secciones)
lib/
  types.ts                 Modelo de datos (Sitio, Seccion, Producto)
  templates.ts             Giros y estilos (temas)
  generator.ts             Generador de contenido (demo; futura IA con Claude)
  store.ts                 Persistencia localStorage + marketplace
```

## Roadmap

- [x] **Fase 1 — MVP navegable:** landing, wizard, editor, página pública,
      marketplace (demo, sin IA, localStorage).
- [ ] **Fase 2 — Publicación real:** Supabase (auth + datos), subdominios
      (`negocio.telovendo.mx`), formulario de contacto → email/WhatsApp.
- [ ] **Fase IA:** conectar Claude para generar el contenido del sitio a partir
      de la descripción (sustituye al generador demo, misma firma).
- [ ] **Fase 3 — Tienda y pagos:** carrito, checkout y **Mercado Pago**
      (tarjeta/SPEI/OXXO), panel de pedidos.
- [ ] **Fase 4 — Negocio:** planes (gratis/pro), dominios propios, analítica.
- [ ] **Fase 5 — Marketplace con logística:** pagos divididos (split a
      vendedores menos comisión) y **fulfillment propio** (nosotros enviamos).
```
