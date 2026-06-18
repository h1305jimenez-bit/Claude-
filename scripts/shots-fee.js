const { chromium } = require("playwright");
const EXEC = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE = "http://localhost:3000";
const OUT = "/tmp/shots";

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC, headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2 });
  const go = (p) => page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" });

  // Crear tienda (productos quedan en marketplace por defecto)
  await go("/crear");
  await page.locator("button", { hasText: "Tienda y productos" }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.waitForTimeout(300);
  await page.locator("button", { hasText: "Moderno" }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.waitForTimeout(300);
  await page.getByPlaceholder(/Taquería El Güero/).fill("Detalles MX");
  await page.getByPlaceholder(/5512345678/).fill("5512345678");
  await page.getByRole("button", { name: /Generar mi página/ }).click();
  await page.waitForURL("**/dashboard/**", { timeout: 15000 });
  await page.waitForTimeout(800);

  // Panel del editor (muestra producto en marketplace con desglose 85/15)
  await page.getByText("Vender en el marketplace").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.locator("aside").first().screenshot({ path: `${OUT}/fee-01-editor-panel.png` });
  console.log("shot fee-01");

  // Comprar en el marketplace -> checkout con dirección -> pedido
  await go("/marketplace");
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /Agregar/ }).first().click();
  await page.waitForTimeout(300);
  await go("/checkout");
  await page.waitForTimeout(400);
  await page.getByPlaceholder(/Nombre completo/).fill("Carlos Ruiz");
  await page.getByPlaceholder(/Tel/).fill("5512300000");
  await page.getByPlaceholder(/Calle y número/).fill("Av. Reforma 123");
  await page.getByPlaceholder(/Ciudad/).fill("CDMX");
  await page.getByPlaceholder("C.P.").fill("06600");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/fee-02-checkout-envio.png` });
  console.log("shot fee-02");
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await page.waitForURL("**/checkout/gracias**", { timeout: 15000 });
  await page.waitForTimeout(500);

  await go("/dashboard/pedidos");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/fee-03-pedido-payout.png`, fullPage: true });
  console.log("shot fee-03");

  await browser.close();
  console.log("DONE");
})().catch((e) => { console.error(e); process.exit(1); });
