import { useMemo, useState } from "react";
import { useApp } from "../app/context";
import { Empty, SectionHead } from "../components/ui";
import { projects } from "../config/profile";
import type { ProjectCategory } from "../config/profile";

const CATS: (ProjectCategory | "all")[] = ["all", "web", "ai", "tool", "game", "study"];

export function Projects() {
  const { t, p, lang } = useApp();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<ProjectCategory | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((pr) => {
      if (cat !== "all" && pr.category !== cat) return false;
      if (!q) return true;
      const hay = [p(pr.title), p(pr.summary), ...pr.tags, pr.year].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [query, cat, p]);

  const dirty = query.trim() !== "" || cat !== "all";

  return (
    <section className="section" aria-labelledby="projects-title">
      <SectionHead title={t("section.projects.title")} sub={t("section.projects.sub")} />

      <div className="filters">
        <label className="search-wrap">
          <span className="glyph" aria-hidden="true">⌕</span>
          <input
            className="input"
            type="search"
            value={query}
            placeholder={t("projects.search")}
            aria-label={t("projects.search")}
            data-testid="project-search"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="row" role="group" aria-label={t("section.projects.title")}>
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip ${cat === c ? "on" : ""}`}
              style={{ cursor: "pointer", padding: "7px 13px" }}
              aria-pressed={cat === c}
              data-testid={`cat-${c}`}
              onClick={() => setCat(c)}
            >
              {c === "all" ? t("projects.all") : t(`cat.${c}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="between" style={{ marginBottom: 12 }}>
        <span className="hint" data-testid="project-count">{t("projects.count", { n: filtered.length })}</span>
        {dirty ? (
          <button type="button" className="btn sm ghost" onClick={() => { setQuery(""); setCat("all"); }}>
            {t("projects.clear")}
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <Empty glyph="⌕" title={t("projects.empty")} hint={t("projects.emptyHint")} />
      ) : (
        <div className="grid g-3" data-testid="project-grid">
          {filtered.map((pr, i) => (
            <article className="card project-card" key={pr.id} style={{ animation: `rise .45s var(--ease) ${i * 0.05}s both` }}>
              <h3>
                {p(pr.title)}
                {pr.sample ? <span className="badge">{t("projects.sample")}</span> : null}
              </h3>
              <p>{p(pr.summary)}</p>
              <div className="row" style={{ gap: 6 }}>
                {pr.tags.map((tg) => (
                  <span className="tag" key={tg}>{tg}</span>
                ))}
              </div>
              <div className="between" style={{ marginTop: 4 }}>
                <span className="dot-sep">
                  {t(`cat.${pr.category}`)} · {pr.year} · {lang === "zh" ? "示例条目" : "sample entry"}
                </span>
                {pr.url ? (
                  <a className="btn sm" href={pr.url} target="_blank" rel="noreferrer noopener">
                    {t("projects.open")} ↗
                  </a>
                ) : (
                  <span className="faint" style={{ fontSize: "0.76rem" }}>{t("projects.noLink")}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
