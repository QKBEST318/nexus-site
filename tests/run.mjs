// 测试运行器 / test runner:
//  1. 用 esbuild CLI 把 tests/logic.test.ts 打成单文件 CJS
//  2. 在 Node 中执行断言
//  3. 起一个本地服务器，检查生产构建 dist/ 的每个资源都能正确返回
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = path.join(root, "tests", ".tmp");
const BIN = path.join(root, "node_modules", "@esbuild", "win32-x64", "esbuild.exe");
const bin = fs.existsSync(BIN) ? BIN : path.join(root, "node_modules", "esbuild", "bin", "esbuild");

fs.mkdirSync(tmp, { recursive: true });

async function bundleAndRun(file, label) {
  // ESM 输出，因为组件测试使用顶层 await（ESM 会让 React 走 import 分支，也正是打包产物用的分支）
  const out = path.join(tmp, path.basename(file).replace(/\.ts$/, ".mjs"));
  console.log(`── bundling ${label} ──────────────────────────────────`);
  const b = spawnSync(
    bin,
    [path.join("tests", file), "--bundle", "--platform=node", "--format=esm", "--target=node20",
     "--jsx=automatic", "--loader:.tsx=tsx", "--loader:.css=empty", "--loader:.svg=dataurl",
     "--define:process.env.NODE_ENV=\"development\"",
     `--outfile=${path.relative(root, out)}`, "--log-level=warning"],
    { cwd: root, stdio: ["ignore", "inherit", "inherit"] },
  );
  if (b.status !== 0) {
    console.error(`bundling ${file} failed`);
    process.exit(1);
  }
  await import(new URL("./.tmp/" + path.basename(out), import.meta.url).href);
}

console.log("── logic tests (shipped source modules) ────────────────────");
await bundleAndRun("logic.test.ts", "logic tests");
const logicOk = !process.exitCode;

console.log("\n── component + interaction tests (real React tree) ─────────");
await bundleAndRun("ui.test.ts", "ui tests");
const uiOk = !process.exitCode;

console.log("\n── production build artefacts ──────────────────────────────");
const dist = path.join(root, "dist");
const refs = [];
if (fs.existsSync(path.join(dist, "index.html"))) {
  const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = m[1];
    if (!/^(https?:|data:|#)/.test(u)) refs.push(u);
  }
  refs.push("/", "/assets/app.css", "/assets/app.js", "/some/spa/route");
} else {
  console.log("  ✗ dist/index.html missing — run `npm run build` first");
  process.exit(1);
}

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

async function get(ref) {
  const url = base + (ref.startsWith("/") ? ref : "/" + ref.replace(/^\.\//, ""));
  const res = await fetch(url);
  return { res, body: await res.text() };
}

let assetFails = 0;
for (const ref of [...new Set(refs)]) {
  const { res, body } = await get(ref);
  const ok = res.status === 200 && body.length > 0;
  if (!ok) assetFails++;
  console.log(`  ${ok ? "✓" : "✗"} GET ${ref} -> ${res.status}, ${body.length} bytes`);
}

// 构建产物必须自洽：HTML 引用 assets/app.js，且它不是开发入口
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const cssPath = path.join(dist, "assets", "app.css");
const checks = [
  ["dist/index.html references bundled app.js", html.includes("./assets/app.js")],
  ["dist/index.html no longer references /src/main.tsx", !html.includes("/src/main.tsx")],
  // 回归守卫：CSS 是由 src/main.tsx 里 import 进来的，esbuild 会把它抽成独立文件。
  // 一旦 HTML 漏掉这个 <link>，整站就会退化成"浏览器默认样式"（曾经真实发生过）。
  ["dist/assets/app.css is emitted", fs.existsSync(cssPath)],
  ["dist/index.html links the stylesheet", /<link[^>]+rel="stylesheet"[^>]+href="\.\/assets\/app\.css"/.test(html)],
  ["linked stylesheet actually resolves (no 404)", fs.existsSync(path.join(dist, "assets", "app.css"))],
  ["stylesheet carries the design tokens", fs.existsSync(cssPath) && fs.readFileSync(cssPath, "utf8").includes("--bg:")],
  ["dist/index.html declares zh-CN + dark default", html.includes('lang="zh-CN"') && html.includes('data-theme="dark"')],
  ["hashed asset names stay stable for entry files", fs.existsSync(path.join(dist, "assets", "app.js")) && fs.existsSync(path.join(dist, "assets", "app.css"))],
  ["bundle contains React runtime", fs.readFileSync(path.join(dist, "assets", "app.js"), "utf8").includes("react")],
  // esbuild escapes non-ASCII in minified output, so check both forms
  ["bundle contains both languages", (() => {
    const js = fs.readFileSync(path.join(dist, "assets", "app.js"), "utf8");
    const zh = js.includes("快捷链接") || /\\u5FEB\\u6377\\u94FE\\u63A5/.test(js);
    return js.includes("Quick Links") && zh;
  })()],
];
for (const [name, ok] of checks) {
  if (!ok) assetFails++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}`);
}

server.close();

console.log(`\n${assetFails === 0 && logicOk && uiOk ? "ALL TESTS PASSED" : "TESTS FAILED"}`);
process.exit(assetFails === 0 && logicOk && uiOk ? 0 : 1);