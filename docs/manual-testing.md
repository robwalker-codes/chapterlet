# Manual device checklist

Automated browser results and emulated touch viewports do not establish physical iPhone/iPad or installed-PWA behaviour. Run this checklist on real devices before a public release. Record browser/OS versions and results.

| Environment                                           | Tested manually in this build session? |
| ----------------------------------------------------- | -------------------------------------- |
| iPhone Safari, 320–430 px, portrait/landscape         | No                                     |
| iOS Home Screen standalone PWA                        | No                                     |
| Android Chrome, native selection handles              | No                                     |
| Installed Android PWA                                 | No                                     |
| iPad Safari, portrait/landscape and Split View        | No                                     |
| Desktop Chrome / Edge with keyboard and screen reader | No                                     |
| Desktop Firefox                                       | No                                     |
| Desktop Safari                                        | No                                     |

## Fresh library and import

- Open a fresh origin/profile. Confirm no sample book is installed.
- Download the original example from Help. Import through the file picker, then paste the same JSON. Verify preview and duplicate choice.
- Try malformed JSON, future schema versions, empty chapters, unsafe link schemes, invalid images, and oversized files. Confirm errors are specific and the current library stays intact.
- Change a cover using a local JPEG/PNG/WebP and verify it offline. Try an invalid/oversized cover.

## Reading and annotations

- Open every chapter in order. Read at 200% browser zoom and with larger OS text.
- Use native selection handles on a word, a bold phrase, and a passage spanning adjacent paragraphs. Highlight, bookmark, and add notes without losing selection unexpectedly.
- Create overlapping highlights. Delete one and confirm the other remains.
- Change font, font size, line spacing, and theme. Rotate the device. Verify the approximate paragraph position and highlight placement.
- Leave and reopen the app. Confirm the last chapter, position, progress, notes, and preferences.
- Filter notebook items by book/type/date. Edit and delete notes. Open a saved passage.
- Close an edited but unsaved note and confirm the discard warning. Check modal focus, Escape, and keyboard navigation.

## Offline, install, and updates

- Visit online and wait for cache readiness. Install through the browser or iOS Share menu.
- Enable airplane mode, close/reopen the installed app, and reload.
- Read, search, annotate, change preferences, import a local file, and export a backup offline. Reopen and verify persistence.
- Deploy a changed static build, reconnect, and revisit. Confirm the update waits for a choice and does not interrupt note entry.
- Confirm safe-area padding around the notch and home indicator in both orientations.

## Data recovery

- Export a backup containing two books, a custom cover, all annotation kinds, multiline notes, and reading preferences.
- Restore into a clean profile and compare everything, including IDs and passage navigation.
- Merge the same backup twice. Confirm both incoming copies and their own annotation relationships survive.
- Cancel replacement and clear-data dialogs. Confirm no changes. Then confirm replacement and verify the result.
- Try malformed backups with missing IDs/references. Confirm the original library remains intact.
- Test unavailable/private browsing storage and denied persistence requests. Confirm no false saved/success state.

## Accessibility and performance

- Check keyboard tab order, visible focus, button labels, and headings with VoiceOver/NVDA/TalkBack.
- Confirm no horizontal page scrolling at 320 px; check 768, 1024, and 1280+ px layouts.
- Enable reduced motion and system dark mode. Verify initial defaults and explicit override persistence.
- Inspect network traffic: only origin static resources/update checks, unless an external link is explicitly opened.
- Test a representative larger personal library and storage quota exhaustion with backups available.
