# Implementation verification

Verified on 17 October 2026 in Linux with Node.js 24.19.0. Tests used the original example book and synthetic fixtures, not personal reading data.

| Check                   | Result                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm run lint`          | Passed                                                                                                          |
| `npm run typecheck`     | Passed, including browser test sources                                                                          |
| `npm run test`          | 34 tests passed across four files                                                                               |
| `npm run build`         | Passed; static application, manifest, service worker, fonts, and icons generated                                |
| `npm run test:e2e`      | 20 tests passed across desktop Chromium and emulated Pixel 7 Chromium                                           |
| Final reader regression | Two targeted tests passed after adding attached-note removal, one per Chromium viewport                         |
| `npm run test:subpath`  | Passed under `/chapterlet/`, including scoped manifest, asset loading, offline reload, and bookmark persistence |
| Generated contracts     | JSON Schema and AI prompt checked against their generated definitions                                           |

The complete browser suite passed before the final attached-note removal improvement. The two subsequent targeted reader tests verify that removing an attached note preserves its highlight, alongside selection, bookmarking, preferences, reload, and reading-position persistence. Lint, type checking, and the production build also passed after this change.

## Coverage exercised

- Empty initial library, file and pasted imports, validation, duplicate handling, local search, and cascading deletion.
- Reading preferences, chapter navigation, saved paragraph position, viewport resizing, multi-paragraph selection, overlapping highlights, bookmarks, notes, and reload persistence.
- Safe Markdown rendering, UTF-16 anchors, schema validation, database migration, backup reference validation, and transactional persistence.
- Custom covers, image validation, portable book export, full backup export, and clean-profile restore.
- A real production service worker with offline reload, reading, annotations, import, and backup export.
- Unsaved-note navigation protection, keyboard dialog focus, 320 px layouts, and requests restricted to local application resources.
- Automated axe WCAG A/AA checks across the main screens and light, sepia, and dark reader themes. Automated checks do not establish full accessibility conformance.

## Remaining verification

Firefox and WebKit are configured in the test suite and CI but were not executed locally. Mobile Chromium tests use emulation; physical iPhone, iPad, and Android devices, native selection handles, installed Home Screen behavior, and assistive technologies still require the [manual checklist](manual-testing.md).

The production service-worker update flow is implemented but has not been verified through a deployed old-build-to-new-build update on physical devices. No live hosting deployment or remote repository push was performed. The GitHub Pages workflow is ready for manual dispatch after the repository is published and Pages is configured.

Screenshots captured during implementation review show the empty and populated library, desktop reader, and mobile notebook. They precede the final small attached-note removal control addition.
