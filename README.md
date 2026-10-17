# Chapterlet

A quiet place for small books and big ideas. Chapterlet is a local-first reading library for short books, literary abridgements, summaries, and personal notes. Import a JSON book, settle into a chapter, and keep the passages that matter.

**No accounts. No backend. No analytics. No AI connection.** Your books and annotations stay in IndexedDB in your browser. After the production application is cached, all essential reading, search, annotation, import, and backup features work offline.

A new library is empty. The original example book is available to download from Import and Help; it is never installed automatically.

## Start locally

Use Node.js 22.18+ (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

Open the URL Vite prints. Development intentionally does not register a service worker. To test the real offline application:

```sh
npm run build
npm run preview
```

Open `http://localhost:4173`, wait for “Ready for offline reading”, import a book, then switch offline and reload. Service workers require HTTPS in production; localhost is an allowed development exception.

## What you can do

- Import a local JSON file or paste JSON, validate it, preview chapters, and explicitly retain duplicates.
- Browse a book-shaped grid or compact list; sort by title, author, added date, or recent reading. Search titles, authors, tags, and full chapter text locally.
- Read in a constrained column with Lora or DM Sans, light/dark/sepia pages, adjustable size and line spacing, chapter navigation, and paragraph-based continuity.
- Save chapter, paragraph, or selected-passage bookmarks. Select across paragraphs to highlight or attach a plain-text note. Highlights can overlap.
- Revisit highlights, bookmarks, and notes in a notebook with book/type/date filters. Edit notes, remove saved items, and return to their context.
- Add local PNG, JPEG, or WebP covers, export portable books, and delete books together with their dependent data.
- Export self-contained backups and restore with merge or explicitly confirmed replacement.
- Install as a PWA where supported, read offline, request persistent storage, and choose when to apply an application update.

## Architecture

React + strict TypeScript + Vite render the application. Hash routing works on GitHub Pages without rewrites. Dexie manages IndexedDB and reactive queries. Zod owns the portable import and backup contracts. Workbox, via `vite-plugin-pwa`, precaches the static application. All fonts, icons, and examples are bundled.

```text
src/app          routing, storage error boundary, update notification
src/components   covers, modal, note editor, inline text, preferences
src/features     library, import, details, reader, notebook, settings, help
src/db           typed Dexie tables and v1 → v2 migration
src/models       internal persistence types
src/schemas      public book, backup, and preference validation
src/services     repository, import/export, backups, text anchors, search
src/hooks        reactive data queries
src/styles       responsive design tokens and application styles
src/test         domain, rendering, migration, and persistence tests
e2e              production browser and offline workflows
public           real PWA icons and an original example book
docs             formats, architecture, annotation strategy, PWA guide
```

See [architecture](docs/architecture.md), [annotations](docs/annotations.md), and [PWA mechanics](docs/pwa.md).

## JSON books and AI assistance

The [book-format guide](docs/book-format.md) describes the version 1 contract. The [example](public/examples/a-small-art-of-attention.json) is original writing licensed with this repository. Book files may be up to 20 MB; embedded covers up to 3 MB.

```json
{
  "schemaVersion": 1,
  "title": "A Small Beginning",
  "author": "Your Name",
  "chapters": [
    {
      "title": "First Thoughts",
      "paragraphs": ["A paragraph with an **important idea**."]
    }
  ]
}
```

The Import screen offers a template, schema, and complete prompt to copy into an external LLM. You supply source material you have the right to use. Chapterlet itself never calls an AI API. The [prompt asset](docs/ai-generation-prompt.txt) and [JSON Schema](docs/book.schema.json) are generated from the same definitions used by the importer:

```sh
npm run docs:generate
```

Single-book exports contain content and metadata, including a cover, but **no personal annotations or reading history**. Internal UUIDs are generated during import and remain stable in local storage and full backups.

## Backup and transfer

Use **Settings → Export library backup** regularly. Save the downloaded file outside browser storage. It contains your entire annotated library and is private personal data. Transfer that file using your own file system to another device, then choose **Restore library backup**.

Restore previews counts before writing. Merge preserves existing records and remaps conflicting incoming identifiers throughout the incoming graph, retaining both copies. Existing preferences win during merge. Replace erases existing data only after confirmation and commits atomically. See [backup format](docs/backup-format.md).

There is no cloud synchronisation. Different devices, browsers, profiles, and origins have separate libraries. Deleting browser data, private-browsing cleanup, storage eviction, or some PWA uninstall flows can delete your library. Storage persistence is a browser-controlled mitigation, not a guarantee or substitute for backups.

## Verification

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:subpath
```

Browser tests run against the **production preview**, not the development server. A separate subpath smoke test builds and serves `/chapterlet/` and verifies scoped offline reading and persistence. The main suite exercises desktop and mobile Chromium, selection and persistence, preferences, duplicate imports, backup export/restore, deletion, local text search, network isolation, and an offline reload after service-worker readiness. Automated axe checks cover the main screens and all reader themes. Where `/usr/bin/chromium` exists it is used automatically; otherwise Playwright uses its downloaded browser. Override with `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if needed.

For the additional browser engines:

```sh
npx playwright install --with-deps chromium firefox webkit
FULL_BROWSERS=1 npm run test:e2e
```

Unit/integration tests use fake IndexedDB. They cover schema errors and versions, Unicode round trips, Markdown safety, duplicate normalisation, local search, UTF-16 offsets, multi-paragraph selection, re-anchoring, overlapping rendering, reading-position mapping, transactional data relationships, restore validation, and the v1 → v2 migration.

See the [verification report](docs/verification.md) for checks actually completed and [manual testing](docs/manual-testing.md) for physical iPhone, iPad, Android, and installed-PWA checks. Browser emulation is not proof of native mobile selection handles or installation behaviour.

### Screenshots

`npm run test:e2e` captures empty and populated library screenshots for each viewport under `test-results/`. Open `playwright-report/index.html` to inspect failures and traces. Screenshots use only the original example; do not commit personal reading data.

## Static hosting and GitHub Pages

`npm run build` produces only static files in `dist/`. Upload that directory to an HTTPS static host. No server process, rewrite rules, environment secrets, or database are needed. Route URLs use `/#/…`.

For a repository subpath:

```sh
BASE_PATH=/chapterlet/ npm run build
```

Keep the leading and trailing slash. Vite assets, manifest scope/start URL, and service-worker paths follow this setting. For root hosting, omit `BASE_PATH`. Use one Chapterlet build per scope; avoid overlapping service workers from unrelated applications.

The optional **Deploy Chapterlet to GitHub Pages** workflow is manually dispatched. In repository Settings → Pages, select **GitHub Actions**, then run the workflow from the intended branch. `configure-pages` supplies the correct path for repository, user-site, or custom-domain hosting. The separate CI workflow runs checks and browser tests on pull requests and main/master pushes. No personal domain or username is hard-coded.

Serve `index.html`, `sw.js`, and `manifest.webmanifest` with revalidation rather than long-lived immutable caching. Hashed assets may use long-lived cache headers. See [PWA documentation](docs/pwa.md) for update behaviour and CSP advice.

## Browser support and limitations

Modern Chromium, Firefox, and Safari with IndexedDB, ES2022, and service workers are the target. PWA installation is browser-specific; Firefox desktop still reads offline in a normal tab. iOS/iPadOS users generally add through Safari’s Share menu. Standalone and browser storage behaviour can differ by OS version.

- Continuous scroll only; there is no paginated ebook layout, EPUB/PDF parser, or content editor.
- The Markdown grammar is intentionally small: bold, italic, inline code, and safe absolute HTTP(S)/mailto links. It is not full CommonMark. Raw HTML and unsupported syntax are literal text.
- Offsets use UTF-16 code units in the rendered text. Paragraph anchors are approximate reading positions, not exact line coordinates. Overlapping highlights render as a union while remaining separately removable.
- Fonts bundle Latin characters; other writing systems use system fallbacks.
- Search is a bounded in-memory scan suited to personal short-book libraries, with at most 100 passage results. Huge libraries are outside the target.
- JSON backups are unencrypted and limited to 100 MB. Merge intentionally retains duplicate copies rather than guessing which changed record is authoritative.
- Clipboard permissions, installation prompts, persistent-storage grants, and local file pickers vary by browser.
- Local storage is not protected from another person with access to the same unlocked browser profile. There is no account or password layer.

## Privacy and security

No runtime analytics, tracking, authentication, telemetry, remote fonts, server storage, or background sync. Ordinary application traffic is static asset loading and service-worker update checks. External links open only when deliberately selected.

Imported structures are validated before transactional writes; unknown fields and future versions are rejected. React renders text without `dangerouslySetInnerHTML`. Link protocols are allowlisted; SVG and remote image covers are rejected. Image signatures, successful image decoding, dimensions (40 MP / 16,000 px per side), and file limits are checked. The default CSP restricts scripts, fonts, images, connections, and forms to the application origin with data/blob images allowed. An HTTPS host can add response-header `frame-ancestors 'none'` and `X-Content-Type-Options: nosniff`.

## Contributing and licence

Run the checks above, keep schemas and generated docs aligned, and include meaningful tests for data or annotation changes. Do not add dependencies on remote services or silently seed a library.

Application source, original icons, and original example text: [MIT](LICENSE). Bundled Lora and DM Sans fonts retain their SIL Open Font License terms; see [third-party notices](docs/third-party-notices.md). Other dependencies retain their own licences.
