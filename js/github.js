const API_BASE = "https://api.github.com";

/** Acepta "owner/repo", una URL completa de GitHub, o con .git al final. Regresa {owner, repo} o null. */
export function parseRepoInput(input) {
  const trimmed = input.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };

  const shortMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };

  return null;
}

async function githubFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (res.status === 404) {
    throw new Error("Repositorio no encontrado (¿es privado, o el nombre esta mal escrito?).");
  }
  if (res.status === 403) {
    const resetHeader = res.headers.get("x-ratelimit-reset");
    const resetIn = resetHeader ? Math.ceil((Number(resetHeader) * 1000 - Date.now()) / 60000) : null;
    throw new Error(
      `Limite de peticiones de GitHub alcanzado.${resetIn ? ` Intenta de nuevo en ~${resetIn} minuto(s).` : ""}`
    );
  }
  if (!res.ok) {
    throw new Error(`GitHub respondio ${res.status}`);
  }
  return res.json();
}

export async function getRepoInfo(owner, repo) {
  const data = await githubFetch(`/repos/${owner}/${repo}`);
  return {
    description: data.description,
    stars: data.stargazers_count,
    defaultBranch: data.default_branch,
    primaryLanguage: data.language,
    htmlUrl: data.html_url,
  };
}

export async function getLanguages(owner, repo) {
  return githubFetch(`/repos/${owner}/${repo}/languages`);
}

export async function getTree(owner, repo, branch) {
  const data = await githubFetch(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  return { items: data.tree, truncated: data.truncated };
}
