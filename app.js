/* ProdScript System Map · self-contained interactive graph renderer */

const DATA_URL = "/system-map.json";
const REPO_BASE = "https://github.com/Powstit/Prodscript/blob/main/";

let SPEC = null;
let CY = null;
let ACTIVE_CATS = new Set();
let ACTIVE_SIGNOFFS = new Set();

async function boot() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) {
    document.getElementById("version-line").textContent = `error loading system-map.json (${res.status})`;
    return;
  }
  SPEC = await res.json();
  document.getElementById("version-line").textContent =
    `v${SPEC.version} · ${SPEC.nodes.length} nodes · ${SPEC.edges.length} edges · updated ${SPEC.generatedAt}`;

  ACTIVE_CATS = new Set(Object.keys(SPEC.legend.categories));
  ACTIVE_SIGNOFFS = new Set(Object.keys(SPEC.legend.signoff));

  renderFilters();
  renderLegend();
  renderStats();
  initCy();
}

function renderFilters() {
  const el = document.getElementById("filters");
  el.innerHTML = "";

  for (const [key, meta] of Object.entries(SPEC.legend.categories)) {
    const b = document.createElement("button");
    b.className = "filter-chip active";
    b.dataset.kind = "cat";
    b.dataset.key = key;
    b.innerHTML = `<span class="dot" style="background:${meta.color}"></span>${meta.label}`;
    b.addEventListener("click", () => toggleFilter("cat", key, b));
    el.appendChild(b);
  }
  const sep = document.createElement("span");
  sep.style.cssText = "color:var(--hairline-strong);padding:0 4px;";
  sep.textContent = "|";
  el.appendChild(sep);

  for (const [key, meta] of Object.entries(SPEC.legend.signoff)) {
    const b = document.createElement("button");
    b.className = "filter-chip active";
    b.dataset.kind = "signoff";
    b.dataset.key = key;
    b.innerHTML = `<span class="dot" style="background:${meta.color}"></span>${meta.label}`;
    b.addEventListener("click", () => toggleFilter("signoff", key, b));
    el.appendChild(b);
  }
}

function toggleFilter(kind, key, btn) {
  const set = kind === "cat" ? ACTIVE_CATS : ACTIVE_SIGNOFFS;
  if (set.has(key)) {
    set.delete(key);
    btn.classList.remove("active");
  } else {
    set.add(key);
    btn.classList.add("active");
  }
  applyFilters();
}

function applyFilters() {
  if (!CY) return;
  CY.batch(() => {
    CY.nodes().forEach((n) => {
      const cat = n.data("category");
      const so = n.data("signoff");
      const visible = ACTIVE_CATS.has(cat) && ACTIVE_SIGNOFFS.has(so);
      n.style("display", visible ? "element" : "none");
    });
    CY.edges().forEach((e) => {
      const s = e.source().style("display");
      const t = e.target().style("display");
      e.style("display", s === "element" && t === "element" ? "element" : "none");
    });
  });
}

function renderLegend() {
  const catEl = document.getElementById("legend-cat");
  for (const [_, meta] of Object.entries(SPEC.legend.categories)) {
    catEl.insertAdjacentHTML(
      "beforeend",
      `<span class="legend-item"><span class="legend-swatch" style="background:${meta.color}"></span>${meta.label}</span>`
    );
  }
  const soEl = document.getElementById("legend-signoff");
  for (const [_, meta] of Object.entries(SPEC.legend.signoff)) {
    soEl.insertAdjacentHTML(
      "beforeend",
      `<span class="legend-item"><span class="legend-swatch" style="background:${meta.color};border-radius:50%"></span>${meta.label}</span>`
    );
  }
  const eEl = document.getElementById("legend-edge");
  for (const [_, meta] of Object.entries(SPEC.legend.edgeKinds)) {
    const dash = meta.style === "dashed" ? "border-top: 2px dashed" : "background";
    eEl.insertAdjacentHTML(
      "beforeend",
      `<span class="legend-item"><span class="legend-line" style="${dash === "background" ? "background:" + meta.color : "border-top: 2px dashed " + meta.color + "; height:0"}"></span>${meta.label}</span>`
    );
  }
}

function renderStats() {
  const el = document.getElementById("stats");
  const counts = { total: SPEC.nodes.length, golden: 0 };
  for (const n of SPEC.nodes) if (n.goldenJourney) counts.golden++;
  const byCat = {};
  for (const n of SPEC.nodes) byCat[n.category] = (byCat[n.category] || 0) + 1;
  const bySo = {};
  for (const n of SPEC.nodes) bySo[n.signoff] = (bySo[n.signoff] || 0) + 1;
  el.innerHTML = `
    <div class="stat-item"><div class="stat-value">${counts.total}</div><div class="stat-label">Total nodes</div></div>
    <div class="stat-item"><div class="stat-value">${SPEC.edges.length}</div><div class="stat-label">Edges</div></div>
    <div class="stat-item"><div class="stat-value">${counts.golden}</div><div class="stat-label">On golden journey</div></div>
    <div class="stat-item"><div class="stat-value">${SPEC.ironGates.length}</div><div class="stat-label">Iron Gates</div></div>
    <div class="stat-item"><div class="stat-value">${bySo.locked || 0}</div><div class="stat-label">Locked live</div></div>
    <div class="stat-item"><div class="stat-value">${bySo.waiting || 0}</div><div class="stat-label">Waiting feedback</div></div>
  `;
}

function initCy() {
  const catColor = (cat) => SPEC.legend.categories[cat]?.color || "#8a8a96";
  const soColor = (so) => SPEC.legend.signoff[so]?.color || "#8a8a96";
  const edgeMeta = (kind) => SPEC.legend.edgeKinds[kind] || { color: "#8a8a96", style: "solid" };

  const elements = [
    ...SPEC.nodes.map((n) => ({
      data: {
        id: n.id,
        label: n.label,
        category: n.category,
        signoff: n.signoff,
        file: n.file,
        notes: n.notes,
        golden: n.goldenJourney,
        catColor: catColor(n.category),
        soColor: soColor(n.signoff),
      },
    })),
    ...SPEC.edges.map((e, i) => ({
      data: {
        id: `e${i}`,
        source: e.from,
        target: e.to,
        kind: e.kind,
        color: edgeMeta(e.kind).color,
      },
      classes: edgeMeta(e.kind).style === "dashed" ? "dashed" : "",
    })),
  ];

  CY = cytoscape({
    container: document.getElementById("cy"),
    elements,
    style: [
      {
        selector: "node",
        style: {
          "background-color": "data(catColor)",
          "border-color": "data(soColor)",
          "border-width": 2,
          "label": "data(label)",
          "color": "#edeff2",
          "font-family": "Inter, sans-serif",
          "font-size": 11,
          "font-weight": 500,
          "text-valign": "center",
          "text-halign": "center",
          "text-outline-color": "#0a0a0b",
          "text-outline-width": 2,
          "width": "label",
          "height": 32,
          "padding": "10px",
          "shape": "round-rectangle",
          "text-max-width": 160,
          "text-wrap": "wrap",
        },
      },
      {
        selector: "node[?golden]",
        style: {
          "border-color": "#f5008c",
          "border-width": 3,
        },
      },
      {
        selector: "node[category='db']",
        style: { "shape": "barrel" },
      },
      {
        selector: "node[category='external']",
        style: { "shape": "diamond", "height": 44 },
      },
      {
        selector: "node[category='cross']",
        style: { "shape": "hexagon" },
      },
      {
        selector: "edge",
        style: {
          "curve-style": "bezier",
          "line-color": "data(color)",
          "target-arrow-color": "data(color)",
          "target-arrow-shape": "triangle",
          "arrow-scale": 0.8,
          "width": 1.5,
          "opacity": 0.6,
        },
      },
      {
        selector: "edge.dashed",
        style: { "line-style": "dashed" },
      },
      {
        selector: "node.highlighted",
        style: { "border-color": "#f5008c", "border-width": 4, "opacity": 1 },
      },
      {
        selector: "node.faded",
        style: { "opacity": 0.15 },
      },
      {
        selector: "edge.highlighted",
        style: { "line-color": "#f5008c", "target-arrow-color": "#f5008c", "width": 3, "opacity": 1 },
      },
      {
        selector: "edge.faded",
        style: { "opacity": 0.05 },
      },
    ],
    layout: {
      name: "dagre",
      rankDir: "LR",
      nodeSep: 30,
      rankSep: 90,
      edgeSep: 12,
    },
    minZoom: 0.2,
    maxZoom: 3,
    wheelSensitivity: 0.2,
  });

  CY.on("tap", "node", (evt) => selectNode(evt.target));
  CY.on("tap", (evt) => {
    if (evt.target === CY) clearSelection();
  });

  // Expose for debugging + headless verify
  window.CY = CY;
  window.SPEC = SPEC;
  window.selectNode = selectNode;

  document.getElementById("btn-reset").addEventListener("click", () => {
    CY.layout({ name: "dagre", rankDir: "LR", nodeSep: 30, rankSep: 90, edgeSep: 12 }).run();
    CY.fit(null, 60);
  });
  document.getElementById("btn-export").addEventListener("click", exportLayout);
  document.getElementById("btn-clear").addEventListener("click", clearSelection);
  document.getElementById("btn-focus").addEventListener("click", () => {
    const selected = CY.nodes(".highlighted");
    if (selected.length === 0) return;
    CY.fit(selected, 60);
  });

  restoreLayout();
  applyFilters();

  // Support ?node=<id> deep link from journeys/features pages
  const params = new URLSearchParams(window.location.search);
  const preselectId = params.get("node");
  if (preselectId) {
    const target = CY.getElementById(preselectId);
    if (target && target.length > 0) {
      selectNode(target);
      CY.fit(target.closedNeighborhood(), 80);
    }
  }
}

function selectNode(node) {
  CY.elements().removeClass("highlighted faded");
  const neighborhood = node.closedNeighborhood();
  CY.elements().not(neighborhood).addClass("faded");
  neighborhood.addClass("highlighted");
  populatePanel(node);
}

function clearSelection() {
  if (!CY) return;
  CY.elements().removeClass("highlighted faded");
  document.getElementById("panel-empty").hidden = false;
  document.getElementById("panel-content").hidden = true;
}

function populatePanel(node) {
  const d = node.data();
  const nodeSpec = SPEC.nodes.find((n) => n.id === d.id);

  document.getElementById("panel-empty").hidden = true;
  const panel = document.getElementById("panel-content");
  panel.hidden = false;

  const catMeta = SPEC.legend.categories[d.category] || { label: d.category, color: "#8a8a96" };
  const soMeta = SPEC.legend.signoff[d.signoff] || { label: d.signoff, color: "#8a8a96" };

  const catEl = document.getElementById("node-cat");
  catEl.textContent = catMeta.label;
  catEl.style.color = catMeta.color;

  document.getElementById("node-label").textContent = d.label;
  document.getElementById("node-file").textContent = d.file;
  document.getElementById("node-notes").textContent = d.notes || "";

  const soEl = document.getElementById("node-signoff");
  soEl.textContent = soMeta.label + (d.golden ? " · GOLDEN JOURNEY" : "");
  soEl.style.background = soMeta.color + "22";
  soEl.style.color = soMeta.color;

  const btnFile = document.getElementById("btn-file");
  if (d.file && d.file !== "external") {
    btnFile.href = REPO_BASE + d.file;
    btnFile.style.display = "";
  } else {
    btnFile.style.display = "none";
  }

  const outgoing = CY.edges().filter((e) => e.source().id() === d.id);
  const incoming = CY.edges().filter((e) => e.target().id() === d.id);

  document.getElementById("metric-in").textContent = incoming.length;
  document.getElementById("metric-out").textContent = outgoing.length;

  const depsOut = document.getElementById("deps-out");
  const depsIn = document.getElementById("deps-in");
  depsOut.innerHTML = "";
  depsIn.innerHTML = "";
  depsOut.classList.toggle("empty", outgoing.length === 0);
  depsIn.classList.toggle("empty", incoming.length === 0);

  outgoing.forEach((e) => {
    const t = e.target();
    const li = document.createElement("li");
    li.innerHTML = `<span class="cat-dot" style="background:${t.data("catColor")}"></span>${t.data("label")}<span class="kind">${e.data("kind")}</span>`;
    li.addEventListener("click", () => selectNode(t));
    depsOut.appendChild(li);
  });
  incoming.forEach((e) => {
    const s = e.source();
    const li = document.createElement("li");
    li.innerHTML = `<span class="cat-dot" style="background:${s.data("catColor")}"></span>${s.data("label")}<span class="kind">${e.data("kind")}</span>`;
    li.addEventListener("click", () => selectNode(s));
    depsIn.appendChild(li);
  });

  const gates = SPEC.ironGates.filter((g) => g.protects.includes(d.id));
  const igSection = document.getElementById("ig-section");
  const igList = document.getElementById("ig-list");
  igList.innerHTML = "";
  if (gates.length) {
    igSection.hidden = false;
    for (const g of gates) {
      const li = document.createElement("li");
      li.innerHTML = `<div class="ig-id">${g.id}</div><div class="ig-rule">${g.rule}</div>`;
      igList.appendChild(li);
    }
  } else {
    igSection.hidden = true;
  }

  const checks = buildRegressionChecklist(d, incoming, outgoing, gates);
  const checkList = document.getElementById("check-list");
  checkList.innerHTML = "";
  for (const c of checks) {
    const li = document.createElement("li");
    li.textContent = c;
    checkList.appendChild(li);
  }
}

function buildRegressionChecklist(d, incoming, outgoing, gates) {
  const items = [];
  if (d.golden) {
    items.push("This node is on the golden journey. Show-night failure risk. Add a regression test + Iron Gate sentinel comment.");
  }
  if (incoming.length > 5) {
    items.push(`${incoming.length} nodes depend on this. Any change is a wide blast. Update system-map.json in the same commit as the code change.`);
  }
  if (outgoing.length > 5) {
    items.push(`This node touches ${outgoing.length} downstream nodes. Confirm all still render / respond after the edit.`);
  }
  if (gates.length) {
    items.push(`${gates.length} Iron Gate(s) apply. Verify each still holds after the change. Do not weaken the guard to make the change pass.`);
  }
  if (d.category === "db") {
    items.push("DB schema change. Update drizzle schema, run pnpm db:push against Neon, verify existing rows survive migration.");
    items.push("Tenant scope: verify every query still passes tenantId (IG-TENANT-SCOPE).");
  }
  if (d.category === "api") {
    items.push("Contract change. Update API-CONTRACTS doc and re-verify all callers.");
    items.push("Auth check: does the endpoint still return 401 without a session, 403 across tenants?");
  }
  if (d.category === "surface") {
    items.push("Take a screenshot before AND after. Diff visually. Verify golden path still works in the browser.");
  }
  if (d.category === "external") {
    items.push("Third-party dependency. Update INTEGRATIONS doc. Consider graceful-degrade if the service is down.");
  }
  if (d.signoff === "locked") {
    items.push("This node is LOCKED LIVE. Do not change without an explicit owner greenlight. Update the section signoff first.");
  }
  items.push("After merging, update the CHANGELOG doc with what changed and why.");
  return items;
}

function exportLayout() {
  if (!CY) return;
  const positions = {};
  CY.nodes().forEach((n) => (positions[n.id()] = n.position()));
  const spec = JSON.parse(JSON.stringify(SPEC));
  for (const n of spec.nodes) {
    if (positions[n.id]) n.position = positions[n.id];
  }
  const blob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "system-map.json";
  a.click();
}

function restoreLayout() {
  if (!CY) return;
  const positioned = SPEC.nodes.filter((n) => n.position);
  if (positioned.length === SPEC.nodes.length) {
    CY.nodes().forEach((n) => {
      const s = SPEC.nodes.find((x) => x.id === n.id());
      if (s?.position) n.position(s.position);
    });
    CY.fit(null, 60);
  }
}

boot();
