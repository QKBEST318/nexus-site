// 端到端检查：构建 → 起服务器 → 用真实 HTTP 请求取回页面与资源 → 关掉服务器
// end-to-end check of the production build over real HTTP.
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;
const PORT = 5199;

const server = spawn(node, [path.join(root, "tools", "build.mjs"), "--serve"], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "ignore", "inherit"],
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = (u, tries = 6) =>
  new Promise((resolve) => {
    const attempt = (n) => {
      const req = http.get({ host: "127.0.0.1", port: PORT, path: u, agent: false }, (res) => {
        const c = [];
        res.on("data", (d) => c.push(d));
        res.on("end", () => resolve({ status: res.statusCode, type: res.headers["content-type"], body: Buffer.concat(c) }));
      });
      req.on("error", async () => {
        if (n > 1) {
          await sleep(300);
          attempt(n - 1);
        } else resolve({ status: 0, type: "", body: Buffer.alloc(0) });
      });
    };
    attempt(tries);
  });

let fails = 0;
const check = (name, ok, detail) => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) fails++;
};

try {
  await sleep(1500);
  const home = await get("/");
  check("GET / returns 200 html", home.status === 200 && String(home.type).includes("text/html"), `${home.status} ${home.type}`);
  const html = home.body.toString("utf8");
  check("served html references the bundled script", html.includes("./assets/app.js"));
  check("served html has the QKBEST title", html.includes("NEXUS") && html.includes("QKBEST"));
  check("served html keeps dark theme default", html.includes('data-theme="dark"'));

  const js = await get("/assets/app.js");
  check("GET /assets/app.js returns 200 js", js.status === 200 && String(js.type).includes("javascript"), `${js.status} ${js.body.length}B`);
  check("bundle contains the React runtime", js.body.toString("utf8").includes("react"));

  const css = await get("/assets/app.css");
  check("GET /assets/app.css returns 200 css", css.status === 200 && String(css.type).includes("css"), `${css.status} ${css.body.length}B`);
  check("stylesheet contains the design tokens", css.body.toString("utf8").includes("--violet"));

  const deep = await get("/tools");
  check("unknown path falls back to index.html (SPA)", deep.status === 200 && deep.body.toString("utf8").includes("<!doctype html>"));

  const missing = await get("/assets/nope.js");
  check("missing asset falls back to the shell without crashing", missing.status === 200);
} finally {
  server.kill();
}

console.log(`\n${fails === 0 ? "HTTP CHECKS PASSED" : "HTTP CHECKS FAILED"}`);
process.exit(fails ? 1 : 0);
