import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { profile, storagePrefix } from "../config/profile";
import { pick, translate } from "../lib/i18n";
import type { Lang } from "../lib/i18n";
import { readStore, uid, writeStore } from "../lib/storage";

/* ------------------------------------------------------------------ i18n --- */

interface AppCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** 读取 profile.ts 中的双语字段 / resolve an L10n field from profile.ts */
  p: (v: { zh: string; en: string }) => string;
}

const Ctx = createContext<AppCtx | null>(null);

const detectLang = (): Lang => {
  const saved = readStore<Lang | null>(`${storagePrefix}.lang`, null);
  if (saved === "zh" || saved === "en") return saved;
  return typeof navigator !== "undefined" && /^zh/i.test(navigator.language || "") ? "zh" : "en";
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    writeStore(`${storagePrefix}.lang`, l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = lang === "zh" ? `NEXUS · ${profile.nickname} 的个人科技空间` : `NEXUS · ${profile.nickname}'s Tech Space`;
  }, [lang]);

  const value = useMemo<AppCtx>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(key, lang, vars),
      p: (v) => pick(v, lang),
    }),
    [lang, setLang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

/* ----------------------------------------------------------------- theme --- */

export type Theme = "dark" | "light";

const readTheme = (): Theme => {
  const saved = readStore<Theme | null>(`${storagePrefix}.theme`, null);
  return saved === "light" ? "light" : "dark"; // 默认深色 / dark by default
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#05060c" : "#eef1fb");
    writeStore(`${storagePrefix}.theme`, theme);
  }, [theme]);

  return { theme, setTheme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

/* ----------------------------------------------------------------- toast --- */

export interface Toast {
  id: string;
  text: string;
  kind: "ok" | "warn" | "info";
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = uid();
    setToasts((prev) => [...prev.slice(-3), { id, text, kind }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 2800);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { toasts, push, dismiss };
}

/* ---------------------------------------------------------------- clock ---- */

export function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
