import { db } from "../db/database";
import { backupSchema, type Backup } from "../schemas/backup";
import { duplicateKey } from "./search";
import { validateImagePixels } from "./images";
export async function createBackup(): Promise<Backup> {
  return db.transaction("r", db.tables, async () =>
    backupSchema.parse({
      format: "chapterlet-backup",
      backupVersion: 1,
      exportedAt: new Date().toISOString(),
      books: await db.books.toArray(),
      annotations: await db.annotations.toArray(),
      progress: await db.progress.toArray(),
      preferences: (await db.preferences.get("reader")) ?? null,
    }),
  );
}
/** Merge preserves every existing record and remaps the entire incoming graph on any collision. */
export async function restoreBackup(input: Backup, mode: "merge" | "replace") {
  const data = backupSchema.parse(input);
  for (const book of data.books)
    if (book.coverImageDataUrl)
      await validateImagePixels(book.coverImageDataUrl);
  await db.transaction("rw", db.tables, async () => {
    if (mode === "replace") {
      for (const table of db.tables) await table.clear();
    }
    const existing = await db.books.toArray();
    const used = new Set(
      existing.flatMap((b) => [
        b.id,
        ...b.chapters.flatMap((c) => [c.id, ...c.paragraphs.map((p) => p.id)]),
      ]),
    );
    (await db.annotations.toArray()).forEach((a) => used.add(a.id));
    const mapping = new Map<string, string>();
    const reserve = (id: string) => {
      let next = id;
      while (used.has(next)) next = crypto.randomUUID();
      used.add(next);
      mapping.set(id, next);
    };
    for (const b of data.books) {
      reserve(b.id);
      for (const c of b.chapters) {
        reserve(c.id);
        c.paragraphs.forEach((p) => reserve(p.id));
      }
    }
    data.annotations.forEach((a) => reserve(a.id));
    const map = (id: string) => mapping.get(id) ?? id;
    await db.books.bulkAdd(
      data.books.map((b) => ({
        ...b,
        id: map(b.id),
        duplicateKey: duplicateKey(b.title, b.author),
        chapters: b.chapters.map((c) => ({
          ...c,
          id: map(c.id),
          paragraphs: c.paragraphs.map((p) => ({ ...p, id: map(p.id) })),
        })),
      })),
    );
    await db.annotations.bulkAdd(
      data.annotations.map((a) => ({
        ...a,
        id: map(a.id),
        bookId: map(a.bookId),
        chapterId: map(a.chapterId),
        segments: a.segments.map((s) => ({
          ...s,
          paragraphId: map(s.paragraphId),
        })),
      })),
    );
    await db.progress.bulkAdd(
      data.progress.map((p) => ({
        ...p,
        bookId: map(p.bookId),
        chapterId: map(p.chapterId),
        paragraphId: map(p.paragraphId),
      })),
    );
    if (
      data.preferences &&
      (mode === "replace" || !(await db.preferences.get("reader")))
    )
      await db.preferences.put(data.preferences);
  });
}
