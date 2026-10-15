/**
 * 测试入口 / test entry: bundled with esbuild into tests/.tmp/logic.mjs and
 * executed by tests/run.mjs in Node. Storage-dependent modules are imported
 * after the localStorage shim is installed.
 */
import { check, done, failures } from "./assert";

/* --------------------------------------------------------------- 1. i18n --- */
import { dict, pick, translate } from "../src/lib/i18n";

const keys = Object.keys(dict);
check("i18n has meaningful key count", keys.length >= 90, `keys=${keys.length}`);
check("every key has zh + en", keys.every((k) => dict[k].zh && dict[k].en));
check("no zh value equals a raw key", keys.every((k) => dict[k].zh !== k));
check("zh/en placeholders match", keys.every((k) => {
  const ph = (s: string) => (s.match(/\{[a-z]+\}/gi) || []).sort().join(",");
  return ph(dict[k].zh) === ph(dict[k].en);
}));
check("translate zh", translate("nav.home", "zh") === "首页", translate("nav.home", "zh"));
check("translate en", translate("nav.home", "en") === "Home", translate("nav.home", "en"));
check("translate interpolates", translate("todos.left", "en", { n: 3 }) === "3 left");
check("translate interpolates zh", translate("todos.left", "zh", { n: 2 }) === "剩余 2 项");
check("unknown key falls back to key", translate("nope.key", "zh") === "nope.key");
check("pick zh", pick({ zh: "中国", en: "China" }, "zh") === "中国");
check("pick en", pick({ zh: "中国", en: "China" }, "en") === "China");

/* ------------------------------------------------------------ 2. storage --- */
const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
};

import { clamp, formatClock, formatDateTime, hostOf, normalizeUrl, readStore, uid, writeStore } from "../src/lib/storage";

check("write + read round trip", (() => { writeStore("t.a", [1, 2, 3]); return readStore<number[]>("t.a", []).length === 3; })());
check("read missing key returns fallback", readStore("t.missing", "fb") === "fb");
mem.set("t.bad", "{not json");
check("corrupt JSON falls back, no throw", readStore("t.bad", 42) === 42);
mem.set("t.null", "null");
check("stored null falls back", readStore("t.null", 7) === 7);
check("uid is unique", uid() !== uid());

check("url: https passes", normalizeUrl("https://example.com/a?b=1").ok === true);
check("url: http passes", normalizeUrl("http://example.com").ok === true);
check("url: bare domain gets https", (() => { const r = normalizeUrl("example.com"); return r.ok && r.url.startsWith("https://example.com"); })());
check("url: whitespace trimmed", (() => { const r = normalizeUrl("  example.com/x  "); return r.ok && r.url === "https://example.com/x"; })());
check("url: empty rejected", normalizeUrl("   ").ok === false);
check("url: javascript: rejected", normalizeUrl("javascript:alert(1)").ok === false);
check("url: data: rejected", normalizeUrl("data:text/html,<h1>x").ok === false);
check("url: no dot rejected", normalizeUrl("https://localhostonly").ok === false);
check("url: garbage rejected", normalizeUrl("not a url at all").ok === false);
check("hostOf strips www", hostOf("https://www.example.com/x") === "example.com");
check("hostOf handles bad input", hostOf("nonsense") === "nonsense");

check("formatClock 1500s", formatClock(1500) === "25:00", formatClock(1500));
check("formatClock 61s", formatClock(61) === "01:01");
check("formatClock 0s", formatClock(0) === "00:00");
check("formatClock negative clamps", formatClock(-5) === "00:00");
check("clamp", clamp(300, 1, 180) === 180 && clamp(-3, 1, 180) === 1 && clamp(25, 1, 180) === 25);

const dtZh = formatDateTime(new Date(2025, 0, 2, 9, 5, 7), "zh");
const dtEn = formatDateTime(new Date(2025, 0, 2, 9, 5, 7), "en");
check("formatDateTime zh time", dtZh.time === "09:05:07", dtZh.time);
check("formatDateTime en time", dtEn.time === "09:05:07", dtEn.time);
check("formatDateTime zh date localised", dtZh.date.includes("2025") && dtZh.date !== dtEn.date);

/* ------------------------------------------------------------ 3. profile --- */
import { defaultQuickLinks, l10n, pomodoroDefaults, profile, projects, socials, storagePrefix } from "../src/config/profile";

check("nickname is QKBEST", profile.nickname === "QKBEST");
check("identity says student", /学生/.test(profile.identity.zh) && /student/i.test(profile.identity.en));
check("personality is introverted", /内敛/.test(profile.personality.zh) && /introvert/i.test(profile.personality.en));
check("no invented location beyond China", profile.location.zh === "中国" && profile.location.en === "China");
check("four interests", profile.interests.length === 4, String(profile.interests.length));
check("interests are the four requested", ["valorant", "ai", "basketball", "movie"].every((id) => profile.interests.some((i) => i.id === id)));
check("VALORANT interest present", profile.interests.some((i) => /VALORANT/i.test(i.name.en)));
check("every interest has bilingual name/desc/tags",
  profile.interests.every((i) => i.name.zh && i.name.en && i.desc.zh && i.desc.en && i.tags.length > 0 && i.tags.every((tg) => tg.zh && tg.en)));
check("avatar is a generated default (no image file)", profile.avatar.style === "tech-default" && profile.avatar.initials.length === 2);

check("socials are reserved but empty (no fake accounts)", socials.length > 0 && socials.every((s) => s.url === null));
check("socials cover github + a platform + email", ["github", "bilibili", "email"].every((k) => socials.some((s) => s.kind === k)));

check("projects exist", projects.length > 0);
check("every project is marked sample", projects.every((p) => p.sample === true));
check("every project title is labelled as sample", projects.every((p) => /示例|Sample/i.test(p.title.zh + p.title.en)));
check("every project has bilingual text + tags", projects.every((p) => p.title.zh && p.title.en && p.summary.zh && p.summary.en && p.tags.length > 0));
check("no project claims to be real by linking out", projects.every((p) => p.url === null || normalizeUrl(p.url).ok));

const searchDone = projects.filter((p) => [p.title.zh, p.title.en, p.summary.zh, p.summary.en, ...p.tags, p.year].join(" ").toLowerCase().includes("react"));
check("project search finds a React tag", searchDone.length >= 1);
check("category filter narrows results", projects.filter((p) => p.category === "ai").length >= 1 && projects.filter((p) => p.category === "ai").length < projects.length);

check("quick link defaults are valid URLs", defaultQuickLinks.length > 0 && defaultQuickLinks.every((l) => normalizeUrl(l.url).ok));
check("quick link defaults are not personal accounts", defaultQuickLinks.every((l) => !/github\.com\/[^/]+$/i.test(l.url)));

check("pomodoro default 25/5/15", pomodoroDefaults.focus === 25 && pomodoroDefaults.shortBreak === 5 && pomodoroDefaults.longBreak === 15);
check("pomodoro validators bound minutes", pomodoroDefaults.limits.min >= 1 && pomodoroDefaults.limits.max <= 180);
check("storage prefix namespaced", storagePrefix.startsWith("nexus"));

/* -------------------------------------------------- 4. notes / todos data --- */
const now = Date.now();
const notes = [{ id: uid(), text: "第一条便签", createdAt: now, updatedAt: now }];
writeStore(`${storagePrefix}.notes`, notes);
check("notes persist and reload", readStore<typeof notes>(`${storagePrefix}.notes`, []).length === 1);
const edited = notes.map((n) => ({ ...n, text: "改过的便签", updatedAt: now + 5 }));
writeStore(`${storagePrefix}.notes`, edited);
check("note edit persists", readStore<typeof notes>(`${storagePrefix}.notes`, [])[0].text === "改过的便签");
writeStore(`${storagePrefix}.notes`, []);
check("note delete persists", readStore<typeof notes>(`${storagePrefix}.notes`, []).length === 0);

type Todo = { id: string; text: string; done: boolean; createdAt: number };
let todos: Todo[] = [
  { id: uid(), text: "写代码", done: false, createdAt: now },
  { id: uid(), text: "打篮球", done: true, createdAt: now },
];
writeStore(`${storagePrefix}.todos`, todos);
check("todo add persists", readStore<Todo[]>(`${storagePrefix}.todos`, []).length === 2);
todos = todos.map((x) => (x.id === todos[0].id ? { ...x, done: true } : x));
writeStore(`${storagePrefix}.todos`, todos);
check("todo toggle + done filter", readStore<Todo[]>(`${storagePrefix}.todos`, []).filter((x) => x.done).length === 2);
check("todo active filter", readStore<Todo[]>(`${storagePrefix}.todos`, []).filter((x) => !x.done).length === 0);
writeStore(`${storagePrefix}.todos`, todos.filter((x) => !x.done));
check("todo clear-completed works", readStore<Todo[]>(`${storagePrefix}.todos`, []).length === 0);
writeStore(`${storagePrefix}.todos`, [{ id: uid(), text: "删除我", done: false, createdAt: now }]);
writeStore(`${storagePrefix}.todos`, readStore<Todo[]>(`${storagePrefix}.todos`, []).filter((x) => x.text !== "删除我"));
check("todo delete works", readStore<Todo[]>(`${storagePrefix}.todos`, []).length === 0);

/* ------------------------------------------------------------ 5. theme ----- */
writeStore(`${storagePrefix}.theme`, "light");
check("theme persists light", readStore(`${storagePrefix}.theme`, "dark") === "light");
writeStore(`${storagePrefix}.theme`, "dark");
check("theme persists dark", readStore(`${storagePrefix}.theme`, "light") === "dark");
check("l10n helper builds both languages", l10n("甲", "A").zh === "甲" && l10n("甲", "A").en === "A");

done();
export { failures };
