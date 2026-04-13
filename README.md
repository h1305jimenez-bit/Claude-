# 🎓 HEC Campus Delivery

App web (mobile-first) para estudiantes de **HEC Paris**. Permite:

- 🛒 Pedir la despensa del **Auchan de Vélizy** y recibirla en tu dorm.
- 🧺 Reservar servicio de **lavandería** con recogida en la habitación
  (lavado, planchado, tintorería, prendas delicadas).
- 💳 Pagar vía **Revolut** en un clic (enlace `revolut.me` con importe y
  referencia precargados).

Pensada para usarse desde el móvil — instalable como PWA (añadir a pantalla
de inicio).

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router)
- TypeScript
- Tailwind CSS
- React Context + `localStorage` para carrito y pedidos

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # ajusta NEXT_PUBLIC_REVOLUT_USERNAME
npm run dev
```

Abre <http://localhost:3000>.

## Variables de entorno

| Variable | Descripción |
| -------- | ----------- |
| `NEXT_PUBLIC_REVOLUT_USERNAME` | Usuario de Revolut.me (sin `@`) que recibe los pagos. |

## Flujo del usuario

1. **Home** – elige entre "Despensa Auchan" o "Lavandería".
2. **Catálogo** – añade productos o servicios al carrito.
3. **Carrito** – indica nombre, dorm, habitación, teléfono y franja horaria.
4. **Confirmación** – se genera un `HEC-XXXX` y un enlace Revolut ya
   precargado con el importe y la referencia. El estudiante pulsa "Abrir
   Revolut y pagar" y completa el pago desde la app oficial de Revolut.
5. El operador marca el pedido como pagado en su panel (a implementar) y
   gestiona la entrega/recogida.

## Cómo funciona el pago con Revolut

Usamos **Revolut.me** (pay link público) porque:

- No requiere cuenta Revolut Business.
- No hay fricción para el estudiante: Revolut ya está instalado en casi
  todos los móviles del campus.
- Es instantáneo y sin comisión entre cuentas Revolut.

El enlace se genera así:

```
https://revolut.me/<usuario>?amount=<total>&currency=EUR&reference=<orderId>
```

Cuando la operación crezca, se puede sustituir por la
[Merchant API de Revolut](https://developer.revolut.com/docs/merchant/overview)
(`POST /orders` + webhooks) para automatizar la conciliación.

## Roadmap sugerido

- [ ] Backend con base de datos (Supabase / Postgres) y dashboard operador.
- [ ] Notificaciones por WhatsApp (Twilio) al crear pedido y al entregar.
- [ ] Merchant API de Revolut con webhooks de confirmación automática.
- [ ] Panel para repartidores con pedidos en ruta.
- [ ] Inicio de sesión con email `@hec.edu` para limitar el acceso a la
      comunidad HEC.
- [ ] Programa de referidos y créditos.

## Estructura del proyecto

```
app/
  layout.tsx              Layout raíz + cabecera + CartProvider
  page.tsx                Home con selección de servicio
  auchan/page.tsx         Catálogo de productos del Auchan
  laundry/page.tsx        Servicios de lavandería
  cart/page.tsx           Carrito + formulario de entrega
  orders/[id]/page.tsx    Confirmación + botón de pago Revolut
components/
  CartProvider.tsx        Contexto de carrito con persistencia
  Header.tsx              Cabecera con contador del carrito
  ProductCard.tsx         Tarjeta de producto Auchan
  LaundryCard.tsx         Tarjeta de servicio de lavandería
lib/
  products.ts             Catálogo mock de Auchan
  laundry.ts              Servicios de lavandería, dorms, horarios
  revolut.ts              Generador de enlace de pago Revolut.me
  types.ts                Tipos compartidos
```
