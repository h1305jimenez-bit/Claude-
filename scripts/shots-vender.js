const { chromium } = require("playwright");
const EXEC = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE = "http://localhost:3000";
const OUT = "/tmp/vender";

// PNG 2x2 válido (el modo demo ignora el contenido).
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGNkYGD4z8DAwMgABwAOEgEBb6e5fwAAAABJRU5ErkJggg==",
  "base64"
);

(async () => {
  require("fs").mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXEC, headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 950 }, deviceScaleFactor: 2 });
  const shot = async (n, o = {}) => { await page.screenshot({ path: `${OUT}/${n}`, ...o }); console.log("shot", n); };

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await shot("01-landing.png", { fullPage: true });

  await page.goto(`${BASE}/vender`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await shot("02-vender-inicio.png");

  // Subir foto
  await page.setInputFiles('input[type="file"]', { name: "producto.png", mimeType: "image/png", buffer: PNG });
  // Estado identificando (rápido) y luego resultado
  await page.waitForTimeout(150);
  await shot("03-identificando.png");
  await page.getByText("Elige tu precio").waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);
  await shot("04-resultado.png", { fullPage: true });

  // Elegir "Máximo" y llenar datos
  await page.getByRole("button", { name: /Máximo/ }).click();
  await page.getByPlaceholder(/WhatsApp/).fill("5512345678");
  await page.getByPlaceholder(/Dirección de recolección/).fill("Av. Reforma 123, CDMX");
  await page.waitForTimeout(300);
  await shot("05-precio-y-datos.png", { fullPage: true });

  // Confirmar
  await page.getByRole("button", { name: /^Vender por/ }).click();
  await page.waitForTimeout(500);
  await shot("06-listo.png", { fullPage: true });

  await browser.close();
  console.log("DONE");
})().catch((e) => { console.error(e); process.exit(1); });
