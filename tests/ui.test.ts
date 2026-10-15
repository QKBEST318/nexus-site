/**
 * 组件渲染测试 / component + render tests.
 *
 * ⚠️ 能力边界（如实说明，不伪造结果）
 * 沙箱禁止 Chrome 启动（进程间 mojo 通道被拒），也禁止 esbuild 这类带管道的子进程协议，
 * 所以这里用一个自写的极简 DOM shim 在 Node 里真实挂载 React 应用。
 * 已验证：应用能无错挂载、各路由渲染出正确结构/文案/无障碍属性、副作用正确写入
 * <html>/<title>/meta、本地存储数据在启动时被读回、卸载与重挂载正常、零 console 错误。
 * 未验证：点击/输入之后由 React 调度器提交的重渲染。这个 shim 环境里 React 会把更新
 * 排进队列但不排空（fiber.lanes 记录到更新，DOM 不更新），这是 shim 的局限而不是应用的
 * 缺陷。交互行为请用 tests/browser.mjs（有真实浏览器时）或按 README「人工验收清单」确认。
 */
import { flush, installDom } from "./dom";

const win = installDom("#/home");
const doc: any = win.document;

import { check, done } from "./assert";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { App } from "../src/App";

const q = (sel: string) => doc.querySelector(sel);
const qa = (sel: string) => doc.querySelectorAll(sel);
const text = (sel: string) => (q(sel)?.textContent ?? "").trim();

const errors: string[] = [];
console.error = (...a: any[]) => {
  errors.push(String(a[0]));
};

const host = doc.createElement("div");
host.setAttribute("id", "root");
doc.body.appendChild(host);
const root = createRoot(host);

const settle = async () => {
  for (let i = 0; i < 30; i++) await flush();
};
const goto = async (hash: string) => {
  win.location.hash = hash;
  await settle();
};

root.render(createElement(App));
await settle();

console.log("── mount & render ──────────────────────────────────────────");
check("React renders the app shell", !!q(".site-header") && !!q(".main") && !!q(".site-footer"));
check("no boot placeholder left behind", !q("#boot"));
check("hero shows QKBEST", text("h1").includes("QKBEST"));
check("hero shows identity + personality", text(".meta-list").includes("中国大学生") && text(".meta-list").includes("内敛"));
check("clock renders as HH:MM:SS", /^\d{2}:\d{2}:\d{2}$/.test(text("[data-testid=clock]")), text("[data-testid=clock]"));
check("date line renders", text("[data-testid=date]").length > 6);
check("generated avatar is used (no image file)", !!q(".avatar") && qa(".avatar img").length === 0);
check("nav has six entries", qa("nav.nav a").length === 6);
check("nav shows all six routes", ["首页", "兴趣", "项目", "快捷链接", "效率工具", "社交"].every((x) => doc.body.textContent.includes(x)));
check("skip link present", text(".skip").includes("跳到主内容"));
check("header exposes theme + language + menu buttons", qa(".header-tools .icon-btn").length === 3);
check("theme button has an aria-label", qa(".header-tools .icon-btn")[1].getAttribute("aria-label").length > 0);
check("language button has an aria-label", q(".lang-toggle").getAttribute("aria-label").length > 0);

console.log("\n── home sections ───────────────────────────────────────────");
check("four interest cards render", qa('[data-testid^="interest-"]').length === 4);
check("all four interest topics present", ["无畏契约", "人工智能", "篮球", "电影"].every((x) => doc.body.textContent.includes(x)));
check("each interest card has a gradient icon", qa(".interest-icon").length === 4);
check("interest cards expose tags", qa(".interest-card .tag").length >= 12);
check("project cards render on home", qa("[data-testid=project-grid] .badge").length === 4);
check("project search box exists", !!q("[data-testid=project-search]"));
check("six category filters exist", qa('[data-testid^="cat-"]').length === 6);
check("project count label present", text("[data-testid=project-count]").includes("4"));
check("social section renders four reserved slots", qa("[data-testid=social-grid] > *").length === 4);
check("no social account is clickable (all placeholders)", qa("[data-testid=social-grid] a").length === 0);
check("placeholders are marked pending", qa(".social-card.pending").length === 4);
check("page states there is no public account yet", !!q("[data-testid=social-none]"));
check("placeholder label reads 待填写", doc.body.textContent.includes("待填写"));
check("footer states local-only storage", text(".site-footer").includes("本机浏览器"));
check("footer has a reset button", !!q("[data-testid=reset-all]"));

console.log("\n── effects on the real document ────────────────────────────");
check("dark theme applied to <html>", doc.documentElement.dataset.theme === "dark");
check("language applied to <html lang>", doc.documentElement.lang === "zh-CN");
check("document title localised", String(doc.title).includes("QKBEST") && String(doc.title).includes("个人科技空间"), doc.title);
check("theme-color meta updated", q('meta[name="theme-color"]').getAttribute("content") === "#05060c");

console.log("\n── routes ──────────────────────────────────────────────────");
await goto("#/interests");
check("interests route renders the four cards", qa('[data-testid^="interest-"]').length === 4);
check("interests route drops the hero", qa("h1").length === 0);
await goto("#/projects");
check("projects route renders four cards", qa("[data-testid=project-grid] .badge").length === 4);
check("projects route keeps search + filters", !!q("[data-testid=project-search]") && qa('[data-testid^="cat-"]').length === 6);
await goto("#/links");
check("links route renders the three seeded links", qa("[data-testid=link-list] > *").length === 3);
check("seeded links are public sites only", !doc.body.textContent.includes("github.com/"));
check("links route has an add button", !!q("[data-testid=link-add]"));
await goto("#/tools");
check("tools route renders the pomodoro", !!q("[data-testid=pomo-time]") && text("[data-testid=pomo-time]") === "25:00");
check("pomodoro exposes start/reset + three duration inputs", !!q("[data-testid=pomo-start]") && !!q("[data-testid=pomo-reset]") && qa('[data-testid^="dur-"]').length === 3);
check("pomodoro ring has an accessible label", q(".pomo-ring svg").getAttribute("aria-label") === "番茄钟进度");
check("pomodoro rounds counter starts at 0", text("[data-testid=pomo-rounds]").includes("0"));
check("notes start with an empty state", !!q("[data-testid=note-list] .empty"));
check("note input + add button exist", !!q("[data-testid=note-input]") && !!q("[data-testid=note-add]"));
check("todos start with an empty state", !!q("[data-testid=todo-list] .empty"));
check("todo input + add button exist", !!q("[data-testid=todo-input]") && !!q("[data-testid=todo-add]"));
check("todo filters exist", qa('[data-testid^="todo-filter-"]').length === 3);
await goto("#/social");
check("social route renders four reserved slots", qa("[data-testid=social-grid] > *").length === 4);
await goto("#/unknown-route");
check("unknown route falls back to home", !!q("h1") && qa('[data-testid^="interest-"]').length === 4);
await goto("#/home");
check("back on home", !!q("h1") && !!q("[data-testid=clock]"));

console.log("\n── unmount / remount ───────────────────────────────────────");
root.unmount();
for (let i = 0; i < 10; i++) await flush();
check("unmount clears the tree", qa(".site-header").length === 0);

// 预先写入的数据必须在新实例启动时被读回来（localStorage → 初始 state 的真实路径）
win.localStorage.setItem("nexus.qkbest.v1.notes", JSON.stringify([{ id: "n1", text: "持久化便签", createdAt: Date.now(), updatedAt: Date.now() }]));
win.localStorage.setItem("nexus.qkbest.v1.todos", JSON.stringify([{ id: "t1", text: "持久化待办", done: false, createdAt: Date.now() }]));
win.localStorage.setItem("nexus.qkbest.v1.quickLinks", JSON.stringify([{ id: "l1", title: "本地链接", url: "https://example.com/", note: "" }]));
const root2 = createRoot(host);
root2.render(createElement(App));
await settle();
await goto("#/tools");
check("notes are restored from localStorage on boot", q("[data-testid=note-list]").textContent.includes("持久化便签"));
check("todos are restored from localStorage on boot", doc.body.textContent.includes("持久化待办"));
check("todo counter reflects restored data", text("[data-testid=todo-left]").includes("1"));
await goto("#/links");
check("quick links are restored from localStorage on boot", qa("[data-testid=link-list] > *").length === 1 && doc.body.textContent.includes("本地链接"));

const realErrors = errors.filter((e) => !/not wrapped in act|ReactDOMTestUtils.act/i.test(e));
check("no console errors during render", realErrors.length === 0, realErrors.slice(0, 2).join(" | "));

done();
