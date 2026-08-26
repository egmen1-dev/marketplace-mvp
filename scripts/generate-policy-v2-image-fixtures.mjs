#!/usr/bin/env node
/** Generate PNG test fixtures with embedded text for OCR/image moderation tests. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

const outDir = join(process.cwd(), "tests/fixtures/policy-v2/images");
mkdirSync(outDir, { recursive: true });

const fixtures = [
  { name: "safe-drill", lines: ["Bosch GSR 120", "Дрель аккумуляторная"] },
  { name: "cyrillic-packaging", lines: ["Состав: вода, соль", "Срок годности 2027"] },
  { name: "mixed-latin-cyrillic", lines: ["NICOTINE FREE", "без никотина", "0 mg/ml"] },
  { name: "nicotine-label", lines: ["Жидкость для вейпа", "NICOTINE 20 mg/ml", "Манго"] },
  { name: "phone-on-image", lines: ["Звоните +7 999 123-45-67", "Telegram @seller"] },
  { name: "url-on-image", lines: ["Купить на t.me/shop", "https://example.com"] },
  { name: "vape-packaging", lines: ["POD SYSTEM", "Вейп одноразка"] },
  { name: "alcohol-label", lines: ["Водка 0.5л", "40% vol"] },
  { name: "toy-gun-box", lines: ["Игрушечный пистолет", "NERF"] },
  { name: "ambiguous-bottle", lines: ["Ароматизатор", "без никотина"] },
  { name: "spaced-evasion", lines: ["в е й п", "ж и ж а"] },
  { name: "low-contrast", lines: ["nicotine 20mg"], width: 400 },
];

async function renderFixture(spec) {
  const width = spec.width ?? 640;
  const lineHeight = 36;
  const height = 80 + spec.lines.length * lineHeight;
  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f8f8f8"/>
  ${spec.lines
    .map(
      (line, i) =>
        `<text x="24" y="${48 + i * lineHeight}" font-family="DejaVu Sans, Arial, sans-serif" font-size="28" fill="#111">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`,
    )
    .join("\n")}
</svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const path = join(outDir, `${spec.name}.png`);
  writeFileSync(path, png);
  return path;
}

const manifest = [];
for (const spec of fixtures) {
  const path = await renderFixture(spec);
  manifest.push({ id: spec.name, path: path.replace(process.cwd() + "/", ""), lines: spec.lines });
}

writeFileSync(join(outDir, "manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), fixtures: manifest }, null, 2));
console.log(`Generated ${manifest.length} image fixtures in ${outDir}`);
