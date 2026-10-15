// 用便携版 MinGit 初始化仓库、配置并提交（推送由用户本人在本地完成）。
// 说明：这里驱动 git 二进制并继承 stdio（沙箱允许 inherit，禁止管道），输出直接回显。
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gitDir = path.join(root, "tools", "portable-git");
const gitExe = path.join(gitDir, "cmd", "git.exe");
const REMOTE = "https://github.com/QKBEST318/nexus-site.git";
const AUTHOR = "QKBEST318";
const EMAIL = "QKBEST318@users.noreply.github.com";

if (!fs.existsSync(gitExe)) {
  console.error("便携版 git 不存在:", gitExe);
  process.exit(1);
}

const env = {
  ...process.env,
  PATH: `${path.join(gitDir, "cmd")};${path.join(gitDir, "mingw64", "bin")};${process.env.PATH}`,
  GIT_EXEC_PATH: path.join(gitDir, "mingw64", "libexec", "git-core"),
  GIT_CONFIG_NOSYSTEM: "1",
  HOME: process.env.USERPROFILE,
};

const steps = [
  ["版本", ["--version"]],
  ["初始化（main 分支）", ["init", "-b", "main"]],
  ["设置提交身份（仅本仓库）", ["config", "user.name", AUTHOR], ["config", "user.email", EMAIL]],
  ["关闭 GPG 签名", ["config", "commit.gpgsign", "false"]],
  ["行尾策略（提交时转 LF）", ["config", "core.autocrlf", "true"]],
  ["配置 origin", ["remote", "add", "origin", REMOTE]],
  ["确认 origin", ["remote", "-v"]],
  ["加入所有文件", ["add", "-A"]],
];

for (const [label, ...cmds] of steps) {
  for (const args of cmds) {
    console.log(`\n=== ${label}: git ${args.join(" ")}`);
    const r = spawnSync(gitExe, args, { cwd: root, env, stdio: ["ignore", "inherit", "inherit"] });
    if (r.status !== 0) {
      console.error(`\n!! 失败 (exit ${r.status}): git ${args.join(" ")}`);
      process.exit(1);
    }
  }
}

// 待提交清单 + 敏感文件核对
console.log("\n=== 暂存区文件清单（git diff --cached --name-status）");
spawnSync(gitExe, ["diff", "--cached", "--name-status"], { cwd: root, env, stdio: ["ignore", "inherit", "inherit"] });

const listed = spawnSync(gitExe, ["diff", "--cached", "--name-only"], { cwd: root, env, stdio: ["ignore", "pipe", "inherit"] });
const files = (listed.stdout ? listed.stdout.toString() : "").split(/\r?\n/).filter(Boolean);
const bad = files.filter((f) =>
  /(^|\/)(node_modules|dist)\//.test(f) ||
  /(^|\/)\.env(\.|$)/.test(f) ||
  /\.(pem|key|p12|pfx|jks)$/i.test(f) ||
  /(^|\/)(credentials|secrets)\.json$/.test(f) ||
  /\.zip$/.test(f) ||
  /portable-git/.test(f),
);
console.log(`\n暂存文件数: ${files.length}`);
console.log("可疑/敏感文件: " + (bad.length ? bad.join(", ") : "无"));
if (bad.length) {
  console.error("!! 暂存区包含不应上传的文件，已终止");
  process.exit(1);
}

const message = [
  "feat: NEXUS 个人科技空间（QKBEST）首次提交",
  "",
  "- React 18 + TypeScript 源码，esbuild 构建（纯前端、无后端、无外部 CDN）",
  "- 首页实时时钟/兴趣展示/项目搜索与分类/快捷链接/番茄钟/便签/待办/社交预留位",
  "- 中英双语切换、深色默认 + 浅色模式，全部数据仅存 localStorage",
  "- 个人资料集中在 src/config/profile.ts；社交账号留空，不含任何虚构信息",
  "- 测试：69 项逻辑断言 + 57 项组件渲染断言 + 13 项构建产物检查，全部通过",
].join("\n");

// 用文件传提交信息，避免命令行引号转义问题
const msgFile = path.join(root, "tools", ".commit-msg.txt");
fs.writeFileSync(msgFile, message, "utf8");
console.log("\n=== 提交");
const commit = spawnSync(
  gitExe,
  ["-c", `user.name=${AUTHOR}`, "-c", `user.email=${EMAIL}`, "commit", "--no-gpg-sign", "-F", msgFile],
  { cwd: root, env, stdio: ["ignore", "inherit", "inherit"] },
);
fs.rmSync(msgFile, { force: true });
if (commit.status !== 0) {
  console.error(`\n!! 提交失败 (exit ${commit.status})`);
  process.exit(1);
}

console.log("\n=== 提交历史");
spawnSync(gitExe, ["log", "--stat", "--oneline", "-1"], { cwd: root, env, stdio: ["ignore", "inherit", "inherit"] });
console.log("\n=== 当前状态");
spawnSync(gitExe, ["status", "--short", "--branch"], { cwd: root, env, stdio: ["ignore", "inherit", "inherit"] });
console.log("\n=== 分支与远程跟踪");
spawnSync(gitExe, ["branch", "-vv"], { cwd: root, env, stdio: ["ignore", "inherit", "inherit"] });
