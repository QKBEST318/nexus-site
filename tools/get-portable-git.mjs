// 下载便携版 Git（MinGit）到工作区 tools/portable-git 并解压。
// 用 https 流写盘，避免沙箱对子进程管道的限制。
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const target = path.join(here, "portable-git");
const zip = path.join(here, "MinGit.zip");
const url =
  "https://github.com/git-for-windows/git/releases/download/v2.56.0.windows.2/MinGit-2.56.0.2-64-bit.zip";

function download(url, dest, redirects = 6) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "user-agent": "nexus-setup" } }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && redirects > 0) {
          r.resume();
          const next = r.headers.location.startsWith("http")
            ? r.headers.location
            : new URL(r.headers.location, url).toString();
          return resolve(download(next, dest, redirects - 1));
        }
        if (r.statusCode !== 200) {
          r.resume();
          return reject(new Error("HTTP " + r.statusCode));
        }
        const out = fs.createWriteStream(dest);
        r.pipe(out);
        out.on("finish", () => resolve(fs.statSync(dest).size));
        out.on("error", reject);
      })
      .on("error", reject);
  });
}

if (!fs.existsSync(zip)) {
  console.log("downloading MinGit ...");
  const size = await download(url, zip);
  console.log("downloaded:", (size / 1048576).toFixed(1) + " MB");
} else {
  console.log("zip already present:", (fs.statSync(zip).size / 1048576).toFixed(1) + " MB");
}

if (!fs.existsSync(target)) {
  fs.mkdirSync(target, { recursive: true });
  console.log("extracting with Expand-Archive ...");
  const r = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${target}' -Force`],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
  console.log("Expand-Archive exit:", r.status, r.error ? r.error.message : "");
}

const gitExe = path.join(target, "cmd", "git.exe");
console.log("git.exe present:", fs.existsSync(gitExe));
if (fs.existsSync(gitExe)) {
  const v = spawnSync(gitExe, ["--version"], { stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, GIT_EXEC_PATH: path.join(target, "mingw64", "libexec", "git-core"), PATH: `${target}\\cmd;${target}\\mingw64\\bin;${process.env.PATH}` } });
  console.log("version check exit:", v.status);
}
