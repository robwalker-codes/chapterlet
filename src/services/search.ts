import type { Book } from "../models/types";
import { plainText } from "./markdown";
export const normalise = (s: string) =>
  s.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
export const duplicateKey = (title: string, author: string) =>
  JSON.stringify([normalise(title), normalise(author)]);
export function searchBooks(books: Book[], query: string) {
  const q = normalise(query);
  if (!q) return [];
  return books
    .flatMap((book) =>
      book.chapters.flatMap((chapter) =>
        chapter.paragraphs.flatMap((p) => {
          const text = plainText(p.text),
            at = normalise(text).indexOf(q);
          return at < 0
            ? []
            : [
                {
                  book,
                  chapter,
                  paragraphId: p.id,
                  snippet: `${at > 60 ? "…" : ""}${text.slice(Math.max(0, at - 60), at + q.length + 100)}${at + q.length + 100 < text.length ? "…" : ""}`,
                },
              ];
        }),
      ),
    )
    .slice(0, 100);
}
export function readingMinutes(book: Pick<Book, "chapters">) {
  return Math.max(
    1,
    Math.ceil(
      book.chapters.reduce(
        (n, c) =>
          n +
          c.paragraphs.reduce(
            (m, p) => m + plainText(p.text).split(/\s+/).length,
            0,
          ),
        0,
      ) / 220,
    ),
  );
}
