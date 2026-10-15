// 对比度审查：直接从 src/styles/app.css 读取真实配色，按 WCAG 公式计算，
// 并把半透明面板与页面底色做 alpha 合成，得到"眼睛实际看到的"底色。
import fs from "node:fs";

const css = fs.readFileSync("C:/Users/lenovo/Documents/deepseek-harness/default-workspace/nexus/src/styles/app.css", "utf8");

/* 解析 :root 与 html[data-theme="light"] 两个变量块 */
function parseBlock(selector) {
  const i = css.indexOf(selector);
  if (i < 0) throw new Error("未找到 " + selector);
  const block = css.slice(i, css.indexOf("}", i));
  const vars = {};
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)) vars[m[1]] = m[2].trim();
  return vars;
}
const dark = parseBlock(":root {");
const light = parseBlock('html[data-theme="light"] {');

const hex = (h) => {
  const s = h.replace("#", "");
  const v = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};
const parseColor = (c) => {
  c = c.trim();
  if (c.startsWith("#")) return [...hex(c), 1];
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  throw new Error("无法解析颜色: " + c);
};
/** 前景(可能半透明)合成到不透明背景上 */
const over = (fg, bg) => {
  const a = fg[3];
  return [0, 1, 2].map((i) => Math.round(fg[i] * a + bg[i] * (1 - a)));
};
const lum = ([r, g, b]) => {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

function audit(name, v) {
  const page = hex(v["bg"]);
  const panel = over(parseColor(v["panel"]), page);      // 卡片实际底色
  const panel2 = over(parseColor(v["panel-2"]), page);   // 控件/输入框实际底色
  const rows = [
    ["正文 --text → 页面", parseColor(v["text"]), page],
    ["正文 --text → 卡片", parseColor(v["text"]), panel],
    ["正文 --text → 控件", parseColor(v["text"]), panel2],
    ["次要 --muted → 页面", parseColor(v["muted"]), page],
    ["次要 --muted → 卡片", parseColor(v["muted"]), panel],
    ["次要 --muted → 控件", parseColor(v["muted"]), panel2],
    ["最弱 --faint → 页面", parseColor(v["faint"]), page],
    ["最弱 --faint → 卡片", parseColor(v["faint"]), panel],
    ["最弱 --faint → 控件", parseColor(v["faint"]), panel2],
    ["链接体小字 --faint → 卡片", parseColor(v["faint"]), panel],
    ["危险 --danger → 卡片", parseColor(v["danger"]), panel],
    ["警告 --warn → 卡片", parseColor(v["warn"]), panel],
    ["强调 --cyan → 卡片", parseColor(v["cyan"]), panel],
  ];
  console.log(`\n===== ${name} =====`);
  console.log(`页面底色 rgb(${page.join(",")})  卡片合成 rgb(${panel.join(",")})  控件合成 rgb(${panel2.join(",")})`);
  let bad = 0;
  for (const [label, fg, bg] of rows) {
    const eff = over(fg, bg);
    const r = ratio(eff, bg);
    const ok = r >= 4.5;
    if (!ok) bad++;
    console.log(`  ${ok ? "✓" : "✗"} ${label.padEnd(26)} ${r.toFixed(2)}:1   (前景 rgb(${eff.join(",")}))`);
  }
  // 半透明状态：待办已完成 opacity .62、社交占位 opacity .68
  for (const [label, op] of [["已完成待办 opacity .62", 0.62], ["社交占位 opacity .68", 0.68]]) {
    const blend = (fg) => over([fg[0], fg[1], fg[2], op], panel);
    const r = ratio(blend(parseColor(v["text"])), panel);
    const rm = ratio(blend(parseColor(v["muted"])), panel);
    console.log(`  ${r >= 4.5 ? "✓" : "✗"} ${label} 正文 ${r.toFixed(2)}:1 / muted ${rm.toFixed(2)}:1`);
  }
  // 按钮/控件上的 hover 与 placeholder
  const ph = ratio(over(parseColor(v["faint"]), panel2), panel2);
  console.log(`  ${ph >= 4.5 ? "✓" : "✗"} 输入框占位符 --faint → 控件  ${ph.toFixed(2)}:1`);
  return bad;
}

const badDark = audit("深色模式（默认）", dark);
const badLight = audit("浅色模式", light);
console.log(`\n不达 AA(4.5:1) 的组合数：深色 ${badDark}，浅色 ${badLight}`);
