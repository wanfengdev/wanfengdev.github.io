/* eslint-disable no-console -- CLI tool: progress output is intentional */
/**
 * Regenerates src/assets/fonts/wanfeng-cjk-{regular,black}.ttf used by the
 * dynamic OG image renderer (satori needs embedded TTFs with CJK coverage).
 *
 * Source: Noto Sans SC (SIL OFL 1.1) served by Google Fonts.
 * Charset: GB2312 level-1 (3755 common simplified chars) + ASCII + CJK
 * punctuation + every CJK char found in the current zh content, so new
 * posts using common characters keep rendering without regeneration.
 *
 * Run: pnpm og:font   (requires network access)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCES = [
  {
    weight: "regular",
    url: "https://fonts.gstatic.com/s/notosanssc/v41/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYw.ttf",
  },
  {
    weight: "black",
    url: "https://fonts.gstatic.com/s/notosanssc/v41/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG3bCnYw.ttf",
  },
];

function collectCharset() {
  const chars = new Set();

  // GB2312 level-1 rows 0xB0-0xD7 (3755 common simplified characters)
  const decoder = new TextDecoder("gbk");
  for (let hi = 0xb0; hi <= 0xd7; hi++) {
    for (let lo = 0xa1; lo <= 0xfe; lo++) {
      const ch = decoder.decode(Uint8Array.from([hi, lo]));
      if (ch.length === 1 && ch.codePointAt(0) !== 0xfffd) chars.add(ch);
    }
  }

  for (let c = 0x20; c <= 0x7e; c++) chars.add(String.fromCharCode(c));

  const punctuation =
    "，。、；：？！“”‘’（）《》〈〉【】「」『』〔〕—…·～￥％＋－×÷＝≠≈∞℃①②③④⑤⑥⑦⑧⑨⑩";
  for (const ch of punctuation) chars.add(ch);

  // Every CJK char already used in zh content/UI
  const contentDirs = [
    "src/data/blog/zh",
    "src/data/galleries/zh",
    "src/i18n",
    "src/pages",
  ];
  const walk = dir => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(md|mdx|ts|astro)$/.test(entry.name)) {
        for (const ch of fs.readFileSync(full, "utf8")) {
          if (/[㐀-䶿一-鿿]/.test(ch)) chars.add(ch);
        }
      }
    }
  };
  for (const dir of contentDirs) walk(path.join(root, dir));
  for (const ch of fs.readFileSync(path.join(root, "src/config.ts"), "utf8")) {
    if (/[㐀-䶿一-鿿]/.test(ch)) chars.add(ch);
  }

  return [...chars].join("");
}

const text = collectCharset();
console.log(`charset: ${text.length} chars`);

for (const { weight, url } of SOURCES) {
  const tmp = path.join(os.tmpdir(), `noto-sans-sc-${weight}.ttf`);
  if (!fs.existsSync(tmp)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download failed: ${res.status} ${url}`);
    fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  }
  const subset = await subsetFont(fs.readFileSync(tmp), text, {
    targetFormat: "truetype",
  });
  const out = path.join(root, `src/assets/fonts/wanfeng-cjk-${weight}.ttf`);
  fs.writeFileSync(out, subset);
  console.log(`${out}: ${(subset.length / 1024).toFixed(0)} KB`);
}