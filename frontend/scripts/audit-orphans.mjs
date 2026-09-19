#!/usr/bin/env node
/**
 * مدقّق الشيفرة اليتيمة — يكتشف ما هو مكتمل لكن غير موصول بالواجهة.
 *
 * 1) ملفات لا يمكن الوصول إليها من نقطة الدخول (لا يستوردها أي ملف إنتاجي).
 * 2) ملفات يستوردها الاختبار فقط — أي موجودة للمستقبل لكنها ليست في الواجهة.
 * 3) تصديرات (مكوّنات/دوال/أنواع) لا يذكرها أي ملف آخر.
 *
 * الاستخدام:  node scripts/audit-orphans.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const testDir = join(root, "test");
const e2eDir = join(root, "e2e");

const EXTENSIONS = [".ts", ".tsx"];
const IGNORED_DIRS = new Set(["node_modules", "dist", "coverage", ".vite"]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTENSIONS.includes(extname(entry)) && !entry.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

function resolveImport(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = join(srcDir, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else return null;
  if (extname(base)) return base;
  for (const ext of EXTENSIONS) if (exists(base + ext)) return base + ext;
  for (const ext of EXTENSIONS) if (exists(join(base, "index" + ext))) return join(base, "index" + ext);
  return null;
}

function exists(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

const IMPORT_RE = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
// عمال الـ Web Workers تُحمّل بعنوان URL لا بـ import — تُحتسب كحافة في الرسم
const WORKER_URL_RE = /new\s+URL\s*\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url/g;
const EXPORT_RE =
  /export\s+(?:default\s+)?(?:async\s+)?(?:const|let|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
const EXPORT_LIST_RE = /export\s*\{([^}]+)\}/g;

function collectImports(file) {
  const source = readFileSync(file, "utf8");
  const specs = [];
  for (const match of source.matchAll(IMPORT_RE)) specs.push(match[1]);
  for (const match of source.matchAll(WORKER_URL_RE)) specs.push(match[1]);
  return specs;
}

const srcFiles = walk(srcDir);
const testFiles = [...walk(testDir), ...walk(e2eDir)];

const importsOf = new Map();
for (const file of [...srcFiles, ...testFiles]) importsOf.set(file, collectImports(file));

// من يستورد ماذا (على مستوى الملفات الإنتاجية فقط)
const importedByProd = new Map(srcFiles.map((f) => [f, new Set()]));
const importedByTest = new Map(srcFiles.map((f) => [f, new Set()]));
for (const file of srcFiles) {
  for (const spec of importsOf.get(file) ?? []) {
    const target = resolveImport(spec, file);
    if (target && importedByProd.has(target)) importedByProd.get(target).add(file);
  }
}
for (const file of testFiles) {
  for (const spec of importsOf.get(file) ?? []) {
    const target = resolveImport(spec, file);
    if (target && importedByTest.has(target)) importedByTest.get(target).add(file);
  }
}

// نقطة الدخول + أي ملف يُدعى مباشرة من HTML
const ENTRY = ["main.tsx", "bootstrap.ts"];
const reachable = new Set();
const queue = srcFiles.filter((f) => ENTRY.includes(basename(f)));
queue.forEach((f) => reachable.add(f));
while (queue.length) {
  const file = queue.pop();
  for (const spec of importsOf.get(file) ?? []) {
    const target = resolveImport(spec, file);
    if (target && importedByProd.has(target) && !reachable.has(target)) {
      reachable.add(target);
      queue.push(target);
    }
  }
}

const rel = (f) => relative(root, f).replaceAll("\\", "/");
const orphanFiles = srcFiles.filter((f) => !reachable.has(f));
const testOnlyFiles = orphanFiles.filter((f) => importedByTest.get(f).size > 0);
const fullyDead = orphanFiles.filter((f) => importedByTest.get(f).size === 0);

// تصديرات لا يذكرها أي ملف آخر
const sources = new Map(srcFiles.map((f) => [f, readFileSync(f, "utf8")]));
const unusedExports = [];
for (const file of srcFiles) {
  const source = sources.get(file);
  const names = new Set();
  for (const match of source.matchAll(EXPORT_RE)) names.add(match[1]);
  for (const match of source.matchAll(EXPORT_LIST_RE)) {
    for (const part of match[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  for (const name of names) {
    if (name === "default") continue;
    let referenced = false;
    for (const other of srcFiles) {
      if (other === file) continue;
      const otherSource = sources.get(other);
      if (new RegExp(`\\b${name.replace(/\$/g, "\\$")}\\b`).test(otherSource)) {
        referenced = true;
        break;
      }
    }
    if (!referenced) unusedExports.push({ file: rel(file), name });
  }
}

const report = (title, items) => {
  console.log(`\n${title} (${items.length})`);
  if (items.length === 0) console.log("  — لا شيء —");
  for (const item of items) console.log(`  • ${item}`);
};

console.log(`ملفات src: ${srcFiles.length} · قابلة للوصول: ${reachable.size}`);
report("🟥 ملفات لا يصلها أي مسار إنتاجي", orphanFiles.map(rel));
report("🟧 منها مستوردة من الاختبار فقط", testOnlyFiles.map(rel));
report("🟨 تصديرات لا يذكرها أي ملف آخر", unusedExports.map((e) => `${e.name} — ${e.file}`));
