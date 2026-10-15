import { useState } from "react";
import { storagePrefix } from "../config/profile";
import type { QuickLink } from "../config/profile";
import { defaultQuickLinks } from "../config/profile";
import { useApp } from "../app/context";
import { useLocalState } from "../lib/hooks";
import { Empty, Modal, SectionHead } from "../components/ui";
import { hostOf, normalizeUrl, uid } from "../lib/storage";

const KEY = `${storagePrefix}.quickLinks`;
const MAX_TITLE = 40;

interface Draft {
  id: string | null;
  title: string;
  url: string;
  note: string;
}

const emptyDraft: Draft = { id: null, title: "", url: "", note: "" };

export function QuickLinks({ onToast }: { onToast: (text: string, kind?: "ok" | "info" | "warn") => void }) {
  const { t } = useApp();
  const [links, setLinks] = useLocalState<QuickLink[]>(KEY, defaultQuickLinks);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");

  const visible = query.trim()
    ? links.filter((l) => (l.title + l.url + (l.note || "")).toLowerCase().includes(query.trim().toLowerCase()))
    : links;

  const open = (link?: QuickLink) => {
    setErrors({});
    setDraft(link ? { id: link.id, title: link.title, url: link.url, note: link.note || "" } : { ...emptyDraft });
  };

  const save = () => {
    if (!draft) return;
    const next: Record<string, string> = {};
    const title = draft.title.trim();
    if (!title) next.title = t("form.required");
    else if (title.length > MAX_TITLE) next.title = t("form.tooLong", { n: MAX_TITLE });

    const parsed = normalizeUrl(draft.url);
    if (!parsed.ok) next.url = t("form.badUrl");
    else if (links.some((l) => l.id !== draft.id && l.url === parsed.url)) next.url = t("form.dup");

    setErrors(next);
    if (Object.keys(next).length || !parsed.ok) return;

    if (draft.id) {
      setLinks((prev) => prev.map((l) => (l.id === draft.id ? { ...l, title, url: parsed.url, note: draft.note.trim() } : l)));
      onToast(t("links.updated", { t: title }));
    } else {
      setLinks((prev) => [...prev, { id: uid(), title, url: parsed.url, note: draft.note.trim() }]);
      onToast(t("links.added", { t: title }));
    }
    setDraft(null);
  };

  const remove = (link: QuickLink) => {
    if (!window.confirm(t("links.confirmDelete", { t: link.title }))) return;
    setLinks((prev) => prev.filter((l) => l.id !== link.id));
    onToast(t("links.deleted", { t: link.title }), "info");
  };

  return (
    <section className="section" aria-labelledby="links-title">
      <SectionHead title={t("section.links.title")} sub={t("section.links.sub")} />

      <div className="filters">
        <label className="search-wrap">
          <span className="glyph" aria-hidden="true">⌕</span>
          <input
            className="input"
            type="search"
            value={query}
            placeholder={t("projects.search")}
            aria-label={t("projects.search")}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button type="button" className="btn primary" data-testid="link-add" onClick={() => open()}>
          + {t("links.add")}
        </button>
      </div>

      {visible.length === 0 ? (
        <Empty glyph="🔗" title={links.length ? t("projects.empty") : t("links.empty")} hint={t("links.emptyHint")} />
      ) : (
        <div className="grid g-2" data-testid="link-list">
          {visible.map((link, i) => (
            <div className="card link-item" key={link.id} style={{ animation: `rise .4s var(--ease) ${i * 0.04}s both` }}>
              <span className="link-favicon" aria-hidden="true">{hostOf(link.url).slice(0, 1)}</span>
              <div className="link-body">
                <b>{link.title}</b>
                <span title={link.url}>{hostOf(link.url)}{link.note ? ` · ${link.note}` : ""}</span>
              </div>
              <div className="link-actions">
                <a className="btn sm" href={link.url} target="_blank" rel="noreferrer noopener">{t("links.open")} ↗</a>
                <button type="button" className="btn sm ghost" onClick={() => open(link)}>{t("links.edit")}</button>
                <button type="button" className="btn sm danger" onClick={() => remove(link)} aria-label={`${t("links.delete")} ${link.title}`}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {draft ? (
        <Modal title={draft.id ? t("links.edit") : t("links.add")} onClose={() => setDraft(null)}>
          <label className="field">
            <span>{t("links.title")}</span>
            <input
              className={`input ${errors.title ? "err" : ""}`}
              value={draft.title}
              maxLength={MAX_TITLE + 10}
              data-testid="link-title"
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
            />
            {errors.title ? <span className="err-text">{errors.title}</span> : null}
          </label>

          <label className="field">
            <span>{t("links.url")}</span>
            <input
              className={`input ${errors.url ? "err" : ""}`}
              value={draft.url}
              placeholder="https://example.com"
              data-testid="link-url"
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
            />
            {errors.url ? <span className="err-text">{errors.url}</span> : <span className="hint">http / https</span>}
          </label>

          <label className="field">
            <span>{t("links.note")}</span>
            <input className="input" data-testid="link-note" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={() => setDraft(null)}>{t("links.cancel")}</button>
            <button type="button" className="btn primary" data-testid="link-save" onClick={save}>{t("links.save")}</button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
