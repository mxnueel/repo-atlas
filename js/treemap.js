const LANGUAGE_COLORS = {
  js: "#f1e05a",
  jsx: "#f1e05a",
  mjs: "#f1e05a",
  ts: "#3178c6",
  tsx: "#3178c6",
  py: "#3572A5",
  rb: "#701516",
  go: "#00ADD8",
  rs: "#dea584",
  java: "#b07219",
  kt: "#A97BFF",
  c: "#555555",
  cpp: "#f34b7d",
  cc: "#f34b7d",
  h: "#555555",
  cs: "#178600",
  php: "#4F5D95",
  html: "#e34c26",
  css: "#563d7c",
  scss: "#c6538c",
  json: "#b0b0b0",
  yml: "#cb171e",
  yaml: "#cb171e",
  md: "#083fa1",
  sh: "#89e051",
  sql: "#e38c00",
  swift: "#F05138",
  dart: "#00B4AB",
  vue: "#41b883",
};

const DEFAULT_COLOR = "#8a8a8a";

const LANGUAGE_NAME_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Ruby: "#701516",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  Kotlin: "#A97BFF",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  PHP: "#4F5D95",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Shell: "#89e051",
  Swift: "#F05138",
  Dart: "#00B4AB",
  Vue: "#41b883",
};

/** Color determinista (mismo nombre -> mismo color siempre) para lenguajes fuera del mapa curado. */
function hashColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

export function languageNameColor(name) {
  return LANGUAGE_NAME_COLORS[name] ?? hashColor(name);
}

export function extensionOf(path) {
  const fileName = path.split("/").pop() ?? "";
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) return ""; // sin extension, o dotfile tipo ".gitignore"
  return fileName.slice(dotIndex + 1).toLowerCase();
}

export function languageColor(ext) {
  return LANGUAGE_COLORS[ext] ?? DEFAULT_COLOR;
}

/**
 * Convierte el arreglo plano del git tree de GitHub en una jerarquia anidada
 * lista para d3.hierarchy(). Solo los archivos (blobs) llevan `value` (su tamano
 * en bytes) - las carpetas obtienen su tamano por agregacion via d3 .sum().
 */
export function buildHierarchy(treeItems, rootName) {
  const root = { name: rootName, path: "", children: [] };
  const folderNodes = new Map([["", root]]);

  function getOrCreateFolder(path) {
    if (folderNodes.has(path)) return folderNodes.get(path);
    const parentPath = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    const parent = getOrCreateFolder(parentPath);
    const name = path.split("/").pop();
    const node = { name, path, children: [] };
    parent.children.push(node);
    folderNodes.set(path, node);
    return node;
  }

  for (const item of treeItems) {
    if (item.type !== "blob" || typeof item.size !== "number") continue;
    const parentPath = item.path.includes("/") ? item.path.slice(0, item.path.lastIndexOf("/")) : "";
    const parent = getOrCreateFolder(parentPath);
    const ext = extensionOf(item.path);
    parent.children.push({
      name: item.path.split("/").pop(),
      path: item.path,
      value: item.size,
      ext,
      color: languageColor(ext),
    });
  }

  return root;
}

/** Cuenta bytes totales por extension, para la barra de desglose por lenguaje/tipo de archivo. */
export function bytesByExtension(treeItems) {
  const totals = new Map();
  for (const item of treeItems) {
    if (item.type !== "blob" || typeof item.size !== "number") continue;
    const ext = extensionOf(item.path) || "(sin extension)";
    totals.set(ext, (totals.get(ext) ?? 0) + item.size);
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}
