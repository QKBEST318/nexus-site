import { useMemo, useState } from "react";
import { useApp } from "../app/context";
import { Card, Empty } from "../components/ui";
import { storagePrefix } from "../config/profile";
import { useLocalState } from "../lib/hooks";
import type { Todo } from "../lib/hooks";
import { uid } from "../lib/storage";

const KEY = `${storagePrefix}.todos`;
const MAX = 160;
type Filter = "all" | "active" | "done";

export function Todos({ onToast }: { onToast: (text: string, kind?: "ok" | "info" | "warn") => void }) {
  const { t } = useApp();
  const [todos, setTodos] = useLocalState<Todo[]>(KEY, []);
  const [filter, setFilter] = useState<Filter>("all");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () => todos.filter((x) => (filter === "all" ? true : filter === "done" ? x.done : !x.done)),
    [todos, filter],
  );
  const left = todos.filter((x) => !x.done).length;
  const doneCount = todos.length - left;

  const add = () => {
    const body = text.trim();
    if (!body) {
      setError(t("form.required"));
      return;
    }
    if (body.length > MAX) {
      setError(t("form.tooLong", { n: MAX }));
      return;
    }
    setTodos((prev) => [{ id: uid(), text: body, done: false, createdAt: Date.now() }, ...prev]);
    setText("");
    setError(null);
  };

  const toggle = (id: string) =>
    setTodos((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));

  const remove = (todo: Todo) => {
    if (!window.confirm(t("todos.confirmDelete"))) return;
    setTodos((prev) => prev.filter((x) => x.id !== todo.id));
  };

  const clearDone = () => {
    const n = doneCount;
    if (!n) return;
    setTodos((prev) => prev.filter((x) => !x.done));
    onToast(t("todos.cleared", { n }), "info");
  };

  return (
    <Card className="card-pad">
      <div className="between" style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: "1.05rem" }}>☑ {t("todos.title")}</h3>
        <span className="chip" data-testid="todo-left">{t("todos.left", { n: left })}</span>
      </div>

      <div className="row" style={{ marginBottom: 12, flexWrap: "nowrap" }}>
        <input
          className={`input ${error ? "err" : ""}`}
          value={text}
          maxLength={MAX + 20}
          placeholder={t("todos.placeholder")}
          aria-label={t("todos.placeholder")}
          data-testid="todo-input"
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <button type="button" className="btn primary" data-testid="todo-add" onClick={add}>{t("todos.add")}</button>
      </div>
      {error ? <p className="err-text" data-testid="todo-error">{error}</p> : null}

      <div className="row" style={{ marginBottom: 12 }} role="group" aria-label={t("todos.title")}>
        {(["all", "active", "done"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`chip ${filter === f ? "on" : ""}`}
            style={{ cursor: "pointer", padding: "6px 12px" }}
            aria-pressed={filter === f}
            data-testid={`todo-filter-${f}`}
            onClick={() => setFilter(f)}
          >
            {t(`todos.filter.${f}`)}
          </button>
        ))}
      </div>

      <div className="stack" data-testid="todo-list">
        {visible.length === 0 ? (
          <Empty glyph="☑" title={t("todos.empty")} hint={t("todos.emptyHint")} />
        ) : (
          visible.map((todo) => (
            <div className={`todo ${todo.done ? "done" : ""}`} key={todo.id} data-testid="todo-item">
              <button
                type="button"
                className={`check ${todo.done ? "on" : ""}`}
                role="checkbox"
                aria-checked={todo.done}
                aria-label={todo.text}
                data-testid="todo-toggle"
                onClick={() => toggle(todo.id)}
              >
                {todo.done ? "✓" : ""}
              </button>
              <span className="todo-text">{todo.text}</span>
              <button
                type="button"
                className="btn sm danger"
                data-testid="todo-delete"
                onClick={() => remove(todo)}
                aria-label={`${t("links.delete")} ${todo.text.slice(0, 12)}`}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {doneCount > 0 ? (
        <div className="between" style={{ marginTop: 14 }}>
          <span className="hint">{doneCount} ✓</span>
          <button type="button" className="btn sm ghost" data-testid="todo-clear" onClick={clearDone}>
            {t("todos.clearDone")}
          </button>
        </div>
      ) : null}
    </Card>
  );
}
