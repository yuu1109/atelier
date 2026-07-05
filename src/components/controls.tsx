import { useId, useState } from "react";
import type { CSSProperties } from "react";
import type { Option } from "../lib/types";

/**
 * フォームコントロール集（hishoトーン）。
 * フラット第一・白カード上では surface-soft の面で構造を出す。
 * 押せるものは active:opacity-70 + transition-colors。
 */

/* ===== セグメントコントロール（単一選択・少数） ===== */
export function Segment({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex max-w-full flex-wrap gap-0.5 rounded-full bg-surface-mute p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors active:opacity-70 ${
              active ? "bg-surface font-bold text-ink shadow-chip" : "text-ink2"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ===== ピル群（単一 or 複数選択） ===== */
export function Pills({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: Option[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multi?: boolean;
}) {
  const selected = new Set(Array.isArray(value) ? value : value === "" ? [] : [value]);
  const toggle = (v: string) => {
    if (multi) {
      const next = new Set(selected);
      if (next.has(v)) {
        next.delete(v);
      } else {
        next.add(v);
      }
      onChange([...next]);
    } else {
      // 単一選択は同じピルをもう一度押すと解除（任意項目で「選ばない」に戻せる）
      onChange(selected.has(v) ? "" : v);
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.has(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            title={o.desc}
            className={`rounded-full px-3 py-1.5 text-[13px] transition-colors active:opacity-70 ${
              active ? "bg-accent font-bold text-white" : "bg-surface-soft text-ink2"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * プリセットのミニプレビュー。
 * image があれば写真/生成画像をそのまま表示し、読み込みエラー時は自動で
 * colors ベースのCSSスウォッチにフォールバックする（image未指定でも動く）。
 */
function PresetSwatch({ preview }: { preview: NonNullable<Option["preview"]> }) {
  const [imgFailed, setImgFailed] = useState(false);
  const { image, colors, texture = "flat" } = preview;

  if (image && !imgFailed) {
    return (
      <span className="mb-2 block aspect-video w-full overflow-hidden rounded-lg border border-line bg-surface-mute">
        <img src={image} alt="" className="h-full w-full object-cover" onError={() => setImgFailed(true)} />
      </span>
    );
  }

  if (!colors || colors.length === 0) return null;

  const c0 = colors[0] ?? "#E5E5EA";
  const c1 = colors[1] ?? c0;
  const c2 = colors[2] ?? c1;

  const style: CSSProperties = (() => {
    switch (texture) {
      case "duo":
        return { backgroundImage: `linear-gradient(135deg, ${c0} 50%, ${c1} 50%)` };
      case "isometric":
        return {
          backgroundImage: `repeating-linear-gradient(60deg, ${c0} 0px, ${c0} 10px, ${c1} 10px, ${c1} 20px)`,
        };
      case "mono":
        return { backgroundImage: `linear-gradient(135deg, ${c0}, ${c1})` };
      case "illustration":
        return {
          backgroundColor: c0,
          backgroundImage: `radial-gradient(circle at 22% 32%, ${c1} 0 26%, transparent 27%), radial-gradient(circle at 74% 68%, ${c2} 0 22%, transparent 23%)`,
        };
      default:
        return { backgroundColor: c0 };
    }
  })();

  return (
    <span className="relative mb-2 block aspect-video w-full overflow-hidden rounded-lg border border-line" style={style}>
      {texture === "flat" ? (
        <span
          className="absolute bottom-1.5 right-1.5 h-3 w-3 rounded-full border border-white/50"
          style={{ background: c2 }}
        />
      ) : null}
    </span>
  );
}

/* ===== リッチカード（スタイルプリセット等の単一選択） ===== */
export function Cards({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  columns?: 2 | 3;
}) {
  return (
    <div className={`grid gap-1.5 ${columns === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(active ? "" : o.value)}
            className={`rounded-xl border p-3 text-left transition-colors active:opacity-70 ${
              active ? "border-accent bg-accent-soft" : "border-transparent bg-surface-soft"
            }`}
          >
            {o.preview ? <PresetSwatch preview={o.preview} /> : null}
            <span className={`block text-[13px] font-bold ${active ? "text-accent" : "text-ink"}`}>{o.label}</span>
            {o.desc ? <span className="mt-0.5 block text-[11px] leading-relaxed text-ink2">{o.desc}</span> : null}
            {o.tags && o.tags.length > 0 ? (
              <span className="mt-1.5 flex flex-wrap gap-1">
                {o.tags.map((t) => (
                  <span key={t} className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] text-ink3">
                    {t}
                  </span>
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ===== テキスト入力 ===== */
export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl bg-surface-soft px-3 py-2.5 text-[15px] text-ink placeholder:text-ink3 outline-none focus:ring-2 focus:ring-accent"
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-y rounded-xl bg-surface-soft px-3 py-2.5 text-[14px] leading-relaxed text-ink placeholder:text-ink3 outline-none focus:ring-2 focus:ring-accent"
    />
  );
}

/* ===== 数値ステッパー ===== */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 10,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const step = (d: number) => onChange(Math.min(max, Math.max(min, value + d)));
  return (
    <div className="inline-flex items-center gap-3">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={value <= min}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-[17px] text-ink transition-colors active:opacity-70 disabled:opacity-40 disabled:active:opacity-40"
        aria-label="減らす"
      >
        −
      </button>
      <span className="min-w-6 text-center text-[17px] font-bold text-ink">{value}</span>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={value >= max}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-[17px] text-ink transition-colors active:opacity-70 disabled:opacity-40 disabled:active:opacity-40"
        aria-label="増やす"
      >
        ＋
      </button>
    </div>
  );
}

/* ===== iOSスイッチ（ONは緑 = hisho流） ===== */
export function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer select-none items-center gap-2.5">
      <span className="relative inline-block h-[31px] w-[51px]">
        <input
          id={id}
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`absolute inset-0 rounded-full transition-colors ${value ? "bg-good" : "bg-surface-mute"}`}
        />
        <span
          className={`absolute top-0.5 h-[27px] w-[27px] rounded-full bg-white shadow-chip transition-[left] ${
            value ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
      {label ? <span className="text-[13px] text-ink2">{label}</span> : null}
    </label>
  );
}

/* ===== カラースウォッチ＋自由入力 ===== */
export function ColorField({
  value,
  onChange,
  swatches = [],
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  swatches?: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [focus, setFocus] = useState(false);
  const isHex = /^#[0-9a-fA-F]{3,8}$/.test(value.trim());
  return (
    <div className="space-y-2">
      {swatches.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {swatches.map((s) => {
            const active = value.trim().toLowerCase() === s.value.toLowerCase();
            return (
              <button
                key={s.value}
                type="button"
                title={s.label}
                onClick={() => onChange(active ? "" : s.value)}
                className={`h-7 w-7 rounded-full border border-line transition-transform active:opacity-70 ${
                  active ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""
                }`}
                style={{ background: s.value }}
                aria-label={s.label}
              />
            );
          })}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <span
          className="h-7 w-7 shrink-0 rounded-full border border-line"
          style={{ background: isHex ? value.trim() : "transparent" }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={placeholder ?? "色名 or HEX（例: #007AFF）"}
          className={`w-full rounded-xl bg-surface-soft px-3 py-2 text-[13px] text-ink placeholder:text-ink3 outline-none ${
            focus ? "ring-2 ring-accent" : ""
          }`}
        />
      </div>
    </div>
  );
}
