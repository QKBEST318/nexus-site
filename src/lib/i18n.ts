import type { L10n } from "../config/profile";

export type Lang = "zh" | "en";

type Dict = Record<string, L10n>;

/** 所有界面文案都在这里，中英各一份 / every UI string, both languages. */
export const dict: Dict = {
  "brand.name": { zh: "NEXUS", en: "NEXUS" },
  "brand.sub": { zh: "个人科技空间", en: "Personal Tech Space" },
  "nav.home": { zh: "首页", en: "Home" },
  "nav.interests": { zh: "兴趣", en: "Interests" },
  "nav.projects": { zh: "项目", en: "Projects" },
  "nav.links": { zh: "快捷链接", en: "Quick Links" },
  "nav.tools": { zh: "效率工具", en: "Toolkit" },
  "nav.social": { zh: "社交", en: "Social" },

  "hero.hello": { zh: "你好，我是", en: "Hi, I'm" },
  "hero.identity": { zh: "身份", en: "Identity" },
  "hero.personality": { zh: "性格", en: "Personality" },
  "hero.location": { zh: "位置", en: "Location" },
  "hero.now": { zh: "本地时间", en: "Local time" },
  "hero.explore": { zh: "看看我的空间", en: "Explore my space" },
  "hero.interests": { zh: "兴趣标签", en: "Interest tags" },

  "section.interests.title": { zh: "兴趣展示", en: "Interests" },
  "section.interests.sub": { zh: "四个方向，构成了我大部分的自由时间。", en: "Four directions that take up most of my free time." },
  "section.projects.title": { zh: "项目展示", en: "Projects" },
  "section.projects.sub": { zh: "示例条目已明确标注，替换成你自己的作品即可。", en: "Sample entries are clearly labelled - swap in your own work." },
  "section.links.title": { zh: "快捷链接", en: "Quick Links" },
  "section.links.sub": { zh: "添加常用网址，保存在本机浏览器中。", en: "Add the sites you use often; they stay in this browser." },
  "section.social.title": { zh: "社交区域", en: "Social" },
  "section.social.sub": { zh: "预留位置，默认不展示任何虚构账号。", en: "Reserved slots - no invented accounts are shown." },
  "section.tools.title": { zh: "效率工具", en: "Toolkit" },

  "projects.search": { zh: "搜索项目…", en: "Search projects…" },
  "projects.all": { zh: "全部", en: "All" },
  "projects.count": { zh: "共 {n} 个项目", en: "{n} projects" },
  "projects.empty": { zh: "没有匹配的项目", en: "No matching projects" },
  "projects.emptyHint": { zh: "试试其它关键词，或切换分类。", en: "Try another keyword or switch category." },
  "projects.clear": { zh: "清除筛选", en: "Clear filters" },
  "projects.sample": { zh: "示例", en: "Sample" },
  "projects.open": { zh: "打开链接", en: "Open link" },
  "projects.noLink": { zh: "未提供链接", en: "No link provided" },

  "cat.web": { zh: "网页", en: "Web" },
  "cat.ai": { zh: "AI", en: "AI" },
  "cat.tool": { zh: "工具", en: "Tool" },
  "cat.game": { zh: "游戏", en: "Game" },
  "cat.study": { zh: "学习", en: "Study" },

  "links.add": { zh: "新增链接", en: "Add link" },
  "links.title": { zh: "标题", en: "Title" },
  "links.url": { zh: "网址", en: "URL" },
  "links.note": { zh: "备注（可选）", en: "Note (optional)" },
  "links.save": { zh: "保存", en: "Save" },
  "links.cancel": { zh: "取消", en: "Cancel" },
  "links.edit": { zh: "编辑", en: "Edit" },
  "links.delete": { zh: "删除", en: "Delete" },
  "links.open": { zh: "访问", en: "Visit" },
  "links.empty": { zh: "还没有快捷链接", en: "No quick links yet" },
  "links.emptyHint": { zh: "点击「新增链接」添加第一个。", en: "Click “Add link” to create your first one." },
  "links.confirmDelete": { zh: "确定删除「{t}」？", en: "Delete “{t}”?" },
  "links.added": { zh: "已添加：{t}", en: "Added: {t}" },
  "links.updated": { zh: "已更新：{t}", en: "Updated: {t}" },
  "links.deleted": { zh: "已删除：{t}", en: "Deleted: {t}" },

  "pomodoro.title": { zh: "番茄钟", en: "Pomodoro" },
  "pomodoro.focus": { zh: "专注", en: "Focus" },
  "pomodoro.short": { zh: "短休息", en: "Short break" },
  "pomodoro.long": { zh: "长休息", en: "Long break" },
  "pomodoro.start": { zh: "开始", en: "Start" },
  "pomodoro.pause": { zh: "暂停", en: "Pause" },
  "pomodoro.resume": { zh: "继续", en: "Resume" },
  "pomodoro.reset": { zh: "重置", en: "Reset" },
  "pomodoro.skip": { zh: "跳过", en: "Skip" },
  "pomodoro.rounds": { zh: "已完成 {n} 个专注", en: "{n} focus rounds done" },
  "pomodoro.settings": { zh: "自定义时长（分钟）", en: "Custom duration (minutes)" },
  "pomodoro.apply": { zh: "应用时长", en: "Apply" },
  "pomodoro.applied": { zh: "时长已更新", en: "Durations updated" },
  "pomodoro.done": { zh: "{mode}结束！", en: "{mode} finished!" },
  "pomodoro.invalid": { zh: "请输入 {min}–{max} 之间的整数", en: "Enter a whole number between {min} and {max}" },

  "notes.title": { zh: "个人便签", en: "Notes" },
  "notes.add": { zh: "新建便签", en: "New note" },
  "notes.placeholder": { zh: "写点什么…", en: "Write something…" },
  "notes.empty": { zh: "还没有便签", en: "No notes yet" },
  "notes.emptyHint": { zh: "记下第一个想法吧。", en: "Jot down your first thought." },
  "notes.saved": { zh: "已保存", en: "Saved" },
  "notes.deleted": { zh: "已删除便签", en: "Note deleted" },
  "notes.confirmDelete": { zh: "删除这条便签？", en: "Delete this note?" },
  "notes.edited": { zh: "已更新", en: "Updated" },
  "todos.title": { zh: "待办清单", en: "Todos" },
  "todos.add": { zh: "添加", en: "Add" },
  "todos.placeholder": { zh: "下一个任务…", en: "Next task…" },
  "todos.empty": { zh: "清单是空的", en: "Nothing here" },
  "todos.emptyHint": { zh: "添加一个待办，开始今天。", en: "Add a todo to start the day." },
  "todos.filter.all": { zh: "全部", en: "All" },
  "todos.filter.active": { zh: "未完成", en: "Active" },
  "todos.filter.done": { zh: "已完成", en: "Done" },
  "todos.left": { zh: "剩余 {n} 项", en: "{n} left" },
  "todos.clearDone": { zh: "清除已完成", en: "Clear completed" },
  "todos.cleared": { zh: "已清除 {n} 项", en: "Cleared {n} item(s)" },
  "todos.confirmDelete": { zh: "删除这个待办？", en: "Delete this todo?" },

  "form.required": { zh: "此项必填", en: "This field is required" },
  "form.badUrl": { zh: "请输入有效网址，例如 https://example.com", en: "Enter a valid URL, e.g. https://example.com" },
  "form.tooLong": { zh: "最多 {n} 个字符", en: "Max {n} characters" },
  "form.dup": { zh: "已存在相同网址", en: "That URL already exists" },

  "social.empty": { zh: "待填写", en: "To be filled" },
  "social.hint": { zh: "在 src/config/profile.ts 中填写 url 后即可点击。", en: "Set the url in src/config/profile.ts to enable it." },
  "social.none": { zh: "暂无已公开的社交账号。", en: "No public social account yet." },
  "social.configured": { zh: "已配置 {n} 个账号", en: "{n} account(s) configured" },

  "footer.built": { zh: "由 React + TypeScript 构建，纯前端运行。", en: "Built with React + TypeScript. Runs fully client-side." },
  "footer.local": { zh: "所有数据仅保存在本机浏览器。", en: "All data is stored in this browser only." },
  "footer.reset": { zh: "清空本地数据", en: "Reset local data" },
  "footer.resetConfirm": { zh: "将清空快捷链接、便签、待办与主题设置，确定？", en: "This clears quick links, notes, todos and theme. Continue?" },
  "footer.resetDone": { zh: "本地数据已清空", en: "Local data cleared" },

  "a11y.skip": { zh: "跳到主内容", en: "Skip to content" },
  "a11y.themeToggle": { zh: "切换深色/浅色模式", en: "Toggle dark / light mode" },
  "a11y.langToggle": { zh: "切换语言", en: "Switch language" },
  "a11y.menu": { zh: "打开导航菜单", en: "Open navigation menu" },
  "a11y.progress": { zh: "番茄钟进度", en: "Pomodoro progress" },
  "a11y.dismiss": { zh: "关闭提示", en: "Dismiss" },
  "a11y.close": { zh: "关闭", en: "Close" },
};

export function translate(
  key: string,
  lang: Lang,
  vars?: Record<string, string | number>,
): string {
  const entry = dict[key];
  let text = entry ? entry[lang] : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  }
  return text;
}

/** 本地化配置里的 L10n 文本 / resolve an L10n value from profile.ts */
export const pick = (value: L10n, lang: Lang): string => value[lang];
