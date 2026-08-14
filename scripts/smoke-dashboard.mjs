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

async function waitForCards(page, count = 22) {
  await page.waitForFunction((expected) => document.querySelectorAll(".candidate-card").length === expected, count);
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
  if (await page.locator(".candidate-card").count() !== 22) throw new Error(`${profile.name}: expected 22 inventory cards`);
  if (await page.locator("#hero-stats > div").count() !== 4) throw new Error(`${profile.name}: summary did not render`);
  if (await page.locator("#coverage-table tbody tr").count() !== 22) throw new Error(`${profile.name}: coverage matrix is incomplete`);
  if (await page.locator(".evidence-legend .badge").count() !== 3) throw new Error(`${profile.name}: evidence provenance legend is incomplete`);

  const accessibilityProblems = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map(({ id }) => id);
    return {
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      unnamedButtons: [...document.querySelectorAll("button")].filter((button) => !button.textContent.trim() && !button.getAttribute("aria-label")).length,
      lang: document.documentElement.lang,
      dialogLabel: document.querySelector("#detail-dialog")?.getAttribute("aria-labelledby"),
    };
  });
  if (accessibilityProblems.duplicateIds.length || accessibilityProblems.unnamedButtons || accessibilityProblems.lang !== "en" || accessibilityProblems.dialogLabel !== "detail-title") {
    throw new Error(`${profile.name}: basic accessibility checks failed: ${JSON.stringify(accessibilityProblems)}`);
  }

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

  await page.locator("#search").fill("Coinbase AgentKit");
  if (await page.locator(".candidate-card").count() !== 1) throw new Error(`${profile.name}: search filter did not narrow to one card`);
  await page.locator(".reset-button").click();
  await waitForCards(page);

  await page.locator("select[name=status]").selectOption("documentation_only");
  if (await page.locator(".candidate-card").count() !== 11) throw new Error(`${profile.name}: evidence-state filter did not show 11 documentation-only cards`);
  await page.locator(".reset-button").click();
  await waitForCards(page);

  await page.locator("select[name=category]").selectOption("payments");
  if (await page.locator(".candidate-card").count() !== 5) throw new Error(`${profile.name}: payment category filter did not show five cards`);
  await page.locator(".reset-button").click();
  await waitForCards(page);

  await page.locator("select[name=sort]").selectOption("status");
  if (!await page.locator(".candidate-card").first().locator(".status-verified").isVisible()) throw new Error(`${profile.name}: status sort did not put verified cards first`);
  await page.locator(".reset-button").click();
  await waitForCards(page);

  await page.locator("#search").fill("no-such-finance-mcp-candidate");
  if (!await page.locator("#empty-state").isVisible()) throw new Error(`${profile.name}: empty state did not render`);
  await page.locator("#empty-state button").click();
  await waitForCards(page);

  await page.locator("#search").fill("Arcadia Finance");
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
  await page.locator(".reset-button").click();
  await waitForCards(page);

  await page.locator("#search").fill("Coinbase AgentKit");
  await page.locator(".candidate-card .primary").click();
  if (!await dialog.getByText("No runtime artifact: documentation assessment only.").isVisible()) throw new Error(`${profile.name}: documentation-only detail overstates runtime evidence`);
  if (!await dialog.locator(".evidence-repository").first().isVisible()) throw new Error(`${profile.name}: repository evidence badge is absent`);
  const sourceHrefs = await dialog.locator(".source-list a").evaluateAll((links) => links.map((link) => link.href));
  if (!sourceHrefs.length || sourceHrefs.some((href) => !href.startsWith("https://"))) throw new Error(`${profile.name}: source links are missing or invalid`);
  await dialog.locator(".dialog-close").click();
  await page.locator(".reset-button").click();
  await waitForCards(page);

  for (const path of ["docs/RESEARCH_METHOD.md", "data/mcps.json", "data/mcps.schema.json", "research/evidence/octagon.json"]) {
    const assetResponse = await page.request.get(`${origin}${path}`);
    if (!assetResponse.ok()) throw new Error(`${profile.name}: ${path} returned ${assetResponse.status()}`);
  }

  if (browserErrors.length) throw new Error(`${profile.name}: ${browserErrors.join("; ")}`);

  if (profile.name === "desktop") {
    await page.evaluate(() => window.dispatchEvent(new ErrorEvent("error", { error: new Error("smoke-test-error-state") })));
    if (!await page.locator("#error-state").isVisible()) throw new Error("desktop: error state did not render");
    browserErrors.length = 0;
    await page.reload({ waitUntil: "networkidle" });
    if (await page.locator(".candidate-card").count() !== 22) throw new Error("desktop: dashboard did not recover after reload");
  }

  if (browserErrors.length) throw new Error(`${profile.name}: ${browserErrors.join("; ")}`);
  console.log(`${profile.name}: ${profile.viewport.width}x${profile.viewport.height}, subpath assets, 22 cards, search/filter/sort, empty/error states, dialog/focus, accessibility, matrix, and evidence passed`);
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
