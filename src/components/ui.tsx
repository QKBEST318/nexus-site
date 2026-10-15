import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../app/context";
import type { Toast } from "../app/context";

export function Card({ children, className = "", pad = false }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <div className={`card ${pad ? "card-pad" : ""} ${className}`.trim()}>{children}</div>;
}

export function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="sec-head">
      <h2>{title}</h2>
      {sub ? <p>{sub}</p> : null}
      <div className="rule" />
    </header>
  );
}

export function Empty({ glyph = "◇", title, hint }: { glyph?: string; title: string; hint?: string }) {
  return (
    <div className="empty">
      <span className="glyph" aria-hidden="true">{glyph}</span>
      <strong>{title}</strong>
      {hint ? <span>{hint}</span> : null}
    </div>
  );
}

export function ToastHost({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const { t } = useApp();
  if (!toasts.length) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((x) => (
        <div key={x.id} className={`toast ${x.kind}`}>
          <span aria-hidden="true">{x.kind === "warn" ? "!" : x.kind === "info" ? "i" : "✓"}</span>
          <span style={{ flex: 1 }}>{x.text}</span>
          <button type="button" onClick={() => onDismiss(x.id)} aria-label={t("a11y.dismiss")}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useApp();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const first = ref.current?.querySelector<HTMLElement>("input, textarea, button");
    first?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card modal" ref={ref} role="dialog" aria-modal="true" aria-label={title}>
        <div className="between">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t("a11y.close")} style={{ width: 32, height: 32 }}>✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
