import { describe, it, expect } from "vitest";
import { bookSchema, parseBook, validImage, aiPrompt } from "../schemas/book";
import { inline, plainText, safeLink } from "../services/markdown";
import {
  segmentFor,
  reanchor,
  readingPercent,
  resolvePosition,
  captureSelection,
} from "../services/anchors";
import { makeBook, portableBook } from "../services/repository";
import { searchBooks, duplicateKey } from "../services/search";
import { backupSchema, parseBackup } from "../schemas/backup";
import example from "../../public/examples/a-small-art-of-attention.json";

describe("public contract", () => {
  it("accepts the original example and produces stable internal IDs", () => {
    const input = bookSchema.parse(example);
    const b = makeBook(input);
    expect(b.chapters).toHaveLength(3);
    expect(b.chapters[0].paragraphs[0].id).toMatch(/^[a-f0-9-]{36}$/);
    expect(portableBook(b)).toEqual(input);
  });
  it.each([
    { ...example, title: "" },
    { ...example, author: undefined },
    { ...example, chapters: [] },
    { ...example, chapters: [{ title: "One", paragraphs: [] }] },
    { ...example, chapters: [{ title: "One", paragraphs: ["   "] }] },
    { ...example, unknown: true },
  ])("rejects invalid fields", (data) =>
    expect(bookSchema.safeParse(data).success).toBe(false),
  );
  it("explains malformed JSON and future versions", () => {
    expect(() => parseBook("{oops")).toThrow("Malformed");
    expect(() =>
      parseBook(JSON.stringify({ ...example, schemaVersion: 2 })),
    ).toThrow("Unsupported schemaVersion");
  });
  it("preserves Unicode and multiline content on export", () => {
    const source = bookSchema.parse({
      ...example,
      title: "  Café — “read”  ",
      chapters: [
        {
          title: "Été",
          paragraphs: ["Crème brûlée 🌿\nSecond line. **Voilà!**"],
        },
      ],
    });
    expect(parseBook(JSON.stringify(portableBook(makeBook(source))))).toEqual(
      source,
    );
  });
  it("rejects remote, SVG, and false image signatures", () => {
    for (const data of [
      "https://example.com/a.png",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "data:image/png;base64,bm90IGFuIGltYWdl",
    ])
      expect(validImage(data)).toBe(false);
  });
  it("keeps generated AI instructions aligned with schema", () => {
    expect(aiPrompt).toContain('"schemaVersion"');
    expect(aiPrompt).toContain('"additionalProperties": false');
    expect(aiPrompt).toContain("no code fences");
  });
});
describe("safe inline text and search", () => {
  it("renders a defined plain-text representation", () => {
    expect(
      plainText(
        "An **important** and *quiet* `idea` with [a link](https://example.com)",
      ),
    ).toBe("An important and quiet idea with a link");
    expect(inline("**bold**")[0].kind).toBe("strong");
  });
  it("rejects unsafe URLs and leaves HTML inert", () => {
    expect(safeLink("javascript:alert(1)")).toBe(false);
    expect(safeLink("data:text/html,test")).toBe(false);
    expect(safeLink("https://example.org")).toBe(true);
    expect(plainText("<script>alert(1)</script>")).toBe(
      "<script>alert(1)</script>",
    );
    expect(plainText("[evil](javascript:alert)")).toContain("javascript:");
  });
  it("normalises whitespace, case, and compatibility characters for duplicates", () => {
    expect(duplicateKey("  A  BOOK ", "JANE")).toBe(
      duplicateKey("a book", "jane"),
    );
    expect(duplicateKey("Ａ", "Jane")).toBe(duplicateKey("A", "Jane"));
  });
  it("searches rendered chapter text and returns navigable context", () => {
    const book = makeBook(bookSchema.parse(example));
    const hits = searchBooks([book], "attention is a small");
    expect(hits).toHaveLength(1);
    expect(hits[0].chapter.id).toBe(book.chapters[0].id);
    expect(hits[0].snippet).not.toContain("**");
    expect(searchBooks([book], "not-in-this-book")).toEqual([]);
    expect(searchBooks([book], "")).toEqual([]);
  });
});
describe("paragraph anchoring", () => {
  it("uses UTF-16 offsets including emoji", () => {
    const s = segmentFor("p", "Hello 🌿 café", 6, 8);
    expect(s.exact).toBe("🌿");
    expect(reanchor(s, "Hello 🌿 café")).toEqual(s);
  });
  it("reanchors unique text after an insertion", () => {
    const s = segmentFor("p", "A quiet thought", 2, 7);
    expect(reanchor(s, "What a quiet thought")?.start).toBe(7);
  });
  it("uses context to resolve repeated text and rejects ambiguity", () => {
    const s = segmentFor("p", "One thought here", 4, 11);
    expect(reanchor(s, "Earlier thought. One thought here")?.start).toBe(21);
    expect(
      reanchor({ ...s, prefix: "", suffix: "" }, "thought and thought"),
    ).toBeNull();
    expect(reanchor(s, "Gone")).toBeNull();
  });
  it("maps missing reading positions to the first stable paragraph", () => {
    const b = makeBook(bookSchema.parse(example));
    expect(resolvePosition(b).paragraph.id).toBe(
      b.chapters[0].paragraphs[0].id,
    );
    const c = b.chapters.at(-1)!;
    expect(readingPercent(b, c.id, c.paragraphs.at(-1)!.id)).toBe(100);
    expect(readingPercent(b, "missing", "missing")).toBe(0);
  });
  it("captures selections across formatted nodes and adjacent paragraphs", () => {
    const b = makeBook(
      bookSchema.parse({
        schemaVersion: 1,
        title: "A",
        author: "B",
        chapters: [
          { title: "C", paragraphs: ["One **bright** idea", "Then another."] },
        ],
      }),
    );
    const c = b.chapters[0];
    const root = document.createElement("div");
    root.innerHTML = `<p data-paragraph="${c.paragraphs[0].id}">One <strong>bright</strong> idea</p><p data-paragraph="${c.paragraphs[1].id}">Then another.</p>`;
    document.body.append(root);
    const r = document.createRange();
    r.setStart(root.querySelector("strong")!.firstChild!, 0);
    r.setEnd(root.querySelectorAll("p")[1].firstChild!, 4);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(r);
    const segments = captureSelection(root, c);
    expect(segments.map((s) => s.exact)).toEqual(["bright idea", "Then"]);
    expect(segments[0].start).toBe(4);
    window.getSelection()!.removeAllRanges();
    root.remove();
  });
});
describe("backup validation", () => {
  const b = makeBook(bookSchema.parse(example));
  const base = {
    format: "chapterlet-backup",
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    books: [b],
    annotations: [],
    progress: [],
    preferences: null,
  };
  it("validates a self-contained backup", () =>
    expect(parseBackup(JSON.stringify(base)).books[0].id).toBe(b.id));
  it("rejects versions, duplicate IDs, and dangling relationships", () => {
    expect(backupSchema.safeParse({ ...base, backupVersion: 2 }).success).toBe(
      false,
    );
    expect(backupSchema.safeParse({ ...base, books: [b, b] }).success).toBe(
      false,
    );
    expect(
      backupSchema.safeParse({
        ...base,
        progress: [
          {
            bookId: b.id,
            chapterId: crypto.randomUUID(),
            paragraphId: crypto.randomUUID(),
            percent: 10,
            updatedAt: 1,
          },
        ],
      }).success,
    ).toBe(false);
  });
});
