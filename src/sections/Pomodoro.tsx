import { useEffect, useRef, useState } from "react";
import { useApp } from "../app/context";
import { Card } from "../components/ui";
import { pomodoroDefaults, storagePrefix } from "../config/profile";
import { useLocalState } from "../lib/hooks";
import { clamp, formatClock, writeStore } from "../lib/storage";

type Mode = "focus" | "short" | "long";

interface Durations {
  focus: number;
  short: number;
  long: number;
}

const KEY = `${storagePrefix}.pomodoro`;
const ROUNDS_KEY = `${storagePrefix}.pomodoroRounds`;
const { min, max } = pomodoroDefaults.limits;
const R = 84;
const C = 2 * Math.PI * R;

/** 结束时的一声提示音 / a short two-tone chime when a session ends. */
function chime() {
  try {
    const AC: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + i * 0.22 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.22 + 0.34);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.22);
      osc.stop(ctx.currentTime + i * 0.22 + 0.36);
    });
    window.setTimeout(() => void ctx.close(), 1400);
  } catch {
    /* 音频不可用时不阻塞计时 / audio is optional */
  }
}

export function Pomodoro({ onToast }: { onToast: (text: string, kind?: "ok" | "info" | "warn") => void }) {
  const { t } = useApp();
  const [durations, setDurations] = useLocalState<Durations>(KEY, {
    focus: pomodoroDefaults.focus,
    short: pomodoroDefaults.short,
    long: pomodoroDefaults.long,
  });
  const [rounds, setRounds] = useLocalState<number>(ROUNDS_KEY, 0);

  const [mode, setMode] = useState<Mode>("focus");
  const [left, setLeft] = useState(durations.focus * 60);
  const [running, setRunning] = useState(false);
  const [values, setValues] = useState<Durations>({ ...durations });
  const [formErr, setFormErr] = useState<string | null>(null);

  // 计时循环读取的实时值 / live values read by the ticking loop
  const state = useRef({ left, mode, durations, rounds, finish: false, finishedMode: "focus" as Mode });
  state.current.left = left;
  state.current.mode = mode;
  state.current.durations = durations;
  state.current.rounds = rounds;

  const total = durations[mode] * 60;

  /** 切换到另一个模式 / switch session type and re-arm the clock. */
  const switchTo = (m: Mode, dur: Durations) => {
    setRunning(false);
    setMode(m);
    setLeft(dur[m] * 60);
  };

  /* 计时：基于目标时间戳，标签页被挂起后仍然准确 */
  useEffect(() => {
    if (!running) return;
    const deadline = Date.now() + state.current.left * 1000;

    const tick = () => {
      const remaining = deadline - Date.now();
      if (remaining > 0) {
        setLeft(Math.ceil(remaining / 1000));
        return;
      }
      const finished = state.current.mode;
      setRunning(false);
      setLeft(0);
      chime();
      onToast(t("pomodoro.done", { mode: t(`pomodoro.${finished}`) }), "info");
      if (finished === "focus") {
        const done = state.current.rounds + 1;
        setRounds(done);
        switchTo(done % pomodoroDefaults.longBreakEvery === 0 ? "long" : "short", state.current.durations);
      } else {
        switchTo("focus", state.current.durations);
      }
    };

    const id = window.setInterval(tick, 200);
    tick();
    return () => window.clearInterval(id);
    // 只在开始/停止时重建计时器；t/onToast 变化不应打断计时
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const reset = () => switchTo(mode, durations);
  const skip = () => switchTo(mode === "focus" ? "short" : "focus", durations);

  const applyDurations = () => {
    const bad = (n: number) => !Number.isFinite(n) || n < min || n > max;
    if ([values.focus, values.short, values.long].some(bad)) {
      setFormErr(t("pomodoro.invalid", { min, max }));
      return;
    }
    const next: Durations = { focus: Math.round(values.focus), short: Math.round(values.short), long: Math.round(values.long) };
    setDurations(next);
    setValues(next);
    setFormErr(null);
    if (!running) setLeft(next[mode] * 60);
    onToast(t("pomodoro.applied"));
  };

  const pct = total > 0 ? clamp(1 - left / total, 0, 1) : 0;

  return (
    <Card className="pomo" pad>
      <div className="between" style={{ marginBottom: 6 }}>
        <h3 style={{ fontSize: "1.05rem" }}>⏱ {t("pomodoro.title")}</h3>
        <span className="chip" data-testid="pomo-rounds">{t("pomodoro.rounds", { n: rounds })}</span>
      </div>

      <div className="mode-tabs">
        {(["focus", "short", "long"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            className={`chip ${mode === m ? "on" : ""}`}
            style={{ cursor: "pointer", padding: "6px 12px" }}
            aria-pressed={mode === m}
            data-testid={`mode-${m}`}
            onClick={() => switchTo(m, durations)}
          >
            {t(`pomodoro.${m}`)}
          </button>
        ))}
      </div>

      <div className="pomo-ring">
        <svg width="190" height="190" viewBox="0 0 190 190" role="img" aria-label={t("a11y.progress")}>
          <defs>
            <linearGradient id="pomoGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <circle className="track" cx="95" cy="95" r={R} fill="none" strokeWidth="10" />
          <circle
            className="bar"
            cx="95"
            cy="95"
            r={R}
            fill="none"
            strokeWidth="10"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
          />
        </svg>
        <div className="pomo-center">
          <span className="t tabular" data-testid="pomo-time">{formatClock(left)}</span>
          <span className="m">{t(`pomodoro.${mode}`)}</span>
          <span className="r">{Math.round(pct * 100)}%</span>
        </div>
      </div>

      <div className="pomo-actions">
        {!running ? (
          <button type="button" className="btn primary" data-testid="pomo-start" onClick={() => setRunning(true)}>
            {left === total ? t("pomodoro.start") : t("pomodoro.resume")}
          </button>
        ) : (
          <button type="button" className="btn" data-testid="pomo-pause" onClick={() => setRunning(false)}>
            {t("pomodoro.pause")}
          </button>
        )}
        <button type="button" className="btn" data-testid="pomo-reset" onClick={reset}>{t("pomodoro.reset")}</button>
        <button type="button" className="btn ghost" onClick={skip}>{t("pomodoro.skip")} ⇥</button>
      </div>

      <div className="pomo-settings">
        <p className="hint" style={{ marginBottom: 10 }}>{t("pomodoro.settings")}</p>
        <div className="grid g-3">
          {(["focus", "short", "long"] as Mode[]).map((m) => (
            <label className="field" key={m} style={{ margin: 0 }}>
              <span>{t(`pomodoro.${m}`)}</span>
              <input
                className={`input tabular ${formErr ? "err" : ""}`}
                type="number"
                min={min}
                max={max}
                step={1}
                value={Number.isFinite(values[m]) ? values[m] : ""}
                data-testid={`dur-${m}`}
                onChange={(e) => {
                  const raw = e.target.value;
                  setValues((v) => ({ ...v, [m]: raw === "" ? NaN : Number(raw) }));
                }}
              />
            </label>
          ))}
        </div>
        {formErr ? <p className="err-text" data-testid="pomo-error">{formErr}</p> : null}
        <button type="button" className="btn sm" style={{ marginTop: 10 }} data-testid="pomo-apply" onClick={applyDurations}>
          {t("pomodoro.apply")}
        </button>
      </div>
    </Card>
  );
}

/** 供主应用在「清空本地数据」时调用 / used by the global reset action. */
export function resetPomodoro(): void {
  writeStore(KEY, { focus: pomodoroDefaults.focus, short: pomodoroDefaults.short, long: pomodoroDefaults.long });
  writeStore(ROUNDS_KEY, 0);
}
