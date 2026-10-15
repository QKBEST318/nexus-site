import { useApp, useClock } from "../app/context";
import { Avatar } from "../components/Backdrop";
import { profile } from "../config/profile";
import { formatDateTime } from "../lib/storage";

export function Hero({ onExplore }: { onExplore: () => void }) {
  const { t, p, lang } = useApp();
  const now = useClock();
  const { time, date } = formatDateTime(now, lang);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";

  return (
    <section className="section hero" aria-labelledby="hero-title">
      <div className="hero-grid">
        <div className="card hero-card">
          <p className="eyebrow">{t("brand.name")} · {t("hero.hello")}</p>
          <h1 id="hero-title">
            <span className="hero-name">{profile.nickname}</span>
          </h1>
          <p className="tagline">{p(profile.tagline)}</p>
          {profile.bio.slice(0, 2).map((b, i) => (
            <p className="bio" key={i}>{p(b)}</p>
          ))}

          <div className="meta-list">
            <span className="meta"><span>{t("hero.identity")}</span><b>{p(profile.identity)}</b></span>
            <span className="meta"><span>{t("hero.personality")}</span><b>{p(profile.personality)}</b></span>
            <span className="meta"><span>{t("hero.location")}</span><b>{p(profile.location)}</b></span>
          </div>

          <div className="row" style={{ marginTop: 20 }}>
            <button type="button" className="btn primary" onClick={onExplore}>
              {t("hero.explore")} →
            </button>
          </div>
        </div>

        <div className="card clock-card">
          <div className="avatar-row">
            <Avatar />
            <div>
              <b style={{ display: "block", fontSize: "1.05rem" }}>{profile.nickname}</b>
              <span className="faint" style={{ fontSize: "0.82rem" }}>{p(profile.identity)}</span>
            </div>
          </div>

          <div>
            <p className="clock-zone">{t("hero.now")} · {zone}</p>
            <p className="clock-time" data-testid="clock" aria-live="off">{time}</p>
            <p className="clock-date" data-testid="date">{date}</p>
          </div>

          <div>
            <p className="faint" style={{ fontSize: "0.78rem", marginBottom: 8 }}>{t("hero.interests")}</p>
            <div className="tag-cloud">
              {profile.interests.map((it) => (
                <span className="chip on" key={it.id}>{it.icon} {p(it.name)}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
