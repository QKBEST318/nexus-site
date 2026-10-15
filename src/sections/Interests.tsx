import { useApp } from "../app/context";
import { SectionHead } from "../components/ui";
import { profile } from "../config/profile";

export function Interests() {
  const { t, p } = useApp();

  return (
    <section className="section" aria-labelledby="interests-title">
      <SectionHead title={t("section.interests.title")} sub={t("section.interests.sub")} />
      <div className="grid g-2">
        {profile.interests.map((it, i) => (
          <article
            className="card interest-card"
            key={it.id}
            data-testid={`interest-${it.id}`}
            style={{ animation: `rise .5s var(--ease) ${i * 0.06}s both` }}
          >
            <div className="interest-icon" style={{ backgroundImage: it.gradient }} aria-hidden="true">{it.icon}</div>
            <h3>{p(it.name)}</h3>
            <p>{p(it.desc)}</p>
            <div className="interest-tags">
              {it.tags.map((tg, k) => (
                <span className="tag" key={k}>{p(tg)}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
