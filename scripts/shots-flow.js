const { chromium } = require("playwright");
const EXEC = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE = "http://localhost:3000";
const OUT = "/tmp/flow";

(async () => {
  require("fs").mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXEC, headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2 });
  const go = (p) => page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" });
  const shot = async (n, opts = {}) => { await page.screenshot({ path: `${OUT}/${n}`, ...opts }); console.log("shot", n); };

  // ===== WIZARD =====
  await go("/crear");
  await page.locator("button", { hasText: "Tienda y productos" }).click();
  await page.waitForTimeout(250);
  await shot("01-wizard-giro-seleccionado.png");          // clic en un giro -> se resalta
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.waitForTimeout(300);
  await shot("02-wizard-estilo.png");                      // Continuar -> paso estilo
  await page.locator("button", { hasText: "Moderno" }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.waitForTimeout(300);
  await page.getByPlaceholder(/Taquería El Güero/).fill("Boutique La Coqueta");
  await page.getByPlaceholder(/Tacos al pastor/).fill("Ropa y accesorios artesanales hechos en México.");
  await page.getByPlaceholder(/5512345678/).fill("5512345678");
  await shot("03-wizard-datos.png");                       // Continuar -> paso datos (lleno)
  await page.getByRole("button", { name: /Generar mi página/ }).click();
  await page.waitForTimeout(400);
  await shot("04-wizard-generando.png");                   // clic Generar -> "Armando tu página…"

  // ===== EDITOR =====
  await page.waitForURL("**/dashboard/**", { timeout: 15000 });
  await page.waitForTimeout(800);
  await shot("05-editor.png");                             // editor con preview + aviso $29
  await page.getByRole("button", { name: /Quedármela/ }).click();
  await page.waitForTimeout(300);
  await shot("06-editor-quedarmela.png");                  // clic Quedármela -> mensaje 24h
  await page.getByRole("button", { name: /Vibrante/ }).click();
  await page.waitForTimeout(400);
  await shot("07-editor-estilo-vibrante.png");             // clic estilo Vibrante -> cambia color
  await page.getByRole("button", { name: /Moderno/ }).click(); // regresar a Moderno
  await page.waitForTimeout(300);

  const href = await page.getByRole("link", { name: /Ver página pública/ }).getAttribute("href");

  // ===== TIENDA PÚBLICA =====
  await go(href);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(300);
  await shot("08-tienda-antes.png");                       // tienda sin carrito
  await page.getByRole("button", { name: /Agregar al carrito/ }).first().click();
  await page.waitForTimeout(500);
  await shot("09-tienda-agregado.png");                    // clic Agregar -> barra de carrito

  // ===== CHECKOUT (tienda) =====
  await go("/checkout");
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "+", exact: true }).first().click();
  await page.getByRole("button", { name: "+", exact: true }).first().click();
  await page.waitForTimeout(300);
  await page.getByPlaceholder(/Nombre completo/).fill("Ana López");
  await page.getByPlaceholder(/Tel/).fill("5598765432");
  await shot("10-checkout-cantidad.png");                  // clic +/- -> cambia cantidad y total
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await page.waitForURL("**/checkout/gracias**", { timeout: 15000 });
  await page.waitForTimeout(500);
  await shot("11-gracias.png", { fullPage: true });        // Confirmar -> folio + WhatsApp

  // ===== MARKETPLACE =====
  await go("/marketplace");
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /Agregar/ }).first().click();
  await page.waitForTimeout(500);
  await shot("12-marketplace-agregado.png");               // clic Agregar -> ✓ y contador carrito

  // checkout marketplace para generar pedido con pago al vendedor
  await go("/checkout");
  await page.waitForTimeout(500);
  await page.getByPlaceholder(/Nombre completo/).fill("Carlos Ruiz");
  await page.getByPlaceholder(/Tel/).fill("5512300000");
  await page.getByPlaceholder(/Calle y número/).fill("Av. Reforma 123");
  await page.getByPlaceholder(/Ciudad/).fill("CDMX");
  await page.getByPlaceholder("C.P.").fill("06600");
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await page.waitForURL("**/checkout/gracias**", { timeout: 15000 });

  // ===== PEDIDOS =====
  await go("/dashboard/pedidos");
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /^Enviado$/ }).first().click();
  await page.waitForTimeout(300);
  await shot("13-pedidos-estado.png", { fullPage: true }); // clic estado -> se marca "Enviado"

  // ===== DASHBOARD =====
  await go("/dashboard");
  await page.waitForTimeout(500);
  await shot("14-dashboard.png");                          // Mis sitios (Editar / Ver / 🗑)

  await browser.close();
  console.log("DONE");
})().catch((e) => { console.error(e); process.exit(1); });
