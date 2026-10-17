import { imageSchema } from "../schemas/book";
export const MAX_IMAGE_PIXELS = 40_000_000;
/** Read dimensions before asking the browser to allocate decoded pixels. */
export function imageDimensions(
  data: string,
): { width: number; height: number } | null {
  const raw = atob(data.slice(data.indexOf(",") + 1));
  const byte = (i: number) => raw.charCodeAt(i);
  const be16 = (i: number) => (byte(i) << 8) | byte(i + 1);
  const be32 = (i: number) =>
    byte(i) * 16777216 + (byte(i + 1) << 16) + (byte(i + 2) << 8) + byte(i + 3);
  const le24 = (i: number) =>
    byte(i) | (byte(i + 1) << 8) | (byte(i + 2) << 16);
  if (
    raw.startsWith("\x89PNG\r\n\x1a\n") &&
    raw.length >= 24 &&
    raw.slice(12, 16) === "IHDR"
  )
    return { width: be32(16), height: be32(20) };
  if (raw.startsWith("\xff\xd8\xff")) {
    let at = 2;
    while (at + 4 <= raw.length) {
      if (byte(at++) !== 255) return null;
      while (byte(at) === 255) at++;
      const marker = byte(at++);
      if (marker === 217 || marker === 218) break;
      if (marker === 216 || marker === 1) continue;
      const length = be16(at);
      if (length < 2 || at + length > raw.length) return null;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        length >= 7
      )
        return { width: be16(at + 5), height: be16(at + 3) };
      at += length;
    }
  }
  if (
    raw.startsWith("RIFF") &&
    raw.slice(8, 12) === "WEBP" &&
    raw.length >= 30
  ) {
    const type = raw.slice(12, 16);
    if (type === "VP8X") return { width: le24(24) + 1, height: le24(27) + 1 };
    if (type === "VP8 " && raw.slice(23, 26) === "\x9d\x01\x2a")
      return {
        width: (byte(26) | (byte(27) << 8)) & 16383,
        height: (byte(28) | (byte(29) << 8)) & 16383,
      };
    if (type === "VP8L" && byte(20) === 47) {
      const bits = (le24(21) | (byte(24) << 24)) >>> 0;
      return { width: (bits & 16383) + 1, height: ((bits >>> 14) & 16383) + 1 };
    }
  }
  return null;
}
/** Decode before a write, outside IndexedDB transactions. No network is used. */
export async function validateImagePixels(data: string): Promise<void> {
  imageSchema.parse(data);
  const size = imageDimensions(data);
  if (!size || !size.width || !size.height)
    throw new Error(
      "This embedded cover is damaged or has an invalid image header.",
    );
  if (
    size.width > 16000 ||
    size.height > 16000 ||
    size.width * size.height > MAX_IMAGE_PIXELS
  )
    throw new Error(
      "Cover dimensions are too large. Use an image under 40 megapixels and 16,000 pixels per side.",
    );
  const image = new Image();
  image.src = data;
  try {
    await image.decode();
  } catch {
    throw new Error(
      "This embedded cover is damaged or cannot be decoded. Choose another PNG, JPEG, or WebP.",
    );
  }
  if (image.naturalWidth !== size.width || image.naturalHeight !== size.height)
    throw new Error(
      "The cover has inconsistent image dimensions. Choose another image.",
    );
}
