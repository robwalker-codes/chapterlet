# Text selection, anchors, and annotations

## One text convention

All offsets are zero-based **UTF-16 code units** in the rendered plain text of one paragraph, with an exclusive end. This matches JavaScript string slicing and DOM Range text lengths. Emoji may occupy two code units; they are not counted as one character for offset arithmetic. Inline Markdown markers are absent from the rendered text. HTML remains literal text, so it remains part of the offset stream.

The small inline parser produces a tree of safe text, emphasis, code, and links. `plainText()` flattens that same tree. The renderer and anchor services therefore agree about text even around nested formatting.

## Capture

Native browser selection remains enabled. A `selectionchange` listener captures a meaningful selection only when both endpoints are inside the chapter text. For each intersected paragraph, a DOM Range measures the start offset and selected length. A multi-paragraph selection becomes one logical annotation containing ordered paragraph segments.

Every segment stores `paragraphId`, `start`, `end`, `exact`, and up to 32 code units of `prefix` and `suffix`. The annotation stores book and chapter IDs, combined quotation, kind, plain-text note, colour, and timestamps. A chapter bookmark/note has no segments. “Save reading position” bookmarks the current paragraph; a passage bookmark uses the actual selection.

The action toolbar is placed above the lower edge of the screen. It leaves native handles and menus available; physical iOS and Android interaction still requires manual verification. Pointer-down on toolbar controls preserves the captured selection until the action is invoked.

## Rendering and overlap

Chapterlet uses a React-rendered fallback universally instead of depending on CSS Custom Highlight API availability. It splits text leaves at the boundaries of anchored segments and wraps covered spans in `<mark>`. It does not imperatively mutate React-managed DOM. Strong/emphasis/link/code wrappers remain intact, and the underlying text stream stays unchanged.

Overlapping highlights are supported deterministically: visible coverage is the union of all intervals, while each annotation retains its own ID. Removing one leaves any remaining overlapping coverage visible. This strategy is tested across formatted nodes and re-rendering.

## Re-anchoring

1. Try the saved offsets and verify exact text.
2. Search for exact text and disambiguate with prefix/suffix.
3. Accept a unique remaining match; never guess among ambiguous repeats.
4. If no safe match exists, preserve the saved quotation in Notebook, show an explanation, and link back to the chapter/paragraph context.

Content is immutable after import, so ordinary appearance changes do not require repair. The recovery path protects against imported backups with stale text or future migrations. No DOM node paths or pixels are persisted.

## Reading continuity and notes

The reader tracks an approximate paragraph near the top of the viewport, debounces progress writes by 400 ms, and flushes on leaving the chapter or hiding the page. Entry loads saved typography and waits for font readiness before revealing the page at its stable paragraph anchor. Completion progress is kept separate from the paragraph anchor so a taller viewport cannot overwrite the saved place merely by showing the end of a short chapter. Font size/family/spacing and rotation restore that anchor rather than an old pixel coordinate.

Notes are multi-paragraph plain text. The editor uses a native modal dialog with focus management. Closing a modified note or navigating back within the app asks before discarding; a browser unload handler protects unsaved changes where supported. Mobile operating systems can terminate tabs without sending unload events, so users should explicitly save before leaving the app. Saved notes are committed to IndexedDB before the editor closes. In Notebook, “Remove note” deletes an attached note while retaining its highlight or bookmark. Removing a standalone note deletes that note annotation.
