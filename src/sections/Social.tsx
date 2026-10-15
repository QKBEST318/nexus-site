import { useApp } from "../app/context";
import { Card, Empty, SectionHead } from "../components/ui";
import { socials } from "../config/profile";
import { hostOf } from "../lib/storage";

const GLYPH: Record<string, string> = {
  github: "◆",
  bilibili: "▶",
  email: "✉",
  website: "◉",
  x: "✕",
  other: "◇",
};

export function Social() {
  const { t, p } = useApp();
  const configured = socials.filter((s) => !!s.url);

  return (
    <section className="section" aria-labelledby="social-title">
      <SectionHead title={t("section.social.title")} sub={t("section.social.sub")} />

      {configured.length === 0 ? (
        <p className="hint" style={{ marginBottom: 14 }} data-testid="social-none">{t("social.none")}</p>
      ) : (
        <p className="hint" style={{ marginBottom: 14 }}>{t("social.configured", { n: configured.length })}</p>
      )}

      {socials.length === 0 ? (
        <Empty glyph="◎" title={t("social.none")} hint={t("social.hint")} />
      ) : (
        <div className="grid g-4" data-testid="social-grid">
          {socials.map((s) => {
            const body = (
              <>
                <span className="social-ico" aria-hidden="true">{GLYPH[s.kind] || "◇"}</span>
                <span style={{ minWidth: 0 }}>
                  <b>{p(s.label)}</b>
                  <span>
                    {s.url ? hostOf(s.url) : t("social.empty")}
                    {s.note ? ` · ${p(s.note)}` : ""}
                  </span>
                </span>
              </>
            );
            return s.url ? (
              <a
                className="card social-card"
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                data-testid={`social-${s.id}`}
              >
                {body}
              </a>
            ) : (
              <Card className="social-card pending" key={s.id}>
                <span data-testid={`social-${s.id}`} style={{ display: "contents" }}>{body}</span>
              </Card>
            );
          })}
        </div>
      )}
      <p className="hint" style={{ marginTop: 12 }}>{t("social.hint")}</p>
    </section>
  );
}
