import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startStaticServer } from "./static-server.js";

let server;
let baseUrl;
let browser;
let page;
const consoleErrors = [];

before(async () => {
  ({ server, url: baseUrl } = await startStaticServer());
  browser = await chromium.launch();
  page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForFunction(() => window.__repoAtlasLoaded === true, { timeout: 20_000 });
});

after(async () => {
  await browser?.close();
  server?.close();
});

test("la pagina carga con el titulo correcto", async () => {
  assert.equal(await page.title(), "Repo Atlas — mapa visual de cualquier repositorio de GitHub");
});

test("no hay errores en la consola del navegador al cargar", () => {
  assert.deepEqual(consoleErrors, []);
});

test("el treemap renderiza celdas reales para el repo de ejemplo", async () => {
  const cells = await page.$$(".treemap-cell");
  assert.ok(cells.length > 3, "se esperaban varias celdas del treemap del repo de ejemplo (sismos-mx)");
});

test("la seccion de info del repo muestra datos reales", async () => {
  const statsText = await page.textContent("#repo-stats");
  assert.match(statsText, /archivos/);
  const title = await page.textContent("#repo-title");
  assert.match(title, /sismos-mx/);
});

test("buscar otro repo real actualiza el mapa", async () => {
  await page.click('.example-btn[data-repo="mxnueel/vuln-lens"]');
  await page.waitForFunction(
    () => document.getElementById("repo-title").textContent.includes("vuln-lens"),
    { timeout: 20_000 }
  );
  const cells = await page.$$(".treemap-cell");
  assert.ok(cells.length > 0);
});

test("un repositorio que no existe muestra un mensaje de error claro", async () => {
  await page.fill("#repo-input", "mxnueel/esto-no-existe-nunca-jamas-123456");
  await page.click('#search-form button[type="submit"]');
  await page.waitForFunction(
    () => {
      const text = document.getElementById("status-text").textContent;
      return text.length > 0 && text !== "Cargando...";
    },
    { timeout: 20_000 }
  );
  const status = await page.textContent("#status-text");
  assert.match(status, /no encontrado/);
});
