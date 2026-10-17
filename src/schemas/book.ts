import { z } from "zod";
export const MAX_BOOK_BYTES = 20 * 1024 * 1024;
export const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export function validImage(value: string): boolean {
  const match =
    /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4)
    return false;
  try {
    const raw = atob(match[2]);
    if (raw.length > MAX_IMAGE_BYTES) return false;
    return match[1] === "png"
      ? raw.startsWith("\x89PNG\r\n\x1a\n")
      : match[1] === "jpeg"
        ? raw.startsWith("\xff\xd8\xff")
        : raw.startsWith("RIFF") && raw.slice(8, 12) === "WEBP";
  } catch {
    return false;
  }
}
export const imageSchema = z
  .string()
  .refine(validImage, "Use an embedded PNG, JPEG, or WebP image, up to 3 MB.");
const requiredText = z.string().trim().min(1, "Must not be empty.").max(1000);
export const bookSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: requiredText,
    author: requiredText,
    description: z.string().max(20000).optional(),
    kind: z.enum(["summary", "abridgement", "notes"]).optional(),
    language: z
      .string()
      .regex(
        /^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/,
        "Use a language tag such as en or en-GB.",
      )
      .optional(),
    tags: z.array(requiredText).max(100).optional(),
    coverImageDataUrl: imageSchema.optional(),
    chapters: z
      .array(
        z
          .object({
            title: requiredText,
            paragraphs: z
              .array(
                z
                  .string()
                  .min(1)
                  .max(100000)
                  .refine(
                    (s) => s.trim().length > 0,
                    "Paragraph must not be blank.",
                  ),
              )
              .min(1, "Add at least one paragraph.")
              .max(10000),
          })
          .strict(),
      )
      .min(1, "Add at least one chapter.")
      .max(1000),
  })
  .strict();
export type PortableBook = z.infer<typeof bookSchema>;
export const publicJsonSchema = z.toJSONSchema(bookSchema, {
  unrepresentable: "any",
});
export const aiPrompt = `Create a short, engaging book summary or abridgement from the material I supply below. Divide it into appropriately titled chapters with readable paragraphs. Include accurate title, author, description, kind, language, and tags. Return only valid JSON: no code fences or commentary. Escape quotation marks, newlines, and special characters correctly. Never invent unsupported properties. Do not include internal IDs or remote images. Paragraphs may use **bold**, *italic*, inline code, and safe https links; never raw HTML. schemaVersion must be 1. Follow this exact JSON Schema:\n${JSON.stringify(publicJsonSchema, null, 2)}\n\nSource material and desired length:\n[Paste your source material and instructions here]`;
export function parseBook(text: string): PortableBook {
  if (new TextEncoder().encode(text).length > MAX_BOOK_BYTES)
    throw new Error("Book files must be 20 MB or smaller.");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      "Malformed JSON. Check commas, quotation marks, and brackets.",
    );
  }
  if (
    typeof data === "object" &&
    data !== null &&
    "schemaVersion" in data &&
    data.schemaVersion !== 1
  )
    throw new Error(
      "Unsupported schemaVersion. Chapterlet currently accepts version 1.",
    );
  return bookSchema.parse(data);
}
export function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError)
    return error.issues
      .map((i) => `${i.path.join(".") || "File"}: ${i.message}`)
      .slice(0, 8)
      .join("\n");
  if (error instanceof Error) {
    if (/quota/i.test(error.name))
      return "Device storage is full. Export a backup, then free storage and try again.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
