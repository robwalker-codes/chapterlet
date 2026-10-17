import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bookmark,
  Highlighter,
  StickyNote,
  ArrowUpRight,
  Trash2,
  Pencil,
} from "lucide-react";
import { useAnnotations, useLibrary } from "../hooks/data";
import { PageHeading, Confirm } from "../components/UI";
import { NoteEditor } from "../components/NoteEditor";
import { removeAnnotation, saveAnnotation } from "../services/repository";
import { reanchor } from "../services/anchors";
import { plainText } from "../services/markdown";
import type { Annotation } from "../models/types";
export default function Notebook() {
  const annotations = useAnnotations(),
    books = useLibrary(),
    [params] = useSearchParams();
  const [bookId, setBookId] = useState(params.get("book") ?? ""),
    [kind, setKind] = useState(""),
    [order, setOrder] = useState("newest"),
    [edit, setEdit] = useState<Annotation | null>(null),
    [remove, setRemove] = useState<Annotation | null>(null),
    [removeNote, setRemoveNote] = useState<Annotation | null>(null);
  const filtered = annotations
    .filter(
      (a) =>
        (!bookId || a.bookId === bookId) &&
        (!kind || (kind === "note" ? !!a.note : a.kind === kind)),
    )
    .sort((a, b) =>
      order === "newest"
        ? b.createdAt - a.createdAt
        : a.createdAt - b.createdAt,
    );
  return (
    <main className="page narrow">
      <PageHeading eyebrow="KEEP WHAT STAYS WITH YOU" title="Your notebook">
        A home for the words you marked and the thoughts they sparked.
      </PageHeading>
      <div className="notebook-filters">
        <label>
          <span className="sr-only">Filter by book</span>
          <select value={bookId} onChange={(e) => setBookId(e.target.value)}>
            <option value="">Every book</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </label>
        <select
          aria-label="Annotation type"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="">All saved items</option>
          <option value="highlight">Highlights</option>
          <option value="bookmark">Bookmarks</option>
          <option value="note">Notes</option>
        </select>
        <select
          aria-label="Sort annotations"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      {!filtered.length ? (
        <div className="notebook-empty">
          <StickyNote size={38} />
          <h2>A thought begins with a pause.</h2>
          <p>
            Highlight a passage, save your place, or leave yourself a note while
            reading. You’ll find it here.
          </p>
          <Link className="button" to="/">
            Find your next chapter <ArrowUpRight size={17} />
          </Link>
        </div>
      ) : (
        <div className="annotations">
          {filtered.map((a) => {
            const b = books.find((b) => b.id === a.bookId),
              c = b?.chapters.find((c) => c.id === a.chapterId);
            const Icon =
              a.kind === "highlight"
                ? Highlighter
                : a.kind === "bookmark"
                  ? Bookmark
                  : StickyNote;
            const unmapped = a.segments.some((s) => {
              const p = c?.paragraphs.find((p) => p.id === s.paragraphId);
              return !p || !reanchor(s, plainText(p.text));
            });
            return (
              <article key={a.id} className="annotation">
                <div className="annotation-label">
                  <Icon size={16} />
                  <span>{a.kind}</span>
                  <time>
                    {new Date(a.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </div>
                <Link
                  className="annotation-context"
                  to={`/read/${a.bookId}/${a.chapterId}${a.segments[0] ? `?p=${a.segments[0].paragraphId}` : ""}`}
                >
                  {a.quote ? (
                    <blockquote>{a.quote}</blockquote>
                  ) : (
                    <h2>{c?.title ?? "Saved chapter"}</h2>
                  )}
                  <span className="muted">
                    {b?.title} · {c?.title} <ArrowUpRight size={15} />
                  </span>
                </Link>
                {a.note && <p className="saved-note">{a.note}</p>}
                {unmapped && (
                  <p className="muted">
                    The exact text could not be located. Your saved quotation is
                    preserved; open the chapter for context.
                  </p>
                )}
                <div className="annotation-actions">
                  <button onClick={() => setEdit(a)}>
                    <Pencil size={15} />
                    {a.note ? "Edit note" : "Add note"}
                  </button>
                  {a.note && a.kind !== "note" && (
                    <button
                      aria-label="Delete note"
                      onClick={() => setRemoveNote(a)}
                    >
                      <Trash2 size={15} /> Remove note
                    </button>
                  )}
                  <button
                    aria-label={`Delete ${a.kind}`}
                    onClick={() => setRemove(a)}
                  >
                    <Trash2 size={15} /> Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {edit && <NoteEditor annotation={edit} onClose={() => setEdit(null)} />}
      {removeNote && (
        <Confirm
          title="Remove this note?"
          danger
          onCancel={() => setRemoveNote(null)}
          onConfirm={async () => {
            await saveAnnotation({
              ...removeNote,
              note: "",
              updatedAt: Date.now(),
            });
            setRemoveNote(null);
          }}
        >
          The note will be deleted. Its {removeNote.kind} and saved passage will
          remain.
        </Confirm>
      )}
      {remove && (
        <Confirm
          title="Remove this saved item?"
          danger
          onCancel={() => setRemove(null)}
          onConfirm={async () => {
            await removeAnnotation(remove.id);
            setRemove(null);
          }}
        >
          This {remove.kind} and its attached note will be deleted. The book’s
          text will stay unchanged.
        </Confirm>
      )}
    </main>
  );
}
