import Dexie from "dexie";
import { beforeEach, describe, it, expect } from "vitest";
import { db, ChapterletDB } from "../db/database";
import { bookSchema } from "../schemas/book";
import {
  importBook,
  clearLibrary,
  saveAnnotation,
  savePreferences,
  saveProgress,
  deleteBook,
  makeBook,
  portableBook,
} from "../services/repository";
import { createBackup, restoreBackup } from "../services/backup";
import { segmentFor } from "../services/anchors";
import { plainText } from "../services/markdown";
import { parseBackup } from "../schemas/backup";
import example from "../../public/examples/a-small-art-of-attention.json";
beforeEach(async () => {
  await clearLibrary();
});
describe("transactional local library", () => {
  it("imports chapters in order and protects duplicate annotations", async () => {
    const input = bookSchema.parse(example);
    const b = await importBook(input);
    expect((await db.books.get(b.id))?.chapters.map((c) => c.title)).toEqual(
      example.chapters.map((c) => c.title),
    );
    await expect(importBook(input)).rejects.toThrow("already");
    await importBook(input, true);
    expect(await db.books.count()).toBe(2);
  });
  it("round-trips books, covers, three annotation kinds, notes, preferences and progress", async () => {
    const b = await importBook(bookSchema.parse(example));
    const c = b.chapters[0],
      p = c.paragraphs[0];
    for (const kind of ["highlight", "bookmark", "note"] as const)
      await saveAnnotation({
        id: crypto.randomUUID(),
        bookId: b.id,
        chapterId: c.id,
        kind,
        segments: [segmentFor(p.id, plainText(p.text), 0, 6)],
        quote: "Before",
        note: kind === "note" ? "A thought.\nAnother thought." : "",
        color: "yellow",
        createdAt: 1,
        updatedAt: 1,
      });
    await savePreferences({ theme: "sepia", fontSize: 24 });
    await saveProgress({
      bookId: b.id,
      chapterId: c.id,
      paragraphId: p.id,
      percent: 6,
      updatedAt: 1,
    });
    const backup = await createBackup();
    await clearLibrary();
    await restoreBackup(parseBackup(JSON.stringify(backup)), "replace");
    const restored = await createBackup();
    expect({ ...restored, exportedAt: backup.exportedAt }).toEqual(backup);
    expect(portableBook(restored.books[0])).not.toHaveProperty("annotations");
  });
  it("merges conflicting IDs without overwriting and remaps every relationship", async () => {
    const b = await importBook(bookSchema.parse(example));
    const c = b.chapters[0],
      p = c.paragraphs[0];
    await saveAnnotation({
      id: crypto.randomUUID(),
      bookId: b.id,
      chapterId: c.id,
      kind: "bookmark",
      segments: [segmentFor(p.id, plainText(p.text), 0, 6)],
      quote: "Before",
      note: "Keep me",
      color: "yellow",
      createdAt: 1,
      updatedAt: 1,
    });
    await saveProgress({
      bookId: b.id,
      chapterId: c.id,
      paragraphId: p.id,
      percent: 6,
      updatedAt: 1,
    });
    const backup = await createBackup();
    await restoreBackup(backup, "merge");
    const merged = await createBackup();
    expect(merged.books).toHaveLength(2);
    expect(merged.annotations).toHaveLength(2);
    const incoming = merged.books.find((x) => x.id !== b.id)!;
    const note = merged.annotations.find((a) => a.bookId === incoming.id)!;
    expect(note.chapterId).toBe(incoming.chapters[0].id);
    expect(note.segments[0].paragraphId).toBe(
      incoming.chapters[0].paragraphs[0].id,
    );
    expect(
      merged.progress.find((p) => p.bookId === incoming.id)?.chapterId,
    ).toBe(incoming.chapters[0].id);
  });
  it("rejects a malformed replacement before modifying the library", async () => {
    await importBook(bookSchema.parse(example));
    const backup = await createBackup();
    backup.books[0].chapters = [];
    await expect(restoreBackup(backup, "replace")).rejects.toThrow();
    expect(await db.books.count()).toBe(1);
  });
  it("deletes all dependent data with the book", async () => {
    const b = await importBook(bookSchema.parse(example));
    const c = b.chapters[0];
    await saveAnnotation({
      id: crypto.randomUUID(),
      bookId: b.id,
      chapterId: c.id,
      kind: "bookmark",
      segments: [],
      quote: "",
      note: "",
      color: "yellow",
      createdAt: 1,
      updatedAt: 1,
    });
    await saveProgress({
      bookId: b.id,
      chapterId: c.id,
      paragraphId: c.paragraphs[0].id,
      percent: 1,
      updatedAt: 1,
    });
    await deleteBook(b.id);
    expect(await db.annotations.count()).toBe(0);
    expect(await db.progress.count()).toBe(0);
  });
  it("migrates version 1 duplicate keys without changing IDs", async () => {
    const name = `migration-${crypto.randomUUID()}`;
    const v1 = new Dexie(name);
    v1.version(1).stores({
      books: "id,addedAt",
      annotations: "id,bookId,chapterId,kind,createdAt",
      progress: "bookId,updatedAt",
      preferences: "id",
    });
    const book = makeBook(bookSchema.parse(example));
    const old = { ...book, duplicateKey: undefined };
    await v1.table("books").add(old);
    v1.close();
    const v2 = new ChapterletDB(name);
    await v2.open();
    expect((await v2.books.get(book.id))?.duplicateKey).toBe(book.duplicateKey);
    expect((await v2.books.get(book.id))?.chapters[0].id).toBe(
      book.chapters[0].id,
    );
    await v2.delete();
  });
});
