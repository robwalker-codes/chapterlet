import { z } from "zod";
const id = z.string().uuid(),
  timestamp = z.number().finite().nonnegative();
const segment = z
  .object({
    paragraphId: id,
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    exact: z.string().min(1),
    prefix: z.string().max(32),
    suffix: z.string().max(32),
  })
  .strict()
  .refine(
    (s) => s.end > s.start && s.end - s.start === s.exact.length,
    "Invalid text offsets.",
  );
export const preferencesSchema = z
  .object({
    id: z.literal("reader"),
    theme: z.enum(["light", "dark", "sepia"]),
    font: z.enum(["serif", "sans"]),
    fontSize: z.number().min(16).max(32),
    lineHeight: z.number().min(1.4).max(2.4),
    layout: z.enum(["grid", "list"]),
  })
  .strict();
export const annotationSchema = z
  .object({
    id,
    bookId: id,
    chapterId: id,
    kind: z.enum(["highlight", "bookmark", "note"]),
    segments: z.array(segment).max(10000),
    quote: z
      .string()
      .max(1000000, "Select a shorter passage (under one million characters)."),
    note: z.string().max(100000),
    color: z.literal("yellow"),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .strict();
export const progressSchema = z
  .object({
    bookId: id,
    chapterId: id,
    paragraphId: id,
    percent: z.number().min(0).max(100),
    updatedAt: timestamp,
  })
  .strict();
