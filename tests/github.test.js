import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRepoInput, getRepoInfo, getLanguages, getTree } from "../js/github.js";

test("parseRepoInput acepta el formato owner/repo", () => {
  assert.deepEqual(parseRepoInput("mxnueel/sismos-mx"), { owner: "mxnueel", repo: "sismos-mx" });
});

test("parseRepoInput acepta una URL completa de GitHub", () => {
  assert.deepEqual(parseRepoInput("https://github.com/mxnueel/sismos-mx"), { owner: "mxnueel", repo: "sismos-mx" });
});

test("parseRepoInput acepta URLs con .git o / al final", () => {
  assert.deepEqual(parseRepoInput("https://github.com/mxnueel/sismos-mx.git"), {
    owner: "mxnueel",
    repo: "sismos-mx",
  });
  assert.deepEqual(parseRepoInput("https://github.com/mxnueel/sismos-mx/"), {
    owner: "mxnueel",
    repo: "sismos-mx",
  });
});

test("parseRepoInput regresa null para entradas invalidas", () => {
  assert.equal(parseRepoInput("esto no es un repo"), null);
  assert.equal(parseRepoInput(""), null);
});

test("getRepoInfo trae datos reales de un repo real (API real de GitHub)", async () => {
  const info = await getRepoInfo("mxnueel", "sismos-mx");
  assert.equal(info.defaultBranch, "master");
  assert.equal(typeof info.stars, "number");
});

test("getRepoInfo lanza un error claro para un repo que no existe", async () => {
  await assert.rejects(() => getRepoInfo("mxnueel", "esto-no-existe-nunca-jamas-123456"), /no encontrado/);
});

test("getLanguages trae el desglose real de lenguajes de un repo real", async () => {
  const langs = await getLanguages("mxnueel", "sismos-mx");
  assert.ok("JavaScript" in langs);
});

test("getTree trae el arbol completo real de un repo real", async () => {
  const { items, truncated } = await getTree("mxnueel", "sismos-mx", "master");
  assert.equal(truncated, false);
  assert.ok(items.length > 5);
  assert.ok(items.some((i) => i.path === "index.html"));
});
