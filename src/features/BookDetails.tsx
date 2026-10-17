import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  ImagePlus,
  Trash2,
} from "lucide-react";
import { useBook, useProgress } from "../hooks/data";
import { Cover, Confirm, useAction, useNotice } from "../components/UI";
import {
  deleteBook,
  portableBook,
  downloadJson,
  readImage,
  setCover,
} from "../services/repository";
import { readingMinutes } from "../services/search";
export default function BookDetails() {
  const { id } = useParams(),
    book = useBook(id),
    progress = useProgress().find((p) => p.bookId === id),
    navigate = useNavigate(),
    act = useAction(),
    notice = useNotice();
  const [confirm, setConfirm] = useState(false);
  if (!book)
    return (
      <main className="page">
        <p>Loading book… If it has been deleted, return to your library.</p>
        <Link to="/">Back to library</Link>
      </main>
    );
  return (
    <main className="page">
      <Link className="back-link" to="/">
        <ArrowLeft size={16} /> Your library
      </Link>
      <section className="book-details">
        <Cover book={book} />
        <div>
          <p className="eyebrow">{book.kind ?? "PERSONAL EDITION"}</p>
          <h1>{book.title}</h1>
          <p className="author">by {book.author}</p>
          <p className="description">{book.description}</p>
          <p className="muted">
            {book.chapters.length} chapters <span aria-hidden="true">·</span>{" "}
            {readingMinutes(book)} min read
            {book.language && ` · ${book.language}`}
          </p>
          <div className="tags">
            {book.tags?.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          {progress && (
            <div className="detail-progress">
              <span>
                {progress.percent === 100
                  ? "You’ve reached the final paragraph"
                  : `${progress.percent}% through your book`}
              </span>
              <progress value={progress.percent} max="100" />
            </div>
          )}
          <Link className="button primary" to={`/read/${book.id}`}>
            {progress ? "Continue reading" : "Start reading"}
            <ArrowRight size={18} />
          </Link>
          <div className="book-actions">
            <button
              onClick={() =>
                downloadJson(
                  portableBook(book),
                  `${book.title.replace(/[^a-z0-9]/gi, "-")}.json`,
                )
              }
            >
              <Download size={16} /> Export book
            </button>
            <label className="button">
              <ImagePlus size={16} /> Change cover
              <input
                className="sr-only"
                type="file"
                aria-label="Change cover"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f)
                    void act(
                      async () => setCover(book.id, await readImage(f)),
                      "Cover updated.",
                    );
                }}
              />
            </label>
            <button
              className="icon-button danger-text"
              aria-label="Delete book"
              onClick={() => setConfirm(true)}
            >
              <Trash2 size={17} />
            </button>
          </div>
          <small className="muted">
            Book exports contain content only. Save your notes with a library
            backup.
          </small>
        </div>
      </section>
      <section className="contents">
        <p className="eyebrow">ONE CHAPTER AT A TIME</p>
        <h2>Inside this book</h2>
        <ol>
          {book.chapters.map((c, i) => (
            <li key={c.id}>
              <Link to={`/read/${book.id}/${c.id}`}>
                <span className="chapter-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{c.title}</span>
                <ArrowRight size={18} />
              </Link>
            </li>
          ))}
        </ol>
      </section>
      {confirm && (
        <Confirm
          title="Remove this book?"
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={async () => {
            await deleteBook(book.id);
            notice("Book and its reading data removed.");
            navigate("/");
          }}
        >
          “{book.title}” and all of its highlights, notes, bookmarks, and
          reading progress will be deleted from this device. Export a backup
          first if you want to keep them.
        </Confirm>
      )}
    </main>
  );
}
