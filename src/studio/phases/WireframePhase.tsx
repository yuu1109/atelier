import { useEffect, useMemo, useRef, useState } from "react";
import { MdLock, MdOpenInNew, MdSaveAlt } from "react-icons/md";
import { Segment } from "../../components/controls";
import { CoCreatePanel } from "../cocreate/CoCreatePanel";
import { useCoCreation } from "../cocreate/session";
import { patchState, projectPath, readState } from "../lib/project";
import { buildWfSystemPrompt } from "../wf/knowledge";
import { renderWireframe } from "../wf/render";
import { errorSummary, validateWfPlan } from "../wf/rules";
import { WF_PLAN_SCHEMA, type WfPlan } from "../wf/schema";
import type { PhaseProps } from "./PhaseProps";

/**
 * WF壁打ちフェーズ。
 * 左: AIとの壁打ち（WfPlanを対で更新）/ 中: グレースケールHTMLプレビュー /
 * 右: アウトライン編集 + 規律検査（rules.ts）+ 手動チェック。
 * 成果物は state.json の wfPlan にデバウンス保存し、
 * 書き出しで clients/{案件}/wireframe/index.html + CHANGELOG.md を更新する。
 */

/** 初案づくりの提案チップ（成果物が無いときだけ表示） */
const FIRST_DRAFT_SUGGESTIONS = [
  "hearingから初案を作って",
  "来店特化でシンプルに",
  "採用も見据えた構成に",
];

/** 手動チェック項目（wireframe-spec.md §9 の目視項目。保存はしない） */
const MANUAL_CHECKS = [
  "FVだけで「誰の・何の店・どこ・次の行動」が伝わる",
  "中央寄せ縦積みの同型セクションが続いていない",
  "SP幅（390px）で崩れ・横スクロールが無い",
];

/** state.json 保存のデバウンス間隔（ms） */
const SAVE_DEBOUNCE_MS = 800;

/** ローカル日付（YYYY-MM-DD）。CHANGELOGの見出しに使う */
function localDate(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 改行を潰して1行にする（CHANGELOGの箇条書き用） */
function oneLine(s: string): string {
  return s.replace(/\s*\n+\s*/g, " ").trim();
}

export function WireframePhase({ store, project, onToast }: PhaseProps) {
  /** undefined = 読み込み中 / null = hearing.md 無し */
  const [hearingText, setHearingText] = useState<string | null | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [hasIndex, setHasIndex] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [device, setDevice] = useState<"pc" | "sp">("pc");
  const [busyFile, setBusyFile] = useState(false);
  const [checks, setChecks] = useState<boolean[]>(() => MANUAL_CHECKS.map(() => false));
  /** 2回目以降の書き出しで開く「今回の変更メモ」ダイアログ */
  const [memo, setMemo] = useState<{ open: boolean; instruction: string; action: string }>({
    open: false,
    instruction: "",
    action: "",
  });

  // systemプロンプト: 固定の規律 + この案件のヒアリング全文（分析セクション含む）を末尾に連結
  const system = useMemo(() => {
    const base = buildWfSystemPrompt();
    if (!hearingText || hearingText.trim() === "") return base;
    return `${base}

## この案件のヒアリング（hearing.md 全文。## 分析 の要件定義を含む）

以下の事実を最優先で使う。実績数・料金・年数などの数字がここに無いのに捏造しない。埋まらない箇所だけ業種の典型で仮置きし、その旨をnoteに書く。

${hearingText}`;
  }, [hearingText]);

  const cocreate = useCoCreation<WfPlan>({
    system,
    artifactSchema: WF_PLAN_SCHEMA,
    artifactLabel: "ワイヤーフレーム計画",
    validate: errorSummary,
  });
  const plan = cocreate.artifact;

  // reset は安定コールバックだが、cocreate オブジェクト自体は毎レンダー変わるため ref 経由で使う
  const resetRef = useRef(cocreate.reset);
  resetRef.current = cocreate.reset;
  /** 直近に state.json へ保存した内容（JSON文字列）。読み込み直後の再保存を防ぐ */
  const lastSavedRef = useRef<string | null>(null);

  /* ---- 初期読み込み: hearing.md / state.json / 書き出し・フィックス有無 ---- */
  useEffect(() => {
    let alive = true;
    setHearingText(undefined);
    setLoaded(false);
    setChecks(MANUAL_CHECKS.map(() => false));
    void (async () => {
      const [hearing, state, indexExists, fixedExists] = await Promise.all([
        store.readText(projectPath(project, "hearing.md")),
        readState(store, project),
        store.exists(projectPath(project, "wireframe/index.html")),
        store.exists(projectPath(project, "wireframe/wireframe-fixed.html")),
      ]);
      if (!alive) return;
      setHearingText(hearing);
      setHasIndex(indexExists);
      setFixed(fixedExists);
      const saved = (state.wfPlan as WfPlan | undefined) ?? null;
      resetRef.current(saved);
      lastSavedRef.current = saved ? JSON.stringify(saved) : null;
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [store, project]);

  /* ---- 成果物のデバウンス保存（state.json の wfPlan） ---- */
  useEffect(() => {
    if (!loaded || !plan) return;
    const json = JSON.stringify(plan);
    if (json === lastSavedRef.current) return;
    const t = setTimeout(() => {
      lastSavedRef.current = json;
      void patchState(store, project, { wfPlan: plan }).catch(() => {
        onToast("state.json への保存に失敗した…");
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [plan, loaded, store, project, onToast]);

  /* ---- プレビューHTML・検査結果 ---- */
  const previewHtml = useMemo(() => (plan ? renderWireframe(plan) : null), [plan]);
  const violations = useMemo(() => (plan ? validateWfPlan(plan) : []), [plan]);

  const openInNewTab = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    // タブが読み込む猶予をおいてから解放する
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  /* ---- アウトライン操作（setArtifact 経由でプレビューにも即反映） ---- */
  const moveSection = (i: number, dir: -1 | 1) => {
    if (!plan) return;
    const j = i + dir;
    if (j < 0 || j >= plan.sections.length) return;
    const sections = plan.sections.slice();
    [sections[i], sections[j]] = [sections[j], sections[i]];
    cocreate.setArtifact({ ...plan, sections });
  };

  const removeSection = (i: number) => {
    if (!plan) return;
    const removed = plan.sections[i];
    const sections = plan.sections.filter((_, k) => k !== i);
    // 参照切れナビを残さない（rules.ts の error になるため一緒に落とす）
    const nav = plan.nav.filter((n) => n.sectionKey !== removed.key);
    cocreate.setArtifact({ ...plan, sections, nav });
  };

  /* ---- 書き出し（wireframe/index.html + CHANGELOG.md） ---- */
  const changelogPath = projectPath(project, "wireframe/CHANGELOG.md");

  const doExport = async (entry?: { instruction: string; action: string }) => {
    if (!plan) return;
    setBusyFile(true);
    try {
      await store.writeText(projectPath(project, "wireframe/index.html"), renderWireframe(plan));
      const existing = await store.readText(changelogPath);
      if (existing === null) {
        // 初回: 見出し行だけ作る
        await store.writeText(changelogPath, `# ワイヤーフレーム修正履歴: ${project}\n`, { backup: false });
      } else if (entry) {
        const lines = [
          "",
          `## ${localDate()}`,
          `- 指示（原文）: ${oneLine(entry.instruction) || "（メモなし）"}`,
          `- 対応: ${oneLine(entry.action) || "（メモなし）"}`,
          "",
        ].join("\n");
        await store.writeText(changelogPath, existing.trimEnd() + "\n" + lines, { backup: false });
      }
      setHasIndex(true);
      onToast("wireframe/index.html に書き出したよ");
    } catch (e) {
      onToast(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyFile(false);
    }
  };

  const onExportClick = () => {
    if (!plan) return;
    if (!hasIndex) {
      void doExport();
      return;
    }
    // 2回目以降: 変更メモを聞いてから追記する。デフォルトは直近の壁打ち内容
    const lastUser = [...cocreate.history].reverse().find((m) => m.role === "user")?.text ?? "";
    const lastAssistant = [...cocreate.history].reverse().find((m) => m.role === "assistant")?.text ?? "";
    setMemo({ open: true, instruction: lastUser, action: lastAssistant });
  };

  /* ---- フィックス（index.html → wireframe-fixed.html 複製・凍結） ---- */
  const doFix = async () => {
    setBusyFile(true);
    try {
      const indexHtml = await store.readText(projectPath(project, "wireframe/index.html"));
      if (indexHtml === null) {
        onToast("先に wireframe/index.html へ書き出してね");
        return;
      }
      if (fixed) {
        const ok = window.confirm("wireframe-fixed.html がすでにある。上書きして再フィックスする？");
        if (!ok) return;
      }
      await store.writeText(projectPath(project, "wireframe/wireframe-fixed.html"), indexHtml);
      // CHANGELOGにフィックス日を記録（HPファクトリーの書式に合わせる）
      const existing = await store.readText(changelogPath);
      const head = existing ?? `# ワイヤーフレーム修正履歴: ${project}\n`;
      const entry = `\n## ${localDate()} — フィックス\n- index.html を wireframe-fixed.html に複製し凍結。以降は実装フェーズの正とする\n`;
      await store.writeText(changelogPath, head.trimEnd() + "\n" + entry, { backup: false });
      setFixed(true);
      onToast("フィックスした。以降 wireframe-fixed.html が実装の正になる");
    } catch (e) {
      onToast(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyFile(false);
    }
  };

  /* ---- 読み込み中 ---- */
  if (hearingText === undefined || !loaded) {
    return (
      <div className="rounded-cardlg bg-surface p-8">
        <p className="animate-pulse text-center text-[13px] text-ink3">案件データを読み込み中…</p>
      </div>
    );
  }

  /* ---- hearing.md 未作成: ガイド表示 ---- */
  if (hearingText === null || hearingText.trim() === "") {
    return (
      <div className="rounded-cardlg bg-surface p-8 text-center">
        <p className="text-[15px] font-bold text-ink">先にヒアリングから</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink2">
          ワイヤーフレームは hearing.md（ヒアリングの記録）を土台に壁打ちする。
          <br />
          「ヒアリング」フェーズで hearing.md を作ってから戻ってきてね
        </p>
      </div>
    );
  }

  const errorCount = violations.filter((v) => v.level === "error").length;
  const warnCount = violations.length - errorCount;

  return (
    <div className="space-y-3">
      {/* ヘッダー + アクション行 */}
      <section className="rounded-cardlg bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="section-label">Wireframe</p>
            <div className="mt-1 flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-ink">ワイヤーフレーム壁打ち</h3>
              {fixed ? (
                <span className="flex items-center gap-1 rounded-full bg-good-bg px-2.5 py-0.5 text-[11px] font-bold text-good">
                  <MdLock size={11} />
                  フィックス済み
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-ink2">
              AIと壁打ちして構成を固め、グレースケールHTMLで確認。納得したら書き出し → フィックスで凍結する
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!plan || busyFile}
              onClick={onExportClick}
              className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-white transition-colors active:opacity-70 disabled:opacity-40"
            >
              <MdSaveAlt size={15} />
              wireframe/index.html に書き出し
            </button>
            <button
              type="button"
              disabled={!hasIndex || busyFile}
              onClick={() => void doFix()}
              className="flex items-center gap-1.5 rounded-full bg-surface-soft px-4 py-2.5 text-[13px] font-bold text-ink2 transition-colors active:opacity-70 disabled:opacity-40"
              title="index.html を wireframe-fixed.html に複製して凍結する"
            >
              <MdLock size={14} />
              フィックス
            </button>
          </div>
        </div>
      </section>

      {/* 3ペイン: 壁打ち / プレビュー / アウトライン+検査 */}
      <div className="grid items-start gap-3 lg:grid-cols-[380px_1fr_280px]">
        {/* 左: 壁打ち */}
        <div className="h-[520px] lg:sticky lg:top-4 lg:h-[calc(100vh-140px)]">
          <CoCreatePanel
            cocreate={cocreate}
            suggestions={plan ? [] : FIRST_DRAFT_SUGGESTIONS}
            placeholder="指示を書く（例: 料金を上に移動して、FVはもっと大胆に）"
            onToast={onToast}
          />
        </div>

        {/* 中: プレビュー */}
        <section className="min-w-0 rounded-cardlg bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="section-label">Preview</span>
            <div className="flex items-center gap-2">
              <Segment
                options={[
                  { value: "pc", label: "PC" },
                  { value: "sp", label: "SP" },
                ]}
                value={device}
                onChange={(v) => setDevice(v as "pc" | "sp")}
              />
              <button
                type="button"
                disabled={!previewHtml}
                onClick={openInNewTab}
                className="flex items-center gap-1 rounded-full bg-surface-soft px-3 py-1.5 text-[12px] text-ink2 transition-colors active:opacity-70 disabled:opacity-40"
              >
                <MdOpenInNew size={13} />
                別タブで開く
              </button>
            </div>
          </div>
          {previewHtml ? (
            <div className="mt-3 flex justify-center overflow-x-auto rounded-xl bg-surface-mute p-3">
              <iframe
                title="ワイヤーフレームプレビュー"
                srcDoc={previewHtml}
                className={`h-[70vh] shrink-0 rounded-lg border border-line bg-white ${
                  device === "sp" ? "w-[390px]" : "w-full"
                }`}
              />
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-surface-soft p-10 text-center">
              <p className="text-[13px] font-bold text-ink2">まだ計画が無い</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink3">
                左の壁打ちで「hearingから初案を作って」と送ると、
                <br />
                ここにグレースケールのワイヤーフレームが出る
              </p>
            </div>
          )}
        </section>

        {/* 右: アウトライン + 検査 + 手動チェック */}
        <div className="space-y-3">
          {/* アウトライン */}
          <section className="rounded-cardlg bg-surface p-5">
            <p className="section-label">Outline</p>
            {plan && plan.sections.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {plan.sections.map((s, i) => (
                  <li key={s.key} className="flex items-center gap-1.5 rounded-xl bg-surface-soft px-2.5 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-bold text-ink">{s.label}</p>
                      <p className="truncate text-[10px] text-ink3">
                        {s.kind}
                        {s.isCta ? " ・CTA" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => moveSection(i, -1)}
                      disabled={i === 0}
                      aria-label="上へ"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] text-ink2 transition-colors active:opacity-70 disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(i, 1)}
                      disabled={i === plan.sections.length - 1}
                      aria-label="下へ"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] text-ink2 transition-colors active:opacity-70 disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSection(i)}
                      aria-label="削除"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-[13px] text-ink3 transition-colors active:opacity-70"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12px] text-ink3">計画ができるとセクション一覧が出る</p>
            )}
          </section>

          {/* 検査パネル（rules.ts） */}
          <section className="rounded-cardlg bg-surface p-5">
            <div className="flex items-center justify-between">
              <p className="section-label">Check</p>
              {plan ? (
                <span className="text-[10px] text-ink3">
                  error {errorCount} / warn {warnCount}
                </span>
              ) : null}
            </div>
            {!plan ? (
              <p className="mt-2 text-[12px] text-ink3">計画ができると規律検査の結果が出る</p>
            ) : violations.length === 0 ? (
              <p className="mt-2 rounded-xl bg-good-bg p-2.5 text-[11px] font-bold text-good">
                規律違反なし（wireframe-spec 準拠）
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {violations.map((v, i) => (
                  <li
                    key={i}
                    className={`rounded-xl p-2.5 text-[11px] leading-relaxed ${
                      v.level === "error" ? "bg-bad-bg text-bad" : "bg-warn-bg text-warn"
                    }`}
                  >
                    <span className="font-bold">{v.where}</span>
                    <br />
                    {v.message}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 手動チェック（§9 目視。保存しない） */}
          <section className="rounded-cardlg bg-surface p-5">
            <p className="section-label">Eye Check</p>
            <div className="mt-2 space-y-2">
              {MANUAL_CHECKS.map((label, i) => (
                <label key={label} className="flex cursor-pointer select-none items-start gap-2">
                  <input
                    type="checkbox"
                    checked={checks[i]}
                    onChange={(e) => {
                      const next = checks.slice();
                      next[i] = e.target.checked;
                      setChecks(next);
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                  />
                  <span className={`text-[12px] leading-relaxed ${checks[i] ? "text-ink3 line-through" : "text-ink2"}`}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* 変更メモダイアログ（2回目以降の書き出し時） */}
      {memo.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-cardlg bg-surface p-5">
            <p className="section-label">Changelog</p>
            <h3 className="mt-1 text-[15px] font-bold text-ink">今回の変更メモ</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-ink2">
              wireframe/CHANGELOG.md に「指示（原文）と対応」を1件追記する
            </p>
            <div className="mt-3 space-y-2.5">
              <div>
                <p className="mb-1 text-[11px] font-bold text-ink2">指示（原文）</p>
                <textarea
                  value={memo.instruction}
                  onChange={(e) => setMemo((m) => ({ ...m, instruction: e.target.value }))}
                  rows={2}
                  placeholder="例: 料金セクションを上に移動して"
                  className="w-full resize-y rounded-xl bg-surface-soft px-3 py-2 text-[13px] leading-relaxed text-ink placeholder:text-ink3 outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <p className="mb-1 text-[11px] font-bold text-ink2">対応</p>
                <textarea
                  value={memo.action}
                  onChange={(e) => setMemo((m) => ({ ...m, action: e.target.value }))}
                  rows={3}
                  placeholder="例: 料金を3番目に移動し、CTAバンドを直後に追加"
                  className="w-full resize-y rounded-xl bg-surface-soft px-3 py-2 text-[13px] leading-relaxed text-ink placeholder:text-ink3 outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMemo((m) => ({ ...m, open: false }))}
                className="rounded-full bg-surface-soft px-4 py-2 text-[12px] text-ink2 transition-colors active:opacity-70"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={busyFile}
                onClick={() => {
                  setMemo((m) => ({ ...m, open: false }));
                  void doExport({ instruction: memo.instruction, action: memo.action });
                }}
                className="rounded-full bg-accent px-4 py-2 text-[12px] font-bold text-white transition-colors active:opacity-70 disabled:opacity-40"
              >
                追記して書き出す
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
