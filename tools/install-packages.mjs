// Minimal dependency installer used because npm/pnpm cannot reach the registry
// from this sandbox (CLI network + piped-stdio restrictions).
// Usage: node tools/install-packages.mjs --root <dir> pkg@range ...
import https from "node:https";
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const rootIdx = args.indexOf("--root");
const root = path.resolve(rootIdx >= 0 ? args[rootIdx + 1] : ".");
const specs = args.filter((a, i) => i !== rootIdx && i !== rootIdx + 1);
const nm = path.join(root, "node_modules");
fs.mkdirSync(nm, { recursive: true });

const cache = new Map();
const get = (url, tries = 4) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
          r.resume();
          return resolve(get(r.headers.location, tries));
        }
        if (r.statusCode !== 200) {
          r.resume();
          const err = new Error("HTTP " + r.statusCode + " " + url);
          if (tries > 1 && r.statusCode >= 500) return resolve(get(url, tries - 1));
          return reject(err);
        }
        const c = [];
        r.on("data", (d) => c.push(d));
        r.on("end", () => resolve(Buffer.concat(c)));
      })
      .on("error", (e) => (tries > 1 ? resolve(get(url, tries - 1)) : reject(e)));
  });

const metaCache = new Map();
async function meta(name) {
  if (metaCache.has(name)) return metaCache.get(name);
  const buf = await get("https://registry.npmjs.org/" + encodeURIComponent(name));
  const m = JSON.parse(buf.toString());
  metaCache.set(name, m);
  return m;
}

// --- tiny semver ------------------------------------------------------------
function parse(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(v.replace(/^v/, ""));
  if (!m) return null;
  return { maj: +m[1], min: +m[2], pat: +m[3], pre: m[4] || null };
}
function cmp(a, b) {
  for (const k of ["maj", "min", "pat"]) if (a[k] !== b[k]) return a[k] - b[k];
  if (a.pre && !b.pre) return -1;
  if (!a.pre && b.pre) return 1;
  if (a.pre && b.pre) return a.pre < b.pre ? -1 : a.pre > b.pre ? 1 : 0;
  return 0;
}
function satisfies(version, range) {
  const v = parse(version);
  if (!v || v.pre) return false;
  const parts = String(range || "*").split("||").map((s) => s.trim());
  return parts.some((part) => {
    if (!part || part === "*" || part === "latest") return true;
    return part.split(/\s+/).every((tok) => {
      if (tok.startsWith("^")) {
        const b = parse(tok.slice(1));
        if (!b) return true;
        if (cmp(v, b) < 0) return false;
        if (b.maj > 0) return v.maj === b.maj;
        if (b.min > 0) return v.maj === 0 && v.min === b.min;
        return v.maj === 0 && v.min === 0 && v.pat === b.pat;
      }
      if (tok.startsWith("~")) {
        const b = parse(tok.slice(1));
        if (!b) return true;
        return cmp(v, b) >= 0 && v.maj === b.maj && v.min === b.min;
      }
      if (/^[<>=]/.test(tok)) {
        const op = /^(>=|<=|>|<|=)/.exec(tok)[1];
        const b = parse(tok.slice(op.length));
        if (!b) return true;
        const c = cmp(v, b);
        return op === ">=" ? c >= 0 : op === "<=" ? c <= 0 : op === ">" ? c > 0 : op === "<" ? c < 0 : c === 0;
      }
      const b = parse(tok);
      return b ? cmp(v, b) === 0 : true;
    });
  });
}
async function pick(name, range) {
  const m = await meta(name);
  if (m.versions[range]) return range;
  const all = Object.keys(m.versions).filter((v) => !m.versions[v].deprecated);
  const ok = all.filter((v) => satisfies(v, range));
  if (ok.length) return ok.sort((a, b) => cmp(parse(a), parse(b))).pop();
  if (m["dist-tags"] && m["dist-tags"].latest) return m["dist-tags"].latest;
  throw new Error("no version for " + name + "@" + range);
}

// --- tar extraction ---------------------------------------------------------
function extract(tgz, dest) {
  const buf = zlib.gunzipSync(tgz);
  let off = 0;
  const written = [];
  while (off + 512 <= buf.length) {
    const hdr = buf.subarray(off, off + 512);
    const name = hdr.toString("utf8", 0, 100).replace(/\0.*/, "");
    if (!name) break;
    let size = parseInt(hdr.toString("utf8", 124, 136).replace(/\0.*/, "").trim(), 8) || 0;
    const type = hdr.toString("utf8", 156, 157);
    const prefix = hdr.toString("utf8", 345, 500).replace(/\0.*/, "");
    let full = prefix ? prefix + "/" + name : name;
    full = full.replace(/^package\//, "");
    off += 512;
    if (size && full && !full.endsWith("/")) {
      const target = path.join(dest, full);
      if (path.resolve(target).startsWith(path.resolve(dest))) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, buf.subarray(off, off + size));
        if (full.startsWith("bin/") || full.endsWith(".exe")) fs.chmodSync(target, 0o755);
        written.push(full);
      }
    }
    off += Math.ceil(size / 512) * 512;
  }
  return written;
}

// --- resolve + install ------------------------------------------------------
const plan = new Map(); // name -> {version, pkg}
const queue = [];
for (const spec of specs) {
  const at = spec.lastIndexOf("@");
  queue.push({ name: at > 0 ? spec.slice(0, at) : spec, range: at > 0 ? spec.slice(at + 1) : "latest" });
}
const warnings = [];
while (queue.length) {
  const { name, range, optional } = queue.shift();
  let version;
  try {
    version = await pick(name, range);
  } catch (e) {
    if (optional) { warnings.push("skip optional " + name + ": " + e.message); continue; }
    throw e;
  }
  if (plan.has(name)) continue;
  const m = await meta(name);
  const pkg = m.versions[version];
  plan.set(name, { version, pkg });
  for (const [dn, dr] of Object.entries(pkg.dependencies || {})) queue.push({ name: dn, range: dr });
  for (const dn of Object.keys(pkg.optionalDependencies || {})) {
    const dr = pkg.optionalDependencies[dn];
    queue.push({ name: dn, range: dr, optional: true });
  }
}
console.log("planned packages: " + plan.size);

const entries = [...plan.entries()];
let done = 0;
const workers = Array.from({ length: 8 }, async () => {
  while (entries.length) {
    const [name, { version, pkg }] = entries.shift();
    const dest = path.join(nm, ...name.split("/"));
    fs.mkdirSync(dest, { recursive: true });
    const tb = await get(pkg.dist.tarball);
    const files = extract(tb, dest);
    fs.writeFileSync(path.join(dest, "package.json"), JSON.stringify({ ...pkg, _resolved: pkg.dist.tarball }, null, 2));
    done++;
    console.log(`[${done}/${plan.size}] ${name}@${version} (${files.length} files)`);
  }
});
await Promise.all(workers);
fs.writeFileSync(path.join(root, "tools", "install-manifest.json"), JSON.stringify({
  installed: Object.fromEntries([...plan].map(([k, v]) => [k, v.version])), warnings,
}, null, 2));
console.log("WARNINGS: " + JSON.stringify(warnings));
console.log("DONE");
