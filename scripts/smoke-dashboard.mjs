#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

const host = "127.0.0.1";
const port = 4173;
const mountPath = "/finance-guide/";
const origin = `http://${host}:${port}${mountPath}`;
const distRoot = resolve("dist");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}`);
    if (!url.pathname.startsWith(mountPath)) {
      response.writeHead(404).end("Not found");
      return;
    }
    const relativePath = decodeURIComponent(url.pathname.slice(mountPath.length)) || "index.html";
    const filePath = resolve(distRoot, relativePath);
    if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const body = await readFile(filePath);
    response.writeHead(200, { "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream" }).end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

async function startServer() {
  await new Promise((resolveStart, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolveStart);
  });
}

async function assertPage(page, profile) {
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));

  const response = await page.goto(origin, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`${profile.name}: dashboard returned ${response?.status()}`);
  if (await page.title() !== "Finance MCP Field Guide") throw new Error(`${profile.name}: unexpected document title`);
  if (await page.locator(".candidate-card").count() !== 12) throw new Error(`${profile.name}: expected 12 inventory cards`);
  if (await page.locator("#hero-stats > div").count() !== 4) throw new Error(`${profile.name}: summary did not render`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`${profile.name}: page overflows viewport by ${overflow}px`);

  if (profile.name === "mobile") {
    const navLinks = page.locator(".site-header nav a");
    if (await navLinks.count() !== 4) throw new Error("mobile: primary navigation is incomplete");
    for (let index = 0; index < 4; index += 1) {
      const box = await navLinks.nth(index).boundingBox();
      if (!box || box.height < 44) throw new Error(`mobile: navigation target ${index + 1} is shorter than 44px`);
    }
    for (const selector of ["#search", "select[name=category]", ".reset-button", ".candidate-card .primary"]) {
      const box = await page.locator(selector).first().boundingBox();
      if (!box || box.height < 44) throw new Error(`mobile: touch target ${selector} is shorter than 44px`);
    }
    const matrix = await page.locator(".table-scroll").evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }));
    if (matrix.scroll <= matrix.client) throw new Error("mobile: coverage matrix is not independently scrollable");
  }

  await page.locator("#search").fill("QuickBooks MCP");
  if (await page.locator(".candidate-card").count() !== 1) throw new Error(`${profile.name}: search filter did not narrow to one card`);
  await page.locator(".reset-button").click();
  await page.waitForFunction(() => document.querySelectorAll(".candidate-card").length === 12);

  const trigger = page.locator(".candidate-card .primary").first();
  await trigger.click();
  const dialog = page.locator("#detail-dialog");
  if (!await dialog.isVisible()) throw new Error(`${profile.name}: detail dialog did not open`);
  const evidenceHref = await dialog.getByText("Open sanitized evidence ↗").getAttribute("href");
  if (!evidenceHref) throw new Error(`${profile.name}: evidence link is absent`);
  const evidenceResponse = await page.request.get(new URL(evidenceHref, origin).toString());
  if (!evidenceResponse.ok()) throw new Error(`${profile.name}: evidence link returned ${evidenceResponse.status()}`);
  await dialog.locator(".dialog-close").click();
  if (!await trigger.evaluate((element) => element === document.activeElement)) throw new Error(`${profile.name}: dialog focus was not restored`);

  for (const path of ["docs/RESEARCH_METHOD.md", "data/mcps.json", "data/mcps.schema.json", "research/evidence/octagon.json"]) {
    const assetResponse = await page.request.get(`${origin}${path}`);
    if (!assetResponse.ok()) throw new Error(`${profile.name}: ${path} returned ${assetResponse.status()}`);
  }
  if (browserErrors.length) throw new Error(`${profile.name}: ${browserErrors.join("; ")}`);

  console.log(`${profile.name}: ${profile.viewport.width}x${profile.viewport.height}, subpath assets, 12 cards, filters, dialog/focus, navigation, matrix, and evidence passed`);
}

let browser;
try {
  await startServer();
  browser = await chromium.launch({ headless: true });
  for (const profile of [
    { name: "mobile", viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true },
    { name: "desktop", viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  ]) {
    const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.isMobile, hasTouch: profile.hasTouch });
    const page = await context.newPage();
    await assertPage(page, profile);
    await context.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
