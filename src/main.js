import dataset from "../data/mcps.json";
import "./styles.css";
import { filterCandidates, formatDate, label, sortCandidates, summarize } from "./research.js";

const candidates = dataset.mcps;
const form = document.querySelector("#filters");
const grid = document.querySelector("#inventory-grid");
const dialog = document.querySelector("#detail-dialog");
const detailContent = document.querySelector("#detail-content");
const emptyState = document.querySelector("#empty-state");
const errorState = document.querySelector("#error-state");
const publicBase = import.meta.env.BASE_URL;
let detailTrigger = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function badge(value, type = "status") {
  return `<span class="badge ${type}-${escapeHtml(value)}">${escapeHtml(label(value))}</span>`;
}

function option(value) {
  return `<option value="${escapeHtml(value)}">${escapeHtml(label(value))}</option>`;
}

function populateFilters() {
  const values = {
    category: new Set(candidates.flatMap(({ categories }) => categories)),
    maintainerType: new Set(candidates.map(({ maintainerType }) => maintainerType)),
    status: new Set(candidates.map(({ test }) => test.status)),
    transport: new Set(candidates.flatMap(({ transports }) => transports)),
    license: new Set(candidates.map(({ license }) => license).filter(Boolean)),
    risk: new Set(candidates.map(({ readWriteRisk }) => readWriteRisk)),
  };
  for (const [name, items] of Object.entries(values)) {
    const select = form.elements[name];
    select.insertAdjacentHTML("beforeend", [...items].sort((a, b) => label(a).localeCompare(label(b))).map(option).join(""));
  }
}

function renderSummary() {
  const stats = summarize(candidates);
  document.querySelector("#hero-stats").innerHTML = [
    [stats.total, "candidates"],
    [stats.attempted, "connection attempts"],
    [stats.verified, "initialized"],
    [stats.categories, "finance categories"],
  ].map(([value, text]) => `<div><strong>${value}</strong><span>${text}</span></div>`).join("");

  const strongest = candidates
    .filter(({ test, readWriteRisk }) => test.status === "verified" && test.readCall === "passed" && readWriteRisk === "read_only")
    .map(({ name, id }) => `<button class="text-button" data-detail="${id}">${escapeHtml(name)}</button>`).join(", ");
  document.querySelector("#finding-cards").innerHTML = `
    <article class="finding-card accent">
      <span class="finding-number">01</span>
      <h3>${stats.verified} servers crossed the protocol line.</h3>
      <p>${stats.verified} of ${stats.attempted} attempts completed MCP initialization and capability discovery. “Verified” does not mean endorsed.</p>
      <a href="#status-legend">See the evidence legend →</a>
    </article>
    <article class="finding-card">
      <span class="finding-number">02</span>
      <h3>Public, read-only paths are the cleanest entry.</h3>
      <p>${stats.safeReads} allowlisted reads passed. Read-only verified options include ${strongest || "none in this snapshot"}.</p>
    </article>
    <article class="finding-card warning">
      <span class="finding-number">03</span>
      <h3>Discovery itself can expose write risk.</h3>
      <p>${stats.mixedRisk} candidates expose or document state-changing capabilities. Arcadia’s runtime list included transaction builders and a broadcast tool; none were invoked.</p>
      <button class="text-button" data-detail="arcadia-finance">Inspect Arcadia’s evidence →</button>
    </article>
    <article class="finding-card">
      <span class="finding-number">04</span>
      <h3>Ten primary-source additions widen the field, not the runtime claims.</h3>
      <p>${stats.documentationOnly} candidates are documentation-only and ${stats.credentialGated} require credentials. Nine additions remain documentation-only; the credential-free Banking Regulations endpoint passed initialization and discovery with no tool invocation.</p>
      <a href="#coverage">View the coverage matrix →</a>
    </article>`;
}

function currentFilters() {
  return Object.fromEntries(new FormData(form).entries());
}

function candidateCard(candidate) {
  const source = candidate.sources[0];
  return `<article class="candidate-card">
    <div class="card-topline">
      ${badge(candidate.test.status)}
      <span class="freshness">Checked <time datetime="${candidate.verifiedAt}">${formatDate(candidate.verifiedAt)}</time></span>
    </div>
    <div>
      <p class="maintainer">${escapeHtml(candidate.maintainer)} · ${candidate.official ? "Official" : label(candidate.maintainerType)}</p>
      <h3>${escapeHtml(candidate.name)}</h3>
      <p>${escapeHtml(candidate.summary)}</p>
    </div>
    <div class="tag-row">${candidate.categories.map((value) => `<span>${escapeHtml(label(value))}</span>`).join("")}</div>
    <dl class="card-facts">
      <div><dt>Transport</dt><dd>${candidate.transports.map(label).join(", ")}</dd></div>
      <div><dt>Auth</dt><dd>${escapeHtml(label(candidate.authenticationClass))}</dd></div>
      <div><dt>Deployment</dt><dd>${escapeHtml(candidate.deploymentModel)}</dd></div>
      <div><dt>Pricing</dt><dd>${escapeHtml(candidate.pricing)}</dd></div>
      <div><dt>Risk</dt><dd>${badge(candidate.readWriteRisk, "risk")}</dd></div>
      <div><dt>License</dt><dd>${escapeHtml(candidate.license ?? "Unknown")}</dd></div>
    </dl>
    <div class="card-actions">
      <button class="button primary compact" data-detail="${candidate.id}">View evidence</button>
      <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Primary source <span class="sr-only">for ${escapeHtml(candidate.name)}</span> ↗</a>
    </div>
  </article>`;
}

function renderInventory() {
  const filters = currentFilters();
  const visible = sortCandidates(filterCandidates(candidates, filters), filters.sort);
  grid.innerHTML = visible.map(candidateCard).join("");
  document.querySelector("#result-count").textContent = `${visible.length} of ${candidates.length} candidates`;
  emptyState.hidden = visible.length !== 0;
  const active = Object.entries(filters).filter(([key, value]) => value && key !== "sort");
  document.querySelector("#active-filters").innerHTML = active.length
    ? `<span>Active filters:</span>${active.map(([key, value]) => `<button type="button" data-clear="${key}">${escapeHtml(label(value))}<span aria-hidden="true"> ×</span></button>`).join("")}`
    : "";
}

function renderError(error) {
  console.error("Finance MCP dashboard render failed", error);
  grid.hidden = true;
  form.hidden = true;
  emptyState.hidden = true;
  errorState.hidden = false;
  document.querySelector("#result-count").textContent = "Inventory unavailable";
}

function renderCoverage() {
  const categories = [...new Set(candidates.flatMap(({ categories }) => categories))];
  document.querySelector("#coverage-table").innerHTML = `
    <thead><tr><th scope="col">Candidate</th>${categories.map((value) => `<th scope="col">${escapeHtml(label(value))}</th>`).join("")}<th scope="col">Test state</th></tr></thead>
    <tbody>${candidates.map((candidate) => `<tr>
      <th scope="row"><button class="table-link" data-detail="${candidate.id}">${escapeHtml(candidate.name)}</button></th>
      ${categories.map((value) => `<td>${candidate.categories.includes(value) ? `<span class="covered" aria-label="Covered">●</span>` : `<span class="not-covered" aria-label="Not covered">—</span>`}</td>`).join("")}
      <td>${badge(candidate.test.status)}</td>
    </tr>`).join("")}</tbody>`;
}

function evidenceHref(path) {
  return path ? `${publicBase}${path.replace(/^\.\.\//, "")}` : null;
}

function showDetail(id, trigger = null) {
  const candidate = candidates.find((item) => item.id === id);
  if (!candidate) return;
  const test = candidate.test;
  const evidence = evidenceHref(test.evidencePath);
  detailContent.innerHTML = `
    <div class="dialog-header">
      <div>
        <p class="eyebrow">${escapeHtml(candidate.maintainer)} · ${candidate.official ? "Official provider" : label(candidate.maintainerType)}</p>
        <h2 id="detail-title">${escapeHtml(candidate.name)}</h2>
        <p>${escapeHtml(candidate.summary)}</p>
      </div>
      <button class="dialog-close" type="button" aria-label="Close details">×</button>
    </div>
    <div class="detail-status">${badge(test.status)} ${badge(candidate.readWriteRisk, "risk")} <span>Sources checked ${formatDate(candidate.verifiedAt)}</span></div>
    <div class="detail-grid">
      <section>
        <h3>Setup & coverage</h3>
        <dl class="detail-list">
          <div><dt>Install</dt><dd>${escapeHtml(candidate.installation)}</dd></div>
          <div><dt>Deployment</dt><dd>${escapeHtml(candidate.deploymentModel)}</dd></div>
          <div><dt>Runtime</dt><dd>${candidate.runtime.map(escapeHtml).join(" · ")}</dd></div>
          <div><dt>Authentication</dt><dd>${candidate.authentication.map(escapeHtml).join(" · ")}</dd></div>
          <div><dt>Pricing</dt><dd>${escapeHtml(candidate.pricing)}</dd></div>
          <div><dt>Financial workflows</dt><dd>${candidate.financialWorkflows.map(escapeHtml).join(" · ")}</dd></div>
          <div><dt>Upstream</dt><dd>${candidate.upstreamProviders.map(escapeHtml).join(", ")}</dd></div>
          <div><dt>Geography</dt><dd>${candidate.geographies.map(escapeHtml).join(", ")}</dd></div>
          <div><dt>Markets</dt><dd>${candidate.markets.map(escapeHtml).join(", ")}</dd></div>
          <div><dt>Assets</dt><dd>${candidate.assetClasses.map(escapeHtml).join(", ")}</dd></div>
        </dl>
      </section>
      <section>
        <h3>Connection evidence</h3>
        <dl class="test-grid">
          <div><dt>Initialize</dt><dd>${label(test.initialize)}</dd></div>
          <div><dt>tools/list</dt><dd>${label(test.toolsList)}</dd></div>
          <div><dt>resources/list</dt><dd>${label(test.resourcesList)}</dd></div>
          <div><dt>prompts/list</dt><dd>${label(test.promptsList)}</dd></div>
          <div><dt>Safe read</dt><dd>${label(test.readCall)}</dd></div>
          <div><dt>Transport</dt><dd>${escapeHtml(label(test.transport))}</dd></div>
        </dl>
        <p class="evidence-note">${escapeHtml(test.notes)}</p>
        ${evidence ? `<a href="${evidence}" target="_blank">Open sanitized evidence ↗</a>` : "<p>No runtime artifact: documentation assessment only.</p>"}
      </section>
    </div>
    <section class="capability-section">
      <h3>Exposed capabilities</h3>
      <div class="capability-list">${candidate.capabilities.map((capability) => `<article>
        <div>${badge(capability.kind, "kind")} ${badge(capability.risk, "risk")} ${badge(capability.evidence, "evidence")}</div>
        <h4><code>${escapeHtml(capability.name)}</code></h4>
        <p>${escapeHtml(capability.summary)}</p>
      </article>`).join("")}</div>
    </section>
    <div class="detail-grid lower">
      <section>
        <h3>Known limitations</h3>
        <ul>${candidate.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section>
        <h3>Sources</h3>
        <ol class="source-list">${candidate.sources.map((source) => `<li>
          <div>${badge(source.evidenceType, "evidence")} <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a></div>
          <span>Supports: ${source.supports.map(escapeHtml).join(", ")}</span>
          <small>Accessed ${formatDate(source.accessedAt)}</small>
        </li>`).join("")}</ol>
      </section>
    </div>
    <div class="legend">
      <h3>Evidence legend</h3>
      <p>${["verified", "documentation_only", "blocked", "failed", "not_tested", "stale"].map((value) => badge(value)).join(" ")}</p>
      <p>${["runtime", "repository", "documentation"].map((value) => badge(value, "evidence")).join(" ")}</p>
      <p><strong>Verified</strong> means initialization and capability discovery passed in this snapshot—not that security, reliability, or suitability was audited.</p>
    </div>`;
  detailTrigger = trigger;
  dialog.showModal();
  dialog.querySelector(".dialog-close").focus();
}

form.addEventListener("input", renderInventory);
form.addEventListener("reset", () => requestAnimationFrame(renderInventory));
emptyState.querySelector("button").addEventListener("click", () => { form.reset(); renderInventory(); });
document.addEventListener("click", (event) => {
  const detailButton = event.target.closest("[data-detail]");
  if (detailButton) showDetail(detailButton.dataset.detail, detailButton);
  const clearButton = event.target.closest("[data-clear]");
  if (clearButton) {
    form.elements[clearButton.dataset.clear].value = "";
    renderInventory();
  }
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog || event.target.closest(".dialog-close")) dialog.close();
});
dialog.addEventListener("close", () => {
  detailTrigger?.focus();
  detailTrigger = null;
});

window.addEventListener("error", (event) => renderError(event.error ?? event.message));

try {
  if (candidates.length !== 22) throw new Error(`Expected 22 candidates, received ${candidates.length}`);
  populateFilters();
  renderSummary();
  renderInventory();
  renderCoverage();
  document.querySelector("#generated-at").dateTime = dataset.generatedAt;
  document.querySelector("#generated-at").textContent = formatDate(dataset.generatedAt, { year: "numeric", month: "long", day: "numeric" });
} catch (error) {
  renderError(error);
}
