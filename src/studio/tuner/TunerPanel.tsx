import type { CssVar } from "./cssVars";

/**
 * CSS変数の調整パネル（hishoトーン）。
 * 色系（値が#HEX）とその他に分けて表示し、変更済みの行には丸ドットを付ける。
 * 値の解釈・書き戻しは親が担い、ここは表示と onChange の中継だけを行う。
 */

export interface TunerPanelProps {
  vars: CssVar[];
  /** 変更中の値（変数名 → 新しい値）。未変更の変数はキーなし */
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

/** #RGB / #RRGGBB を色系とみなす（input type=color で扱える範囲） */
function isHexColor(v: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim());
}

/** input type=color 用に #RRGGBB へ正規化（#RGB は展開） */
function toColorInputHex(v: string): string {
  const t = v.trim();
  const m3 = t.match(/^#([0-9a-fA-F]{3})$/);
  if (m3) {
    const [r, g, b] = m3[1];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return /^#[0-9a-fA-F]{6}$/.test(t) ? t.toLowerCase() : "#000000";
}

/** 「1.5rem」のような数値+rem単独の値ならその数値を返す */
function parseRemValue(v: string): number | null {
  const m = v.trim().match(/^(\d+(?:\.\d+)?)rem$/);
  return m ? Number(m[1]) : null;
}

/** スライダーの範囲（rem） */
const REM_MIN = 0;
const REM_MAX = 10;
const REM_STEP = 0.25;

function VarRow({
  v,
  current,
  changed,
  onChange,
}: {
  v: CssVar;
  current: string;
  changed: boolean;
  onChange: (value: string) => void;
}) {
  const colorLike = isHexColor(v.value);
  const remLike = !colorLike && parseRemValue(v.value) !== null;

  return (
    <div className="flex items-center gap-2.5 py-2.5">
      {/* 変更済みドット */}
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${changed ? "bg-accent" : "bg-transparent"}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[12px] text-ink">{v.name}</p>
        {v.comment ? (
          <p className="truncate text-[11px] text-ink3" title={v.comment}>
            {v.comment}
          </p>
        ) : null}
      </div>
      {colorLike ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <input
            type="color"
            value={toColorInputHex(isHexColor(current) ? current : v.value)}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="h-8 w-9 cursor-pointer rounded-lg border border-line bg-surface-soft p-0.5"
            aria-label={`${v.name} の色`}
          />
          <input
            type="text"
            value={current}
            onChange={(e) => onChange(e.target.value)}
            className="w-[88px] rounded-lg bg-surface-soft px-2 py-1.5 font-mono text-[12px] text-ink outline-none focus:ring-2 focus:ring-accent"
            aria-label={`${v.name} のHEX値`}
          />
        </div>
      ) : remLike ? (
        <div className="flex shrink-0 items-center gap-2">
          <input
            type="range"
            min={REM_MIN}
            max={REM_MAX}
            step={REM_STEP}
            value={parseRemValue(current) ?? parseRemValue(v.value) ?? 0}
            onChange={(e) => onChange(`${Number(e.target.value)}rem`)}
            className="w-28 accent-accent"
            aria-label={`${v.name} のサイズ`}
          />
          <span className="w-[60px] text-right font-mono text-[12px] text-ink2">{current}</span>
        </div>
      ) : (
        <input
          type="text"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="w-[190px] shrink-0 rounded-lg bg-surface-soft px-2 py-1.5 font-mono text-[12px] text-ink outline-none focus:ring-2 focus:ring-accent"
          aria-label={`${v.name} の値`}
        />
      )}
    </div>
  );
}

export function TunerPanel({ vars, values, onChange }: TunerPanelProps) {
  const colors = vars.filter((v) => isHexColor(v.value));
  const others = vars.filter((v) => !isHexColor(v.value));

  const renderGroup = (label: string, group: CssVar[]) =>
    group.length === 0 ? null : (
      <div key={label}>
        <p className="section-label">{label}</p>
        <div className="mt-1 divide-y divide-line">
          {group.map((v) => {
            const current = values[v.name] ?? v.value;
            return (
              <VarRow
                key={v.name}
                v={v}
                current={current}
                changed={values[v.name] !== undefined && values[v.name] !== v.value}
                onChange={(value) => onChange(v.name, value)}
              />
            );
          })}
        </div>
      </div>
    );

  if (vars.length === 0) {
    return <p className="text-[13px] text-ink3">調整できる変数が見つからない（:root ブロックが空）</p>;
  }

  return (
    <div className="space-y-5">
      {renderGroup("COLORS", colors)}
      {renderGroup("SIZE / OTHERS", others)}
    </div>
  );
}
