# Full-library backup format, version 1

A UTF-8 JSON object with:

```json
{
  "format": "chapterlet-backup",
  "backupVersion": 1,
  "exportedAt": "2026-01-01T00:00:00.000Z",
  "books": [],
  "annotations": [],
  "progress": [],
  "preferences": null
}
```

Maximum size: 100 MB. The file is unencrypted and self-contained; it may contain private notes. Store it outside browser storage. No upload or account is involved.

## Entities

- `books`: public metadata plus `id`, `addedAt`, `duplicateKey`, and nested chapters/paragraphs with stable UUIDs. Paragraphs use `{ id, text }` internally rather than portable strings. Covers are embedded image data URLs.
- `annotations`: `id`, `bookId`, `chapterId`, `kind` (`highlight`, `bookmark`, `note`), `segments`, `quote`, `note`, `color: "yellow"`, `createdAt`, `updatedAt`. A note may be attached to a highlight/bookmark or be its own passage/chapter item. Times are Unix milliseconds.
- `segments`: `paragraphId`, `start`, `end`, `exact`, `prefix`, `suffix`, using the [UTF-16 convention](annotations.md).
- `progress`: one record per book, containing `bookId`, `chapterId`, `paragraphId`, `percent`, and `updatedAt`.
- `preferences`: `null` or the singleton `{ id: "reader", theme, font, fontSize, lineHeight, layout }`.

Zod rejects unknown fields, unsupported versions, invalid UUIDs, duplicate IDs, broken references, invalid offsets, invalid preference ranges, and invalid images. Images are also decoded before restore, outside the database transaction. Stale exact quotations with valid bounds can be retained for context-based recovery. Export takes a read transaction so all tables form one consistent snapshot.

## Restore semantics

Validation and a count preview happen before modifying storage. All table writes occur in one read/write transaction. A failure rolls back the replacement or merge.

**Replace:** clear all tables, restore original identifiers and all preferences. The UI requires explicit destructive confirmation. Failed validation leaves existing data untouched.

**Merge:** existing records never change. Build an incoming-ID map in fixed file traversal order. Any incoming book, chapter, paragraph, or annotation identifier already in use receives a fresh UUID. All incoming references are rewritten consistently before insertion. The decision rule is deterministic; generated replacement UUID values are intentionally random. Both conflicting copies and their annotations survive. Incoming preferences apply only if there are no existing saved preferences. Title/author duplicates are not deduplicated, since they may represent distinct editions with different annotations.

The `duplicateKey` is recalculated from title/author rather than trusted. Book order and chapter/paragraph order are preserved. Repeated merges intentionally create extra copies; restore into an empty library or use confirmed Replace when reproducing an exact backup is desired.

## Portability distinction

A portable single-book JSON is content only and contains no IDs. A full backup preserves the entire private reading state. These formats have separate version numbers and separate import paths. Uploading one to the other importer produces an error rather than guessing or dropping personal data.
