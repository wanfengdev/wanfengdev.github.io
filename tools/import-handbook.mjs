/* eslint-disable no-console -- CLI tool: progress output is intentional */
/**
 * One-shot import of the open-source《AI Agent Handbook》(Apache-2.0,
 * https://github.com/aliyun/ai-agent-handbook) into the blog as a zh-only
 * column under src/data/handbook/zh/.
 *
 * Reuses the book's own manifest (.vitepress/book.mjs readingOrder) so slugs,
 * part grouping and reading order stay faithful to the upstream book.
 *
 * Run: node tools/import-handbook.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  readingOrder,
  parts,
  repository,
  bySource,
  byRoute,
  directoryPages,
} from "/Users/at/Desktop/ai-agent-handbook/.vitepress/book.mjs";

const BOOK = "/Users/at/Desktop/ai-agent-handbook";
const BLOG = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(BLOG, "src/data/handbook/zh");
const IMG_OUT = path.join(BLOG, "public/handbook/imgs");

// ── manifest: readingOrder already contains children; dedupe by route ──
const seen = new Set();
const pages = readingOrder.filter(p => {
  if (seen.has(p.route)) return false;
  seen.add(p.route);
  return true;
});

// ── image index: every file under book/assets, by root-relative path ──
const imageIndex = new Map();
const walk = dir => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else imageIndex.set(path.relative(BOOK, full).split(path.sep).join("/"), full);
  }
};
walk(path.join(BOOK, "assets"));
const byBasename = new Map();
for (const rel of imageIndex.keys()) {
  const base = path.posix.basename(rel);
  if (!byBasename.has(base)) byBasename.set(base, []);
  byBasename.get(base).push(rel);
}

const unresolvedImages = [];
const unresolvedLinks = [];

// basename → page, for cross-directory bare-filename links (skip ambiguous names)
const pageByBasename = new Map();
for (const p of pages) {
  const base = path.posix.basename(p.source);
  if (pageByBasename.has(base)) pageByBasename.set(base, null);
  else pageByBasename.set(base, p);
}

function resolveImage(raw, source) {
  let p = raw.trim().replace(/^<|>$/g, "");
  if (/^(https?:|data:|\/\/)/.test(p)) return null; // remote: leave as-is
  p = p.split(/[?#]/)[0].replace(/\s+"[^"]*"\s*$/, "").trim();
  const candidates = [];
  const marker = p.indexOf("assets/imgs/");
  if (marker >= 0) candidates.push(p.slice(marker));
  candidates.push(path.posix.normalize(path.posix.join(path.posix.dirname(source), p)));
  candidates.push(p.replace(/^\/+/, ""));
  for (const c of candidates) {
    if (imageIndex.has(c)) return c;
  }
  const base = path.posix.basename(p);
  const matches = byBasename.get(base);
  if (matches && matches.length === 1) return matches[0];
  if (matches && matches.length > 1) {
    const near = matches.find(m => m.includes(path.posix.dirname(source).split("/")[0]));
    return near ?? matches[0];
  }
  return undefined;
}

function copyImage(rel) {
  return imageUrl.get(rel);
}

// ── pass 1: compress every referenced image once (PNG/JPG→WebP, GIF→animated WebP) ──
const imageUrl = new Map();
async function prepareImages() {
  const rels = new Set();
  for (const page of pages) {
    const body = fs.readFileSync(path.join(BOOK, page.source), "utf8");
    for (const m of body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
      const r = resolveImage(m[1], page.source);
      if (r) rels.add(r);
    }
    for (const m of body.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g)) {
      const r = resolveImage(m[1], page.source);
      if (r) rels.add(r);
    }
  }
  fs.rmSync(IMG_OUT, { recursive: true, force: true });
  for (const rel of rels) {
    const sub = rel.replace(/^assets\/imgs\//, "");
    const ext = path.posix.extname(sub).toLowerCase();
    const src = imageIndex.get(rel);
    const encode = p => p.split("/").map(encodeURIComponent).join("/");
    if (ext === ".svg") {
      const dest = path.join(IMG_OUT, sub);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      imageUrl.set(rel, `/handbook/imgs/${encode(sub)}`);
      continue;
    }
    const outSub = sub.replace(/\.(png|jpe?g|gif)$/i, ".webp");
    const dest = path.join(IMG_OUT, outSub);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const animated = ext === ".gif";
    const img = sharp(src, { pages: animated ? -1 : 1 });
    const meta = await img.metadata();
    const pipeline =
      meta.width > 1600 ? img.resize({ width: 1600, withoutEnlargement: true }) : img;
    await pipeline.webp({ quality: 80, effort: 4 }).toFile(dest);
    imageUrl.set(rel, `/handbook/imgs/${encode(outSub)}`);
  }
}
await prepareImages();

function resolveLink(raw, source) {
  const url = raw.trim().replace(/^<|>$/g, "");
  if (!url || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return null;
  if (/^\/handbook\//.test(url)) return null; // already-rewritten handbook URL
  const split = url.search(/[?#]/);
  const pathname = split < 0 ? url : url.slice(0, split);
  const suffix = split < 0 ? "" : url.slice(split);
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const resolved = path.posix
    .normalize(
      decoded.startsWith("/")
        ? decoded.slice(1)
        : path.posix.join(path.posix.dirname(source), decoded)
    )
    .replace(/\/$/, "");
  const target =
    bySource.get(resolved) ||
    directoryPages.get(resolved) ||
    byRoute.get(resolved.replace(/\.html$/, ".md"));
  // Astro's glob loader strips "/index" from collection ids, so link targets
  // must use the normalized route to match the generated page paths.
  if (target)
    return `/handbook/${target.route.replace(/\/index$/, "")}${suffix}`;
  const byBase = pageByBasename.get(path.posix.basename(resolved));
  if (byBase)
    return `/handbook/${byBase.route.replace(/\/index$/, "")}${suffix}`;
  return undefined; // internal but unknown
}

// ── content transforms ──
function transformImages(body, source) {
  // markdown ![alt](path "title")
  body = body.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, raw) => {
    const rel = resolveImage(raw, source);
    if (rel === null) return m;
    if (rel === undefined) {
      unresolvedImages.push(`${source}: ${raw}`);
      return m;
    }
    const title = raw.match(/\s+"[^"]*"\s*$/)?.[0] ?? "";
    return `![${alt}](${copyImage(rel)}${title})`;
  });
  // html <img src="path">
  body = body.replace(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g, (m, raw) => {
    const rel = resolveImage(raw, source);
    if (rel === null || rel === undefined) {
      if (rel === undefined) unresolvedImages.push(`${source}: ${raw}`);
      return m;
    }
    return m.replace(`src="${raw}"`, `src="${copyImage(rel)}"`);
  });
  return body;
}

function transformLinks(body, source) {
  const repl = (m, text, raw) => {
    const target = resolveLink(raw, source);
    if (target === null) return m;
    if (target === undefined) {
      unresolvedLinks.push(`${source}: ${raw}`);
      return m;
    }
    return `[${text}](${target})`;
  };
  body = body.replace(/\[([^\]]*)\]\(<([^>]+)>\)/g, repl);
  body = body.replace(/\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (m, text, raw, title) => {
    const target = resolveLink(raw, source);
    if (target === null) return m;
    if (target === undefined) {
      unresolvedLinks.push(`${source}: ${raw}`);
      return m;
    }
    return `[${text}](${target}${title ?? ""})`;
  });
  return body;
}

// VitePress ::: / :::: containers → blockquote (nested markers flattened)
function transformContainers(body) {
  const lines = body.split("\n");
  const out = [];
  let depth = 0;
  let inCode = false;
  for (const line of lines) {
    if (/^```/.test(line)) inCode = !inCode;
    const m = !inCode && line.match(/^:{3,4}\s*(.*)$/);
    if (m) {
      if (depth === 0 && m[1]) out.push(`> **${m[1].trim()}**`, ">");
      depth = m[1] || depth === 0 ? depth + 1 : depth - 1;
      if (depth === 0) out.push("");
      continue;
    }
    out.push(depth > 0 ? `> ${line}`.trimEnd() : line);
  }
  return out.join("\n");
}

function firstParagraph(body) {
  const para = body
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .find(s => s && !/^[#>|!:\-]/.test(s) && !s.startsWith("```"));
  if (!para) return "";
  return para
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
}

const yamlEscape = s => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

// ── run ──
fs.mkdirSync(OUT, { recursive: true });
let order = 0;
for (const page of pages) {
  order += 1;
  const srcAbs = path.join(BOOK, page.source);
  let body = fs.readFileSync(srcAbs, "utf8");
  body = body.replace(/^#\s+.+\n+/, ""); // layout renders the title
  body = transformContainers(body);
  body = transformImages(body, page.source);
  body = transformLinks(body, page.source);

  const fm = [
    "---",
    `title: "${yamlEscape(page.title)}"`,
    `description: "${yamlEscape(firstParagraph(body))}"`,
    `partId: "${page.part === "开始阅读" ? "start" : parts.find(p => p.title === page.part)?.id ?? "start"}"`,
    `part: "${yamlEscape(page.part)}"`,
    ...(page.chapter !== undefined ? [`chapter: "${page.chapter}"`] : []),
    `order: ${order}`,
    `source: "${page.source}"`,
    "---",
    "",
  ].join("\n");

  const dest = path.join(OUT, `${page.route}.md`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, fm + body.trim() + "\n");
}

// part metadata for the column home page
const meta = {
  repository,
  license: "Apache-2.0",
  parts: [
    { id: "start", title: "开始阅读", english: "Start", description: "前言与开发者调研报告。" },
    ...parts.map(p => ({
      id: p.id,
      title: p.title,
      english: p.english,
      range: p.range,
      description: p.description,
    })),
  ],
};
fs.writeFileSync(
  path.join(BLOG, "src/data/handbook/meta.json"),
  JSON.stringify(meta, null, 2) + "\n"
);

console.log(`pages: ${pages.length}`);
console.log(`images processed: ${imageUrl.size}`);
console.log(`unresolved images: ${unresolvedImages.length}`);
unresolvedImages.slice(0, 20).forEach(x => console.log("  IMG", x));
console.log(`unresolved links: ${unresolvedLinks.length}`);
unresolvedLinks.slice(0, 20).forEach(x => console.log("  LNK", x));