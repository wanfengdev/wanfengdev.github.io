import fs from "fs";
import path from "path";

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type FontStyle = "normal" | "italic";

export interface OgFontOption {
  name: string;
  data: ArrayBuffer;
  weight: Weight;
  style: FontStyle;
}

function readFont(file: string): ArrayBuffer {
  const fontPath = path.resolve(`./src/assets/fonts/${file}`);
  const fontData = fs.readFileSync(fontPath);
  return fontData.buffer.slice(
    fontData.byteOffset,
    fontData.byteOffset + fontData.byteLength
  );
}

let cachedFonts: OgFontOption[] | null = null;

export async function loadOgFont(): Promise<OgFontOption[]> {
  if (!cachedFonts) {
    const wotfard = readFont("wotfard.ttf");
    // CJK subset (GB2312 level-1 + ASCII) for Chinese titles; see tools/subset-og-font.mjs
    const cjkRegular = readFont("wanfeng-cjk-regular.ttf");
    const cjkBlack = readFont("wanfeng-cjk-black.ttf");

    // We map different weights to the same TTF file so that satori
    // can render correctly regardless of the fontWeight
    // used in the templates.
    cachedFonts = [
      { name: "Wotfard", data: wotfard, weight: 400, style: "normal" },
      { name: "Wotfard", data: wotfard, weight: 600, style: "normal" },
      { name: "Wotfard", data: wotfard, weight: 700, style: "normal" },
      { name: "Wotfard", data: wotfard, weight: 900, style: "normal" },
      { name: "Wanfeng CJK", data: cjkRegular, weight: 400, style: "normal" },
      { name: "Wanfeng CJK", data: cjkRegular, weight: 600, style: "normal" },
      { name: "Wanfeng CJK", data: cjkBlack, weight: 700, style: "normal" },
      { name: "Wanfeng CJK", data: cjkBlack, weight: 900, style: "normal" },
    ];
  }

  return cachedFonts;
}

export default loadOgFont;
