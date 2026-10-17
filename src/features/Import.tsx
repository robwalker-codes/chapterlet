import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  FileJson,
  Copy,
  Download,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { PageHeading, Cover, useNotice } from "../components/UI";
import {
  parseBook,
  errorMessage,
  MAX_BOOK_BYTES,
  publicJsonSchema,
  aiPrompt,
  type PortableBook,
} from "../schemas/book";
import { importBook, readFile, downloadJson } from "../services/repository";
import { duplicateKey, readingMinutes } from "../services/search";
import { useLibrary } from "../hooks/data";
import example from "../../public/examples/a-small-art-of-attention.json";
export default function Import() {
  const [text, setText] = useState(""),
    [preview, setPreview] = useState<PortableBook | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [duplicate, setDuplicate] = useState(false);
  const books = useLibrary(),
    navigate = useNavigate(),
    notice = useNotice();
  const inspect = (value: string) => {
    try {
      setPreview(parseBook(value));
      setError("");
      setDuplicate(false);
    } catch (e) {
      setError(errorMessage(e));
      setPreview(null);
    }
  };
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notice("Copied to clipboard.");
    } catch {
      setError(
        "Clipboard unavailable. Select and copy the text below, or download the template.",
      );
    }
  };
  return (
    <main className="page narrow">
      <PageHeading
        eyebrow="BRING SOMETHING WORTH READING"
        title="A new addition"
      >
        Your next chapter starts with a simple JSON file.
      </PageHeading>
      <div className="import-grid">
        <section>
          <label className="upload-zone">
            <Upload size={28} />
            <strong>Choose a book file</strong>
            <span>JSON · up to 20 MB · stays on your device</span>
            <input
              type="file"
              accept=".json,application/json"
              aria-label="Choose book JSON"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f)
                  try {
                    const value = await readFile(f, MAX_BOOK_BYTES);
                    setText(value);
                    inspect(value);
                  } catch (err) {
                    setError(errorMessage(err));
                  }
              }}
            />
          </label>
          <div className="or-divider">or paste your JSON</div>
          <label className="sr-only" htmlFor="book-json">
            Book JSON
          </label>
          <textarea
            id="book-json"
            className="code-input"
            placeholder={
              '{\n  "schemaVersion": 1,\n  "title": "Your next good read",\n  …\n}'
            }
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPreview(null);
            }}
            spellCheck={false}
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary full"
            disabled={!text.trim()}
            onClick={() => inspect(text)}
          >
            Preview book <ArrowRight size={17} />
          </button>
          {preview && (
            <section className="import-preview">
              <div className="preview-heading">
                <Cover small book={preview} />
                <div>
                  <p className="eyebrow">READY FOR YOUR SHELF</p>
                  <h2>{preview.title}</h2>
                  <p>{preview.author}</p>
                  <small>
                    {preview.chapters.length} chapters ·{" "}
                    {readingMinutes({
                      ...preview,
                      chapters: preview.chapters.map((c) => ({
                        ...c,
                        id: "",
                        paragraphs: c.paragraphs.map((text) => ({
                          id: "",
                          text,
                        })),
                      })),
                    })}{" "}
                    min read
                  </small>
                </div>
              </div>
              <p>{preview.description}</p>
              <ol>
                {preview.chapters.map((c, i) => (
                  <li key={i}>{c.title}</li>
                ))}
              </ol>
              {books.some(
                (b) =>
                  b.duplicateKey ===
                  duplicateKey(preview.title, preview.author),
              ) && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={duplicate}
                    onChange={(e) => setDuplicate(e.target.checked)}
                  />
                  This title and author already exist. Keep another copy.
                </label>
              )}
              <div className="actions">
                <button onClick={() => setPreview(null)}>Cancel</button>
                <button
                  className="primary"
                  disabled={
                    busy ||
                    (books.some(
                      (b) =>
                        b.duplicateKey ===
                        duplicateKey(preview.title, preview.author),
                    ) &&
                      !duplicate)
                  }
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const b = await importBook(preview, duplicate);
                      notice("Book added to your library.");
                      navigate(`/book/${b.id}`);
                    } catch (e) {
                      setError(errorMessage(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? "Adding…" : "Add to library"}
                </button>
              </div>
            </section>
          )}
        </section>
        <aside className="ai-guide">
          <Sparkles size={24} />
          <h2>Create a book with AI</h2>
          <p>
            Turn your own material into a little book. Use our prompt in ChatGPT
            or another AI tool, then bring the JSON back here.
          </p>
          <ol className="steps">
            <li>Copy the prompt below.</li>
            <li>Add your source material in your AI tool.</li>
            <li>Paste the resulting JSON into Chapterlet.</li>
          </ol>
          <button onClick={() => copy(aiPrompt)}>
            <Copy size={16} /> Copy AI generation prompt
          </button>
          <button
            onClick={() => copy(JSON.stringify(publicJsonSchema, null, 2))}
          >
            <FileJson size={16} /> Copy schema
          </button>
          <button
            onClick={() => downloadJson(example, "chapterlet-template.json")}
          >
            <Download size={16} /> Download JSON template
          </button>
          <small>
            Chapterlet never connects to an AI service or sends your books
            anywhere.
          </small>
          <details>
            <summary>See the format & example</summary>
            <pre>{JSON.stringify(example, null, 2)}</pre>
          </details>
          <details>
            <summary>Read the generation prompt</summary>
            <pre>{aiPrompt}</pre>
          </details>
        </aside>
      </div>
    </main>
  );
}
