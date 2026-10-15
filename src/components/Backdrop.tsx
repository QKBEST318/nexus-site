import { profile } from "../config/profile";
import { useApp } from "../app/context";

/** 背景光效层 / animated background: grid + gradient orbs. */
export function Backdrop() {
  return (
    <div className="bg-layer" aria-hidden="true">
      <div className="bg-grid" />
      <div className="orb a" />
      <div className="orb b" />
      <div className="orb c" />
    </div>
  );
}

/** 科技风默认头像（纯 CSS 生成，无需图片文件）/ generated tech avatar. */
export function Avatar({ size = 72 }: { size?: number }) {
  const { avatar } = profile;
  return (
    <div className="avatar" style={{ ["--h" as string]: avatar.hue, width: size, height: size }} aria-hidden="true">
      <b>{avatar.initials}</b>
    </div>
  );
}

export function LangBadge() {
  const { lang } = useApp();
  return <span className="chip on">{lang === "zh" ? "中文" : "EN"}</span>;
}
