# PWA mechanics

## Manifest and installation

Vite emits a manifest with Chapterlet’s name, description, standalone display, colours, start URL/scope, regular PNG icons at 192/512 px, and a 512 px maskable icon. An Apple touch icon is included. Original icons can be regenerated with `npm run icons:generate`.

A manifest tells supporting browsers how the installed app should appear; it does not itself make the app work offline. HTTPS and browser-specific installation criteria apply. Chromium may emit `beforeinstallprompt`; Settings exposes that prompt when available. Safari on iPhone/iPad generally uses Share → Add to Home Screen. Firefox desktop can read offline in a tab without offering the same installation UI. No installation is forced.

## Two kinds of browser storage

**Cache Storage** contains replaceable application assets: HTML, JS chunks, CSS, local fonts, icons, examples, and the manifest as emitted by the PWA integration. Workbox creates the precache from the production build. The navigation fallback serves the app shell within the service-worker scope.

**IndexedDB** contains the user’s books, metadata, embedded covers, progress, annotations, and preferences. It is managed by Dexie. A service-worker update does not clear or upload these tables. Imported books are never fetched or precached through HTTP.

Once the service worker installs, activates, and controls a successfully cached page, the shell can load without a network. All domain operations use IndexedDB and local file APIs, so reading, search, annotation, settings, import, and export remain available offline. Initial visits on a new device still require network access. A cleared cache may require another online visit; a cleared IndexedDB requires a backup restore.

## Updates

`registerType: "prompt"` leaves a newly installed service worker waiting. Chapterlet displays an update banner rather than reloading an active reader or note editor. The user explicitly accepts, after saving edits; the waiting worker activates and the page reloads. Workbox cleans old application caches. Database versions upgrade independently through Dexie.

Browsers check the service worker during subsequent page visits. Long-running tabs may not see a new version until revisited/reloaded. Do not cache `sw.js` or the shell indefinitely at the host. Hashed assets are safe for immutable caching.

## Scope and deployment

`BASE_PATH=/repository-name/` sets Vite assets, manifest start URL, scope, and service-worker placement consistently. Routes are fragments (`/#/book/...`), requiring no server rewrites. Root deployments use `/`. A changing origin or browser profile changes the storage context and does not transfer a library.

Serve from HTTPS. `localhost` is a secure-context exception for development. `npm run dev` intentionally has no service worker; test offline behaviour against `npm run build && npm run preview`.

## Privacy and CSP

No runtime APIs, remote fonts, telemetry, background sync, or push registration exist. A deliberately clicked external link is the only user-content-related external navigation. Backups are downloaded using Blob object URLs.

`index.html` supplies a CSP restricting script and font sources to self, images to self/data/blob, and network connections to self (plus `ws:` for Vite development). Inline styles are permitted for reader preferences and React styles; inline scripts and objects are not. Production hosts can tighten `connect-src` to `'self'`, add a response-header `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and an appropriate referrer policy. GitHub Pages does not support arbitrary response headers directly; the meta CSP still applies to supported directives.

## Browser caveats

Quota, persistence grants, tab termination, private browsing, installation, and storage sharing between Safari and Home Screen apps vary by browser and OS version. A storage persistence request does not guarantee survival when users clear data or uninstall. Native mobile selection menus cannot be fully reproduced through desktop emulation. Keep regular external backups and use the physical-device checklist.
