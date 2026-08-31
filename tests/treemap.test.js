import { test } from "node:test";
import assert from "node:assert/strict";
import { extensionOf, languageColor, languageNameColor, buildHierarchy, bytesByExtension } from "../js/treemap.js";

test("extensionOf extrae la extension en minusculas", () => {
  assert.equal(extensionOf("src/app.JS"), "js");
  assert.equal(extensionOf("index.ts"), "ts");
  assert.equal(extensionOf("a/b/c/style.CSS"), "css");
});

test("extensionOf regresa vacio para archivos sin extension o dotfiles", () => {
  assert.equal(extensionOf("Makefile"), "");
  assert.equal(extensionOf(".gitignore"), "");
  assert.equal(extensionOf("src/README"), "");
});

test("languageColor regresa un color conocido para extensiones comunes y un color por defecto para desconocidas", () => {
  assert.equal(languageColor("ts"), "#3178c6");
  assert.notEqual(languageColor("xyz123"), undefined);
});

test("languageNameColor regresa colores curados para lenguajes conocidos y es determinista para desconocidos", () => {
  assert.equal(languageNameColor("TypeScript"), "#3178c6");
  const c1 = languageNameColor("Brainfuck");
  const c2 = languageNameColor("Brainfuck");
  assert.equal(c1, c2, "el mismo nombre de lenguaje debe dar siempre el mismo color");
  assert.notEqual(languageNameColor("Brainfuck"), languageNameColor("COBOL"));
});

test("buildHierarchy anida archivos dentro de sus carpetas correctamente", () => {
  const items = [
    { path: "package.json", type: "blob", size: 100 },
    { path: "src/index.ts", type: "blob", size: 200 },
    { path: "src/utils/format.ts", type: "blob", size: 50 },
    { path: "src", type: "tree" }, // las entradas 'tree' se ignoran, se reconstruyen por path
  ];
  const root = buildHierarchy(items, "mi-repo");

  assert.equal(root.name, "mi-repo");
  const pkg = root.children.find((c) => c.name === "package.json");
  assert.equal(pkg.value, 100);

  const src = root.children.find((c) => c.name === "src");
  assert.ok(src);
  const index = src.children.find((c) => c.name === "index.ts");
  assert.equal(index.value, 200);
  assert.equal(index.ext, "ts");

  const utils = src.children.find((c) => c.name === "utils");
  const format = utils.children.find((c) => c.name === "format.ts");
  assert.equal(format.value, 50);
});

test("buildHierarchy ignora entradas que no son blobs con tamano numerico", () => {
  const items = [
    { path: "submodule", type: "commit" },
    { path: "empty-dir", type: "tree" },
  ];
  const root = buildHierarchy(items, "repo");
  assert.equal(root.children.length, 0);
});

test("bytesByExtension suma bytes por extension y ordena de mayor a menor", () => {
  const items = [
    { path: "a.js", type: "blob", size: 100 },
    { path: "b.js", type: "blob", size: 50 },
    { path: "c.css", type: "blob", size: 300 },
  ];
  const totals = bytesByExtension(items);
  assert.deepEqual(totals, [
    ["css", 300],
    ["js", 150],
  ]);
});
