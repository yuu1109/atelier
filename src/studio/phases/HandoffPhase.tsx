import { useEffect, useState } from "react";
import { navigate } from "../../lib/router";
import { copyText } from "../../lib/clipboard";
import { buildStudioSpecMd } from "../../tools/web/build";
import { patchState, projectPath, readState } from "../lib/project";
import type { ConceptState } from "../tone/schema";
import type { WfPlan } from "../wf/schema";
import type { PhaseProps } from "./PhaseProps";

/** design/ からスペックに載せる画像の拡張子 */
const DESIGN_IMAGE_RE = /\.(png|jpe?g|webp)$/i;

/** 前提ファイルの存在チェック結果 */
interface GateChecks {
  wfFixed: boolean;
  tone: boolean;
  site: boolean;
}

/** 実装引き渡し: spec.md を生成し、Claude Code / Codex へのキックオフコマンドを渡す */
export function HandoffPhase({ store, project, onToast }: PhaseProps) {
  const [checks, setChecks] = useState<GateChecks | null>(null);
  const [specMd, setSpecMd] = useState<string | null>(null);
  const [handoffAt, setHandoffAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const p = (rel: string) => projectPath(project, rel);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const rel = (r: string) => projectPath(project, r);
      const [wfFixed, tone, site, existingSpec, state] = await Promise.all([
        store.exists(rel("wireframe/wireframe-fixed.html")),
        store.exists(rel("tone.md")),
        store.exists(rel("site")),
        store.readText(rel("spec.md")),
        readState(store, project),
      ]);
      if (!alive) return;
      setChecks({ wfFixed, tone, site });
      setSpecMd(existingSpec);
      setHandoffAt(state.handoffAt ?? null);
    })().catch((e: unknown) => {
      if (alive) setError(String((e as Error).message ?? e));
    });
    return () => {
      alive = false;
    };
  }, [store, project]);

  /** hearing.md / tone.md / state / design一覧を読んで spec.md を書き出す */
  const generateSpec = async () => {
    setBusy(true);
    setError(null);
    try {
      const [hearingMd, toneMd, state, designAll] = await Promise.all([
        store.readText(p("hearing.md")),
        store.readText(p("tone.md")),
        readState(store, project),
        store.listFiles(p("design")),
      ]);
      const concept = (state.concept ?? null) as ConceptState | null;
      const wfPlan = (state.wfPlan ?? null) as WfPlan | null;
      const md = buildStudioSpecMd({
        project,
        hearingMd: hearingMd ?? "",
        designSystem: concept?.designSystem ?? null,
        toneMd,
        wfPlan,
        designFiles: designAll.filter((f) => DESIGN_IMAGE_RE.test(f)),
      });
      await store.writeText(p("spec.md"), md);
      setSpecMd(md);
      onToast("spec.md を書き出した");
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  /** 引き渡し済みの記録（state.json の handoffAt） */
  const markHandoff = async () => {
    try {
      const at = new Date().toISOString();
      await patchState(store, project, { handoffAt: at });
      setHandoffAt(at);
      onToast("引き渡しを記録した");
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  };

  const copy = async (text: string, label: string) => {
    const ok = await copyText(text);
    onToast(ok ? `${label}をコピーした` : "コピーできなかった");
  };

  const claudeCmd = `cd /Users/yuu_design2022/Desktop/01_project/HP && claude "「${project}」の実装をお願い。codingスキルで clients/${project}/ の wireframe/wireframe-fixed.html・tone.md・spec.md・design/ を入力に site/ を実装して"`;
  const codexCmd = `cd /Users/yuu_design2022/Desktop/01_project/HP && codex "clients/${project}/spec.md を読んで、wireframe-fixed.html と tone.md に従い site/ に Astro+Tailwind で実装して"`;

  if (checks === null && !error) {
    return (
      <div className="animate-pulse rounded-cardlg bg-surface p-5">
        <div className="mb-3 h-3 w-24 rounded bg-surface-mute" />
        <div className="mb-2 h-4 w-2/3 rounded bg-surface-soft" />
        <div className="h-4 w-1/2 rounded bg-surface-soft" />
      </div>
    );
  }

  const gateMissing = checks !== null && (!checks.wfFixed || !checks.tone);

  return (
    <div className="grid gap-3">
      {error ? <div className="rounded-cardlg bg-bad-bg p-4 text-[13px] text-bad">{error}</div> : null}

      {checks?.site ? (
        <div className="flex items-center justify-between gap-3 rounded-cardlg bg-good-bg p-5">
          <div>
            <p className="text-[15px] font-bold text-ink">実装済み。site/ がある</p>
            <p className="mt-1 text-[12px] text-ink2">トークンの微調整は次のフェーズで</p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ kind: "project", project, phase: "tuning" })}
            className="shrink-0 rounded-full bg-good px-4 py-2 text-[13px] font-bold text-white transition-colors active:opacity-70"
          >
            微調整フェーズへ
          </button>
        </div>
      ) : null}

      {gateMissing ? (
        <>
          {!checks.wfFixed ? (
            <GateCard
              title="ワイヤーフレームが未フィックス"
              desc="wireframe/wireframe-fixed.html が無い。構造とコピーが凍結されるまで引き渡せない。"
              buttonLabel="ワイヤーフレームへ"
              onGo={() => navigate({ kind: "project", project, phase: "wireframe" })}
            />
          ) : null}
          {!checks.tone ? (
            <GateCard
              title="トーンが未確定"
              desc="tone.md が無い。デザインの人格（配色・書体・装飾）を決めてから引き渡す。"
              buttonLabel="コンセプトへ"
              onGo={() => navigate({ kind: "project", project, phase: "concept" })}
            />
          ) : null}
        </>
      ) : (
        <>
          {/* spec.md 生成 */}
          <div className="rounded-cardlg bg-surface p-5">
            <div className="section-label mb-2">Spec</div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-bold text-ink">spec.md を生成して書き出し</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink2">
                  hearing.md・tone.md・WFプラン・design/ を束ねた実装仕様書を clients/{project}/spec.md に保存する
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void generateSpec()}
                className="shrink-0 rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-white transition-colors active:opacity-70 disabled:opacity-40"
              >
                {busy ? "生成中…" : specMd ? "再生成" : "生成する"}
              </button>
            </div>
            {busy ? (
              <div className="mt-4 animate-pulse space-y-2">
                <div className="h-3 w-full rounded bg-surface-soft" />
                <div className="h-3 w-4/5 rounded bg-surface-soft" />
                <div className="h-3 w-2/3 rounded bg-surface-soft" />
              </div>
            ) : specMd ? (
              <>
                <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl bg-surface-soft p-4 text-[11px] leading-relaxed text-ink2">
                  {specMd}
                </pre>
                <button
                  type="button"
                  onClick={() => void copy(specMd, "spec.md")}
                  className="mt-3 rounded-full bg-surface-soft px-4 py-2 text-[12px] font-bold text-ink2 transition-colors active:opacity-70"
                >
                  spec.md をコピー
                </button>
              </>
            ) : null}
          </div>

          {/* キックオフコマンド */}
          <div className="grid gap-3 sm:grid-cols-2">
            <KickoffCard
              title="Claude Code に渡す"
              desc="codingスキルで site/ を実装させるキックオフ"
              command={claudeCmd}
              onCopy={() => void copy(claudeCmd, "Claude Code コマンド")}
            />
            <KickoffCard
              title="Codex に渡す"
              desc="spec.md を読ませて Astro+Tailwind で実装させる"
              command={codexCmd}
              onCopy={() => void copy(codexCmd, "Codex コマンド")}
            />
          </div>

          {/* 引き渡し記録 */}
          <div className="flex items-center justify-between gap-3 rounded-cardlg bg-surface p-5">
            <div>
              <div className="section-label mb-1">Handoff</div>
              {handoffAt ? (
                <p className="text-[13px] text-ink">
                  引き渡し済み
                  <span className="ml-2 text-[12px] text-ink3">{new Date(handoffAt).toLocaleString("ja-JP")}</span>
                </p>
              ) : (
                <p className="text-[12px] text-ink2">コマンドを渡したら記録を残す。site/ ができたら自動で実装済みになる</p>
              )}
            </div>
            {handoffAt ? null : (
              <button
                type="button"
                onClick={() => void markHandoff()}
                className="shrink-0 rounded-full bg-surface-soft px-4 py-2 text-[13px] font-bold text-ink2 transition-colors active:opacity-70"
              >
                引き渡し済みにする
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** 前提が欠けているときの案内カード */
function GateCard({
  title,
  desc,
  buttonLabel,
  onGo,
}: {
  title: string;
  desc: string;
  buttonLabel: string;
  onGo: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-cardlg bg-surface p-5">
      <div>
        <div className="section-label mb-1">Prerequisite</div>
        <p className="text-[15px] font-bold text-ink">{title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink2">{desc}</p>
      </div>
      <button
        type="button"
        onClick={onGo}
        className="shrink-0 rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-white transition-colors active:opacity-70"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

/** キックオフコマンドのコピー用カード */
function KickoffCard({
  title,
  desc,
  command,
  onCopy,
}: {
  title: string;
  desc: string;
  command: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col rounded-cardlg bg-surface p-5">
      <div className="section-label mb-2">Kickoff</div>
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="mt-1 text-[12px] text-ink2">{desc}</p>
      <pre className="mt-3 flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-surface-soft p-3 font-mono text-[11px] leading-relaxed text-ink2">
        {command}
      </pre>
      <button
        type="button"
        onClick={onCopy}
        className="mt-3 self-start rounded-full bg-accent px-4 py-2 text-[12px] font-bold text-white transition-colors active:opacity-70"
      >
        コマンドをコピー
      </button>
    </div>
  );
}
