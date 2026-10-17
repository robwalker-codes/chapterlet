import { Link } from "react-router-dom";
import { Download, ArrowRight } from "lucide-react";
import { PageHeading } from "../components/UI";
import { Install } from "../components/Install";
import { downloadJson } from "../services/repository";
import example from "../../public/examples/a-small-art-of-attention.json";
export default function Help() {
  return (
    <main className="page prose">
      <PageHeading
        eyebrow="A SMALL GUIDE TO CHAPTERLET"
        title="Settle into a good book"
      >
        A quiet, private reading space. Here’s how to make it yours.
      </PageHeading>
      <section>
        <h2>Your library starts with you</h2>
        <p>
          Chapterlet opens with an empty shelf. Import short books, summaries,
          abridgements, and personal notes as JSON files. Everything is
          processed on this device. You don’t need an account.
        </p>
        <Link className="button primary" to="/import">
          Import a book <ArrowRight size={17} />
        </Link>
      </section>
      <section>
        <h2>A simple format for good ideas</h2>
        <p>
          Each book needs <code>schemaVersion: 1</code>, a title, an author, and
          at least one chapter. Every chapter needs a title and a non-empty
          array of paragraph strings. Optional fields are description, kind
          (summary, abridgement, or notes), language, tags, and an embedded
          coverImageDataUrl.
        </p>
        <p>
          Paragraphs support **bold**, *italic*, `inline code`, and
          [links](https://example.org). HTML stays literal text. Cover images
          must be PNG, JPEG, or WebP, up to 3 MB. Book files may be up to 20 MB.
        </p>
        <button
          onClick={() => downloadJson(example, "a-small-art-of-attention.json")}
        >
          <Download size={17} /> Download an original example book
        </button>
        <details>
          <summary>Read the complete example JSON</summary>
          <pre>{JSON.stringify(example, null, 2)}</pre>
        </details>
        <p>
          The import page includes a copyable JSON schema and AI generation
          prompt. Use the prompt in an external AI tool with material you have
          the right to use, then paste its JSON into Chapterlet. No AI service
          is connected to this app.
        </p>
      </section>
      <section>
        <h2>Read at your own pace</h2>
        <p>
          Choose a chapter, set a comfortable font and page colour, and start
          reading. Chapterlet remembers your approximate paragraph position.
          Select words or passages to highlight, bookmark, or add a note. Use
          the bookmark icon to save an entire chapter, or “Save reading
          position” to bookmark the current paragraph.
        </p>
        <p>
          Your notebook collects everything you save. Open an item to return to
          its original context; use “Add note” on a highlight to attach a
          thought. Notes accept multiple paragraphs of plain text.
        </p>
      </section>
      <section>
        <h2>Your device is your bookshelf</h2>
        <p>
          After an initial online visit and successful application caching, you
          can read, search, annotate, import local files, and export backups
          offline. The service worker keeps application files; IndexedDB keeps
          your library. The two serve different purposes.
        </p>
        <p>
          Nothing synchronises automatically between devices. Private-browsing
          sessions may remove data when closed, and clearing browser data or
          uninstalling a PWA may erase your library. A different browser,
          hostname, or browser profile has its own library.
        </p>
      </section>
      <section>
        <h2>Keep a copy of what matters</h2>
        <p>
          In Settings, choose “Export library backup” to save all books,
          annotations, progress, and preferences to one JSON file. Move it using
          your own file system, then restore on another device. Merge keeps
          existing content and retains incoming copies with new IDs where
          necessary. Replace requires confirmation.
        </p>
        <p>
          Exporting one book from its details page includes only its content. To
          keep your highlights and notes, use a full library backup. Backups
          contain your private reading data; store them thoughtfully.
        </p>
      </section>
      <section>
        <h2>Take Chapterlet with you</h2>
        <Install />
        <p>
          When an update is ready, Chapterlet offers an update button. Save open
          notes before accepting it. Mobile browsers differ in installation and
          selection behaviour; Chapterlet keeps native selection available.
        </p>
      </section>
    </main>
  );
}
