import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  List,
  Bookmark,
  Highlighter,
  StickyNote,
  Type,
  X,
} from "lucide-react";
import { usePreferences, useAnnotations } from "../hooks/data";
import { useLiveQuery } from "dexie-react-hooks";
import { db, defaultPreferences } from "../db/database";
import type { Preferences as ReaderPreferences } from "../models/types";
import type { Annotation, Segment, Book, Chapter } from "../models/types";
import {
  captureSelection,
  readingPercent,
  resolvePosition,
  segmentFor,
} from "../services/anchors";
import { plainText } from "../services/markdown";
import {
  saveAnnotation,
  saveProgress,
  removeAnnotation,
} from "../services/repository";
import { InlineText } from "../components/InlineText";
import { Modal, useAction } from "../components/UI";
import { Preferences } from "../components/Preferences";
import { NoteEditor } from "../components/NoteEditor";
export default function Reader() {
  const { id, chapterId } = useParams();
  const data = useLiveQuery(
    async () =>
      id
        ? {
            book: await db.books.get(id),
            progress: await db.progress.get(id),
            preferences: await db.preferences.get("reader"),
          }
        : undefined,
    [id],
  );
  const book = data?.book,
    progress = data?.progress;
  if (!book)
    return (
      <main className="page">
        <p>Loading your book…</p>
        <Link to="/">Return to library</Link>
      </main>
    );
  const resolved = resolvePosition(book, progress),
    chapter = book.chapters.find((c) => c.id === chapterId) ?? resolved.chapter;
  return (
    <ReaderChapter
      key={`${book.id}-${chapter.id}`}
      book={book}
      chapter={chapter}
      initialPreferences={data?.preferences ?? defaultPreferences()}
      initialParagraph={
        progress?.chapterId === chapter.id ? resolved.paragraph.id : undefined
      }
    />
  );
}
function ReaderChapter({
  book,
  chapter,
  initialParagraph,
  initialPreferences,
}: {
  book: Book;
  chapter: Chapter;
  initialParagraph?: string;
  initialPreferences: ReaderPreferences;
}) {
  const prefs = usePreferences(initialPreferences),
    annotations = useAnnotations().filter(
      (a) => a.bookId === book.id && a.chapterId === chapter.id,
    ),
    act = useAction();
  const [params, setParams] = useSearchParams(),
    [pageReady, setPageReady] = useState(false),
    [endVisible, setEndVisible] = useState(false),
    [panel, setPanel] = useState<"contents" | "appearance" | null>(null),
    [selection, setSelection] = useState<Segment[]>([]),
    [note, setNote] = useState<Annotation | null>(null),
    [current, setCurrent] = useState(
      chapter.paragraphs.some((p) => p.id === params.get("p"))
        ? params.get("p")!
        : (initialParagraph ?? chapter.paragraphs[0].id),
    );
  const root = useRef<HTMLDivElement>(null),
    position = useRef(current),
    ready = useRef(false),
    atEnd = useRef(false),
    restoreOnEntry = useRef(Boolean(initialParagraph || params.get("p")));
  const index = book.chapters.findIndex((c) => c.id === chapter.id);
  const makeAnnotation = (
    kind: Annotation["kind"],
    segments: Segment[] = selection,
  ): Annotation => ({
    id: crypto.randomUUID(),
    bookId: book.id,
    chapterId: chapter.id,
    kind,
    segments,
    quote: segments.map((s) => s.exact).join("\n"),
    note: "",
    color: "yellow",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setSelection([]);
  };
  useEffect(() => {
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      const target = document.getElementById(`paragraph-${position.current}`);
      if (restoreOnEntry.current) target?.scrollIntoView({ block: "start" });
      else window.scrollTo(0, 0);
      ready.current = true;
      setPageReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const target = params.get("p");
    if (target && chapter.paragraphs.some((p) => p.id === target)) {
      position.current = target;
      document
        .getElementById(`paragraph-${target}`)
        ?.scrollIntoView({ block: "start" });
      const next = new URLSearchParams(params);
      next.delete("p");
      setParams(next, { replace: true });
    }
  }, [params, setParams, chapter.paragraphs]);
  useEffect(() => {
    const handler = () => {
      if (root.current) {
        const segments = captureSelection(root.current, chapter);
        setSelection(segments);
      }
    };
    const timerHandler = () => {
      window.setTimeout(handler, 100);
    };
    document.addEventListener("selectionchange", timerHandler);
    return () => document.removeEventListener("selectionchange", timerHandler);
  }, [chapter]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const persist = () => {
      void act(() =>
        saveProgress({
          bookId: book.id,
          chapterId: chapter.id,
          paragraphId: position.current,
          percent: readingPercent(
            book,
            chapter.id,
            atEnd.current ? chapter.paragraphs.at(-1)!.id : position.current,
          ),
          updatedAt: Date.now(),
        }),
      );
    };
    const scan = () => {
      if (!ready.current) return;
      const elements = [
        ...(root.current?.querySelectorAll<HTMLElement>("[data-paragraph]") ??
          []),
      ];
      const found = elements.find(
        (p) => p.getBoundingClientRect().bottom > 130,
      );
      if (found) {
        position.current = found.dataset.paragraph!;
        setCurrent(position.current);
      }
      atEnd.current =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 15;
      setEndVisible(atEnd.current);
      clearTimeout(timer);
      timer = setTimeout(persist, 400);
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("scroll", scan, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    timer = setTimeout(scan, 300);
    return () => {
      clearTimeout(timer);
      persist();
      window.removeEventListener("scroll", scan);
      document.removeEventListener("visibilitychange", visibility);
    };
    // The chapter is immutable; persistence tracks the current paragraph through its ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, chapter.id]);
  useEffect(() => {
    const restore = () =>
      document
        .getElementById(`paragraph-${position.current}`)
        ?.scrollIntoView({ block: "start" });
    if (ready.current) restore();
  }, [prefs.fontSize, prefs.font, prefs.lineHeight]);
  useEffect(() => {
    let width = window.innerWidth;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const restoreAfterLayout = () => {
      const anchor = position.current;
      ready.current = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        document
          .getElementById(`paragraph-${anchor}`)
          ?.scrollIntoView({ block: "start" });
        // Ignore the scroll event produced by restoration itself. A taller
        // viewport may clamp the target near the end of a short chapter.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            ready.current = true;
          }),
        );
      }, 150);
    };
    const resize = () => {
      if (window.innerWidth !== width) {
        width = window.innerWidth;
        restoreAfterLayout();
      }
    };
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", restoreAfterLayout);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", restoreAfterLayout);
    };
  }, []);
  const chapterBookmark = annotations.find(
    (a) => a.kind === "bookmark" && !a.segments.length,
  );
  return (
    <div className={`reader theme-${prefs.theme}`}>
      <header className="reader-header">
        <Link to={`/book/${book.id}`} aria-label="Back to book">
          <ArrowLeft size={20} />
        </Link>
        <Link className="reader-book-title" to={`/book/${book.id}`}>
          {book.title}
        </Link>
        <div>
          <button
            aria-label="Table of contents"
            onClick={() => setPanel("contents")}
          >
            <List size={21} />
          </button>
          <button
            aria-label="Reading appearance"
            onClick={() => setPanel("appearance")}
          >
            <Type size={21} />
          </button>
          <button
            aria-label={
              chapterBookmark ? "Remove chapter bookmark" : "Bookmark chapter"
            }
            aria-pressed={!!chapterBookmark}
            onClick={() =>
              act(
                () =>
                  chapterBookmark
                    ? removeAnnotation(chapterBookmark.id)
                    : saveAnnotation(makeAnnotation("bookmark", [])),
                chapterBookmark ? "Bookmark removed." : "Chapter bookmarked.",
              )
            }
          >
            <Bookmark
              size={20}
              fill={chapterBookmark ? "currentColor" : "none"}
            />
          </button>
        </div>
      </header>
      <main
        className={`reading-column font-${prefs.font}`}
        aria-busy={!pageReady}
        style={{
          visibility: pageReady ? "visible" : "hidden",
          fontSize: `${prefs.fontSize / 16}rem`,
          lineHeight: prefs.lineHeight,
        }}
      >
        <p className="eyebrow">
          CHAPTER {String(index + 1).padStart(2, "0")} /{" "}
          {String(book.chapters.length).padStart(2, "0")}
        </p>
        <h1>{chapter.title}</h1>
        <div className="chapter-divider" />
        <div ref={root} className="paragraphs">
          {chapter.paragraphs.map((p) => (
            <p id={`paragraph-${p.id}`} data-paragraph={p.id} key={p.id}>
              <InlineText
                text={p.text}
                segments={annotations
                  .filter((a) => a.kind === "highlight" || a.kind === "note")
                  .flatMap((a) =>
                    a.segments.filter((s) => s.paragraphId === p.id),
                  )}
              />
            </p>
          ))}
        </div>
        <div className="chapter-notes">
          <button onClick={() => setNote(makeAnnotation("note", []))}>
            <StickyNote size={17} /> Add a chapter note
          </button>
          <button
            onClick={() => {
              const p =
                chapter.paragraphs.find((p) => p.id === position.current) ??
                chapter.paragraphs[0];
              const text = plainText(p.text);
              void act(
                () =>
                  saveAnnotation(
                    makeAnnotation("bookmark", [
                      segmentFor(p.id, text, 0, text.length),
                    ]),
                  ),
                "Reading position bookmarked.",
              );
            }}
          >
            <Bookmark size={17} /> Save reading position
          </button>
        </div>
        {annotations
          .filter((a) => a.note)
          .map((a) => (
            <button
              className="reader-note"
              key={a.id}
              onClick={() => setNote(a)}
            >
              <StickyNote size={16} />
              <span>{a.note}</span>
            </button>
          ))}
        <nav className="chapter-navigation" aria-label="Chapters">
          {index > 0 ? (
            <Link to={`/read/${book.id}/${book.chapters[index - 1].id}`}>
              <ArrowLeft size={18} />
              <span>
                <small>PREVIOUS CHAPTER</small>
                {book.chapters[index - 1].title}
              </span>
            </Link>
          ) : (
            <Link to={`/book/${book.id}`}>
              <ArrowLeft size={18} /> Book details
            </Link>
          )}
          {index < book.chapters.length - 1 ? (
            <Link to={`/read/${book.id}/${book.chapters[index + 1].id}`}>
              <span>
                <small>NEXT CHAPTER</small>
                {book.chapters[index + 1].title}
              </span>
              <ArrowRight size={18} />
            </Link>
          ) : (
            <Link to="/">
              Back to your library <ArrowRight size={18} />
            </Link>
          )}
        </nav>
      </main>
      <footer className="reader-footer">
        <span>
          {index + 1} of {book.chapters.length} chapters
        </span>
        <progress
          value={readingPercent(
            book,
            chapter.id,
            endVisible ? chapter.paragraphs.at(-1)!.id : current,
          )}
          max={100}
        />
        <span>
          {readingPercent(
            book,
            chapter.id,
            endVisible ? chapter.paragraphs.at(-1)!.id : current,
          )}
          %
        </span>
        <Link to={`/notebook?book=${book.id}`}>Notebook</Link>
      </footer>
      {selection.length > 0 && (
        <div
          className="selection-toolbar"
          aria-label="Selected text actions"
          onPointerDown={(e) => e.preventDefault()}
        >
          <span className="selection-excerpt">
            {selection
              .map((s) => s.exact)
              .join(" ")
              .slice(0, 50)}
          </span>
          <button
            onClick={() =>
              act(async () => {
                await saveAnnotation(makeAnnotation("highlight"));
                clearSelection();
              }, "Highlight saved.")
            }
          >
            <Highlighter size={17} /> Highlight
          </button>
          <button
            onClick={() =>
              act(async () => {
                await saveAnnotation(makeAnnotation("bookmark"));
                clearSelection();
              }, "Passage bookmarked.")
            }
          >
            <Bookmark size={17} /> Bookmark
          </button>
          <button
            onClick={() => {
              setNote(makeAnnotation("note"));
              clearSelection();
            }}
          >
            <StickyNote size={17} /> Add note
          </button>
          <button
            aria-label="Dismiss selection actions"
            onClick={clearSelection}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {panel && (
        <Modal
          title={
            panel === "contents"
              ? "Inside this book"
              : "Make yourself comfortable"
          }
          onClose={() => setPanel(null)}
        >
          {panel === "contents" ? (
            <ol className="reader-toc">
              {book.chapters.map((c, i) => (
                <li key={c.id}>
                  <Link
                    aria-current={c.id === chapter.id ? "page" : undefined}
                    to={`/read/${book.id}/${c.id}`}
                    onClick={() => setPanel(null)}
                  >
                    {i + 1}. {c.title}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <Preferences />
          )}
        </Modal>
      )}
      {note && <NoteEditor annotation={note} onClose={() => setNote(null)} />}
    </div>
  );
}
