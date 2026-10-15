// Build + local preview server for NEXUS.
//   node tools/build.mjs                    production build -> dist/
//   node tools/build.mjs --dev              unminified + sourcemap
//   node tools/build.mjs --serve            build, then serve dist/ on 127.0.0.1:5178
//   node tools/build.mjs --watch --serve    rebuild on change and serve
//
// NOTE: esbuild is driven through its CLI binary, not the JS API. In this
// sandbox a child process may only be spawned with `stdio: "ignore"` or real
// file descriptors - pipes raise EPERM - so the JS service protocol is
// unavailable. The CLI path is functionally identical.
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

const BIN = path.join(root, "node_modules", "@esbuild", "win32-x64", process.platform === "win32" ? "esbuild.exe" : "esbuild");
const bin = fs.existsSync(BIN)
  ? BIN
  : path.join(root, "node_modules", "esbuild", "bin", "esbuild");

function writeHtml() {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  fs.writeFileSync(path.join(dist, "index.html"), html.replace("/src/main.tsx", "./assets/app.js"));
}

function cliArgs() {
  return [
    "src/main.tsx",
    "--bundle",
    "--format=esm",
    "--target=es2020,chrome100,firefox100,safari15",
    "--jsx=automatic",
    "--loader:.tsx=tsx",
    "--loader:.ts=ts",
    "--loader:.css=css",
    "--outdir=dist",
    "--entry-names=assets/app",
    "--asset-names=assets/[name]-[hash]",
    "--legal-comments=none",
    "--log-level=warning",
    '--define:process.env.NODE_ENV="' + (dev ? "development" : "production") + '"',
    dev ? "--sourcemap" : "--minify",
  ];
}

function sizes() {
  const kb = (f) => (fs.existsSync(f) ? (fs.statSync(f).size / 1024).toFixed(1) + " kB" : "—");
  return { js: kb(path.join(dist, "assets", "app.js")), css: kb(path.join(dist, "assets", "app.css")) };
}

function buildOnce() {
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
  const r = spawnSync(bin, cliArgs(), { cwd: root, stdio: ["ignore", "inherit", "inherit"] });
  if (r.status !== 0) {
    console.error("build failed (exit " + r.status + ")");
    process.exit(1);
  }
  writeHtml();
  const s = sizes();
  console.log(`built dist/  assets/app.js ${s.js}  assets/app.css ${s.css}`);
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
  fs.mkdirSync(dist, { recursive: true });
  writeHtml();
  const child = spawn(bin, [...cliArgs(), "--watch"], { cwd: root, stdio: ["ignore", "inherit", "inherit"] });
  console.log("watching src/ for changes…");
  process.on("SIGINT", () => {
    child.kill();
    process.exit(0);
  });
} else {
  buildOnce();
}

if (serve) serveDist();
