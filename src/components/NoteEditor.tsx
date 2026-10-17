import { useEffect, useRef, useState } from "react";
import type { Annotation } from "../models/types";
import { saveAnnotation } from "../services/repository";
import { Modal, useNotice } from "./UI";
import { errorMessage } from "../schemas/book";
import { useBlocker } from "react-router-dom";
export function NoteEditor({
  annotation,
  onClose,
}: {
  annotation: Annotation;
  onClose: () => void;
}) {
  const [text, setText] = useState(annotation.note),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const current = useRef(text);
  current.current = text;
  const notice = useNotice();
  const blocker = useBlocker(text !== annotation.note);
  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm("Discard your unsaved note and leave this page?"))
        blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (current.current !== annotation.note) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [annotation.note]);
  const close = () => {
    if (saving) return;
    if (
      text === annotation.note ||
      window.confirm("Discard your unsaved note?")
    )
      onClose();
  };
  return (
    <Modal
      title={annotation.note ? "Edit note" : "A thought worth keeping"}
      onClose={close}
    >
      {annotation.quote && <blockquote>{annotation.quote}</blockquote>}
      <label htmlFor="note-text">Your note</label>
      <textarea
        id="note-text"
        autoFocus
        className="note-input"
        maxLength={100000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What does this bring to mind?"
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button onClick={close} disabled={saving}>
          Cancel
        </button>
        <button
          className="primary"
          disabled={!text.trim() || saving}
          onClick={async () => {
            setSaving(true);
            try {
              await saveAnnotation({
                ...annotation,
                note: text,
                updatedAt: Date.now(),
              });
              notice("Note saved.");
              onClose();
            } catch (e) {
              setError(errorMessage(e));
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save note"}
        </button>
      </div>
    </Modal>
  );
}
