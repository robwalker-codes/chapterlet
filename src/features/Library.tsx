import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  ArrowUpRight,
  BookOpen,
  LockKeyhole,
  WifiOff,
} from "lucide-react";
import { useLibrary, useProgress, usePreferences } from "../hooks/data";
import { Cover, PageHeading, useAction } from "../components/UI";
import { normalise, searchBooks, readingMinutes } from "../services/search";
import { savePreferences } from "../services/repository";
export default function Library() {
  const books = useLibrary(),
    progress = useProgress(),
    prefs = usePreferences(),
    act = useAction();
  const [query, setQuery] = useState(""),
    [sort, setSort] = useState("recent"),
    [scope, setScope] = useState("books");
  const q = normalise(query);
  const filtered = books
    .filter(
      (b) =>
        !q ||
        normalise(
          `${b.title} ${b.author} ${(b.tags ?? []).join(" ")}`,
        ).includes(q),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "author"
          ? a.author.localeCompare(b.author)
          : sort === "added"
            ? b.addedAt - a.addedAt
            : (progress.find((p) => p.bookId === b.id)?.updatedAt ??
                b.addedAt) -
              (progress.find((p) => p.bookId === a.id)?.updatedAt ?? a.addedAt),
    );
  const results = scope === "text" ? searchBooks(books, query) : [];
  return (
    <main className="page">
      <PageHeading
        eyebrow="A LITTLE READING. A WORLD OF IDEAS."
        title="Your library"
        action={
          <Link className="button primary" to="/import">
            <Plus size={18} /> Import book
          </Link>
        }
      >
        {books.length
          ? `${books.length} ${books.length === 1 ? "book" : "books"}, always within reach.`
          : "Make room for your next good read."}
      </PageHeading>
      {!books.length ? (
        <>
          <section className="empty-library">
            <div className="book-illustration" aria-hidden="true">
              <div className="illustrated-book back">
                a new
                <br />
                perspective
              </div>
              <div className="illustrated-book front">
                <BookOpen />
                <span>
                  Small books.
                  <br />
                  Big ideas.
                </span>
                <i>YOUR CHAPTER STARTS HERE</i>
              </div>
              <div className="illustration-ground" />
            </div>
            <div className="empty-copy">
              <p className="eyebrow">A SHELF OF YOUR OWN</p>
              <h2>
                Good things come
                <br />
                in little chapters.
              </h2>
              <p>
                Collect the books, summaries, and ideas you want to spend time
                with. Bring your first book, and make this space yours.
              </p>
              <Link to="/import" className="button primary">
                <Plus size={18} /> Import your first book
              </Link>
              <Link className="text-link" to="/help">
                Get to know the book format <ArrowUpRight size={16} />
              </Link>
            </div>
          </section>
          <div className="quiet-features">
            <div>
              <LockKeyhole />
              <span>
                <strong>Yours, and only yours</strong>
                <small>Books and notes stay on this device.</small>
              </span>
            </div>
            <div>
              <WifiOff />
              <span>
                <strong>Take your reading offline</strong>
                <small>Once cached, no connection needed.</small>
              </span>
            </div>
            <div>
              <BookOpen />
              <span>
                <strong>A little more intentional</strong>
                <small>Read, highlight, and keep what matters.</small>
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="library-tools">
            <label className="search">
              <Search size={18} />
              <input
                aria-label="Search library"
                placeholder="Find a book, author, or idea…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Search in"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="books">Titles & authors</option>
              <option value="text">Inside books</option>
            </select>
            <select
              aria-label="Sort books"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">Recently read</option>
              <option value="added">Date added</option>
              <option value="title">Title A–Z</option>
              <option value="author">Author A–Z</option>
            </select>
            <div className="segmented">
              <button
                aria-label="Grid layout"
                aria-pressed={prefs.layout === "grid"}
                onClick={() => act(() => savePreferences({ layout: "grid" }))}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                aria-label="List layout"
                aria-pressed={prefs.layout === "list"}
                onClick={() => act(() => savePreferences({ layout: "list" }))}
              >
                <List size={18} />
              </button>
            </div>
          </div>
          {scope === "text" ? (
            <div className="search-results">
              {!query ? (
                <p className="empty-small">
                  Search for a word or phrase in your books.
                </p>
              ) : !results.length ? (
                <p className="empty-small">
                  No passages found. Try another phrase.
                </p>
              ) : (
                results.map((r) => (
                  <Link
                    key={r.paragraphId}
                    className="search-result"
                    to={`/read/${r.book.id}/${r.chapter.id}?p=${r.paragraphId}`}
                  >
                    <small>
                      {r.book.title} · {r.chapter.title}
                    </small>
                    <p>{r.snippet}</p>
                    <span className="text-link">
                      Read passage <ArrowUpRight size={15} />
                    </span>
                  </Link>
                ))
              )}
            </div>
          ) : (
            <div className={`book-collection ${prefs.layout}`}>
              {filtered.map((b) => {
                const p = progress.find((p) => p.bookId === b.id);
                return (
                  <article className="book-card" key={b.id}>
                    <Link className="book-main" to={`/book/${b.id}`}>
                      <Cover book={b} />
                      <div className="book-meta">
                        <span className="eyebrow">
                          {b.kind ?? "YOUR COLLECTION"}
                        </span>
                        <h2>{b.title}</h2>
                        <p>{b.author}</p>
                        <small>
                          {b.chapters.length} chapters · {readingMinutes(b)} min
                          read
                        </small>
                      </div>
                    </Link>
                    {p ? (
                      <Link className="book-progress" to={`/read/${b.id}`}>
                        <span>
                          Continue reading <ArrowUpRight size={14} />
                        </span>
                        <small>{p.percent}%</small>
                        <progress value={p.percent} max={100} />
                      </Link>
                    ) : (
                      <span className="unread">Ready when you are</span>
                    )}
                  </article>
                );
              })}
              {!filtered.length && (
                <p className="empty-small">No books match “{query}”.</p>
              )}
            </div>
          )}
        </>
      )}
      <footer className="page-footer">
        <span>Less scrolling. More turning pages.</span>
        <span>PRIVATE BY NATURE · LOCAL BY DESIGN</span>
      </footer>
    </main>
  );
}
