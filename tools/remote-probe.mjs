// 用 GitHub 公共 API 核实仓库状态（不涉及任何凭据）
import fs from "node:fs";
import https from "node:https";

const get = (url, opts = {}) =>
  new Promise((resolve, reject) => {
    https.get(url, { headers: { "user-agent": "nexus-probe", accept: "application/vnd.github+json", ...(opts.headers || {}) }, ...opts }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        r.resume();
        return resolve(get(r.headers.location));
      }
      const c = [];
      r.on("data", (d) => c.push(d));
      r.on("end", () => resolve({ status: r.statusCode, headers: r.headers, body: Buffer.concat(c).toString("utf8") }));
    }).on("error", reject);
  });

const out = [];
const repo = await get("https://api.github.com/repos/QKBEST318/nexus-site");
out.push("repo API status: " + repo.status);
if (repo.status === 200) {
  const j = JSON.parse(repo.body);
  out.push(`full_name: ${j.full_name}`);
  out.push(`private: ${j.private}  default_branch: ${j.default_branch}  size: ${j.size}KB`);
  out.push(`pushed_at: ${j.pushed_at}  created_at: ${j.created_at}`);
  out.push(`permissions(anon): ${JSON.stringify(j.permissions || null)}`);
} else if (repo.status === 404) {
  out.push("仓库不存在，或它不允许匿名读取（比如是私有仓库）");
}
for (const ref of ["main", "master"]) {
  const r = await get(`https://api.github.com/repos/QKBEST318/nexus-site/commits/${ref}`);
  out.push(`branch ${ref}: HTTP ${r.status}`);
  if (r.status === 200) {
    const c = JSON.parse(r.body);
    out.push(`  head: ${c.sha.slice(0, 8)} "${(c.commit.message || "").split("\n")[0]}" by ${c.commit.author?.name}`);
  }
}
const tags = await get("https://api.github.com/repos/git-for-windows/git/releases/latest");
out.push("git-for-windows latest: HTTP " + tags.status);
if (tags.status === 200) {
  const t = JSON.parse(tags.body);
  out.push("tag: " + t.tag_name);
  for (const a of t.assets) {
    if (/MinGit-.*-64-bit\.zip$/i.test(a.name) || /PortableGit-.*-64-bit\.7z\.exe$/i.test(a.name)) {
      out.push(`asset: ${a.name}  ${(a.size / 1048576).toFixed(1)}MB`);
      out.push(`url: ${a.browser_download_url}`);
    }
  }
}

fs.writeFileSync("C:/Users/lenovo/Documents/deepseek-harness/default-workspace/nexus/tools/remote-probe.log", out.join("\n"));
console.log(out.join("\n"));
