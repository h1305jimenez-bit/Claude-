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

  // 1. Landing
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await shot("01-landing.png", { fullPage: true });

  // 2. Wizard paso 1 (giro)
  await page.goto(`${BASE}/crear`, { waitUntil: "domcontentloaded" });
  await shot("02-crear-giro.png");
  await page.locator("button", { hasText: "Tienda y productos" }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();

  // 3. Wizard paso 2 (estilo)
  await page.waitForTimeout(400);
  await shot("03-crear-estilo.png");
  await page.locator("button", { hasText: "Moderno" }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();

  // 4. Wizard paso 3 (datos)
  await page.waitForTimeout(400);
  await page.getByPlaceholder(/Taquería El Güero/).fill("Boutique La Coqueta");
  await page
    .getByPlaceholder(/Tacos al pastor/)
    .fill("Ropa y accesorios artesanales hechos en México, envíos a todo el país.");
  await page.getByPlaceholder(/5512345678/).fill("5512345678");
  await shot("04-crear-datos.png");

  // Generar -> redirige al editor
  await page.getByRole("button", { name: /Generar mi página/ }).click();
  await page.waitForURL("**/dashboard/**", { timeout: 15000 });
  await page.waitForTimeout(800);
  await shot("05-editor.png");

  // 5. Página pública
  const href = await page
    .getByRole("link", { name: /Ver página pública/ })
    .getAttribute("href");
  await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await shot("06-sitio-publico.png", { fullPage: true });

  // 6. Marketplace
  await page.goto(`${BASE}/marketplace`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await shot("07-marketplace.png", { fullPage: true });

  // 7. Dashboard
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await shot("08-dashboard.png");

  // 8. Menú móvil estilo ChatGPT
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /Abrir menú/ }).click();
  await page.waitForTimeout(400);
  await shot("09-menu-movil.png");

  await browser.close();
  console.log("DONE");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
