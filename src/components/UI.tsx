import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { X, Check, BookOpen } from "lucide-react";
import { errorMessage } from "../schemas/book";
const NoticeContext = createContext<(message: string) => void>(() => {});
export function NoticeProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  return (
    <NoticeContext.Provider value={setMessage}>
      {children}
      {message && (
        <div className="toast" role="status">
          <Check size={18} />
          {message}
          <button
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </NoticeContext.Provider>
  );
}
export const useNotice = () => useContext(NoticeContext);
export function useAction() {
  const notify = useNotice();
  return async (work: () => Promise<unknown>, success?: string) => {
    try {
      await work();
      if (success) notify(success);
    } catch (error) {
      notify(errorMessage(error));
    }
  };
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-header">
        <h2 id="dialog-title">{title}</h2>
        <button aria-label="Close dialog" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  children,
  onCancel,
  onConfirm,
  danger = false,
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  danger?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title={title} onClose={() => !busy && onCancel()}>
      <p>{children}</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="actions">
        <button autoFocus onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          className={danger ? "danger" : "primary"}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } catch (e) {
              setError(errorMessage(e));
              setBusy(false);
            }
          }}
        >
          {busy ? "Working…" : "Confirm"}
        </button>
      </div>
    </Modal>
  );
}
export function PageHeading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <p className="muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}
export function Cover({
  book,
  small = false,
}: {
  book: { title: string; author: string; coverImageDataUrl?: string };
  small?: boolean;
}) {
  let hash = 0;
  for (const c of book.title + book.author)
    hash = (hash * 31 + c.charCodeAt(0)) | 0;
  return (
    <div
      className={`cover palette-${Math.abs(hash) % 5} ${small ? "small" : ""}`}
      aria-hidden="true"
    >
      {book.coverImageDataUrl ? (
        <img src={book.coverImageDataUrl} alt="" />
      ) : (
        <>
          <div className="cover-top">CHAPTERLET EDITIONS</div>
          <div className="cover-ornament">
            <BookOpen />
          </div>
          <div className="cover-title">{book.title}</div>
          <div className="cover-rule" />
          <div className="cover-author">{book.author}</div>
        </>
      )}
    </div>
  );
}
