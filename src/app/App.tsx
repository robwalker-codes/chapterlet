import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createHashRouter,
  RouterProvider,
  NavLink,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import {
  BookOpen,
  Library as LibraryIcon,
  StickyNote,
  Settings as SettingsIcon,
  HelpCircle,
  WifiOff,
} from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { db } from "../db/database";
import { NoticeProvider } from "../components/UI";
const Library = lazy(() => import("../features/Library"));
const Import = lazy(() => import("../features/Import"));
const BookDetails = lazy(() => import("../features/BookDetails"));
const Reader = lazy(() => import("../features/Reader"));
const Notebook = lazy(() => import("../features/Notebook"));
const Settings = lazy(() => import("../features/Settings"));
const Help = lazy(() => import("../features/Help"));
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <main className="page prose">
        <h1>We couldn’t open your reading space.</h1>
        <p>{this.state.error}</p>
        <p>
          Allow browser storage, close other Chapterlet tabs, and reload. Avoid
          clearing browser data unless you have a backup.
        </p>
        <button onClick={() => location.reload()}>Reload Chapterlet</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Shell() {
  const location = useLocation(),
    reader = location.pathname.startsWith("/read/");
  const [offline, setOffline] = useState(!navigator.onLine),
    [storageError, setStorageError] = useState(""),
    [cacheError, setCacheError] = useState(false);
  const {
    needRefresh: [refresh, setRefresh],
    offlineReady: [cached],
    updateServiceWorker,
  } = useRegisterSW({ onRegisterError: () => setCacheError(true) });
  useEffect(() => {
    const on = () => setOffline(false),
      off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const blocked = () =>
      setStorageError(
        "Another Chapterlet tab is blocking a database upgrade. Close other tabs, then reload.",
      );
    db.on("blocked", blocked);
    void db
      .open()
      .catch(() =>
        setStorageError(
          "Browser storage is unavailable. Enable site storage or use a regular browser window, then reload. Nothing can be saved until storage is available.",
        ),
      );
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      db.on("blocked").unsubscribe(blocked);
    };
  }, []);
  useEffect(() => {
    if (!reader) window.scrollTo(0, 0);
    document.title = `${reader ? "Reading" : location.pathname === "/notebook" ? "Notebook" : location.pathname === "/settings" ? "Settings" : location.pathname === "/import" ? "Import" : "Your reading space"} · Chapterlet`;
  }, [location.pathname, reader]);
  return (
    <>
      {!reader && (
        <header className="app-header">
          <NavLink to="/" className="brand">
            <span className="brand-mark">
              <BookOpen size={23} />
            </span>
            chapterlet<span className="brand-dot">.</span>
          </NavLink>
          <nav aria-label="Main navigation">
            <NavLink to="/" end>
              <LibraryIcon size={18} />
              <span>Library</span>
            </NavLink>
            <NavLink to="/notebook">
              <StickyNote size={18} />
              <span>Notebook</span>
            </NavLink>
            <NavLink to="/settings">
              <SettingsIcon size={18} />
              <span>Settings</span>
            </NavLink>
          </nav>
          <NavLink
            to="/help"
            className="help-link"
            aria-label="Help & getting started"
          >
            <HelpCircle size={20} />
          </NavLink>
        </header>
      )}
      {storageError ? (
        <div role="alert" className="storage-error">
          {storageError}
        </div>
      ) : (
        <Suspense
          fallback={
            <main className="page">
              <p>Opening your reading space…</p>
            </main>
          }
        >
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/import" element={<Import />} />
            <Route path="/book/:id" element={<BookDetails />} />
            <Route path="/read/:id/:chapterId?" element={<Reader />} />
            <Route path="/notebook" element={<Notebook />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
            <Route
              path="*"
              element={
                <main className="page">
                  <h1>This page isn’t on the shelf.</h1>
                  <NavLink to="/">Return to your library</NavLink>
                </main>
              }
            />
          </Routes>
        </Suspense>
      )}
      {offline && (
        <div className="offline-badge">
          <WifiOff size={13} /> Offline · your library is here
        </div>
      )}
      {!offline && cached && !reader && (
        <div className="cache-badge">Ready for offline reading</div>
      )}
      {cacheError && (
        <div className="update-banner" role="status">
          Offline caching could not start. Reopen online in a browser with
          service workers enabled. Your saved library is still on this device.
          <button onClick={() => setCacheError(false)}>Dismiss</button>
        </div>
      )}
      {refresh && (
        <div className="update-banner" role="status">
          <span>A fresh edition of Chapterlet is ready.</span>
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Save any open notes first. Update and reload Chapterlet now?",
                )
              )
                void updateServiceWorker(true);
            }}
          >
            Update app
          </button>
          <button onClick={() => setRefresh(false)}>Later</button>
        </div>
      )}
    </>
  );
}
const router = createHashRouter([
  {
    path: "*",
    element: (
      <NoticeProvider>
        <Shell />
      </NoticeProvider>
    ),
    errorElement: (
      <main className="page">
        <h1>We couldn’t open this page.</h1>
        <p>
          Please reload Chapterlet. If storage is unavailable, allow site
          storage and close other tabs. Avoid clearing browser data unless you
          have a backup.
        </p>
        <button onClick={() => window.location.reload()}>
          Reload Chapterlet
        </button>
      </main>
    ),
  },
]);
export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
