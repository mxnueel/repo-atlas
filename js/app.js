import { parseRepoInput, getRepoInfo, getLanguages, getTree } from "./github.js";
import { buildHierarchy, languageNameColor } from "./treemap.js";

const form = document.getElementById("search-form");
const input = document.getElementById("repo-input");
const statusText = document.getElementById("status-text");
const repoInfoSection = document.getElementById("repo-info");
const repoTitle = document.getElementById("repo-title");
const repoDescription = document.getElementById("repo-description");
const repoStats = document.getElementById("repo-stats");
const languageBar = document.getElementById("language-bar");
const svg = d3.select("#treemap");

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderLanguageBar(languages) {
  languageBar.innerHTML = "";
  const total = Object.values(languages).reduce((a, b) => a + b, 0);
  if (total === 0) return;
  for (const [name, bytes] of Object.entries(languages)) {
    const segment = document.createElement("div");
    segment.className = "lang-segment";
    segment.style.width = `${(bytes / total) * 100}%`;
    segment.style.background = languageNameColor(name);
    segment.title = `${name}: ${((bytes / total) * 100).toFixed(1)}%`;
    languageBar.appendChild(segment);
  }
}

function renderTreemap(hierarchyData) {
  svg.selectAll("*").remove();

  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  svg.attr("viewBox", [0, 0, width, height]);

  const root = d3
    .hierarchy(hierarchyData)
    .sum((d) => d.value ?? 0)
    .sort((a, b) => b.value - a.value);

  d3.treemap().size([width, height]).paddingInner(1).paddingOuter(2)(root);

  const leaves = root.leaves();

  // D3 anima el atributo SVG con su propio timer (no una @keyframes de CSS),
  // asi que la media query global de prefers-reduced-motion en style.css no
  // la alcanza — hay que revisarla aqui a mano.
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cellSelection = svg
    .selectAll("g")
    .data(leaves)
    .join("g")
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

  const cell = reduceMotion
    ? cellSelection.attr("opacity", 1)
    : cellSelection
        .attr("opacity", 0)
        .call((sel) =>
          sel
            .transition()
            .delay((d, i) => Math.min(i, 60) * 6)
            .duration(280)
            .attr("opacity", 1)
        );

  cell
    .append("rect")
    .attr("class", "treemap-cell")
    .attr("width", (d) => Math.max(0, d.x1 - d.x0))
    .attr("height", (d) => Math.max(0, d.y1 - d.y0))
    .attr("fill", (d) => d.data.color)
    .append("title")
    .text((d) => `${d.data.path}\n${formatBytes(d.data.value)}`);

  cell
    .filter((d) => d.x1 - d.x0 > 40 && d.y1 - d.y0 > 16)
    .append("text")
    .attr("class", "treemap-label")
    .attr("x", 4)
    .attr("y", 13)
    .text((d) => d.data.name)
    .each(function (d) {
      const maxWidth = d.x1 - d.x0 - 6;
      let text = this.textContent;
      while (this.getComputedTextLength() > maxWidth && text.length > 1) {
        text = text.slice(0, -1);
        this.textContent = `${text}…`;
      }
    });
}

async function search(rawInput) {
  const parsed = parseRepoInput(rawInput);
  if (!parsed) {
    statusText.textContent = 'Formato no reconocido. Usa "owner/repo" o una URL de GitHub.';
    return;
  }

  statusText.textContent = "Cargando...";
  repoInfoSection.hidden = true;
  svg.selectAll("*").remove();

  try {
    const info = await getRepoInfo(parsed.owner, parsed.repo);
    const [languages, { items, truncated }] = await Promise.all([
      getLanguages(parsed.owner, parsed.repo),
      getTree(parsed.owner, parsed.repo, info.defaultBranch),
    ]);

    const hierarchy = buildHierarchy(items, parsed.repo);
    renderTreemap(hierarchy);
    renderLanguageBar(languages);

    const fileCount = items.filter((i) => i.type === "blob").length;
    const totalBytes = items.reduce((sum, i) => sum + (i.type === "blob" ? (i.size ?? 0) : 0), 0);

    repoTitle.innerHTML = `<a href="${info.htmlUrl}" target="_blank" rel="noopener" style="color:inherit">${parsed.owner}/${parsed.repo}</a>`;
    repoDescription.textContent = info.description ?? "";
    repoStats.textContent = `${info.stars.toLocaleString("es-MX")} estrellas · ${fileCount.toLocaleString("es-MX")} archivos · ${formatBytes(totalBytes)}`;
    repoInfoSection.hidden = false;

    statusText.textContent = truncated
      ? "⚠ Este repositorio es muy grande, GitHub truncó la lista de archivos — el mapa muestra una parte."
      : "";
    window.__repoAtlasLoaded = true; // gancho para pruebas end-to-end
  } catch (err) {
    statusText.textContent = err instanceof Error ? err.message : String(err);
    window.__repoAtlasLoaded = false;
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  search(input.value);
});

document.querySelectorAll(".example-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    input.value = btn.dataset.repo;
    search(btn.dataset.repo);
  });
});

// Carga inicial con un ejemplo, para que la pagina nunca se sienta vacia.
input.value = "mxnueel/sismos-mx";
search("mxnueel/sismos-mx");
