import { useCallback } from "react";
import { AppProvider, useApp, useTheme, useToasts } from "./app/context";
import { Backdrop } from "./components/Backdrop";
import { Header } from "./components/Header";
import { ToastHost } from "./components/ui";
import { useRoute } from "./lib/hooks";
import { storagePrefix } from "./config/profile";
import { Hero } from "./sections/Hero";
import { Interests } from "./sections/Interests";
import { Projects } from "./sections/Projects";
import { QuickLinks } from "./sections/QuickLinks";
import { Pomodoro, resetPomodoro } from "./sections/Pomodoro";
import { Notes } from "./sections/Notes";
import { Todos } from "./sections/Todos";
import { Social } from "./sections/Social";

function Footer({ onReset }: { onReset: () => void }) {
  const { t } = useApp();
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div>
          <p>{t("footer.built")}</p>
          <p>{t("footer.local")}</p>
        </div>
        <button type="button" className="btn sm ghost" data-testid="reset-all" onClick={onReset}>
          {t("footer.reset")}
        </button>
      </div>
    </footer>
  );
}

function Site() {
  const { t } = useApp();
  const { route, go } = useRoute();
  const { theme, toggle } = useTheme();
  const { toasts, push, dismiss } = useToasts();

  const toast = useCallback(
    (text: string, kind: "ok" | "info" | "warn" = "ok") => push(text, kind),
    [push],
  );

  const resetAll = () => {
    if (!window.confirm(t("footer.resetConfirm"))) return;
    try {
      ["quickLinks", "notes", "todos", "theme", "lang"].forEach((k) => localStorage.removeItem(`${storagePrefix}.${k}`));
    } catch {
      /* ignore */
    }
    resetPomodoro();
    push(t("footer.resetDone"), "info");
    window.setTimeout(() => window.location.reload(), 600);
  };

  const showHome = route === "home";

  return (
    <div className="site">
      <Backdrop />
      <a className="skip" href="#main">{t("a11y.skip")}</a>
      <Header route={route} go={go} theme={theme} toggleTheme={toggle} />

      <main className="main shell" id="main">
        {showHome ? (
          <>
            <Hero onExplore={() => go("interests")} />
            <Interests />
            <Projects />
            <Social />
          </>
        ) : null}

        {route === "interests" ? <Interests /> : null}
        {route === "projects" ? <Projects /> : null}
        {route === "links" ? <QuickLinks onToast={toast} /> : null}

        {route === "tools" ? (
          <section className="section">
            <div className="tool-grid">
              <Pomodoro onToast={toast} />
              <Notes onToast={toast} />
              <div style={{ gridColumn: "1 / -1" }}>
                <Todos onToast={toast} />
              </div>
            </div>
          </section>
        ) : null}

        {route === "social" ? <Social /> : null}
      </main>

      <Footer onReset={resetAll} />
      <ToastHost toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <Site />
    </AppProvider>
  );
}
