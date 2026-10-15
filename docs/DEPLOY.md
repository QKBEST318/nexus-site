# 推送与上线 / Push & Deploy

本地仓库已经准备好了：分支 `main`、远程 `origin` 已配置、首次提交已完成。
**剩下只需在你自己的终端跑一条推送命令**（下面 A 段），因为推送需要 GitHub 授权，
沙箱里没有、也不应该有你的凭据。

---

## A. 推送（你在本地执行，只需一次）

仓库路径：`C:\Users\lenovo\Documents\deepseek-harness\default-workspace\nexus`

**A1. 如果你本机已装 Git**（推荐）——打开 PowerShell：

```powershell
cd C:\Users\lenovo\Documents\deepseek-harness\default-workspace\nexus
git status                              # 应显示 "On branch main" 且无未提交改动
git push -u origin main
```

`git push` 会弹出 GitHub 登录窗口（Git Credential Manager / 浏览器授权），
登录 `QKBEST318` 账号并同意即可。登录信息由 Windows 凭据管理器保管，
**不会写进仓库**。

**A2. 如果本机也没装 Git** —— 用仓库里已经下好的便携版：

```powershell
cd C:\Users\lenovo\Documents\deepseek-harness\default-workspace\nexus
$git = "$PWD\tools\portable-git\cmd\git.exe"
$env:GIT_EXEC_PATH = "$PWD\tools\portable-git\mingw64\libexec\git-core"
$env:PATH = "$PWD\tools\portable-git\cmd;$PWD\tools\portable-git\mingw64\bin;$env:PATH"
& $git push -u origin main
```

> 便携版没有自带凭据管理器，可能不会弹窗。若提示需要用户名密码，
> 用 GitHub 的 **Personal Access Token** 当密码（用户名填 `QKBEST318`），
> 或者先安装 Git for Windows 用 A1 的方式。

**推送后自检**：打开 <https://github.com/QKBEST318/nexus-site> ，应能看到 41 个文件
和一条提交 `feat: NEXUS 个人科技空间（QKBEST）首次提交`，默认分支为 `main`。

---

## B. 部署到公网（二选一）

两种方式都只需要把 `dist/` 目录的内容上传/发布出去。先在本地构建：

```powershell
cd C:\Users\lenovo\Documents\deepseek-harness\default-workspace\nexus
node tools\build.mjs        # 产出 dist/index.html + dist/assets/{app.js,app.css}
```

### 方式 1：Cloudflare Pages（推荐，国内访问相对友好）

**网页拖拽，最快：**
1. <https://dash.cloudflare.com/> → 左侧 **Workers & Pages** → **Create** → **Pages** → **Upload assets**
2. 项目名 `nexus-site`，把 `dist` 文件夹**里的内容**拖进去（`index.html` 必须在最外层）
3. **Deploy site** → 得到 `https://nexus-site.pages.dev`

顺手把响应头一起带上（可选）：把 [`docs/_headers`](_headers) 复制到 `dist/` 根目录再一起上传，
可获得 `nosniff` / CSP / 长期缓存等安全头。

**命令行：**
```powershell
$env:CLOUDFLARE_API_TOKEN="你的token"      # 控制台 → My Profile → API Tokens
$env:CLOUDFLARE_ACCOUNT_ID="你的account id"
npx wrangler pages deploy dist --project-name=nexus-site
```

### 方式 2：GitHub Pages（仓库里已经带了 workflow）

推送完成后：
1. 仓库 → **Settings** → **Pages** → *Build and deployment* → Source 选 **GitHub Actions**
2. 推送会触发 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)（`npm install --no-save esbuild` + `node tools/build.mjs` + 发布 `dist`）
3. Actions 变绿后访问 `https://qkbest318.github.io/nexus-site/`

因为资源用相对路径（`./assets/…`）且路由是 hash（`#/tools`），**子路径部署不需要改任何配置**。

---

## C. 部署后需要人工确认的事

见 [`docs/MANUAL-CHECKLIST.md`](MANUAL-CHECKLIST.md)（9 组约 40 条可见行为）。
重点是：中英切换、深浅色、快捷链接增删改、番茄钟计时、便签/待办、刷新后数据仍在。

---

## D. 沙箱环境的限制（如实记录）

| 事项 | 结果 |
| --- | --- |
| 本机是否有 Git | ❌ 没有（PATH 中无 `git`，常见安装目录也没有）→ 已下载便携版 MinGit 2.56.0 到 `tools/portable-git/`（已 gitignore） |
| GitHub CLI | ❌ 没有 |
| 凭据 | ❌ 无 token、无 SSH key、无 `.git-credentials`、无凭据管理器 |
| git push | ❌ 未执行。授权范围内也不应执行（用户选择自己在本地推送） |
| git ls-remote（只读） | ❌ 失败：`schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS` —— 沙箱访问不到 Windows 证书存储，**任何 HTTPS git 操作在此环境都不可用** |
| 仓库状态（改走 GitHub API） | ✅ public、0 KB、默认分支 `main`、**零提交**（`commits/main` 返回 409） |
| 本地 init / add / commit | ✅ 成功，提交 `0372693`，41 个文件，5189 行 |
| 生产构建 | ✅ `dist/assets/app.js` 184.4 kB、`app.css` 18.8 kB |
| 测试 | ✅ 69 逻辑 + 57 组件渲染 + 13 构建产物，全部通过 |

`tools/get-portable-git.mjs`、`tools/git-setup.mjs`、`tools/remote-probe.mjs` 是本次为完成
「检查环境 → 建仓 → 提交」而写的辅助脚本，保留在仓库里便于复现，不含任何凭据。
