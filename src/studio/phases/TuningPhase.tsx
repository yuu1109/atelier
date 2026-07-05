import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { PhaseProps } from "./PhaseProps";
import { projectPath } from "../lib/project";
import { parseRootVars, serializeWithValues, type CssVar } from "../tuner/cssVars";
import { TunerPanel } from "../tuner/TunerPanel";
import { BODY_TEXT_CONTRAST_MIN, contrastRatio } from "../../lib/color";

/**
 * 微調整フェーズ。
 * 実装済みサイトの tokens.css（デザイントークン）を読み込み、
 * 左のパネルで値を調整 → 右のスペシメンで即時確認 → 元ファイルへ忠実に書き戻す。
 */

/** tokens.css の案件内パス */
const TOKENS_REL = "site/src/styles/tokens.css";

/** コントラスト検査の対象ペア（文字色 × 地色） */
const CONTRAST_PAIRS: { label: string; fg: string; bg: string }[] = [
  { label: "本文 × 地色", fg: "--c-ink", bg: "--c-bg" },
  { label: "ボタン文字 × 主色", fg: "--c-on-primary", bg: "--c-primary" },
];

type LoadState = "loading" | "missing" | "ready" | "error";

export function TuningPhase({ store, project, onToast }: PhaseProps) {
  const tokensPath = projectPath(project, TOKENS_REL);
  const devCommand = `cd /Users/yuu_design2022/Desktop/01_project/HP/clients/${project}/site && npm run dev`;

  const [load, setLoad] = useState<LoadState>("loading");
  const [css, setCss] = useState("");
  const [vars, setVars] = useState<CssVar[]>([]);
  /** 変更中の値（変数名 → 新しい値） */
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState(false);

  // tokens.css の読み込み（案件切り替え時はリセット）
  useEffect(() => {
    let alive = true;
    setLoad("loading");
    setValues({});
    setSavedHint(false);
    store
      .readText(tokensPath)
      .then((text) => {
        if (!alive) return;
        if (text === null) {
          setLoad("missing");
          return;
        }
        setCss(text);
        setVars(parseRootVars(text).vars);
        setLoad("ready");
      })
      .catch(() => {
        if (alive) setLoad("error");
      });
    return () => {
      alive = false;
    };
  }, [store, tokensPath]);

  /** 現在の実効値（変更中ならその値、なければ元の値） */
  const effective = useCallback(
    (name: string) => values[name] ?? vars.find((v) => v.name === name)?.value,
    [values, vars],
  );

  /** 実際に元の値と異なる変更だけを抽出 */
  const changes = useMemo(() => {
    const list: { name: string; before: string; after: string }[] = [];
    for (const v of vars) {
      const nv = values[v.name];
      if (nv !== undefined && nv !== v.value) list.push({ name: v.name, before: v.value, after: nv });
    }
    return list;
  }, [vars, values]);

  /** スペシメンに全変数をインラインCSS変数として適用する */
  const specimenStyle = useMemo(() => {
    const s: Record<string, string> = {};
    for (const v of vars) s[v.name] = values[v.name] ?? v.value;
    return s as CSSProperties;
  }, [vars, values]);

  const handleChange = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setValues({});
    setSavedHint(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (changes.length === 0) return;
    setSaving(true);
    try {
      const updated: Record<string, string> = {};
      for (const c of changes) updated[c.name] = c.after;
      const next = serializeWithValues(css, updated);
      // writeText は既定でバックアップを _atelier/backups/ に自動退避する
      await store.writeText(tokensPath, next);
      setCss(next);
      setVars(parseRootVars(next).vars);
      setValues({});
      setSavedHint(true);
      onToast("tokens.css に書き戻した（旧内容は自動バックアップ済み）");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "書き戻しに失敗した");
    } finally {
      setSaving(false);
    }
  }, [changes, css, store, tokensPath, onToast]);

  const copyDevCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(devCommand);
      onToast("devサーバー起動コマンドをコピーした");
    } catch {
      onToast("コピーできなかった。下のコマンドを手動で選択してね");
    }
  }, [devCommand, onToast]);

  /* ===== 読み込み中 ===== */
  if (load === "loading") {
    return (
      <div className="animate-pulse rounded-cardlg bg-surface p-8">
        <p className="text-[13px] text-ink3">tokens.css を読み込み中…</p>
      </div>
    );
  }

  /* ===== 読み込みエラー ===== */
  if (load === "error") {
    return (
      <div className="rounded-cardlg bg-bad-bg p-5">
        <p className="text-[13px] font-bold text-bad">tokens.css の読み込みに失敗した</p>
        <p className="mt-1 text-[12px] text-bad">HPルートの接続と clients/{project}/site/ の存在を確認してね</p>
      </div>
    );
  }

  /* ===== 未実装ガイド（tokens.css がまだ無い） ===== */
  if (load === "missing") {
    return (
      <div className="rounded-cardlg bg-surface p-8">
        <p className="section-label">TUNING</p>
        <p className="mt-2 text-[15px] font-bold text-ink">微調整は実装後に使える</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink2">
          この案件はまだ site/ が実装されていない。Claude Code で coding スキルを実行してサイトを実装すると、
          <span className="font-mono text-[12px]">{TOKENS_REL}</span>{" "}
          が生成され、ここで色・書体サイズ・余白を直接調整できるようになる。
        </p>
        <div className="mt-4 rounded-xl bg-surface-soft p-3">
          <p className="text-[11px] text-ink3">Claude Code での実行イメージ</p>
          <p className="mt-1 font-mono text-[12px] text-ink2">
            cd /Users/yuu_design2022/Desktop/01_project/HP && claude → 「{project} を coding スキルで実装して」
          </p>
        </div>
      </div>
    );
  }

  /* ===== 調整UI本体 ===== */
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {/* 左: 変数パネル */}
      <div className="rounded-cardlg bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <p className="section-label">TOKENS</p>
          <p className="font-mono text-[11px] text-ink3">{TOKENS_REL}</p>
        </div>
        <div className="mt-3">
          <TunerPanel vars={vars} values={values} onChange={handleChange} />
        </div>
      </div>

      {/* 右: スペシメン + コントラスト + 差分 + アクション */}
      <div className="space-y-4">
        {/* スペシメン */}
        <div className="rounded-cardlg bg-surface p-5">
          <p className="section-label">SPECIMEN</p>
          <div
            className="mt-3 rounded-xl border border-line p-5"
            style={{
              ...specimenStyle,
              background: "var(--c-bg, #fff)",
              fontFamily: "var(--font-body, sans-serif)",
            }}
          >
            <p
              style={{
                color: "var(--c-ink-muted, #888)",
                fontSize: "var(--text-sm, 0.875rem)",
                letterSpacing: "0.14em",
              }}
            >
              SECTION LABEL
            </p>
            <h3
              className="mt-1"
              style={{
                color: "var(--c-heading, #222)",
                fontFamily: "var(--font-heading, serif)",
                fontSize: "var(--text-lg, 1.5rem)",
                lineHeight: "var(--leading-tight, 1.35)",
                fontWeight: 700,
              }}
            >
              見出しの見本テキスト
            </h3>
            <p
              className="mt-2"
              style={{
                color: "var(--c-ink, #222)",
                fontSize: "var(--text-base, 1rem)",
                lineHeight: "var(--leading-body, 1.8)",
              }}
            >
              本文の見本。地色との相性、行間、書体の雰囲気をここで確かめる。値を動かすと即座に反映される。
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span
                style={{
                  background: "var(--c-primary, #333)",
                  color: "var(--c-on-primary, #fff)",
                  borderRadius: "var(--radius-md, 8px)",
                  padding: "0.6rem 1.4rem",
                  fontSize: "var(--text-sm, 0.875rem)",
                  fontWeight: 700,
                }}
              >
                主ボタン
              </span>
              <span
                style={{
                  border: "1px solid var(--c-primary, #333)",
                  color: "var(--c-primary, #333)",
                  borderRadius: "var(--radius-md, 8px)",
                  padding: "0.6rem 1.4rem",
                  fontSize: "var(--text-sm, 0.875rem)",
                }}
              >
                副ボタン
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                style={{
                  background: "var(--c-primary-soft, #eee)",
                  color: "var(--c-ink, #222)",
                  borderRadius: "var(--radius-full, 999px)",
                  padding: "0.25rem 0.8rem",
                  fontSize: "var(--text-sm, 0.875rem)",
                }}
              >
                チップ
              </span>
              <span
                style={{
                  background: "var(--c-surface, #fff)",
                  border: "1px solid var(--c-border, #ddd)",
                  color: "var(--c-ink-muted, #888)",
                  borderRadius: "var(--radius-full, 999px)",
                  padding: "0.25rem 0.8rem",
                  fontSize: "var(--text-sm, 0.875rem)",
                }}
              >
                アウトライン
              </span>
              <span
                style={{
                  color: "var(--c-accent, #a00)",
                  fontSize: "var(--text-sm, 0.875rem)",
                  fontWeight: 700,
                }}
              >
                アクセント文字
              </span>
            </div>
          </div>

          {/* コントラスト表 */}
          <div className="mt-4 space-y-1.5">
            {CONTRAST_PAIRS.map((p) => {
              const fg = effective(p.fg);
              const bg = effective(p.bg);
              const ratio = fg && bg ? contrastRatio(fg, bg) : null;
              const ok = ratio !== null && ratio >= BODY_TEXT_CONTRAST_MIN;
              return (
                <div
                  key={p.label}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-[12px] ${
                    ratio === null
                      ? "bg-surface-soft text-ink3"
                      : ok
                        ? "bg-good-bg text-good"
                        : "bg-bad-bg text-bad"
                  }`}
                >
                  <span>
                    {p.label}
                    <span className="ml-1.5 font-mono text-[11px] opacity-70">
                      {p.fg} × {p.bg}
                    </span>
                  </span>
                  <span className="font-mono font-bold">
                    {ratio === null
                      ? "判定不可"
                      : `${ratio.toFixed(2)} ${ok ? "AA合格" : `警告（${BODY_TEXT_CONTRAST_MIN}未満）`}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 変更差分 */}
        {changes.length > 0 ? (
          <div className="rounded-cardlg bg-surface p-5">
            <p className="section-label">CHANGES（{changes.length}件）</p>
            <div className="mt-2 divide-y divide-line">
              {changes.map((c) => (
                <div key={c.name} className="flex items-center gap-2 py-2 font-mono text-[12px]">
                  <span className="min-w-0 flex-1 truncate text-ink">{c.name}</span>
                  <span className="truncate text-ink3">{c.before}</span>
                  <span className="text-ink3">→</span>
                  <span className="truncate font-bold text-accent">{c.after}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* アクション */}
        <div className="rounded-cardlg bg-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={changes.length === 0 || saving}
              className="rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-white transition-colors active:opacity-70 disabled:opacity-40"
            >
              {saving ? "書き戻し中…" : `書き戻す${changes.length > 0 ? `（${changes.length}件）` : ""}`}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={changes.length === 0 || saving}
              className="rounded-full bg-surface-soft px-4 py-2 text-[13px] text-ink2 transition-colors active:opacity-70 disabled:opacity-40"
            >
              変更をリセット
            </button>
          </div>

          {savedHint ? (
            <div className="mt-3 rounded-xl bg-accent-soft p-3">
              <p className="text-[12px] font-bold text-accent">書き戻し完了</p>
              <p className="mt-0.5 text-[12px] text-ink2">
                devサーバー起動中なら localhost:4321（npm run dev）で即反映される
              </p>
            </div>
          ) : null}

          <div className="mt-3 rounded-xl bg-surface-soft p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-ink3">Astro devサーバーの起動（ターミナルで実行）</p>
              <button
                type="button"
                onClick={copyDevCommand}
                className="shrink-0 rounded-full bg-surface px-3 py-1 text-[12px] text-accent shadow-chip transition-colors active:opacity-70"
              >
                コピー
              </button>
            </div>
            <p className="mt-1.5 break-all font-mono text-[11px] leading-relaxed text-ink2">{devCommand}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
