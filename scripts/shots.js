const { chromium } = require("playwright");

const EXEC = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE = "http://localhost:3000";
const OUT = "/tmp/shots";

(async () => {
  const fs = require("fs");
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ executablePath: EXEC, headless: true });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 900 },
    deviceScaleFactor: 2,
  });
  const shot = async (name, opts = {}) => {
    await page.screenshot({ path: `${OUT}/${name}`, ...opts });
    console.log("shot", name);
  };
  const go = (path) => page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });

  // 1. Landing
  await go("/");
  await shot("01-landing.png", { fullPage: true });

  // 2-4. Wizard
  await go("/crear");
  await shot("02-crear-giro.png");
  await page.locator("button", { hasText: "Tienda y productos" }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.waitForTimeout(400);
  await shot("03-crear-estilo.png");
  await page.locator("button", { hasText: "Moderno" }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.waitForTimeout(400);
  await page.getByPlaceholder(/Taquería El Güero/).fill("Boutique La Coqueta");
  await page
    .getByPlaceholder(/Tacos al pastor/)
    .fill("Ropa y accesorios artesanales hechos en México.");
  await page.getByPlaceholder(/5512345678/).fill("5512345678");
  await shot("04-crear-datos.png");

  // 5. Editor con aviso de preview + 24h + $99
  await page.getByRole("button", { name: /Generar mi página/ }).click();
  await page.waitForURL("**/dashboard/**", { timeout: 15000 });
  await page.waitForTimeout(800);
  await shot("05-editor-preview-99.png");

  // 6. Página pública
  const href = await page
    .getByRole("link", { name: /Ver página pública/ })
    .getAttribute("href");
  await go(href);
  await page.waitForTimeout(500);
  await shot("06-sitio-publico.png", { fullPage: true });

  // 7. Agregar al carrito en la tienda -> aparece la barra de carrito
  await page.getByRole("button", { name: /Agregar al carrito/ }).first().click();
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await shot("07-carrito-en-tienda.png");

  // 8. Checkout
  await go("/checkout");
  await page.waitForTimeout(500);
  await page.getByPlaceholder(/Nombre completo/).fill("Ana López");
  await page.getByPlaceholder(/Tel/).fill("5598765432");
  await shot("08-checkout.png");

  // 9. Confirmación con folio
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await page.waitForURL("**/checkout/gracias**", { timeout: 15000 });
  await page.waitForTimeout(600);
  await shot("09-gracias.png", { fullPage: true });

  // 10. Panel de pedidos del dueño
  await go("/dashboard/pedidos");
  await page.waitForTimeout(600);
  await shot("10-pedidos.png", { fullPage: true });

  // 11. Marketplace (con el nuevo mensaje vende-sin-riesgo)
  await go("/marketplace");
  await page.waitForTimeout(500);
  await shot("11-marketplace.png", { fullPage: true });

  // 12. Menú móvil estilo ChatGPT
  await page.setViewportSize({ width: 390, height: 844 });
  await go("/dashboard");
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /Abrir menú/ }).click();
  await page.waitForTimeout(400);
  await shot("12-menu-movil.png");

  await browser.close();
  console.log("DONE");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
