import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("public/icons", { recursive: true });
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="105" fill="#294d3e"/><path d="M132 155 Q195 137 256 177 Q317 137 380 155 L380 350 Q315 330 256 367 Q197 330 132 350 Z" fill="none" stroke="#e9e5ca" stroke-width="15" stroke-linejoin="round"/><path d="M256 177V367 M165 197Q202 192 229 210 M165 235Q202 230 229 248 M283 210Q315 192 347 197 M283 248Q315 230 347 235" fill="none" stroke="#e9e5ca" stroke-width="10" stroke-linecap="round"/><circle cx="256" cy="412" r="8" fill="#b5a273"/></svg>`;
for (const [name, size] of [
  ["icon-192", 192],
  ["icon-512", 512],
  ["maskable-512", 512],
  ["apple-touch-icon", 180],
])
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icons/${name}.png`);
