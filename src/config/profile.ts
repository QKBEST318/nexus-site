/**
 * ============================================================================
 *  NEXUS — 个人资料配置 / Site profile configuration
 * ============================================================================
 *  想改这个网站？大部分内容只需要改这一个文件。
 *  To customize this site, this single file is usually all you need.
 *
 *  ⚠️ 诚实声明 / Honesty note
 *  这里只保存 QKBEST 本人提供的信息。姓名、学校、经历、成就、社交账号
 *  一律没有填写，也不允许由代码"补全"或编造。所有占位内容都明确标了 [示例] / [Sample]。
 *  Only the information QKBEST supplied lives here. No name, school, history,
 *  achievement or social account is invented; placeholders are labelled.
 * ============================================================================
 */

/** 双语文本 / A string that exists in both site languages. */
export interface L10n {
  zh: string;
  en: string;
}

export const l10n = (zh: string, en: string): L10n => ({ zh, en });

export interface Profile {
  /** 昵称 / Nickname */
  nickname: string;
  /** 身份一句话 / One-line identity */
  identity: L10n;
  /** 性格 / Personality */
  personality: L10n;
  /** 首页大标题下的签名 / Tagline under the hero title */
  tagline: L10n;
  /** 自我简介段落 / Short bio paragraphs */
  bio: L10n[];
  /** 所在地（仅"中国"，不含城市/学校）/ Location — country only */
  location: L10n;
  /** 头像：科技风默认头像由代码绘制，无需图片文件 / Generated tech avatar */
  avatar: { style: "tech-default"; initials: string; hue: number };
  /** 兴趣 / Interests */
  interests: Interest[];
}

export interface Interest {
  id: string;
  name: L10n;
  desc: L10n;
  /** 单字符图标 / single glyph icon */
  icon: string;
  /** 卡片渐变色 / card gradient */
  gradient: string;
  tags: L10n[];
}

export const profile: Profile = {
  nickname: "QKBEST",
  identity: l10n("中国大学生", "University Student in China"),
  personality: l10n("内敛", "Introverted"),
  tagline: l10n(
    "咕咕嘎嘎",
    "Building quietly, shipping what I love.",
  ),
  bio: [
    l10n(
      "你好，我是 QKBEST，一名中国大学生。性格内敛，习惯先观察再动手，喜欢一个人安静地把一件事做透。",
      "Hi, I'm QKBEST, a university student in China. I'm introverted — I'd rather observe first, then build, and I like taking one thing all the way through on my own.",
    ),
    l10n(
      "我的兴趣集中在四个方向：玩游戏、人工智能、打篮球和看电影。这个站点把四者放在一起：",
      "Four things keep my attention: game, artificial intelligence, basketball and film. This site puts them in one place:",
    ),
    l10n(
      "NEXUS 是我自己写的第一块「网络空间」——一个完全运行在浏览器里的个人主页，没有后端、没有账号、没有追踪，所有数据只留在这台设备上。",
      "NEXUS is my own little network node — a personal homepage that runs entirely in the browser: no backend, no accounts, no tracking, and all data stays on this device.",
    ),
  ],
  location: l10n("中国", "China"),
  avatar: { style: "tech-default", initials: "QK", hue: 258 },
  interests: [
    {
      id: "valorant",
      name: l10n("无畏契约", "VALORANT"),
      desc: l10n(
        "战术射击：枪法、经济与团队节奏。喜欢对局里那种必须冷静的瞬间。",
        "Tactical FPS: aim, economy and team tempo. I like the moments that force you to stay calm.",
      ),
      icon: "◈",
      gradient: "linear-gradient(135deg,#ff4655 0%,#7c5cff 100%)",
      tags: [l10n("战术射击", "Tactical FPS"), l10n("团队配合", "Team play"), l10n("复盘", "VOD review")],
    },
    {
      id: "ai",
      name: l10n("人工智能", "Artificial Intelligence"),
      desc: l10n(
        "关注大模型、Agent 与本地推理。正在自己动手做小工具，边写边学。",
        "Following LLMs, agents and local inference. Learning by building small tools myself.",
      ),
      icon: "◍",
      gradient: "linear-gradient(135deg,#38bdf8 0%,#a855f7 100%)",
      tags: [l10n("大模型", "LLM"), l10n("Agent", "Agents"), l10n("本地推理", "Local inference")],
    },
    {
      id: "basketball",
      name: l10n("篮球", "Basketball"),
      desc: l10n(
        "球场上的节奏和空间感，和写代码其实很像：都要在压力下做正确选择。",
        "Pace and spacing on the court feel a lot like writing code: making the right choice under pressure.",
      ),
      icon: "◎",
      gradient: "linear-gradient(135deg,#fb923c 0%,#f43f5e 100%)",
      tags: [l10n("射术", "Shooting"), l10n("体能", "Conditioning"), l10n("看球", "Watching")],
    },
    {
      id: "movie",
      name: l10n("电影", "Film"),
      desc: l10n(
        "偏爱科幻与悬疑，喜欢看镜头语言，也喜欢一个人看完片尾字幕。",
        "Sci-fi and mystery mostly. I pay attention to camera language — and I stay for the credits.",
      ),
      icon: "▣",
      gradient: "linear-gradient(135deg,#22d3ee 0%,#3b82f6 100%)",
      tags: [l10n("科幻", "Sci-fi"), l10n("悬疑", "Mystery"), l10n("配乐", "Score")],
    },
  ],
};

/* ==========================================================================
 *  社交链接 / Social links
 *  ------------------------------------------------------------------------
 *  ⚠️ 预留位置，故意留空 —— 不填写任何虚构账号。
 *     Reserved on purpose and left EMPTY - no invented account is ever shown.
 *  想展示真实账号时，把 null 换成你的真实链接即可，例如：
 *  To show a real account, replace null with your real URL, e.g.
 *      { id: "github", label: l10n("GitHub", "GitHub"), url: "https://github.com/your-id" }
 * ========================================================================== */

export type SocialKind = "github" | "bilibili" | "email" | "website" | "x" | "other";

export interface SocialPlaceholder {
  id: string;
  kind: SocialKind;
  label: L10n;
  /** null = 未填写，页面上显示为"待填写"占位 / null renders as a placeholder card */
  url: string | null;
  note?: L10n;
}

export const socials: SocialPlaceholder[] = [
  { id: "github", kind: "github", label: l10n("GitHub", "GitHub"), url: "https://github.com/QKBEST318", note: l10n("代码仓库", "Repositories") },
  { id: "bilibili", kind: "bilibili", label: l10n("哔哩哔哩", "Bilibili"), url: null, note: l10n("视频/分享", "Videos & notes") },
  { id: "email", kind: "email", label: l10n("邮箱", "Email"), url: 2217438328@qq.com, note: l10n("联系我", "Reach me") },
  { id: "website", kind: "website", label: l10n("wechat", "Another site"), url: 15248143744, note: l10n("个人/主页", "Blog or homepage") },
];

/* ==========================================================================
 *  项目展示 / Projects
 *  ------------------------------------------------------------------------
 *  ⚠️ 示例内容，全部标注为 [示例] / [Sample]，不是真实作品。
 *     Every entry is a SAMPLE, not a real project. Replace or delete them.
 * ========================================================================== */

export type ProjectCategory = "web" | "ai" | "tool" | "game" | "study";

export interface Project {
  id: string;
  title: L10n;
  summary: L10n;
  tags: string[];
  category: ProjectCategory;
  /** 示例标记 / marks the record as sample content */
  sample: true;
  /** 真实链接或仓库，留空则不显示按钮 / empty = no button shown */
  url: string | null;
  year: string;
}

export const projects: Project[] = [
  {
    id: "sample-1",
    title: l10n("[示例] NEXUS 个人主页", "[Sample] NEXUS personal site"),
    summary: l10n(
      "就是你现在看到的这个站点：纯前端、无后端、数据只存本地。",
      "The site you are looking at: front-end only, no backend, data stored locally.",
    ),
    tags: ["React", "TypeScript", "CSS"],
    category: "web",
    sample: true,
    url: null,
    year: "2025",
  },
  {
    id: "sample-2",
    title: l10n("[示例] 番茄钟小工具", "[Sample] Pomodoro timer"),
    summary: l10n(
      "用于说明「工具」分类会如何展示，并不是真实项目记录。",
      "Shows how the “tool” category renders. Not a real project record.",
    ),
    tags: ["Timer", "Web Audio"],
    category: "tool",
    sample: true,
    url: null,
    year: "2025",
  },
  {
    id: "sample-3",
    title: l10n("deepseek harness", "[Sample] Prompt notebook"),
    summary: l10n(
      "测试大模型deepseek v4.1flash产物",
      "A sample entry used to demo the AI filter.",
    ),
    tags: ["LLM", "Notes"],
    category: "ai",
    sample: true,
    url: null,
    year: "2025",
  },
  {
    id: "sample-4",
    title: l10n("agent制作前端", "[Sample] Shot chart"),
    summary: l10n(
      "API调用大模型，ChatGpt指令在dsh上完成简单web制作",
      "A sample entry showing what a data-visualisation card looks like.",
    ),
    tags: ["Chart", "Data"],
    category: "study",
    sample: true,
    url: null,
    year: "2024",
  },
];

/* ==========================================================================
 *  快捷链接默认值 / Default quick links
 *  只放"确定性存在"的公开地址，不放任何个人账号。
 *  Public, guaranteed-to-exist URLs only - no personal accounts.
 * ========================================================================== */

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  note?: string;
}

export const defaultQuickLinks: QuickLink[] = [
  { id: "ql-valorant", title: "VALORANT", url: "https://playvalorant.com/", note: "无畏契约官网" },
  { id: "ql-hf", title: "Hugging Face", url: "https://huggingface.co/", note: "AI 模型社区" },
  { id: "ql-mdn", title: "MDN Web Docs", url: "https://developer.mozilla.org/", note: "Web 文档" },
];

/* ==========================================================================
 *  番茄钟 / Pomodoro defaults
 * ========================================================================== */

export const pomodoroDefaults = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  /** 每完成 N 个专注进入长休息 / long break every N focus rounds */
  longBreakEvery: 4,
  limits: { min: 1, max: 180 },
};

/** localStorage 键名前缀 / storage key prefix */
export const storagePrefix = "nexus.qkbest.v1";
