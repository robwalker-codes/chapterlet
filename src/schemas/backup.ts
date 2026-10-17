import { z } from "zod";
import { bookSchema, MAX_BACKUP_BYTES } from "./book";
import { plainText } from "../services/markdown";
import { annotationSchema, progressSchema, preferencesSchema } from "./records";
const id = z.string().uuid(),
  timestamp = z.number().finite().nonnegative();
const chapterSchema = z
  .object({
    id,
    title: z.string().trim().min(1).max(1000),
    paragraphs: z
      .array(
        z
          .object({
            id,
            text: z
              .string()
              .min(1)
              .max(100000)
              .refine((s) => s.trim().length > 0),
          })
          .strict(),
      )
      .min(1)
      .max(10000),
  })
  .strict();
export const internalBookSchema = bookSchema
  .omit({ chapters: true })
  .extend({
    id,
    addedAt: timestamp,
    duplicateKey: z.string(),
    chapters: z.array(chapterSchema).min(1).max(1000),
  })
  .strict();
export const backupSchema = z
  .object({
    format: z.literal("chapterlet-backup"),
    backupVersion: z.literal(1),
    exportedAt: z.string().datetime(),
    books: z.array(internalBookSchema).max(10000),
    annotations: z.array(annotationSchema).max(100000),
    progress: z.array(progressSchema),
    preferences: preferencesSchema.nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    const claim = (value: string) => {
      if (ids.has(value))
        ctx.addIssue({
          code: "custom",
          message: `Duplicate identifier: ${value}`,
        });
      ids.add(value);
    };
    for (const b of data.books) {
      claim(b.id);
      for (const c of b.chapters) {
        claim(c.id);
        c.paragraphs.forEach((p) => claim(p.id));
      }
    }
    for (const a of data.annotations) {
      claim(a.id);
      const c = data.books
        .find((b) => b.id === a.bookId)
        ?.chapters.find((c) => c.id === a.chapterId);
      if (!c)
        ctx.addIssue({
          code: "custom",
          message: "Annotation refers to a missing chapter.",
        });
      for (const s of a.segments) {
        const p = c?.paragraphs.find((p) => p.id === s.paragraphId);
        if (!p || s.end > plainText(p.text).length)
          ctx.addIssue({
            code: "custom",
            message: "Annotation refers to an invalid paragraph or offset.",
          });
      }
    }
    const seen = new Set<string>();
    for (const p of data.progress) {
      const c = data.books
        .find((b) => b.id === p.bookId)
        ?.chapters.find((c) => c.id === p.chapterId);
      if (
        seen.has(p.bookId) ||
        !c?.paragraphs.some((v) => v.id === p.paragraphId)
      )
        ctx.addIssue({ code: "custom", message: "Invalid reading position." });
      seen.add(p.bookId);
    }
  });
export type Backup = z.infer<typeof backupSchema>;
export function parseBackup(text: string): Backup {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    throw new Error("Backup must be 100 MB or smaller.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Malformed backup JSON.");
  }
  return backupSchema.parse(value);
}
