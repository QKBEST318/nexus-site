// Build + local preview server for NEXUS.
//   node tools/build.mjs                    production build -> dist/
//   node tools/build.mjs --dev              unminified + sourcemap
//   node tools/build.mjs --serve            build, then serve dist/ on 127.0.0.1:5178
//   node tools/build.mjs --watch --serve    rebuild on change and serve
//
// 依赖只来自 package.json（react / react-dom / esbuild），任何模块都不设 external。
// esbuild 优先用平台二进制（CLI）：本机 Windows 沙箱只允许 inherit / 文件描述符式的
// 子进程，管道会 EPERM，所以 CLI 是这里唯一可用的通道；在 Linux/macOS（含 GitHub
// Actions）管道可用，因此额外保留了 JS API 作为二进制缺失时的回退。
import { spawnSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const argv = process.argv.slice(2);
const dev = argv.includes("--dev");
const watch = argv.includes("--watch");
const serve = argv.includes("--serve");
const PORT = Number(process.env.PORT || 5178);

/* ------------------------------------------------------- esbuild 定位 --- */

/** 当前平台对应的 esbuild 官方二进制包名与二进制相对路径 */
function platformInfo() {
  const arch = { x64: "x64", arm64: "arm64", arm: "arm", ia32: "ia32" }[process.arch];
  const os = { win32: "win32", darwin: "darwin", linux: "linux" }[process.platform];
  if (!arch || !os) return null;
  const exe = process.platform === "win32" ? "esbuild.exe" : "esbuild";
  const sub = process.platform === "win32" ? "" : "bin";
  return { pkg: `@esbuild/${os}-${arch}`, rel: path.join(sub, exe), exe };
}

function resolveBinary() {
  if (process.env.ESBUILD_BINARY_PATH) return process.env.ESBUILD_BINARY_PATH;
  const info = platformInfo();
  const exePath = path.join(root, "node_modules", "esbuild", "bin", "esbuild.exe");
  const candidates = [
    // 官方平台包里的原生二进制（Windows: *.exe；Linux/macOS: bin/esbuild）
    info && path.join(root, "node_modules", ...info.pkg.split("/"), info.rel),
    // 兜底：Windows 上只有真正的 .exe 才能被 spawn。
    // 注意 node_modules/esbuild/bin/esbuild 是 JS 包装脚本（shebang），
    // 在 Windows 上无法直接执行，那种情况必须走 JS API。
    process.platform === "win32" ? exePath : path.join(root, "node_modules", "esbuild", "bin", "esbuild"),
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

const bin = resolveBinary();

/* ------------------------------------------------------------ 构建参数 --- */

const target = "es2020,chrome100,firefox100,safari15";

/** CLI 参数与 JS API 选项共用同一份定义，避免两套配置漂移 */
const common = {
  format: "esm",
  target,
  jsx: "automatic",
  loader: { ".tsx": "tsx", ".ts": "ts", ".css": "css" },
  entryNames: "assets/app",
  assetNames: "assets/[name]-[hash]",
  legalComments: "none",
  logLevel: "warning",
  define: { "process.env.NODE_ENV": dev ? '"development"' : '"production"' },
  minify: !dev,
  sourcemap: dev,
};

function cliArgs() {
  return [
    "src/main.tsx",
    "--bundle",
    `--format=${common.format}`,
    `--target=${common.target}`,
    `--jsx=${common.jsx}`,
    "--loader:.tsx=tsx",
    "--loader:.ts=ts",
    "--loader:.css=css",
    "--outdir=dist",
    `--entry-names=${common.entryNames}`,
    `--asset-names=${common.assetNames}`,
    "--legal-comments=none",
    "--log-level=warning",
    `--define:process.env.NODE_ENV=${common.define["process.env.NODE_ENV"]}`,
    dev ? "--sourcemap" : "--minify",
  ];
}

/** 回退路径：JS API（需要子进程管道可用，例如 Linux CI） */
async function buildWithApi() {
  const esbuild = await import("esbuild");
  // target：CLI 用逗号字符串，API 用数组，这里转换
  return esbuild.build({
    absWorkingDir: root,
    entryPoints: ["src/main.tsx"],
    bundle: true,
    outdir: dist,
    ...common,
    target: common.target.split(","),
  });
}

/* ---------------------------------------------------------------- 输出 --- */

function writeHtml() {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  fs.writeFileSync(path.join(dist, "index.html"), html.replace("/src/main.tsx", "./assets/app.js"));
}

function sizes() {
  const kb = (f) => (fs.existsSync(f) ? (fs.statSync(f).size / 1024).toFixed(1) + " kB" : "—");
  return { js: kb(path.join(dist, "assets", "app.js")), css: kb(path.join(dist, "assets", "app.css")) };
}

function resetDist() {
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
}

/* ---------------------------------------------------------------- 构建 --- */

async function buildOnce() {
  resetDist();

  if (bin) {
    const r = spawnSync(bin, cliArgs(), { cwd: root, stdio: ["ignore", "inherit", "inherit"] });
    if (r.status !== 0) {
      console.error(`esbuild CLI 失败 (exit ${r.status}, bin=${bin})`);
      process.exit(1);
    }
  } else {
    console.log("未找到 esbuild 平台二进制，回退到 JS API 构建…");
    try {
      await buildWithApi();
    } catch (e) {
      console.error("构建失败：既没有可用的 esbuild 二进制，JS API 也不可用。");
      console.error("请在项目目录执行 `npm install` 安装 package.json 中声明的依赖。");
      console.error(String(e && e.message ? e.message : e));
      process.exit(1);
    }
  }

  writeHtml();
  const s = sizes();
  console.log(`built dist/  assets/app.js ${s.js}  assets/app.css ${s.css}  (esbuild: ${bin ? "CLI binary" : "JS API"})`);
}

async function watchMode() {
  fs.mkdirSync(dist, { recursive: true });
  writeHtml();

  if (bin) {
    const child = spawn(bin, [...cliArgs(), "--watch"], { cwd: root, stdio: ["ignore", "inherit", "inherit"] });
    console.log("watching src/ for changes… (esbuild --watch)");
    process.on("SIGINT", () => {
      child.kill();
      process.exit(0);
    });
    return;
  }

  const esbuild = await import("esbuild");
  const ctx = await esbuild.context({
    absWorkingDir: root,
    entryPoints: ["src/main.tsx"],
    bundle: true,
    outdir: dist,
    ...common,
    target: common.target.split(","),
  });
  await ctx.watch();
  console.log("watching src/ for changes… (esbuild context)");
}

function serveDist() {
  const mime = {
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
    ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8",
    ".map": "application/json; charset=utf-8",
  };
  http
    .createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (p.endsWith("/")) p += "index.html";
      let file = path.join(dist, p);
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, "index.html");
      res.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      fs.createReadStream(file).pipe(res);
    })
    .listen(PORT, "127.0.0.1", () => console.log(`serving http://127.0.0.1:${PORT}/  (Ctrl+C to stop)`));
}

if (watch) {
  await watchMode();
} else {
  await buildOnce();
}

if (serve) serveDist();
