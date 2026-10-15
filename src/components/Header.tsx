import { useEffect, useState } from "react";
import { useApp } from "../app/context";
import { profile } from "../config/profile";
import type { RouteId } from "../lib/hooks";

const NAV: { id: RouteId; key: string }[] = [
  { id: "home", key: "nav.home" },
  { id: "interests", key: "nav.interests" },
  { id: "projects", key: "nav.projects" },
  { id: "links", key: "nav.links" },
  { id: "tools", key: "nav.tools" },
  { id: "social", key: "nav.social" },
];

export function Header({
  route,
  go,
  theme,
  toggleTheme,
}: {
  route: RouteId;
  go: (id: RouteId) => void;
  theme: string;
  toggleTheme: () => void;
}) {
  const { t, lang, setLang } = useApp();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [route]);

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <a
          className="logo"
          href="#/home"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
        >
          <span className="logo-mark" aria-hidden="true">N</span>
          <span className="logo-text">
            <b>{profile.nickname}</b>
            <span>{t("brand.sub")}</span>
          </span>
        </a>

        <nav className={`nav ${open ? "" : "closed"}`} aria-label={t("nav.home")}>
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#/${n.id}`}
              className={route === n.id ? "active" : ""}
              aria-current={route === n.id ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                go(n.id);
              }}
            >
              {t(n.key)}
            </a>
          ))}
        </nav>

        <div className="header-tools">
          <button
            type="button"
            className="icon-btn lang-toggle"
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
            title={t("a11y.langToggle")}
            aria-label={t("a11y.langToggle")}
          >
            {lang === "zh" ? "EN" : "中文"}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            title={t("a11y.themeToggle")}
            aria-label={t("a11y.themeToggle")}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={t("a11y.menu")}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>
    </header>
  );
}
