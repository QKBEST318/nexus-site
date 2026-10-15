/**
 * 真实浏览器验收 / real-browser verification（**需要本机能启动 Chrome / Edge**）。
 *
 * ⚠️ 本沙箱里跑不了：Chrome 的多进程 IPC（mojo channel）被安全策略拒绝，
 * 任何 headless 模式都会 FATAL 退出。所以在有真实浏览器的机器上跑这个脚本，
 * 或在沙箱里按 docs/MANUAL-CHECKLIST.md 人工过一遍。
 *
 * 用 CDP（Node 原生 WebSocket）驱动无头浏览器：渲染、控制台报错、中英切换、深浅色、
 * 导航、快捷链接/便签/待办/番茄钟的真实交互，刷新后的 localStorage 持久化，最后截图。
 * 用法 / usage:  node tools/build.mjs && node tests/browser.mjs
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const shots = path.join(root, "docs", "screenshots");
fs.mkdirSync(shots, { recursive: true });

const BROWSERS = [
  path.join(os.homedir(), "AppData", "Local", "Google", "Chrome", "Application", "chrome.exe"),
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const exe = BROWSERS.find((p) => fs.existsSync(p));
if (!exe) {
  console.log("! no Chrome/Edge found — skipping browser verification");
  process.exit(0);
}

/* --------------------------------------------------------- static server -- */
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (p.endsWith("/")) p += "index.html";
  let file = path.join(dist, p);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, "index.html");
  res.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

/* ------------------------------------------------------------ launch ----- */
const profile = path.join(root, "tests", ".tmp", "chrome-profile");
fs.rmSync(profile, { recursive: true, force: true });
fs.mkdirSync(profile, { recursive: true });
const port = 9333;
const child = spawn(
  exe,
  [
    "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions",
    "--disable-sync", "--disable-background-networking", "--mute-audio",
    "--window-size=1440,960", "about:blank",
  ],
  { stdio: "ignore", detached: false },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function targets() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error("browser did not expose a debug target");
}

/* ---------------------------------------------------------------- CDP ----- */
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error("CDP timeout: " + method));
      }, 20000);
    });
  }
  async eval(expression) {
    const r = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("page error: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
  async waitFor(expression, label, timeout = 8000) {
    const t0 = Date.now();
    for (;;) {
      try {
        if (await this.eval(expression)) return true;
      } catch { /* still booting */ }
      if (Date.now() - t0 > timeout) throw new Error("timeout waiting for " + label);
      await sleep(120);
    }
  }
}

const page = await targets();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.addEventListener("open", res);
  ws.addEventListener("error", () => rej(new Error("websocket failed")));
});
const cdp = new CDP(ws);
await cdp.send("Runtime.enable");
await cdp.send("Page.enable");
await cdp.send("Log.enable");

let pass = 0;
const fails = [];
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log("  ✓ " + name); }
  else { fails.push(name + (detail ? ` (${detail})` : "")); console.log("  ✗ " + name + (detail ? `  (${detail})` : "")); }
};

/* ------------------------------------------------------------- the run ---- */
console.log("── browser: first paint ────────────────────────────────────");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url: base + "/" });
await cdp.waitFor("!!document.querySelector('.site-header')", "header render");

const rootEmpty = await cdp.eval("document.getElementById('root').childElementCount > 0");
check("React mounted into #root", rootEmpty);
check("boot placeholder removed", await cdp.eval("!document.getElementById('boot')"));
check("hero shows the nickname", (await cdp.eval("document.querySelector('h1')?.textContent || ''")).includes("QKBEST"));
check("four interest cards on home", (await cdp.eval("document.querySelectorAll('[data-testid^=\"interest-\"]').length")) === 4);
check("clock is ticking", await cdp.eval(`(async()=>{const a=document.querySelector('[data-testid=clock]').textContent;await new Promise(r=>setTimeout(r,1300));return document.querySelector('[data-testid=clock]').textContent!==a})()`));
check("date line is populated", (await cdp.eval("document.querySelector('[data-testid=date]').textContent.trim().length")) > 5);
check("default theme is dark", (await cdp.eval("document.documentElement.dataset.theme")) === "dark");
check("page background is dark", (await cdp.eval("getComputedStyle(document.body).backgroundColor")) === "rgb(5, 6, 12)");
check("default language is Chinese", (await cdp.eval("document.documentElement.lang")) === "zh-CN");

// 布局与响应式
const layout = await cdp.eval(`(()=>{const el=document.querySelector('.hero-grid');const cs=getComputedStyle(el);return {cols:cs.gridTemplateColumns.split(' ').length, overflow: document.documentElement.scrollWidth <= window.innerWidth+1}})()`);
check("desktop hero is a 2-column grid", layout.cols === 2, JSON.stringify(layout));
check("no horizontal overflow on desktop", layout.overflow);

console.log("\n── browser: navigation ─────────────────────────────────────");
async function nav(id, marker) {
  await cdp.eval(`location.hash = '#/${id}'`);
  await cdp.waitFor(`location.hash === '#/${id}'`, id);
  await sleep(320);
  await cdp.waitFor(`!!document.querySelector('${marker}')`, marker);
}
await nav("projects", "[data-testid=project-grid]");
check("projects route renders cards", (await cdp.eval("document.querySelectorAll('[data-testid=project-grid] > *').length")) === 4);
check("project cards are labelled as samples", (await cdp.eval("document.querySelectorAll('[data-testid=project-grid] .badge').length")) === 4);
await cdp.eval(`document.querySelector('[data-testid=project-search]').value=''`);
await cdp.eval(`(()=>{const el=document.querySelector('[data-testid=project-search]');const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,'zzzz');el.dispatchEvent(new Event('input',{bubbles:true}))})()`);
await cdp.waitFor("document.querySelectorAll('[data-testid=project-grid] > *').length === 0", "search empties grid");
check("search filters to empty state", await cdp.eval("!!document.querySelector('.empty')"));
await cdp.eval(`document.querySelector('[data-testid=cat-ai]').click()`);
await cdp.waitFor("document.querySelectorAll('[data-testid=project-grid] > *').length === 1", "ai filter");
check("clear filters restores results", await cdp.eval(`(()=>{const b=[...document.querySelectorAll('.btn')].find(x=>x.textContent.includes('清除'));if(!b)return false;b.click();return true})()`));
await cdp.waitFor("document.querySelectorAll('[data-testid=project-grid] > *').length === 4", "reset filters");

console.log("\n── browser: language + theme ───────────────────────────────");
await cdp.eval(`document.querySelector('.lang-toggle').click()`);
await cdp.waitFor(`document.documentElement.lang === 'en'`, "english");
check("nav switches to English", (await cdp.eval("document.querySelector('nav.nav a').textContent")) === "Home");
check("buttons switch to English", (await cdp.eval("[...document.querySelectorAll('.chip')].some(x=>x.textContent==='All')")));
check("html lang updated", (await cdp.eval("document.documentElement.lang")) === "en");
await cdp.eval(`document.querySelector('.lang-toggle').click()`);
await cdp.waitFor(`document.documentElement.lang === 'zh-CN'`, "back to chinese");
check("returns to Chinese", (await cdp.eval("document.querySelector('nav.nav a').textContent")) === "首页");

await cdp.eval(`document.querySelectorAll('.header-tools .icon-btn')[1].click()`);
await cdp.waitFor(`document.documentElement.dataset.theme === 'light'`, "light theme");
check("light theme applies", (await cdp.eval("getComputedStyle(document.body).backgroundColor")) === "rgb(238, 241, 251)");
check("light theme persisted", (await cdp.eval("localStorage.getItem('nexus.qkbest.v1.theme')")) === '"light"');
await cdp.send("Page.captureScreenshot", { format: "png" }).then((r) => fs.writeFileSync(path.join(shots, "03-light-theme.png"), Buffer.from(r.data, "base64")));
await cdp.eval(`document.querySelectorAll('.header-tools .icon-btn')[1].click()`);
await cdp.waitFor(`document.documentElement.dataset.theme === 'dark'`, "dark theme again");

// 保证番茄钟测试从默认 25 分钟开始（不受上一次运行影响）
await cdp.eval(`localStorage.removeItem('nexus.qkbest.v1.pomodoro'); localStorage.removeItem('nexus.qkbest.v1.pomodoroRounds')`);
await nav("tools", "[data-testid=pomo-time]");
await cdp.send("Page.reload", { ignoreCache: false });
await cdp.waitFor(`!!document.querySelector('.site-header')`, "reload for fresh pomodoro");
await nav("tools", "[data-testid=pomo-time]");

console.log("\n── browser: quick links CRUD ───────────────────────────────");
await nav("links", "[data-testid=link-list]");
const seeded = await cdp.eval("document.querySelectorAll('[data-testid=link-list] > *').length");
check("seeded quick links render", seeded === 3, String(seeded));
await cdp.eval(`document.querySelector('[data-testid=link-add]').click()`);
await cdp.waitFor("!!document.querySelector('[data-testid=link-save]')", "link modal");
await cdp.eval(`(()=>{const el=document.querySelector('[data-testid=link-url]');const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,'javascript:alert(1)');el.dispatchEvent(new Event('input',{bubbles:true}))})()`);
await cdp.eval(`document.querySelector('[data-testid=link-save]').click()`);
await cdp.waitFor("!!document.querySelector('.err-text')", "validation error");
check("invalid URL is rejected with a message", (await cdp.eval("document.querySelectorAll('.err-text').length")) >= 1);
check("bad link was not stored", (await cdp.eval("document.querySelectorAll('[data-testid=link-list] > *').length")) === 3);
const setVal = (sel, val) => `(()=>{const el=document.querySelector('${sel}');const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,${JSON.stringify(val)});el.dispatchEvent(new Event('input',{bubbles:true}))})()`;
await cdp.eval(setVal("[data-testid=link-title]", "我的博客"));
await cdp.eval(setVal("[data-testid=link-url]", "example.com/blog"));
await cdp.eval(`document.querySelector('[data-testid=link-save]').click()`);
await cdp.waitFor("document.querySelectorAll('[data-testid=link-list] > *').length === 4", "link added");
check("link added and normalised to https", await cdp.eval(`JSON.parse(localStorage.getItem('nexus.qkbest.v1.quickLinks')).some(l=>l.url==='https://example.com/blog')`));
check("duplicate URL is rejected", await (async () => {
  await cdp.eval(`document.querySelector('[data-testid=link-add]').click()`);
  await cdp.waitFor("!!document.querySelector('[data-testid=link-url]')", "modal");
  await cdp.eval(setVal("[data-testid=link-title]", "重复"));
  await cdp.eval(setVal("[data-testid=link-url]", "https://example.com/blog"));
  await cdp.eval(`document.querySelector('[data-testid=link-save]').click()`);
  await sleep(300);
  const count = await cdp.eval("document.querySelectorAll('[data-testid=link-list] > *').length");
  await cdp.eval(`[...document.querySelectorAll('.modal .btn')].find(b=>b.textContent.includes('取消')).click()`);
  return count === 4;
})());
// edit
await cdp.eval(`[...document.querySelectorAll('[data-testid=link-list] > *')].find(el=>el.textContent.includes('我的博客')).querySelector('.btn.ghost').click()`);
await cdp.waitFor("!!document.querySelector('[data-testid=link-title]')", "edit modal");
check("edit modal prefilled", (await cdp.eval("document.querySelector('[data-testid=link-title]').value")) === "我的博客");
await cdp.eval(setVal("[data-testid=link-title]", "我的博客 v2"));
await cdp.eval(`document.querySelector('[data-testid=link-save]').click()`);
await cdp.waitFor("[...document.querySelectorAll('[data-testid=link-list] > *')].some(el=>el.textContent.includes('我的博客 v2'))", "link edited");
check("link edit persisted", await cdp.eval(`localStorage.getItem('nexus.qkbest.v1.quickLinks').includes('我的博客 v2')`));
// delete
await cdp.eval(`window.confirm = () => true`);
await cdp.eval(`[...document.querySelectorAll('[data-testid=link-list] > *')].find(el=>el.textContent.includes('我的博客 v2')).querySelector('.btn.danger').click()`);
await cdp.waitFor("document.querySelectorAll('[data-testid=link-list] > *').length === 3", "link deleted");
check("link deleted from storage", await cdp.eval(`!localStorage.getItem('nexus.qkbest.v1.quickLinks').includes('我的博客 v2')`));

console.log("\n── browser: pomodoro ───────────────────────────────────────");
await nav("tools", "[data-testid=pomo-time]");
check("pomodoro starts at 25:00", (await cdp.eval("document.querySelector('[data-testid=pomo-time]').textContent")) === "25:00");
await cdp.eval(`document.querySelector('[data-testid=pomo-start]').click()`);
await sleep(2200);
const running = await cdp.eval("document.querySelector('[data-testid=pomo-time]').textContent");
check("countdown runs", running !== "25:00" && /^24:5[0-9]$/.test(running), running);
await cdp.eval(`document.querySelector('[data-testid=pomo-pause]').click()`);
const paused = await cdp.eval("document.querySelector('[data-testid=pomo-time]').textContent");
await sleep(1200);
check("pause freezes the clock", (await cdp.eval("document.querySelector('[data-testid=pomo-time]').textContent")) === paused, paused);
check("button switches to resume", (await cdp.eval("document.querySelector('[data-testid=pomo-start]').textContent")).includes("继续"));
await cdp.eval(`document.querySelector('[data-testid=pomo-start]').click()`);
await sleep(1200);
check("resume continues counting", (await cdp.eval("document.querySelector('[data-testid=pomo-time]').textContent")) !== paused);
await cdp.eval(`document.querySelector('[data-testid=pomo-reset]').click()`);
check("reset restores 25:00", (await cdp.eval("document.querySelector('[data-testid=pomo-time]').textContent")) === "25:00");
await cdp.eval(setVal("[data-testid=dur-focus]", "999"));
await cdp.eval(`document.querySelector('[data-testid=pomo-apply]').click()`);
await cdp.waitFor("!!document.querySelector('[data-testid=pomo-error]')", "duration validation");
check("out-of-range duration rejected", (await cdp.eval("document.querySelector('[data-testid=pomo-time]').textContent")) === "25:00");
await cdp.eval(setVal("[data-testid=dur-focus]", "1"));
await cdp.eval(`document.querySelector('[data-testid=pomo-apply]').click()`);
await cdp.waitFor(`document.querySelector('[data-testid=pomo-time]').textContent === '01:00'`, "custom duration");
check("custom duration applies", true);
check("duration persisted for next visit", await cdp.eval(`JSON.parse(localStorage.getItem('nexus.qkbest.v1.pomodoro')).focus === 1`));
// 真实走完一个 1 分钟专注 -> 自动进入休息并累计轮次
await cdp.eval(`document.querySelector('[data-testid=pomo-start]').click()`);
await cdp.waitFor(`document.querySelector('[data-testid=mode-short]').getAttribute('aria-pressed') === 'true'`, "auto break", 75000);
check("focus completion auto-switches to break", true);
check("round counter increments", (await cdp.eval("document.querySelector('[data-testid=pomo-rounds]').textContent")).includes("1"));
check("break length is 05:00", (await cdp.eval("document.querySelector('[data-testid=pomo-time]').textContent")) === "05:00");
await cdp.eval(setVal("[data-testid=dur-focus]", "25"));
await cdp.eval(`document.querySelector('[data-testid=pomo-apply]').click()`);

console.log("\n── browser: notes ──────────────────────────────────────────");
check("notes start empty", await cdp.eval("!!document.querySelector('[data-testid=note-list] .empty')"));
await cdp.eval(`document.querySelector('[data-testid=note-add]').click()`);
await sleep(250);
check("empty note is rejected", await cdp.eval("!!document.querySelector('[data-testid=note-error]')"));
await cdp.eval(`(()=>{const el=document.querySelector('[data-testid=note-input]');const s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;s.call(el,'今天要练枪，然后看完一部电影。');el.dispatchEvent(new Event('input',{bubbles:true}))})()`);
await cdp.eval(`document.querySelector('[data-testid=note-add]').click()`);
await cdp.waitFor("document.querySelectorAll('[data-testid=note-list] .note').length === 1", "note created");
check("note saved to localStorage", await cdp.eval(`JSON.parse(localStorage.getItem('nexus.qkbest.v1.notes'))[0].text.includes('练枪')`));
await cdp.eval(`document.querySelector('[data-testid=note-edit]').click()`);
await cdp.eval(`(()=>{const el=document.querySelector('[data-testid=note-edit-input]');const s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;s.call(el,'改好了：练枪 + 复盘。');el.dispatchEvent(new Event('input',{bubbles:true}))})()`);
await cdp.eval(`document.querySelector('[data-testid=note-edit-save]').click()`);
await cdp.waitFor("document.querySelector('[data-testid=note-list] .note p')?.textContent.includes('改好了')", "note edited");
check("note edit persisted", await cdp.eval(`localStorage.getItem('nexus.qkbest.v1.notes').includes('改好了')`));

console.log("\n── browser: todos ──────────────────────────────────────────");
check("todo empty state shown", await cdp.eval("!!document.querySelector('[data-testid=todo-list] .empty')"));
await cdp.eval(`document.querySelector('[data-testid=todo-add]').click()`);
await sleep(200);
check("empty todo rejected", await cdp.eval("!!document.querySelector('[data-testid=todo-error]')"));
for (const text of ["练 30 分钟枪", "看一场球赛"]) {
  await cdp.eval(setVal("[data-testid=todo-input]", text));
  await cdp.eval(`document.querySelector('[data-testid=todo-add]').click()`);
  await sleep(150);
}
await cdp.waitFor("document.querySelectorAll('[data-testid=todo-item]').length === 2", "two todos");
check("todo counter shows 2 left", (await cdp.eval("document.querySelector('[data-testid=todo-left]').textContent")).includes("2"));
await cdp.eval(`document.querySelectorAll('[data-testid=todo-toggle]')[0].click()`);
await cdp.waitFor(`document.querySelectorAll('.todo.done').length === 1`, "todo toggled");
check("done styling applied", true);
check("counter updates after completion", (await cdp.eval("document.querySelector('[data-testid=todo-left]').textContent")).includes("1"));
await cdp.eval(`document.querySelector('[data-testid=todo-filter-active]').click()`);
await cdp.waitFor("document.querySelectorAll('[data-testid=todo-item]').length === 1", "active filter");
check("active filter hides done items", true);
await cdp.eval(`document.querySelector('[data-testid=todo-filter-done]').click()`);
await cdp.waitFor("document.querySelectorAll('[data-testid=todo-item]').length === 1", "done filter");
check("done filter shows only done items", await cdp.eval("document.querySelector('[data-testid=todo-item] .todo-text').textContent === '练 30 分钟枪'"));
await cdp.eval(`document.querySelector('[data-testid=todo-filter-all]').click()`);
await cdp.eval(`document.querySelectorAll('[data-testid=todo-delete]')[0].click()`);
await cdp.waitFor("document.querySelectorAll('[data-testid=todo-item]').length === 1", "todo deleted");
check("todo delete works", true);
await cdp.eval(`document.querySelector('[data-testid=todo-clear]').click()`);
await cdp.waitFor("!!document.querySelector('[data-testid=todo-list] .empty')", "clear completed");
check("clear-completed removes done items", await cdp.eval(`JSON.parse(localStorage.getItem('nexus.qkbest.v1.todos')).length === 1`));

console.log("\n── browser: social + persistence ───────────────────────────");
await nav("social", "[data-testid=social-grid]");
check("no fake social accounts shown", (await cdp.eval("document.querySelectorAll('[data-testid=social-grid] a').length")) === 0);
check("placeholders marked as pending", (await cdp.eval("document.querySelectorAll('.social-card.pending').length")) === 4);
check("page states no public account", (await cdp.eval("!!document.querySelector('[data-testid=social-none]')")));

// reload: localStorage must survive
await nav("tools", "[data-testid=todo-list]");
await cdp.send("Page.reload", { ignoreCache: false });
await cdp.waitFor("!!document.querySelector('.site-header')", "reload");
await nav("tools", "[data-testid=note-list]");
check("notes survive a reload", (await cdp.eval("document.querySelectorAll('[data-testid=note-list] .note').length")) === 1);
check("todos survive a reload", (await cdp.eval("document.querySelectorAll('[data-testid=todo-item]').length")) === 1);
check("theme choice survives a reload", (await cdp.eval("localStorage.getItem('nexus.qkbest.v1.theme')")) === '"dark"');
await nav("links", "[data-testid=link-list]");
check("quick links survive a reload", (await cdp.eval("document.querySelectorAll('[data-testid=link-list] > *').length")) === 3);

console.log("\n── browser: responsive + console ───────────────────────────");
await nav("home", ".hero-grid");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await sleep(400);
const mobile = await cdp.eval(`(()=>{const cs=getComputedStyle(document.querySelector('.hero-grid'));return {cols:cs.gridTemplateColumns.split(' ').length, overflow:document.documentElement.scrollWidth-window.innerWidth, menu:getComputedStyle(document.querySelector('.menu-btn')).display}})()`);
check("mobile hero stacks into one column", mobile.cols === 1, JSON.stringify(mobile));
check("no horizontal overflow on mobile", mobile.overflow <= 1, String(mobile.overflow));
check("hamburger appears on mobile", mobile.menu !== "none");
await cdp.eval(`document.querySelector('.menu-btn').click()`);
await sleep(250);
check("mobile menu opens", await cdp.eval("!document.querySelector('nav.nav').classList.contains('closed')"));
await cdp.eval(`document.querySelector('nav.nav a[href="#/projects"]').click()`);
await sleep(300);
check("mobile menu closes after navigating", await cdp.eval("document.querySelector('nav.nav').classList.contains('closed')"));
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
await nav("home", ".hero-grid");
await sleep(700);

const errors = cdp.events
  .filter((e) => e.method === "Log.entryAdded" && e.params.entry.level === "error")
  .map((e) => e.params.entry.text)
  .filter((t) => !/favicon|net::ERR_/i.test(t));
check("no console errors during the whole run", errors.length === 0, errors.slice(0, 3).join(" | "));

console.log("\n── browser: screenshots ────────────────────────────────────");
for (const [name, url, w, h, mobile_] of [
  ["01-home-dark.png", "#/home", 1440, 960, false],
  ["02-interests-dark.png", "#/interests", 1440, 960, false],
  ["04-projects-dark.png", "#/projects", 1440, 960, false],
  ["05-tools-dark.png", "#/tools", 1440, 1100, false],
  ["06-links-dark.png", "#/links", 1440, 960, false],
  ["07-home-mobile.png", "#/home", 390, 844, true],
]) {
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mobile_ ? 2 : 1, mobile: mobile_ });
  await cdp.eval(`location.hash='${url.slice(1)}'`);
  await sleep(900);
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  fs.writeFileSync(path.join(shots, name), Buffer.from(shot.data, "base64"));
  console.log("  · " + name);
}

ws.close();
child.kill();
server.close();

console.log(`\n${fails.length === 0 ? "BROWSER CHECKS PASSED" : "BROWSER CHECKS FAILED"}: ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log("  FAILED: " + f);
process.exit(fails.length ? 1 : 0);
