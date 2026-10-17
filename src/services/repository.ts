import { db, defaultPreferences } from "../db/database";
import { bookSchema, imageSchema, type PortableBook } from "../schemas/book";
import type { Book, Annotation, Progress, Preferences } from "../models/types";
import { duplicateKey } from "./search";
import { validateImagePixels } from "./images";
import {
  annotationSchema,
  progressSchema,
  preferencesSchema,
} from "../schemas/records";
import { plainText } from "./markdown";
export function makeBook(content: PortableBook): Book {
  const parsed = bookSchema.parse(content);
  return {
    ...parsed,
    id: crypto.randomUUID(),
    addedAt: Date.now(),
    duplicateKey: duplicateKey(parsed.title, parsed.author),
    chapters: parsed.chapters.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
      paragraphs: c.paragraphs.map((text) => ({
        id: crypto.randomUUID(),
        text,
      })),
    })),
  };
}
export async function importBook(
  content: PortableBook,
  allowDuplicate = false,
) {
  const book = makeBook(content);
  if (book.coverImageDataUrl) await validateImagePixels(book.coverImageDataUrl);
  await db.transaction("rw", db.books, async () => {
    if (
      !allowDuplicate &&
      (await db.books.where("duplicateKey").equals(book.duplicateKey).count())
    )
      throw new Error(
        "This title and author are already in your library. Choose “Keep another copy” to continue.",
      );
    await db.books.add(book);
  });
  return book;
}
export function portableBook(book: Book): PortableBook {
  return bookSchema.parse({
    schemaVersion: 1,
    title: book.title,
    author: book.author,
    description: book.description,
    kind: book.kind,
    language: book.language,
    tags: book.tags,
    coverImageDataUrl: book.coverImageDataUrl,
    chapters: book.chapters.map((c) => ({
      title: c.title,
      paragraphs: c.paragraphs.map((p) => p.text),
    })),
  });
}
export async function deleteBook(id: string) {
  await db.transaction(
    "rw",
    db.books,
    db.annotations,
    db.progress,
    async () => {
      await db.annotations.where("bookId").equals(id).delete();
      await db.progress.delete(id);
      await db.books.delete(id);
    },
  );
}
export async function saveAnnotation(annotation: Annotation) {
  annotationSchema.parse(annotation);
  await db.transaction("rw", db.books, db.annotations, async () => {
    const b = await db.books.get(annotation.bookId);
    const c = b?.chapters.find((c) => c.id === annotation.chapterId);
    if (
      !c ||
      annotation.segments.some((s) => {
        const p = c.paragraphs.find((p) => p.id === s.paragraphId);
        return !p || s.end > plainText(p.text).length;
      })
    )
      throw new Error("This book or passage is no longer available.");
    await db.annotations.put(annotation);
  });
}
export async function removeAnnotation(id: string) {
  await db.annotations.delete(id);
}
export async function saveProgress(progress: Progress) {
  progressSchema.parse(progress);
  await db.transaction("rw", db.books, db.progress, async () => {
    const book = await db.books.get(progress.bookId);
    if (
      book?.chapters
        .find((c) => c.id === progress.chapterId)
        ?.paragraphs.some((p) => p.id === progress.paragraphId)
    )
      await db.progress.put(progress);
  });
}
export async function savePreferences(patch: Partial<Preferences>) {
  await db.transaction("rw", db.preferences, async () => {
    const next = {
      ...((await db.preferences.get("reader")) ?? defaultPreferences()),
      ...patch,
      id: "reader" as const,
    };
    await db.preferences.put(preferencesSchema.parse(next));
  });
}
export async function setCover(id: string, data: string) {
  await validateImagePixels(data);
  await db.books.update(id, { coverImageDataUrl: imageSchema.parse(data) });
}
export async function clearLibrary() {
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
}
export function downloadJson(value: unknown, name: string) {
  downloadText(JSON.stringify(value, null, 2), name, "application/json");
}
export function downloadText(text: string, name: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function readFile(file: File, limit: number) {
  if (file.size > limit)
    throw new Error(
      `File is too large. Maximum size: ${Math.round(limit / 1024 / 1024)} MB.`,
    );
  return file.text();
}
export async function readImage(file: File): Promise<string> {
  if (
    file.size > 3 * 1024 * 1024 ||
    !["image/png", "image/jpeg", "image/webp"].includes(file.type)
  )
    throw new Error("Choose a PNG, JPEG, or WebP image up to 3 MB.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(imageSchema.parse(reader.result));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.readAsDataURL(file);
  });
}
