import { useEffect, useState } from "react";
import { readStore, writeStore } from "./storage";

/**
 * 与 localStorage 同步的状态钩子 / state that survives a page refresh.
 * 第二个返回值写入失败时为 false（隐私模式或配额不足）。
 */
export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readStore<T>(key, initial));

  useEffect(() => {
    writeStore(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}

export interface Note {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

/* ------------------------------------------------------------- hash route -- */

export type { RouteId } from "./routes";
import type { RouteId } from "./routes";
import { ROUTES } from "./routes";

const parseHash = (): RouteId => {
  const raw = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return (ROUTES as string[]).includes(raw) ? (raw as RouteId) : "home";
};

export function useRoute() {
  const [route, setRoute] = useState<RouteId>(parseHash);

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (id: RouteId) => {
    if (parseHash() === id) return;
    window.location.hash = `#/${id}`;
  };

  return { route, go };
}
