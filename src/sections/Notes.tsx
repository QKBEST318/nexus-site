import { useState } from "react";
import { useApp } from "../app/context";
import { Card, Empty } from "../components/ui";
import { storagePrefix } from "../config/profile";
import { useLocalState } from "../lib/hooks";
import type { Note } from "../lib/hooks";
import { formatStamp, uid } from "../lib/storage";

const KEY = `${storagePrefix}.notes`;
const MAX = 600;

export function Notes({ onToast }: { onToast: (text: string, kind?: "ok" | "info" | "warn") => void }) {
  const { t, lang } = useApp();
  const [notes, setNotes] = useLocalState<Note[]>(KEY, []);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = () => {
    const body = text.trim();
    if (!body) {
      setError(t("form.required"));
      return;
    }
    if (body.length > MAX) {
      setError(t("form.tooLong", { n: MAX }));
      return;
    }
    const now = Date.now();
    setNotes((prev) => [{ id: uid(), text: body, createdAt: now, updatedAt: now }, ...prev]);
    setText("");
    setError(null);
    onToast(t("notes.saved"));
  };

  const saveEdit = (id: string) => {
    const body = draft.trim();
    if (!body) {
      setError(t("form.required"));
      return;
    }
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text: body.slice(0, MAX), updatedAt: Date.now() } : n)));
    setEditing(null);
    setError(null);
    onToast(t("notes.edited"));
  };

  const remove = (note: Note) => {
    if (!window.confirm(t("notes.confirmDelete"))) return;
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    onToast(t("notes.deleted"), "info");
  };

  return (
    <Card className="card-pad">
      <div className="between" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: "1.05rem" }}>✎ {t("notes.title")}</h3>
        <span className="chip">{notes.length}</span>
      </div>

      <label className="field">
        <span className="sr-only">{t("notes.add")}</span>
        <textarea
          className={`textarea ${error && !editing ? "err" : ""}`}
          value={text}
          maxLength={MAX + 40}
          placeholder={t("notes.placeholder")}
          data-testid="note-input"
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
        />
      </label>
      <div className="between">
        <span className={`hint ${text.length > MAX ? "err-text" : ""}`}>{text.length} / {MAX}</span>
        <button type="button" className="btn primary" data-testid="note-add" onClick={create}>+ {t("notes.add")}</button>
      </div>
      {error && !editing ? <p className="err-text" data-testid="note-error">{error}</p> : null}

      <div className="stack" style={{ marginTop: 16 }} data-testid="note-list">
        {notes.length === 0 ? (
          <Empty glyph="✎" title={t("notes.empty")} hint={t("notes.emptyHint")} />
        ) : (
          notes.map((note) => (
            <article className="card note" key={note.id}>
              {editing === note.id ? (
                <>
                  <textarea
                    className="textarea"
                    value={draft}
                    maxLength={MAX}
                    data-testid="note-edit-input"
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <div className="note-foot">
                    <time>{formatStamp(note.updatedAt, lang)}</time>
                    <div className="row" style={{ gap: 6 }}>
                      <button type="button" className="btn sm ghost" onClick={() => { setEditing(null); setError(null); }}>
                        {t("links.cancel")}
                      </button>
                      <button type="button" className="btn sm primary" data-testid="note-edit-save" onClick={() => saveEdit(note.id)}>
                        {t("links.save")}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p>{note.text}</p>
                  <div className="note-foot">
                    <time>{formatStamp(note.updatedAt, lang)}</time>
                    <div className="row" style={{ gap: 6 }}>
                      <button
                        type="button"
                        className="btn sm ghost"
                        data-testid="note-edit"
                        onClick={() => { setEditing(note.id); setDraft(note.text); setError(null); }}
                      >
                        {t("links.edit")}
                      </button>
                      <button
                        type="button"
                        className="btn sm danger"
                        data-testid="note-delete"
                        onClick={() => remove(note)}
                        aria-label={`${t("links.delete")} ${note.text.slice(0, 12)}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </>
              )}
            </article>
          ))
        )}
      </div>
    </Card>
  );
}
