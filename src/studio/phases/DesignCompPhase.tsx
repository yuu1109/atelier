import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Segment } from "../../components/controls";
import {
  COST_VERIFIED_AT,
  addImageSpend,
  estimateImageCost,
  monthlySpendSummary,
  type ImageProviderId,
} from "../ai/cost";
import { AiRunButton } from "../ai/fallback";
import { geminiImageProvider } from "../ai/gemini";
import { openaiImageProvider } from "../ai/openaiImage";
import {
  buildCompCopyPrompt,
  buildCompImagePrompt,
  type CompViewport,
} from "../design/prompt";
import { idb } from "../lib/idb";
import { projectPath, readState } from "../lib/project";
import type { ConceptState, DesignSystem } from "../tone/schema";
import { toSectionId } from "../wf/idMap";
import type { WfPlan, WfSection } from "../wf/schema";
import type { PhaseProps } from "./PhaseProps";

/**
 * デザインカンプ生成。
 * 確定WF（WfPlan）×デザインシステム（コンセプト工房）からセクション別の画像プロンプトを組み立て、
 * キュー実行（同時1・逐次）で生成 → 比較 → 採用で design/{NN}-{sectionId}.png + prompts.md に保存する。
 * キー無しは一括プロンプトのコピー + 手動アップロードで同じ成果物になる。
 */

/* ===== 定数・ヘルパ ===== */

const IMG_RE = /\.(png|jpe?g|webp)$/i;

const PROVIDER_OPTIONS = [
  { value: "gemini", label: "Gemini（無料枠）" },
  { value: "openai", label: "OpenAI" },
];

const VIEWPORT_OPTIONS = [
  { value: "pc", label: "PC（16:9）" },
  { value: "sp", label: "スマホ（9:16）" },
];

function extFromMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "png";
}

function fileExt(f: File): string {
  const m = f.name.match(IMG_RE);
  if (m) {
    const e = m[1].toLowerCase();
    return e === "jpeg" ? "jpg" : e;
  }
  return extFromMime(f.type);
}

function fmtNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 生成候補（採用前。idbに一時保存して復元可能にする） */
interface Candidate {
  key: string;
  url: string;
  blob: Blob;
  mime: string;
  prompt: string;
  model: string;
}

function GuideCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-cardlg bg-surface p-8 text-center">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-ink2">{body}</p>
    </div>
  );
}

/* ===== 本体 ===== */

export function DesignCompPhase({ store, project, onToast }: PhaseProps) {
  const [loaded, setLoaded] = useState(false);
  const [plan, setPlan] = useState<WfPlan | null>(null);
  const [ds, setDs] = useState<DesignSystem | null>(null);
  const [fixedExists, setFixedExists] = useState(true);

  const [providerId, setProviderId] = useState<ImageProviderId>("gemini");
  const [viewport, setViewport] = useState<CompViewport>("pc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [extraNote, setExtraNote] = useState("");

  const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({});
  const [adoptedFiles, setAdoptedFiles] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [spendTick, setSpendTick] = useState(0);
  const cancelRef = useRef(false);

  const provider = providerId === "gemini" ? geminiImageProvider : openaiImageProvider;

  /* ---- blob URLの管理（unmountで一括revoke） ---- */
  const urlsRef = useRef<Set<string>>(new Set());
  const makeUrl = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  }, []);
  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
      urls.clear();
    };
  }, []);

  /* ---- セクションID・連番（render.tsと同順で採番して spec.md と揃える） ---- */
  const sectionIds = useMemo(() => {
    const map = new Map<string, { id: string; ordinal: number }>();
    if (!plan) return map;
    const used = new Set<string>();
    plan.sections.forEach((s, i) => {
      const id = toSectionId(s.kind === "custom" ? s.key : s.kind, i, used);
      map.set(s.key, { id, ordinal: i + 1 });
    });
    return map;
  }, [plan]);

  /* ---- 採用済みファイルの再読込 ---- */
  const refreshAdopted = useCallback(async () => {
    const files = (await store.listFiles(projectPath(project, "design"))).filter((f) =>
      IMG_RE.test(f),
    );
    setAdoptedFiles(files);
  }, [store, project]);

  const adoptedCountOf = useCallback(
    (sectionKey: string): number => {
      const info = sectionIds.get(sectionKey);
      if (!info) return 0;
      const re = new RegExp(`^\\d+-${escapeRegExp(info.id)}(-\\d+)?\\.`);
      return adoptedFiles.filter((f) => re.test(f)).length;
    },
    [sectionIds, adoptedFiles],
  );

  /* ---- 初期読込: state.json（wfPlan / designSystem）+ design/ + idb一時画像 ---- */
  useEffect(() => {
    let alive = true;
    setLoaded(false);
    setCandidates({});
    void (async () => {
      const [state, fixed] = await Promise.all([
        readState(store, project),
        store.exists(projectPath(project, "wireframe/wireframe-fixed.html")),
      ]);
      if (!alive) return;
      const p = (state.wfPlan ?? null) as WfPlan | null;
      const cs = (state.concept ?? null) as ConceptState | null;
      setPlan(p);
      setDs(cs?.designSystem ?? null);
      setFixedExists(fixed);
      if (p) setSelected(new Set(p.sections.map((s) => s.key)));
      setLoaded(true);
      await refreshAdopted();

      // idbの一時画像（未採用の生成分）を復元
      const keys = await idb.listImageKeys();
      const prefix = `${project}/design/`;
      const mine = keys.filter((k): k is string => typeof k === "string" && k.startsWith(prefix)).sort();
      const restored: Record<string, Candidate[]> = {};
      for (const k of mine) {
        const rest = k.slice(prefix.length);
        const slash = rest.indexOf("/");
        if (slash < 0) continue;
        const sectionKey = decodeURIComponent(rest.slice(0, slash));
        const blob = await idb.getImage(k);
        if (!blob) continue;
        (restored[sectionKey] ??= []).push({
          key: k,
          url: makeUrl(blob),
          blob,
          mime: blob.type || "image/png",
          prompt: "",
          model: provider.modelId,
        });
      }
      if (!alive) return;
      setCandidates(restored);
    })();
    return () => {
      alive = false;
    };
    // provider.modelId は復元表示用のフォールバックなので依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, project, refreshAdopted, makeUrl]);

  /* ---- 生成（キュー実行・同時1） ---- */
  const runGenerate = async (keys: string[]) => {
    if (!plan || !ds || keys.length === 0) return;
    setBusy(true);
    cancelRef.current = false;
    const aspect = viewport === "pc" ? "16:9" : "9:16";
    let ok = 0;
    let firstError: string | null = null;
    try {
      for (let i = 0; i < keys.length; i++) {
        if (cancelRef.current) break;
        const section = plan.sections.find((s) => s.key === keys[i]);
        if (!section) continue;
        setProgress({ done: i, total: keys.length, label: section.label });
        try {
          const prompt = buildCompImagePrompt({ ds, plan, section, viewport, extraNote });
          const images = await provider.generate({ prompt, count: 1, aspect });
          for (const img of images) {
            const idbKey = `${project}/design/${encodeURIComponent(section.key)}/${Date.now()}-${i}`;
            await idb.putImage(idbKey, img.blob);
            const cand: Candidate = {
              key: idbKey,
              url: makeUrl(img.blob),
              blob: img.blob,
              mime: img.mime,
              prompt: img.promptUsed,
              model: img.modelId,
            };
            setCandidates((c) => ({ ...c, [section.key]: [...(c[section.key] ?? []), cand] }));
            addImageSpend(providerId, img.modelId, 1);
            setSpendTick((t) => t + 1);
            ok++;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!firstError) firstError = msg;
          // キー無効系は続けても全滅するので打ち切る
          if (msg.includes("キーが無効") || msg.includes("未設定")) break;
        }
      }
    } finally {
      setBusy(false);
      setProgress(null);
    }
    if (ok > 0 && !firstError) onToast(`${ok}枚生成したよ`);
    else if (ok > 0 && firstError) onToast(`${ok}枚生成（一部失敗: ${firstError}）`);
    else if (firstError) onToast(firstError);
  };

  /* ---- prompts.md への追記 ---- */
  const appendPromptsMd = useCallback(
    async (name: string, sectionLabel: string, model: string, prompt: string) => {
      const path = projectPath(project, "design/prompts.md");
      const existing = await store.readText(path);
      const head = existing?.trim() ? existing.replace(/\n+$/, "") : "# デザインカンプ生成ログ";
      const entry = [
        "",
        `## ${name}`,
        "",
        `- 日時: ${fmtNow()}`,
        `- セクション: ${sectionLabel}`,
        `- モデル: ${model}`,
        `- 画角: ${viewport === "pc" ? "PC 16:9" : "スマホ 9:16"}`,
        "- プロンプト:",
        "",
        "```",
        prompt || "（記録なし: 再読み込み後に採用）",
        "```",
        "",
      ].join("\n");
      await store.writeText(path, `${head}\n${entry}`, { backup: false });
    },
    [store, project, viewport],
  );

  /** 既存ファイルと重複しない採用ファイル名を作る */
  const adoptName = useCallback(
    (sectionKey: string, ext: string): string => {
      const info = sectionIds.get(sectionKey);
      const base = info
        ? `${String(info.ordinal).padStart(2, "0")}-${info.id}`
        : `00-${sectionKey}`;
      let name = `${base}.${ext}`;
      let n = 2;
      while (adoptedFiles.includes(name)) {
        name = `${base}-${n}.${ext}`;
        n += 1;
      }
      return name;
    },
    [sectionIds, adoptedFiles],
  );

  /* ---- 採用 ---- */
  const adopt = async (section: WfSection, cand: Candidate) => {
    try {
      const name = adoptName(section.key, extFromMime(cand.mime));
      await store.writeBlob(projectPath(project, `design/${name}`), cand.blob);
      await appendPromptsMd(name, `${section.label}（${sectionIds.get(section.key)?.id ?? section.key}）`, cand.model, cand.prompt);
      await idb.deleteImage(cand.key);
      setCandidates((c) => ({
        ...c,
        [section.key]: (c[section.key] ?? []).filter((x) => x.key !== cand.key),
      }));
      await refreshAdopted();
      onToast(`design/${name} に採用したよ`);
    } catch (e) {
      onToast(e instanceof Error ? e.message : String(e));
    }
  };

  /* ---- 破棄 ---- */
  const discard = async (sectionKey: string, cand: Candidate) => {
    await idb.deleteImage(cand.key);
    URL.revokeObjectURL(cand.url);
    urlsRef.current.delete(cand.url);
    setCandidates((c) => ({
      ...c,
      [sectionKey]: (c[sectionKey] ?? []).filter((x) => x.key !== cand.key),
    }));
  };

  /* ---- 手動アップロード（キー無し運用: 外部AIで生成した画像をそのまま採用） ---- */
  const onUpload = async (section: WfSection, list: FileList | null) => {
    if (!list || list.length === 0) return;
    try {
      let count = 0;
      for (const file of Array.from(list)) {
        if (!file.type.startsWith("image/")) continue;
        const name = adoptName(section.key, fileExt(file));
        await store.writeBlob(projectPath(project, `design/${name}`), file);
        await appendPromptsMd(name, `${section.label}（${sectionIds.get(section.key)?.id ?? section.key}）`, "手動アップロード", `元ファイル: ${file.name}`);
        await refreshAdopted();
        count++;
      }
      if (count === 0) {
        onToast("画像ファイルが無かった…");
        return;
      }
      onToast(`${count}枚を design/ に採用したよ`);
    } catch (e) {
      onToast(e instanceof Error ? e.message : String(e));
    }
  };

  /* ===== 描画 ===== */

  if (!loaded) {
    return <div className="h-40 animate-pulse rounded-cardlg bg-surface" />;
  }
  if (!plan) {
    return (
      <GuideCard
        title="先にワイヤーフレームをつくってね"
        body={"デザインカンプは確定したWF構成（セクション列とコピー）を元に生成するよ。\n「ワイヤーフレーム」フェーズでAIと壁打ちして構成を固めてから戻ってきてね。"}
      />
    );
  }
  if (!ds) {
    return (
      <GuideCard
        title="先にデザインシステムをつくってね"
        body={"カンプの配色・書体・写真トーンはコンセプト工房のデザインシステムから差し込むよ。\n「コンセプト」フェーズでStep3まで進めてから戻ってきてね。"}
      />
    );
  }

  const selectedKeys = plan.sections.map((s) => s.key).filter((k) => selected.has(k));
  const cost = estimateImageCost(providerId, provider.modelId, Math.max(1, selectedKeys.length));

  const toggleSelected = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* ---- コントロールバー ---- */}
      <section className="rounded-cardlg bg-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Segment options={PROVIDER_OPTIONS} value={providerId} onChange={(v) => setProviderId(v as ImageProviderId)} />
          <Segment options={VIEWPORT_OPTIONS} value={viewport} onChange={(v) => setViewport(v as CompViewport)} />
          <div className="ml-auto flex items-center gap-2">
            {busy && (
              <button
                type="button"
                onClick={() => {
                  cancelRef.current = true;
                }}
                className="rounded-full bg-surface-soft px-3 py-1.5 text-[12px] font-bold text-ink2 active:opacity-70"
              >
                中断
              </button>
            )}
            <AiRunButton
              label={`選択${selectedKeys.length}セクションを順に生成`}
              running={busy}
              disabled={selectedKeys.length === 0}
              onRun={() => runGenerate(selectedKeys)}
              fallbackPrompt={() => {
                const sections = plan.sections.filter((s) => selected.has(s.key));
                if (sections.length === 0) return null;
                return buildCompCopyPrompt({ ds, plan, sections, viewport, extraNote });
              }}
              onToast={onToast}
              keyKind={providerId}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink3">
          <span>
            {provider.modelId} ／ {cost.note}（単価確認 {COST_VERIFIED_AT}）
          </span>
          <span key={spendTick}>{monthlySpendSummary()}</span>
        </div>

        {progress && (
          <p className="mt-2 text-[12px] font-bold text-accent">
            {progress.done + 1}/{progress.total}: 「{progress.label}」を生成中…
          </p>
        )}

        {!fixedExists && (
          <p className="mt-3 rounded-lg bg-warn-bg px-3 py-2 text-[12px] text-warn">
            wireframe-fixed.html がまだ無いよ。WFをフィックスしてから生成するのがおすすめ（構成が変わるとカンプを作り直すことになる）
          </p>
        )}

        <div className="mt-3">
          <p className="mb-1 text-[11px] font-bold text-ink2">方向修正メモ（再生成時にプロンプトへ最優先で追記）</p>
          <textarea
            value={extraNote}
            onChange={(e) => setExtraNote(e.target.value)}
            rows={2}
            placeholder="例: FVの写真をもっと寄りに。全体をあと1段階あかるく"
            className="w-full resize-y rounded-lg bg-surface-soft px-3 py-2 text-[13px] text-ink outline-none"
          />
        </div>
      </section>

      {/* ---- セクション別キュー ---- */}
      {plan.sections.map((section) => {
        const info = sectionIds.get(section.key);
        const cands = candidates[section.key] ?? [];
        const adoptedCount = adoptedCountOf(section.key);
        return (
          <section key={section.key} className="rounded-cardlg bg-surface p-5">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(section.key)}
                  onChange={() => toggleSelected(section.key)}
                  className="size-4 accent-[var(--color-accent,#007AFF)]"
                />
                <span className="text-[14px] font-bold text-ink">{section.label}</span>
              </label>
              <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[11px] text-ink3">
                {info?.id ?? section.key}
              </span>
              {adoptedCount > 0 && (
                <span className="rounded-full bg-good-bg px-2 py-0.5 text-[11px] font-bold text-good">
                  採用済み {adoptedCount}
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                <label className="cursor-pointer rounded-full bg-surface-soft px-3 py-1.5 text-[12px] font-bold text-ink2 active:opacity-70">
                  アップロード
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void onUpload(section, e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <AiRunButton
                  label="この1枚を生成"
                  size="sm"
                  running={busy}
                  onRun={() => runGenerate([section.key])}
                  fallbackPrompt={() => buildCompImagePrompt({ ds, plan, section, viewport, extraNote })}
                  onToast={onToast}
                  keyKind={providerId}
                />
              </div>
            </div>

            {cands.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
                {cands.map((cand) => (
                  <figure key={cand.key} className="overflow-hidden rounded-xl bg-surface-soft">
                    <div className={viewport === "sp" ? "mx-auto aspect-[9/16] max-w-[220px]" : "aspect-video"}>
                      {/* 生成候補のプレビュー */}
                      <img src={cand.url} alt={section.label} className="size-full object-contain" />
                    </div>
                    <figcaption className="flex items-center justify-between px-2.5 py-2">
                      <span className="truncate text-[10px] text-ink3">{cand.model}</span>
                      <span className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => void discard(section.key, cand)}
                          className="rounded-full px-2.5 py-1 text-[11px] font-bold text-ink3 active:opacity-70"
                        >
                          破棄
                        </button>
                        <button
                          type="button"
                          onClick={() => void adopt(section, cand)}
                          className="rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-white active:opacity-70"
                        >
                          採用
                        </button>
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <p className="text-[11px] leading-relaxed text-ink3">
        採用した画像は clients/{project}/design/ に保存され、実装引き渡しの spec.md から「雰囲気参考」として参照されるよ。プロンプトの全文は design/prompts.md に記録される。
      </p>
    </div>
  );
}
