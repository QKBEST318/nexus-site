/**
 * 极简 DOM 实现 / minimal DOM implementation for in-process tests.
 * 沙箱禁止 Chrome 启动（进程间 mojo 通道被拒），因此用这个 shim 让真实的
 * React 组件在 Node 中挂载并接受事件，从而验证交互逻辑。
 * 只实现 React 18 + 本组件树实际用到的 API，不做布局/CSS。
 */
import { act } from "react-dom/test-utils";
import { flushSync } from "react-dom";

let idSeq = 0;

/** 派发过程中被捕获的错误 / errors thrown inside listener dispatch. */
export const dispatchErrors: string[] = [];

export class Node {
  static ELEMENT_NODE = 1;
  static TEXT_NODE = 3;
  static DOCUMENT_NODE = 9;
  static DOCUMENT_FRAGMENT_NODE = 11;

  nodeType = 1;
  nodeName = "";
  childNodes: any[] = [];
  parentNode: any = null;
  _listeners = new Map<string, Set<(e: any) => void>>();

  /** 沿父链找 document：React 会通过 ownerDocument.defaultView 取 window */
  get ownerDocument(): any {
    let n: any = this;
    while (n) {
      if (n.nodeType === 9) return n;
      n = n.parentNode;
    }
    return null;
  }
  set ownerDocument(_v: any) {
    /* 由父链推导，忽略直接赋值 */
  }

  get parentElement() {
    return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null;
  }
  get firstChild() {
    return this.childNodes[0] ?? null;
  }
  get lastChild() {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }
  get nextSibling() {
    const p = this.parentNode;
    if (!p) return null;
    const i = p.childNodes.indexOf(this);
    return p.childNodes[i + 1] ?? null;
  }
  get previousSibling() {
    const p = this.parentNode;
    if (!p) return null;
    const i = p.childNodes.indexOf(this);
    return i > 0 ? p.childNodes[i - 1] : null;
  }
  hasChildNodes() {
    return this.childNodes.length > 0;
  }
  contains(other: any): boolean {
    if (!other) return false;
    if (other === this) return true;
    return this.childNodes.some((c: any) => c.contains?.(other));
  }
  appendChild(child: any) {
    if (child.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      for (const c of [...child.childNodes]) this.appendChild(c);
      child.childNodes = [];
      return child;
    }
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }
  ownerDocumentOf() {
    return this.ownerDocument;
  }
  insertBefore(child: any, ref: any) {
    if (!ref) return this.appendChild(child);
    const i = this.childNodes.indexOf(ref);
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.childNodes.splice(i < 0 ? this.childNodes.length : i, 0, child);
    return child;
  }
  removeChild(child: any) {
    const i = this.childNodes.indexOf(child);
    if (i >= 0) {
      this.childNodes.splice(i, 1);
      child.parentNode = null;
    }
    return child;
  }
  replaceChild(next: any, prev: any) {
    const i = this.childNodes.indexOf(prev);
    if (i < 0) return prev;
    this.childNodes[i] = next;
    next.parentNode = this;
    prev.parentNode = null;
    return prev;
  }
  addEventListener(type: string, fn: (e: any) => void, opts?: any) {
    const key = (opts === true || opts?.capture ? "capture:" : "") + type;
    if (!this._listeners.has(key)) this._listeners.set(key, new Set());
    this._listeners.get(key)!.add(fn);
  }
  removeEventListener(type: string, fn: (e: any) => void, opts?: any) {
    const key = (opts === true || opts?.capture ? "capture:" : "") + type;
    this._listeners.get(key)?.delete(fn);
  }
  dispatchEvent(event: any) {
    event.target ??= this;
    // 事件路径：self -> root
    const path: any[] = [];
    let n: any = this;
    while (n) {
      path.push(n);
      n = n.parentNode;
    }
    // React 18 在根容器上使用「捕获阶段」监听，所以两条路径都要走
    for (let i = path.length - 1; i >= 0 && !event._stopped; i--) {
      event.currentTarget = path[i];
      for (const h of [...(path[i]._listeners.get("capture:" + event.type) ?? [])]) {
        try {
          h.call(path[i], event);
        } catch (e) {
          dispatchErrors.push(String((e as Error).message));
        }
      }
    }
    for (let i = 0; i < path.length && !event._stopped; i++) {
      event.currentTarget = path[i];
      for (const h of [...(path[i]._listeners.get(event.type) ?? [])]) {
        try {
          h.call(path[i], event);
        } catch (e) {
          dispatchErrors.push(String((e as Error).message));
        }
      }
    }
    return !event.defaultPrevented;
  }
  get textContent(): string {
    return this.childNodes.map((c: any) => c.textContent ?? "").join("");
  }
  set textContent(v: string) {
    for (const c of this.childNodes) c.parentNode = null;
    this.childNodes = [];
    if (v !== "" && v !== null && v !== undefined) this.appendChild(new Text(String(v)));
  }
}

export class Text extends Node {
  nodeType = 3;
  nodeName = "#text";
  data: string;
  constructor(data: string) {
    super();
    this.data = String(data);
  }
  get textContent() {
    return this.data;
  }
  set textContent(v: string) {
    this.data = String(v);
  }
}

export class Element extends Node {
  static _registry = new Map<string, any>();
  nodeType = 1;
  tagName: string;
  localName: string;
  namespaceURI: string;
  attributes: Record<string, string> = {};
  style: Record<string, any> = {};
  dataset: Record<string, string> = {};
  _classes = new Set<string>();
  _value: any = "";
  _checked = false;

  constructor(tagName: string, ns = "http://www.w3.org/1999/xhtml") {
    super();
    this.tagName = tagName.toUpperCase();
    this.localName = tagName.toLowerCase();
    this.nodeName = this.tagName;
    this.namespaceURI = ns;
    this.style = new Proxy(
      {},
      {
        get: (t: any, k: string) => {
          if (k === "setProperty") return (name: string, value: any) => ((t as any)[name] = String(value));
          if (k === "removeProperty") return (name: string) => delete (t as any)[name];
          if (k === "getPropertyValue") return (name: string) => (t as any)[name] ?? "";
          return (t as any)[k] ?? "";
        },
        set: (t: any, k: string, v: any) => {
          (t as any)[k] = v;
          return true;
        },
      },
    );
  }
  get className() {
    return [...this._classes].join(" ");
  }
  set className(v: string) {
    this._classes = new Set(String(v).split(/\s+/).filter(Boolean));
  }
  get classList() {
    const self = this;
    return {
      add: (...c: string[]) => c.forEach((x) => self._classes.add(x)),
      remove: (...c: string[]) => c.forEach((x) => self._classes.delete(x)),
      contains: (c: string) => self._classes.has(c),
      toggle: (c: string) => (self._classes.has(c) ? self._classes.delete(c) : self._classes.add(c)),
    };
  }
  setAttribute(name: string, value: any) {
    const v = String(value);
    if (name === "class") this.className = v;
    else if (name === "id") this.id = v;
    else if (name === "style") this.style.cssText = v;
    else if (name.startsWith("data-")) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
    else this.attributes[name] = v;
    if (name.startsWith("on")) (this as any)[name.toLowerCase()] = value;
  }
  getAttribute(name: string) {
    if (name === "class") return this.className || null;
    if (name === "id") return (this as any).id ?? null;
    if (name.startsWith("data-")) {
      const k = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return this.dataset[k] ?? null;
    }
    return this.attributes[name] ?? null;
  }
  hasAttribute(name: string) {
    return this.getAttribute(name) !== null;
  }
  removeAttribute(name: string) {
    if (name === "class") this._classes.clear();
    else if (name.startsWith("data-")) delete this.dataset[name.slice(5)];
    else delete this.attributes[name];
  }
  /** <input> 的默认 type 是 text，React 的 change 插件依赖这个值 */
  get type() {
    return this.attributes.type ?? (this.localName === "input" ? "text" : undefined);
  }
  set type(v: any) {
    this.attributes.type = String(v);
  }
  get name() {
    return this.attributes.name ?? "";
  }
  set name(v: any) {
    this.attributes.name = String(v);
  }
  get disabled() {
    return this.attributes.disabled === "" || this.attributes.disabled === "true";
  }
  set disabled(v: any) {
    if (v) this.attributes.disabled = "true";
    else delete this.attributes.disabled;
  }
  get href() {
    return this.attributes.href ?? "";
  }
  set href(v: any) {
    this.attributes.href = String(v);
  }
  /**
   * 测试辅助：React 的 value tracker 需要"改值"和"更新 tracker"按正确顺序发生。
   * 通过原型上的 value setter 赋值即可同时满足两者。
   */
  setValueTracked(value: any) {
    (this as any).value = value === undefined || value === null ? "" : String(value);
  }
  get value() {
    return this._value;
  }
  set value(v: any) {
    this._value = v === undefined || v === null ? "" : String(v);
  }
  get checked() {
    return this._checked;
  }
  set checked(v: any) {
    this._checked = !!v;
  }
  get selectedIndex() {
    return (this as any).__selectedIndex ?? -1;
  }
  set selectedIndex(v: number) {
    (this as any).__selectedIndex = v;
  }
  get children() {
    return this.childNodes.filter((c: any) => c.nodeType === 1);
  }
  get firstElementChild() {
    return this.children[0] ?? null;
  }
  get childElementCount() {
    return this.children.length;
  }
  focus() {
    const doc: any = this.ownerDocument;
    if (doc) doc.activeElement = this;
    if (!(this as any).__focused) {
      (this as any).__focused = true;
    }
  }
  blur() {
    const doc: any = this.ownerDocument;
    if (doc && doc.activeElement === this) doc.activeElement = doc.body;
  }
  click() {
    fire(this, "click");
  }
  getBoundingClientRect() {
    return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  }
  scrollIntoView() {}
  get scrollTop() {
    return 0;
  }
  set scrollTop(_v: number) {}
  get scrollHeight() {
    return 0;
  }
  get scrollWidth() {
    return 0;
  }
  get clientWidth() {
    return 1024;
  }
  get clientHeight() {
    return 768;
  }
  get offsetWidth() {
    return 1024;
  }
  get offsetHeight() {
    return 768;
  }
  get offsetParent() {
    return this.parentElement;
  }
  get offsetLeft() {
    return 0;
  }
  get offsetTop() {
    return 0;
  }
  get innerHTML() {
    return this.childNodes.map((c: any) => serialize(c)).join("");
  }
  set innerHTML(v: string) {
    for (const c of this.childNodes) c.parentNode = null;
    this.childNodes = [];
    if (v) this.appendChild(new Text(v.replace(/<[^>]*>/g, "")));
  }
  querySelector(sel: string) {
    return query(this, sel, true)[0] ?? null;
  }
  querySelectorAll(sel: string) {
    return query(this, sel, false);
  }
  closest(sel: string) {
    let n: any = this;
    while (n && n.nodeType === 1) {
      if (matches(n, sel)) return n;
      n = n.parentNode;
    }
    return null;
  }
  matches(sel: string) {
    return matches(this, sel);
  }
}

function serialize(node: any): string {
  if (node.nodeType === 3) return node.data;
  const attrs = Object.entries(node.attributes || {})
    .map(([k, v]) => ` ${k}="${v}"`)
    .join("");
  const cls = node.className ? ` class="${node.className}"` : "";
  return `<${node.localName}${cls}${attrs}>${node.childNodes.map(serialize).join("")}</${node.localName}>`;
}

/* ------------------------------------------------------------ selectors --- */

function parseSimple(sel: string) {
  // 支持 tag / .class / #id / [attr] / [attr="v"] / [attr^="v"] / *
  const out: { tag?: string; classes: string[]; id?: string; attrs: [string, string | null, string | null][] } = {
    classes: [],
    attrs: [],
  };
  const re = /([a-zA-Z*][\w-]*)|\.([\w-]+)|#([\w-]+)|\[([\w-]+)(?:([\^$*]?=)"?([^"\]]*)"?)?\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sel))) {
    if (m[1]) out.tag = m[1];
    else if (m[2]) out.classes.push(m[2]);
    else if (m[3]) out.id = m[3];
    else if (m[4]) out.attrs.push([m[4], m[5] ?? null, m[6] ?? null]);
  }
  return out;
}

function matchSimple(el: any, simple: string) {
  const s = parseSimple(simple);
  if (s.tag && s.tag !== "*" && el.localName !== s.tag.toLowerCase()) return false;
  if (s.id && el.id !== s.id) return false;
  for (const c of s.classes) if (!el._classes.has(c)) return false;
  for (const [name, op, val] of s.attrs) {
    const actual = el.getAttribute(name);
    if (actual === null) return false;
    if (op === "^=" && !String(actual).startsWith(val!)) return false;
    if (op === "$=" && !String(actual).endsWith(val!)) return false;
    if (op === "*=" && !String(actual).includes(val!)) return false;
    if (op === "=" && String(actual) !== val) return false;
  }
  return true;
}

interface Compound {
  simple: string;
  /** 与右边相邻元素的关系 / how this part connects to the part on its right */
  comb: " " | ">";
}

function parseSelector(sel: string): Compound[] {
  const parts: Compound[] = [];
  const re = /([a-zA-Z*][\w-]*)|(\.(?:[\w-]+))|(#[\w-]+)|(\[[^\]]+\])|(\s*>\s*)|(\s+)/g;
  let rel: " " | ">" = " ";
  let buf = "";
  const commit = () => {
    if (buf) {
      parts.push({ simple: buf, comb: rel });
      rel = " ";
      buf = "";
    }
  };
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(sel))) {
    if (m.index > last) buf += sel.slice(last, m.index);
    last = re.lastIndex;
    if (m[5]) {
      commit();
      rel = ">";
    } else if (m[6]) {
      commit();
    } else {
      buf += m[0];
    }
  }
  if (last < sel.length) buf += sel.slice(last);
  commit();
  return parts;
}

function matches(el: any, sel: string): boolean {
  const parts = parseSelector(sel.trim());
  if (!parts.length || !matchSimple(el, parts[parts.length - 1].simple)) return false;
  let current: any = el;
  for (let i = parts.length - 1; i > 0; i--) {
    const link = parts[i].comb;
    const need = parts[i - 1].simple;
    if (link === ">") {
      current = current.parentElement;
      if (!current || !matchSimple(current, need)) return false;
    } else {
      let n = current.parentElement;
      let found = false;
      while (n) {
        if (matchSimple(n, need)) {
          found = true;
          current = n;
          break;
        }
        n = n.parentElement;
      }
      if (!found) return false;
    }
  }
  return true;
}

function query(root: any, sel: string, first: boolean) {
  // 支持逗号分隔的选择器组
  const groups = sel.split(",").map((s) => s.trim()).filter(Boolean);
  const out: any[] = [];
  const walk = (node: any) => {
    for (const child of node.childNodes) {
      if (child.nodeType !== 1) continue;
      if (groups.some((g) => matches(child, g))) {
        out.push(child);
        if (first) return true;
      }
      if (walk(child)) return true;
    }
    return false;
  };
  walk(root);
  return out;
}

/* --------------------------------------------------------------- events --- */

export class Event {
  type: string;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented = false;
  _stopped = false;
  target: any = null;
  currentTarget: any = null;
  /** act() 会构造 MessageEvent 并写入 data / MessageEvent.data must be writable */
  data: any = null;
  constructor(type: string, init: any = {}) {
    this.type = type;
    this.bubbles = init.bubbles ?? false;
    this.cancelable = init.cancelable ?? false;
    for (const [k, v] of Object.entries(init)) {
      try {
        (this as any)[k] = v;
      } catch {
        /* 只读属性忽略 */
      }
    }
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  stopPropagation() {
    this._stopped = true;
  }
  persist() {}
}

export function fire(el: any, type: string, init: any = {}) {
  const ev = new Event(type, { bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(ev);
  return ev;
}

/** React 的受控输入监听 input 事件，并且要求走原型上的 value setter。 */
export function setValue(el: any, value: string) {
  if (typeof el.setValueTracked === "function") el.setValueTracked(value);
  else el.value = value;
  fire(el, "input", { bubbles: true });
}

const REACT_PROP_PREFIX = "__reactProps$";
const REACT_FIBER_PREFIX = "__reactFiber$";

/**
 * 写入输入框并触发组件的 onChange。
 *
 * 为什么直接调用 props.onChange：这个 shim 不是真实浏览器，React 18 的合成事件
 * 插件（ChangeEventPlugin + value tracker）依赖若干浏览器内部行为，在这个环境里
 * 无法可靠复现。这里改为"改值 + 调用组件自己的 handler"，让被测的仍然是
 * 应用真实的状态更新与渲染逻辑（点击等其它事件依旧走真实的事件派发）。
 */
export function setInput(el: any, value: string) {
  const next = value === undefined || value === null ? "" : String(value);
  if (typeof el.setValueTracked === "function") el.setValueTracked(next);
  else el.value = next;

  // 找到带 onChange 的 fiber / find the fiber that owns the change handler
  let node: any = el;
  let fiber: any = null;
  while (node && !fiber) {
    fiber = node[Object.keys(node).find((k) => k.startsWith(REACT_FIBER_PREFIX)) as string] ?? null;
    node = node.parentNode;
  }
  let current = fiber;
  let handler: any = null;
  while (current && !handler) {
    const props = current.pendingProps ?? current.memoizedProps;
    if (props && typeof props.onChange === "function") handler = props.onChange;
    current = current.return;
  }
  if (!handler) {
    fire(el, "input", { bubbles: true });
    return;
  }
  const event: any = {
    type: "change",
    target: el,
    currentTarget: el,
    bubbles: true,
    persist() {},
    preventDefault() {},
    stopPropagation() {},
    isDefaultPrevented: () => false,
    isPropagationStopped: () => false,
  };
  handler(event);
}

export class HTMLInputElement extends Element {
  /**
   * React 会给受控输入装 _valueTracker。它要求 value 的访问器不在 input 的原型链上
   * （真实浏览器里 value 是 HTMLInputElement 实例自身的属性），否则 tracker 会装不上、
   * onChange 被吞掉。这里显式声明成自身属性来对齐真实浏览器行为。
   */
  declare _value: string;
  declare _valueTracker: any;
  declare value: string;
}
Object.defineProperty(HTMLInputElement.prototype, "value", {
  configurable: true,
  enumerable: true,
  get(this: any) {
    return this._value;
  },
  set(this: any, v: any) {
    const next = v === undefined || v === null ? "" : String(v);
    const prev = this._value;
    this._value = next;
    const tracker = this._valueTracker;
    if (tracker && prev !== next) tracker.setValue(prev);
  },
});
export class HTMLTextAreaElement extends Element {}
export class HTMLSelectElement extends Element {}
export class HTMLButtonElement extends Element {}
export class HTMLAnchorElement extends Element {}
export class HTMLDivElement extends Element {}
export class HTMLFormElement extends Element {}
export class SVGSVGElement extends Element {}
export class SVGElement extends Element {}
export class HTMLElement extends Element {}

const TAG_CLASS: Record<string, any> = {
  input: HTMLInputElement,
  textarea: HTMLTextAreaElement,
  select: HTMLSelectElement,
  button: HTMLButtonElement,
  a: HTMLAnchorElement,
  div: HTMLDivElement,
  form: HTMLFormElement,
  svg: SVGSVGElement,
};

export function createElement(tag: string, ns?: string) {
  const cls = ns && ns !== "http://www.w3.org/1999/xhtml" ? SVGElement : TAG_CLASS[tag.toLowerCase()] ?? Element;
  return new cls(tag, ns);
}

export class Comment extends Node {
  nodeType = 8;
  nodeName = "#comment";
  data: string;
  constructor(data: string) {
    super();
    this.data = data;
  }
  get textContent() {
    return this.data;
  }
  set textContent(v: string) {
    this.data = String(v);
  }
}

export class DocumentFragment extends Node {
  nodeType = 11;
  nodeName = "#document-fragment";
}

/* ------------------------------------------------ localStorage / window --- */

export function installDom(hash = "#/home") {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };

  const document: any = new Node();
  document.nodeType = 9;
  document.nodeName = "#document";
  document.ownerDocument = document;
  document.readyState = "complete";
  document.createElement = (tag: string) => createElement(tag);
  document.createElementNS = (ns: string, tag: string) => createElement(tag, ns || undefined);
  document.createTextNode = (t: string) => new Text(t);
  document.createComment = (t: string) => new Comment(t);
  document.createDocumentFragment = () => new DocumentFragment();
  document.createEvent = () => new Event("none");
  document.defaultView = null;
  document.title = "NEXUS · QKBEST";

  const html = createElement("html");
  const head = createElement("head");
  const body = createElement("body");
  document.appendChild(html);
  html.appendChild(head);
  html.appendChild(body);
  document.documentElement = html;
  document.head = head;
  document.body = body;
  document.activeElement = body;
  html.ownerDocument = document;

  // document 是 Node 而不是 Element，查询要转发给 documentElement（App 用它改主题色 meta）
  document.querySelector = (sel: string) => html.querySelector(sel);
  document.querySelectorAll = (sel: string) => html.querySelectorAll(sel);
  document.getElementById = (id: string) => html.querySelector("#" + id);

  const meta = createElement("meta");
  meta.setAttribute("name", "theme-color");
  meta.setAttribute("content", "#05060c");
  head.appendChild(meta);

  const location: any = {
    hash,
    href: "http://localhost/" + hash,
    pathname: "/",
    search: "",
    origin: "http://localhost",
    protocol: "http:",
    host: "localhost",
    hostname: "localhost",
    reload() {},
    assign() {},
    toString() {
      return this.href;
    },
  };

  const win: any = {
    document,
    localStorage,
    location,
    name: "nexus-test",
    innerWidth: 1440,
    innerHeight: 960,
    devicePixelRatio: 1,
    navigator: { language: "zh-CN", userAgent: "node-test", languages: ["zh-CN", "en"] },
    setTimeout: (...a: any[]) => (globalThis.setTimeout as any)(...a),
    clearTimeout: (id: any) => globalThis.clearTimeout(id),
    setInterval: (...a: any[]) => (globalThis.setInterval as any)(...a),
    clearInterval: (id: any) => globalThis.clearInterval(id),
    requestAnimationFrame: (fn: any) => globalThis.setTimeout(() => fn(Date.now()), 16) as any,
    cancelAnimationFrame: (id: any) => globalThis.clearTimeout(id),
    requestIdleCallback: (fn: any) => globalThis.setTimeout(() => fn({ didTimeout: false, timeRemaining: () => 50 }), 1) as any,
    cancelIdleCallback: (id: any) => globalThis.clearTimeout(id),
    setImmediate: (fn: any, ...a: any[]) => (globalThis.setImmediate as any)(fn, ...a),
    clearImmediate: (id: any) => (globalThis as any).clearImmediate(id),
    performance: { now: () => Date.now() },
    queueMicrotask: (fn: any) => globalThis.queueMicrotask(fn),
    getComputedStyle: () => ({ getPropertyValue: () => "", cssText: "" }),
    matchMedia: (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    scrollTo() {},
    scroll() {},
    alert() {},
    confirm: () => false,
    prompt: () => null,
    addEventListener: (type: string, fn: any) => document.addEventListener(type, fn),
    removeEventListener: (type: string, fn: any) => document.removeEventListener(type, fn),
    dispatchEvent: (ev: any) => document.dispatchEvent(ev),
    console,
    CustomEvent: class extends Event {
      detail: any;
      constructor(type: string, init: any = {}) {
        super(type, init);
        this.detail = init.detail;
      }
    },
  };
  win.window = win;
  win.self = win;
  win.top = win;
  win.parent = win;
  document.defaultView = win;

  Object.defineProperty(location, "hash", {
    get: () => location.__hash ?? hash,
    set: (v: string) => {
      location.__hash = v;
      location.href = "http://localhost/" + v;
      document.dispatchEvent(new Event("hashchange"));
    },
  });

  const put = (key: string, value: any) => {
    try {
      (globalThis as any)[key] = value;
    } catch {
      try {
        Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
      } catch {
        /* 某些 Node 版本的全局属性是只读的，跳过即可 */
      }
    }
  };
  put("window", win);
  put("document", document);
  put("localStorage", localStorage);
  put("navigator", win.navigator);
  for (const [k, v] of Object.entries({
    Element, HTMLElement, HTMLInputElement, HTMLTextAreaElement, HTMLSelectElement, HTMLButtonElement,
    HTMLAnchorElement, HTMLDivElement, HTMLFormElement, SVGElement, SVGSVGElement, Node, Text, Event,
    DocumentFragment, Comment,
  })) {
    put(k, v);
    (win as any)[k] = v;
  }
  put("IS_REACT_ACT_ENVIRONMENT", true);
  // React 的 act() 会构造 MessageEvent；Node 内置的那个 data 是只读 getter，会抛错
  put("MessageEvent", Event);
  put("CustomEvent", win.CustomEvent);
  win.MessageEvent = Event;
  win.CustomEvent = win.CustomEvent;

  // React 会引用大量浏览器全局类（用于 instanceof 检查），按需自动补上
  const known: any = (globalThis as any).window;
  (globalThis as any).window = new Proxy(known, {
    get(target: any, prop: string | symbol) {
      if (prop in target) return target[prop];
      if (typeof prop !== "string") return undefined;
      if (/^[A-Z]/.test(prop)) {
        const stub = class extends Element {};
        Object.defineProperty(stub, "name", { value: prop, configurable: true });
        target[prop] = stub;
        try {
          put(prop, stub);
        } catch {
          /* ignore */
        }
        return stub;
      }
      return undefined;
    },
  });
  return win;
}

/** 让 React 处理已排队的事件与副作用 / flush React work. */
export const flush = () => new Promise((r) => globalThis.setTimeout(r, 0));

/**
 * 在 act() 中处理一次用户操作。React 18 会批量处理事件回调里的状态更新，
 * 只有 act() 能保证在断言前把这些更新真正提交到 DOM。
 */
export async function interact(fn: () => void): Promise<void> {
  // flushSync 强制把事件里排队的更新同步提交到 DOM；
  // 这个 shim 环境里 act() 的异步队列不会被调度器排空，所以两者都要用。
  await act(async () => {
    try {
      flushSync(fn);
    } catch {
      fn();
    }
    await new Promise((r) => globalThis.setTimeout(r, 1));
  });
  await new Promise((r) => globalThis.setTimeout(r, 0));
}

