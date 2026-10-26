// Pós-build: garante que a loja (dist/index.html) não carrega nada do portal (src/admin)
// e que o portal não usa o CSS da loja. Rode depois de `npm run build`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const errors = [];

const isAdminPath = (p) => /^(src\/admin(\/|$)|admin\/)/.test(p);

// 1) Grafo do manifest a partir da entrada da loja (imports estáticos e dinâmicos).
const manifest = JSON.parse(readFileSync(join(dist, ".vite", "manifest.json"), "utf8"));
const storeEntry = "index.html";
if (!manifest[storeEntry]) {
  errors.push(`manifest sem a entrada ${storeEntry}`);
} else {
  const seen = new Set();
  const stack = [storeEntry];
  while (stack.length) {
    const key = stack.pop();
    if (seen.has(key)) continue;
    seen.add(key);
    const chunk = manifest[key];
    if (!chunk) {
      errors.push(`manifest sem a chave ${key}`);
      continue;
    }
    for (const id of [key, chunk.src, chunk.name].filter(Boolean)) {
      if (isAdminPath(id) || /^admin(-|$)/.test(id)) {
        errors.push(`loja alcança chunk do portal: ${key} (${chunk.file})`);
        break;
      }
    }
    stack.push(...(chunk.imports ?? []), ...(chunk.dynamicImports ?? []));
  }
}

// 2) O HTML da loja não pode referenciar assets do portal.
const storeHtml = readFileSync(join(dist, "index.html"), "utf8");
const adminFiles = Object.entries(manifest)
  .filter(([key]) => isAdminPath(key))
  .map(([, c]) => c.file);
for (const file of adminFiles) {
  if (storeHtml.includes(file)) errors.push(`dist/index.html referencia ${file}`);
}
if (/\/admin\//.test(storeHtml)) errors.push("dist/index.html referencia /admin/");

// 3) O HTML do portal não pode referenciar o CSS da loja.
const adminHtmlSrc = readFileSync(join(root, "admin", "index.html"), "utf8");
if (/styles\.css/.test(adminHtmlSrc)) errors.push("admin/index.html referencia styles.css da loja");
const storeCss = (manifest[storeEntry]?.css ?? []).map((f) => f);
const adminHtmlDist = readFileSync(join(dist, "admin", "index.html"), "utf8");
for (const css of storeCss) {
  if (adminHtmlDist.includes(css)) errors.push(`dist/admin/index.html referencia CSS da loja ${css}`);
}

// 4) Código-fonte: nada fora de src/admin importa de src/admin. (Imports estáticos entram no
// chunk da loja sem aparecer no manifest; esta varredura cobre esse caso.)
const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const adminDir = join(root, "src", "admin");
const importRe = /(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g;
for (const file of walk(join(root, "src"))) {
  if (!/\.(tsx?|jsx?|css)$/.test(file) || file.startsWith(adminDir + sep)) continue;
  for (const [, spec] of readFileSync(file, "utf8").matchAll(importRe)) {
    if (!spec.startsWith(".")) continue;
    const target = resolve(file, "..", spec);
    if (target === adminDir || target.startsWith(adminDir + sep)) {
      errors.push(`${relative(root, file)} importa de src/admin (${spec})`);
    }
  }
}

// 5) Inverso: src/admin só importa (relativo) de src/admin e src/shared.
const sharedDir = join(root, "src", "shared");
const inside = (t, d) => t === d || t.startsWith(d + sep);
if (statSync(adminDir, { throwIfNoEntry: false })) {
  for (const file of walk(adminDir)) {
    if (!/\.(tsx?|jsx?|css)$/.test(file)) continue;
    for (const [, spec] of readFileSync(file, "utf8").matchAll(importRe)) {
      if (!spec.startsWith(".")) continue;
      const target = resolve(file, "..", spec);
      if (!inside(target, adminDir) && !inside(target, sharedDir)) {
        errors.push(`${relative(root, file)} importa fora de src/admin e src/shared (${spec})`);
      }
    }
  }
}

if (errors.length) {
  console.error("Falha no isolamento loja/portal:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("Isolamento loja/portal OK");
