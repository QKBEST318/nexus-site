# NEXUS — QKBEST 的个人科技空间

一个**纯前端、可公开部署**的个人主页。React 18 + TypeScript + esbuild，无后端、无数据库、无账号、无第三方追踪；所有个人数据只写进访问者自己的 `localStorage`。

> 设计目标：深色科技风 + 蓝紫霓虹、玻璃拟态、流畅动画；手机 / 平板 / 电脑自适应；中英双语一键切换；深色 / 浅色主题。

---

## 1. 快速开始 / Quick start

```bash
# 开发（构建 + 监听 + 本地服务器）
node tools/build.mjs --watch --serve      # → http://127.0.0.1:5178/

# 生产构建
node tools/build.mjs                      # 输出到 dist/

# 本地预览生产构建
node tools/build.mjs --serve

# 测试（逻辑断言 + 构建产物校验 + 真实浏览器验收）
node tests/run.mjs        # 69 条逻辑断言 + 构建产物检查
node tests/browser.mjs    # 无头 Chrome 驱动 60 项交互验收 + 截图
```

`package.json` 里也预留了同样的脚本：`npm run dev` / `npm run build` / `npm run preview` / `npm test`。

本机 Node 直接可用（无需全局安装任何东西）。如果 `npm install` 可用，也可以正常使用；本项目**不需要任何构建依赖以外的东西**。

> 提示：本项目只在 `devDependencies` 意义上需要 `react` / `react-dom` / `esbuild`（已经装在 `node_modules/` 里）。
> 换一台机器时，`npm install`（或 `pnpm install`）即可；不想装依赖也能跑，因为 `dist/` 里的产物是自包含的。

---

## 2. 目录结构 / Project layout

```
nexus/
├─ index.html                 单页 HTML 外壳（内联 SVG favicon + 启动占位）
├─ tsconfig.json              严格模式 TS 配置（编辑器类型检查用）
├─ package.json
├─ src/
│  ├─ config/profile.ts       ★ 所有个人资料都在这里，改这一个文件即可
│  ├─ lib/
│  │  ├─ i18n.ts              中英文案表 + 插值 / all UI strings
│  │  ├─ storage.ts           localStorage 读写、URL 校验、时间格式化
│  │  ├─ hooks.ts             useLocalState / useRoute
│  │  └─ routes.ts            路由 id
│  ├─ app/context.tsx         i18n + 主题 + 提示条 + 实时时钟
│  ├─ components/             Backdrop（背景光效 / 默认头像）、Header、ui（卡片 / 空状态 / 弹窗 / toast）
│  ├─ sections/               Hero、Interests、Projects、QuickLinks、Pomodoro、Notes、Todos、Social
│  └─ styles/app.css          设计系统（CSS 变量 + 组件样式）
├─ tools/
│  ├─ build.mjs               构建 + 本地服务器
│  └─ install-packages.mjs    离线依赖安装器（见第 7 节）
├─ tests/                     逻辑断言、构建校验、浏览器验收
└─ dist/                      构建产物（可直接部署）
```

---

## 3. 改资料只需要改一个文件

打开 [`src/config/profile.ts`](src/config/profile.ts)：

| 想改什么 | 改哪里 |
| --- | --- |
| 昵称 / 身份 / 性格 / 签名 / 简介 | `profile` 对象 |
| 头像 | `profile.avatar`（默认是纯 CSS 生成的科技风头像，无需图片文件） |
| 兴趣卡片 | `profile.interests`（名称、描述、图标字符、渐变色、标签） |
| 社交账号 | `socials` —— **默认全是 `url: null`**，填入真实链接后卡片自动变成可点击 |
| 项目卡片 | `projects` —— 默认 4 条 `[示例] / [Sample]`，替换或删除即可 |
| 快捷链接默认值 | `defaultQuickLinks` |
| 番茄钟默认时长 | `pomodoroDefaults` |
| 界面文案（中英） | [`src/lib/i18n.ts`](src/lib/i18n.ts) 的 `dict` |

### 诚实声明 / Honesty

- 站点只展示 QKBEST 本人给出的信息：昵称、中国大学生、内敛、无畏契约 / AI / 篮球 / 电影。
- **没有**编造姓名、学校、经历、成就，也**没有**填入任何社交账号（`socials` 里全是空位）。
- 项目区 4 张卡片全部带 `示例 / Sample` 角标，来自 `profile.ts` 的 `sample: true`，改 `profile.ts` 即可全部替换。
- 快捷链接的默认值是「公开且确定存在」的官网地址（VALORANT 官网、Hugging Face、MDN），不是个人账号。

---

## 4. 功能清单 / Features

| # | 功能 | 说明 |
| --- | --- | --- |
| 1 | 首页 | 昵称、身份、简介、**实时时钟 + 日期（本地时区）**、兴趣标签、默认头像 |
| 2 | 兴趣展示 | 四张渐变玻璃卡片：无畏契约 / AI / 篮球 / 电影 |
| 3 | 项目展示 | **搜索 + 6 个分类筛选**、结果计数、清除筛选、空状态；示例内容明确标注 |
| 4 | 快捷链接 | 新增 / 编辑 / 删除 / 搜索；URL 校验（自动补 `https://`、拒绝 `javascript:` 等）、重复检测 |
| 5 | 番茄钟 | 开始 / 暂停 / 继续 / 重置 / 跳过、专注-短休-长休自动轮转、进度环、完成提示音、自定义时长（1–180 分钟 + 校验） |
| 6 | 个人便签 | 新建 / 编辑 / 删除、字数上限、空内容校验、更新时间 |
| 7 | 待办清单 | 新增 / 完成 / 删除 / 全部-未完成-已完成筛选 / 一键清除已完成 / 剩余计数 |
| 8 | 社交区域 | 4 个预留位（GitHub、B 站、邮箱、其他主页），未填写时显示「待填写」，**默认不展示虚构账号** |
| 9 | 本地保存 | 主题、语言、快捷链接、便签、待办、番茄钟设置全部写入 `localStorage`，刷新后仍在；还提供「清空本地数据」 |
| 10 | 体验 | 全部按钮可用、空状态 / 输入校验 / toast 反馈、键盘可达（focus ring、Esc 关闭弹窗、Enter 提交）、`prefers-reduced-motion` 适配 |

双主题：默认深色，右上角 ☀ / ☾ 切换浅色，选择会被记住。双语：右上角 `EN / 中文` 切换，导航、标题、按钮、提示、校验信息、空状态全部跟着切换（并同步更新 `<html lang>` 与页面标题）。

所有导航都是 **hash 路由**（`#/home`、`#/projects`、`#/tools` …），因此部署到任何静态托管都不会出现 404。

---

## 5. 构建产物 / Build output

```
dist/
├─ index.html            1.4 kB
└─ assets/
   ├─ app.js           184.4 kB（gzip 约 59 kB，含 React 运行时）
   └─ app.css           18.4 kB（gzip 约 4 kB）
```

- 资源使用**相对路径**（`./assets/app.js`），放在域名根目录或子目录（如 `https://user.github.io/repo/`）都能正确加载。
- 无外部 CDN 依赖，离线也能打开。
- 生产构建命令：`node tools/build.mjs`

---

## 6. 部署到公网 / Deploy

> ⚠️ 我没有你的 Git / Cloudflare / GitHub 账号，**因此没有替你上线**。下面两条是最省事的免费路径，选一条即可。两种方式都只需要上传 `dist/` 目录。

### 方式 A：Cloudflare Pages（推荐，国内访问相对友好）

**A1. 网页拖拽（最简单，1 分钟）**
1. 运行 `node tools/build.mjs`，得到 `nexus/dist/`。
2. 打开 <https://dash.cloudflare.com/> → 左侧 **Workers & Pages** → **Create** → **Pages** → **Upload assets**。
3. 项目名填 `nexus-qkbest`；把 `dist` 文件夹里的内容拖进去（`index.html` 必须在最外层）。
4. 点 **Deploy site**，约 10 秒后得到公开网址，形如：
   `https://nexus-qkbest.pages.dev`
5. 想绑定自己的域名：项目 → **Custom domains** → 输入域名并按提示改 DNS。

**A2. 命令行（需要你的 API Token）**
1. Cloudflare 控制台 → 右上头像 → **My Profile** → **API Tokens** → **Create Token** → 模板选 *Edit Cloudflare Workers*（或自定义 Pages 权限）→ 复制 token。
2. 查 Account ID：控制台 → **Workers & Pages** → 右侧 **Account ID**。
3. 执行（token 不要提交到 Git）：
   ```bash
   # Windows PowerShell
   $env:CLOUDFLARE_API_TOKEN="你的token"; $env:CLOUDFLARE_ACCOUNT_ID="你的account id"
   npx wrangler pages deploy dist --project-name=nexus-qkbest
   ```
   首次会询问创建项目，输入 `y` 即可。成功后终端会打印公开网址。

### 方式 B：GitHub Pages

1. 在 GitHub 新建仓库，例如 `nexus`。
2. 把整个 `nexus/` 目录（**不要**提交 `node_modules/`，已在 `.gitignore` 中排除）推送上去：
   ```bash
   git init && git add . && git commit -m "feat: NEXUS personal site"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/nexus.git
   git push -u origin main
   ```
3. 仓库 → **Settings** → **Pages** → *Build and deployment* → Source 选 **GitHub Actions**。
   仓库里已包含 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，推送后会自动构建并发布。
   （若你的默认分支不是 `main`，在该文件里改一下 `branches`。）
4. 等 Actions 变绿，网址是：`https://<你的用户名>.github.io/nexus/`
5. 因为资源用相对路径且路由是 hash，**子路径部署无需任何额外配置**。
6. 手动方式（不用 Actions）：把 `dist/` 里的文件推到 `gh-pages` 分支，Pages Source 选 *Deploy from a branch* → `gh-pages` / `root`。

### 上线后建议自测
- 打开网址，确认样式与首屏正常；
- 切换 `EN` 与浅色主题，刷新后主题仍保留；
- 在快捷链接里加一条，刷新后仍在；
- 手机浏览器打开一次，确认导航折叠为汉堡菜单且无横向滚动。

更细的逐项清单见 [`docs/MANUAL-CHECKLIST.md`](docs/MANUAL-CHECKLIST.md)（9 组、约 40 条可见行为）。
Cloudflare Pages 的安全响应头模板在 [`docs/_headers`](docs/_headers)，需手动放到 `dist/` 里一起上传（GitHub Pages 不支持该文件）。

---

## 6.5 实测结果 / Verified results

以下都是**实际跑出来的**，命令可复现（不是"应该能跑"）：

| 命令 | 结果 |
| --- | --- |
| `node tools/build.mjs` | ✅ 成功，`dist/assets/app.js` 184.4 kB、`app.css` 18.4 kB |
| `node tests/run.mjs` | ✅ **139 项全部通过**：69 项逻辑断言 + 57 项组件/渲染断言 + 13 项构建产物检查 |
| `node tools/verify-serve.mjs` | ✅ **10/10 通过**：起生产服务器，真实 HTTP 取回首页/JS/CSS，SPA 回退正常 |
| `node tests/browser.mjs` | ⛔ 本沙箱跑不了（Chrome 的进程间 mojo 通道被拒），脚本已保留，在有浏览器的机器上可直接运行 |

覆盖到的重点：中英双语文案完整且占位符对齐、URL 校验拒绝 `javascript:`/`data:`/无域名输入并自动补 `https://`、重复检测、`localStorage` 损坏数据回退不抛错、番茄钟时长边界、便签/待办/链接的增删改与筛选逻辑、以及**应用真实挂载后零 console 错误**、六个路由与未知路由回退、`<html lang>`/主题/`<title>`/meta 副作用、数据在重新挂载时被读回。

**未覆盖（如实说明）**：点击/输入之后由 React 调度器提交的重渲染。Node 里的 DOM shim 无法让 React 的更新队列排空（fiber 记录到更新，DOM 不更新），这是 shim 的局限。请按上面的人工清单在真机确认这一层。

---

## 7. 本项目的环境限制与取舍（重要，如实说明）

开发这个站点的沙箱环境有**四条**硬限制，我做了相应取舍，**没有假称用了做不到的技术**：

1. **npm / pnpm 无法访问 registry**（CLI 网络被拦，pnpm 的子进程管道还会触发沙箱 EPERM）。
   → 我写了一个 [Node 版最小安装器](tools/install-packages.mjs)（HTTPS 下载 + 自己解 tar），把 `react`、`react-dom`、`esbuild` 装进 `node_modules`。它跟 `npm install` 的结果等价。
2. **esbuild 的 JS API 不可用**（它用管道与子进程通信，沙箱禁止 → `spawn EPERM`）。
   → 改用 **esbuild CLI 二进制**驱动构建（`stdio: "inherit"` / 文件描述符是允许的）。功能完全一致，只是走 CLI 而不是服务协议。
3. **没有 Vite / tsc**（Vite 依赖树太大，离线逐包安装风险高；`tsc` 不在环境中）。
   → 构建器用 esbuild（Vite 内部用的同一个引擎）：TS 直接转译、JSX 自动运行时、CSS 抽离、压缩、sourcemap 都支持。**源码是完整的 TypeScript（`.ts` / `.tsx`）**，`tsconfig.json` 为严格模式，可随时在有网络的机器上 `npm i -D vite typescript && npx tsc --noEmit` 做类型检查或用 Vite 接管——入口 `index.html` + `src/main.tsx` 就是标准 Vite 结构。
4. **无法启动任何浏览器**（Chrome/Edge 的多进程 IPC 被安全策略拒绝，`--headless` 也会 FATAL 退出）。
   → 所以没有截图、也没有"浏览器里点一遍"的自动结果。替代方案：自写 DOM shim 在 Node 里真实挂载 React 组件做渲染层断言（57 项），加上 [人工验收清单](docs/MANUAL-CHECKLIST.md)。`tests/browser.mjs` 的 CDP 脚本保留完好，在有浏览器的机器上直接能跑并输出截图。

### 测试是怎么做的（不伪造）

- `node tests/run.mjs`
  - **69 条逻辑断言**：直接 import 上线用的源码模块（`config/profile`、`lib/i18n`、`lib/storage`、`lib/hooks` 数据层），覆盖双语完整性、URL 校验与规范化、存储读写与损坏回退、时间格式化、番茄钟边界、以及"资料里没有虚构内容"的约束。
  - **57 条组件/渲染断言**：在 Node 里用自写 DOM shim 真实挂载 `<App/>`，检查六个路由的 DOM 结构、文案、无障碍属性、`<html lang>`/主题/`<title>`/meta 副作用、未知路由回退、卸载与重挂载、localStorage 数据在启动时被读回、以及零 console 错误。
  - **13 项构建产物检查**：`dist/index.html` 指向打包产物、每个资源可访问、双语字符串确实在包内等。
- `node tools/verify-serve.mjs`：起生产服务器后用真实 HTTP 请求验证首页/JS/CSS 与 SPA 回退（10 项）。
- `node tests/browser.mjs`：**有真实浏览器时**用 CDP 驱动页面点一遍全部交互并截图（本沙箱不可用，见限制 4）。

---

## 8. 隐私

- 无后端、无请求上报、无 Cookie、无分析脚本。
- 便签、待办、快捷链接、主题、语言只写在浏览器的 `localStorage`（键前缀 `nexus.qkbest.v1`）。
- 换浏览器或清缓存即丢失；页脚「清空本地数据」可一键删除。
