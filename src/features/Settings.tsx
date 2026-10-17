import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  Upload,
  ShieldCheck,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { PageHeading, Confirm, useAction, useNotice } from "../components/UI";
import { Preferences } from "../components/Preferences";
import { Install } from "../components/Install";
import { createBackup, restoreBackup } from "../services/backup";
import { parseBackup, type Backup } from "../schemas/backup";
import { MAX_BACKUP_BYTES, errorMessage } from "../schemas/book";
import { clearLibrary, downloadJson, readFile } from "../services/repository";
export default function Settings() {
  const [usage, setUsage] = useState<StorageEstimate | null>(null),
    [persistent, setPersistent] = useState<boolean | null>(null),
    [backup, setBackup] = useState<Backup | null>(null),
    [mode, setMode] = useState<"merge" | "replace">("merge"),
    [confirm, setConfirm] = useState<"clear" | "replace" | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const act = useAction(),
    notice = useNotice();
  useEffect(() => {
    void navigator.storage
      ?.estimate?.()
      .then(setUsage)
      .catch(() => {});
    void navigator.storage
      ?.persisted?.()
      .then(setPersistent)
      .catch(() => {});
  }, []);
  const restore = async () => {
    if (!backup) return;
    setBusy(true);
    try {
      await restoreBackup(backup, mode);
      setBackup(null);
      setConfirm(null);
      notice("Library backup restored.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="page narrow">
      <PageHeading eyebrow="JUST THE WAY YOU LIKE IT" title="Settings">
        Make yourself at home, and keep your library safe.
      </PageHeading>
      <div className="settings-grid">
        <section className="settings-section">
          <h2>Reading preferences</h2>
          <p className="muted">A comfortable page makes all the difference.</p>
          <Preferences />
        </section>
        <section className="settings-section">
          <h2>Your data, in your hands</h2>
          <p>
            Books, reading history, and notes live in this browser on this
            device. Browser data can be cleared or evicted. Regular backups are
            the best way to keep your library safe.
          </p>
          <button
            className="primary"
            onClick={() =>
              act(
                async () =>
                  downloadJson(
                    await createBackup(),
                    `chapterlet-backup-${new Date().toISOString().slice(0, 10)}.json`,
                  ),
                "Backup downloaded. Store it somewhere safe.",
              )
            }
          >
            <Download size={17} /> Export library backup
          </button>
          <label className="button">
            <Upload size={17} /> Restore library backup
            <input
              className="sr-only"
              type="file"
              aria-label="Restore library backup"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file)
                  try {
                    setBackup(
                      parseBackup(await readFile(file, MAX_BACKUP_BYTES)),
                    );
                    setError("");
                  } catch (err) {
                    setError(errorMessage(err));
                  }
                e.target.value = "";
              }}
            />
          </label>
          <small>
            Backups include all books, covers, notes, highlights, bookmarks,
            progress, and preferences.
          </small>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {backup && (
            <section className="restore-preview">
              <h3>Ready to restore</h3>
              <p>
                {backup.books.length} books ·{" "}
                {
                  backup.annotations.filter((a) => a.kind === "highlight")
                    .length
                }{" "}
                highlights · {backup.annotations.filter((a) => a.note).length}{" "}
                notes ·{" "}
                {backup.annotations.filter((a) => a.kind === "bookmark").length}{" "}
                bookmarks
              </p>
              <label>
                Restore method
                <select
                  value={mode}
                  onChange={(e) =>
                    setMode(e.target.value as "merge" | "replace")
                  }
                >
                  <option value="merge">Merge with this library</option>
                  <option value="replace">Replace this library</option>
                </select>
              </label>
              <p className="muted">
                {mode === "merge"
                  ? "Existing items stay safe. Conflicting incoming IDs are remapped, retaining both copies and their annotation relationships. Existing preferences are kept."
                  : "All current books and reading data will be replaced by this backup."}
              </p>
              <div className="actions">
                <button onClick={() => setBackup(null)}>Cancel</button>
                <button
                  disabled={busy}
                  className="primary"
                  onClick={() =>
                    mode === "replace" ? setConfirm("replace") : act(restore)
                  }
                >
                  {busy ? "Restoring…" : "Restore backup"}
                </button>
              </div>
            </section>
          )}
        </section>
        <section className="settings-section">
          <h2>A little more peace of mind</h2>
          <p>
            {usage?.usage !== undefined
              ? `${(usage.usage / 1024 / 1024).toFixed(1)} MB used${usage.quota ? ` of approximately ${(usage.quota / 1024 / 1024).toFixed(0)} MB available to this origin` : ""}.`
              : "Your browser does not report storage usage."}
          </p>
          <p>
            {persistent === true
              ? "Persistent storage has been granted. Backups are still recommended."
              : persistent === false
                ? "Storage is currently managed by your browser."
                : "Persistent-storage status is unavailable."}
          </p>
          {persistent !== true && navigator.storage?.persist && (
            <button
              onClick={() =>
                act(async () => {
                  const granted = await navigator.storage.persist();
                  setPersistent(granted);
                  notice(
                    granted
                      ? "Persistent storage granted."
                      : "Your browser did not grant persistent storage. Please keep backups.",
                  );
                })
              }
            >
              <ShieldCheck size={17} /> Request persistent storage
            </button>
          )}
          <p className="muted">
            Persistence helps protect against automatic eviction. It cannot
            protect against clearing browser data or losing a device.
          </p>
        </section>
        <section className="settings-section">
          <h2>Make it part of your day</h2>
          <Install />
          <p className="muted">
            Chapterlet 1.0.0 · No accounts. No tracking. No cloud sync.
          </p>
          <Link className="text-link" to="/help">
            Help & the book format <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
      <section className="danger-zone">
        <div>
          <h2>A fresh start</h2>
          <p>
            Remove every book, annotation, reading position, and preference on
            this device.
          </p>
        </div>
        <button className="danger-text" onClick={() => setConfirm("clear")}>
          <Trash2 size={17} /> Clear all local data
        </button>
      </section>
      {confirm && (
        <Confirm
          danger
          title={
            confirm === "clear"
              ? "Erase your entire local library?"
              : "Replace your entire local library?"
          }
          onCancel={() => setConfirm(null)}
          onConfirm={
            confirm === "clear"
              ? async () => {
                  await clearLibrary();
                  setConfirm(null);
                  notice("Local library cleared.");
                }
              : restore
          }
        >
          {confirm === "clear"
            ? "This cannot be undone. Export a library backup before continuing. All books and personal reading data on this device will be permanently deleted."
            : "This replaces all current books, annotations, reading history, and preferences. Export your current library first if you want to keep it."}
        </Confirm>
      )}
    </main>
  );
}
