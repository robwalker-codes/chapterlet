import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { imageDimensions, validateImagePixels } from "../services/images";
describe("local image limits", () => {
  it("reads real PNG dimensions", () => {
    const bytes = readFileSync("public/icons/icon-192.png");
    expect(
      imageDimensions(`data:image/png;base64,${bytes.toString("base64")}`),
    ).toEqual({ width: 192, height: 192 });
  });
  it("rejects forged signatures and enormous dimensions before decoding", async () => {
    await expect(
      validateImagePixels("data:image/png;base64,iVBORw0KGgo="),
    ).rejects.toThrow("damaged");
    const bytes = Buffer.from(readFileSync("public/icons/icon-192.png"));
    bytes.writeUInt32BE(100000, 16);
    await expect(
      validateImagePixels(`data:image/png;base64,${bytes.toString("base64")}`),
    ).rejects.toThrow("too large");
  });
});

it.each(["jpeg", "webp"] as const)(
  "reads %s cover dimensions",
  async (format) => {
    const { default: sharp } = await import("sharp");
    const bytes = await sharp({
      create: { width: 7, height: 11, channels: 3, background: "#335544" },
    })
      .toFormat(format)
      .toBuffer();
    expect(
      imageDimensions(
        `data:image/${format};base64,${bytes.toString("base64")}`,
      ),
    ).toEqual({ width: 7, height: 11 });
  },
);
