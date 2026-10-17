import { useLiveQuery } from "dexie-react-hooks";
import { db, defaultPreferences } from "../db/database";
import type { Preferences } from "../models/types";
export function useLibrary() {
  return useLiveQuery(() => db.books.toArray(), [], []);
}
export function useBook(id: string | undefined) {
  return useLiveQuery(() => (id ? db.books.get(id) : undefined), [id]);
}
export function usePreferences(initial?: Preferences) {
  return (
    useLiveQuery(() => db.preferences.get("reader"), []) ??
    initial ??
    defaultPreferences()
  );
}
export function useProgress() {
  return useLiveQuery(() => db.progress.toArray(), [], []);
}
export function useAnnotations() {
  return useLiveQuery(() => db.annotations.toArray(), [], []);
}
