import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Segment } from "../../components/controls";
import { contrastRatio } from "../../lib/color";
import { AiRunButton } from "../ai/fallback";
import { geminiImageProvider, hasGeminiKey } from "../ai/gemini";
import { CoCreatePanel } from "../cocreate/CoCreatePanel";
import { useCoCreation } from "../cocreate/session";
import { idb } from "../lib/idb";
import { patchState, projectPath, readState } from "../lib/project";
import { buildConceptSystemPrompt, buildDesignSystemSystemPrompt } from "../tone/knowledge";
import {
  DESIGN_CONCEPT_SCHEMA,
  DESIGN_SYSTEM_SCHEMA,
  type ConceptState,
  type DesignConcept,
  type DesignSystem,
  type DesignSystemColors,
} from "../tone/schema";
import { renderToneMd, renderTonePreviewHtml } from "../tone/toneMd";
import { validateDesignSystem } from "../tone/validate";
import type { PhaseProps } from "./PhaseProps";

/**
 * デザインコンセプト工房。
 * Step1 コンセプト壁打ち → Step2 ムードボード生成/採用 → Step3 デザインシステム壁打ち → tone.md 書き出し。
 * 成果物（concept / designSystem / adoptedMoods）は state.json にデバウンス保存して復元する。
 */

/* ===== 定数・ヘルパ ===== */

type Step = "concept" | "mood" | "system";

const STEP_OPTIONS = [
  { value: "concept", label: "1 コンセプト" },
  { value: "mood", label: "2 ムードボード" },
  { value: "system", label: "3 デザインシステム" },
];

/** ムードボード画像の拡張子判定 */
const IMG_RE = /\.(png|jpe?g|webp)$/i;

/** 生成4枚（1回の実行で生成する枚数） */
const MOOD_GEN_COUNT = 4;

/** state.json への保存デバウンス（ms） */
const SAVE_DEBOUNCE_MS = 800;

/** コンセプト名 → ファイル名スラッグ（日本語はそのまま残し、記号だけ潰す） */
function slugify(title: string): string {
  const s = title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return s || "mood";
}

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

/** 採用ファイルの次の連番（2桁）。既存の数字プレフィックスと件数の大きい方+1 */
function nextSeq(files: string[]): string {
  const nums = files.map((f) => {
    const m = f.match(/^(\d+)-/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const max = Math.max(0, ...nums, files.length);
  return String(max + 1).padStart(2, "0");
}

function fmtNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * コンセプト → ムードボード画像プロンプト。
 * Webサイトの画面ではなく「雰囲気を伝えるコラージュボード」を作らせる（日本語+英語キーワード併記）。
 */
function buildMoodboardPrompt(c: DesignConcept): string {
  return [
    "ブランドのデザインコンセプトを伝えるムードボード画像を1枚生成して。",
    "Webサイトの画面・UIモック・ワイヤーフレームではなく、雰囲気を伝えるコラージュボード。",
    "質感の接写・色面・素材・光の断片・情景の切れ端を1枚に美しく構成する。文字・ロゴ・UIパーツは入れない。",
    "",
    `コンセプト名: ${c.title}`,
    `コンセプト文: ${c.statement}`,
    `キーワード: ${c.keywords.join(" / ")}`,
    `質感: ${c.textures.join(" / ")}`,
    `被写体・配色の方向性: ${c.moodDirection}`,
    "",
    "English keywords: brand mood board, collage of material textures and color swatches, tactile close-up photography, cohesive color palette, natural light, editorial still life, no text, no logo, no UI, not a website screenshot",
  ].join("\n");
}

/* ===== 小物UI ===== */

function GuideCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-cardlg bg-surface p-8 text-center">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-ink2">{body}</p>
    </div>
  );
}

/** コンセプトカード（Step1右ペイン） */
function ConceptCard({ c }: { c: DesignConcept }) {
  return (
    <section className="rounded-cardlg bg-surface p-5">
      <p className="section-label">Design Concept</p>
      <h3 className="mt-1 text-[19px] font-bold text-ink">{c.title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-ink">{c.statement}</p>

      <p className="mb-1.5 mt-4 text-[11px] font-bold text-ink2">キーワード</p>
      <div className="flex flex-wrap gap-1.5">
        {c.keywords.map((k) => (
          <span key={k} className="rounded-full bg-accent-soft px-3 py-1 text-[12px] font-bold text-accent">
            {k}
          </span>
        ))}
      </div>

      <p className="mb-1.5 mt-4 text-[11px] font-bold text-ink2">質感の言語化</p>
      <ul className="space-y-1">
        {c.textures.map((t) => (
          <li key={t} className="rounded-lg bg-surface-soft px-3 py-1.5 text-[12px] leading-relaxed text-ink">
            {t}
          </li>
        ))}
      </ul>

      <p className="mb-1 mt-4 text-[11px] font-bold text-ink2">ムードボードの方向性</p>
      <p className="text-[12px] leading-relaxed text-ink2">{c.moodDirection}</p>

      {c.referenceTones.length > 0 ? (
        <p className="mt-3 text-[11px] text-ink3">参照トーン: {c.referenceTones.join(", ")}</p>
      ) : (
        <p className="mt-3 text-[11px] text-ink3">参照トーン: なし（完全カスタム）</p>
      )}
    </section>
  );
}

/** コントラスト表（主要4組・WCAG AA） */
function ContrastTable({ colors }: { colors: DesignSystemColors }) {
  const rows = [
    { label: "本文 ink × bg", fg: colors.ink, bg: colors.bg, min: 4.5 },
    { label: "CTA文字 on-primary × primary", fg: colors.onPrimary, bg: colors.primary, min: 4.5 },
    { label: "補足 ink-muted × bg", fg: colors.inkMuted, bg: colors.bg, min: 3 },
    { label: "見出し heading × bg", fg: colors.heading, bg: colors.bg, min: 3 },
  ];
  return (
    <div className="space-y-1.5">
      {rows.map((r) => {
        const ratio = contrastRatio(r.fg, r.bg);
        const ok = ratio !== null && ratio >= r.min;
        return (
          <div key={r.label} className="flex items-center justify-between gap-2 rounded-lg bg-surface-soft px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{r.label}</span>
            <span className="shrink-0 font-mono text-[11px] text-ink2">
              {ratio === null ? "—" : `${ratio.toFixed(2)}:1`}（基準 {r.min}:1）
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                ok ? "bg-good-bg text-good" : "bg-bad-bg text-bad"
              }`}
            >
              {ok ? "OK" : "NG"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** ライブスペシメン（colorsを直接styleに適用） */
function Specimen({ ds }: { ds: DesignSystem }) {
  const c = ds.colors;
  const chips: { name: string; value: string }[] = [
    { name: "bg", value: c.bg },
    { name: "bg-alt", value: c.bgAlt },
    { name: "surface", value: c.surface },
    { name: "ink", value: c.ink },
    { name: "ink-muted", value: c.inkMuted },
    { name: "heading", value: c.heading },
    { name: "primary", value: c.primary },
    { name: "on-primary", value: c.onPrimary },
    { name: "accent", value: c.accent },
    { name: "border", value: c.border },
  ];
  return (
    <div>
      <div className="overflow-hidden rounded-xl border" style={{ background: c.bg, borderColor: c.border }}>
        <div className="p-5">
          <p
            className="text-[10px]"
            style={{ color: c.inkMuted, fontFamily: ds.fonts.accent, letterSpacing: "0.18em" }}
          >
            DESIGN SYSTEM SPECIMEN
          </p>
          <h4
            className="mt-1 text-[24px] font-bold"
            style={{
              color: c.heading,
              fontFamily: ds.fonts.heading,
              lineHeight: 1.35,
              letterSpacing: ds.fonts.headingLetterSpacing,
            }}
          >
            {ds.name}
          </h4>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: c.ink, fontFamily: ds.fonts.body }}>
            本文サンプル。書体・行間・地色との相性を確かめる。日本語の本文は欧文より行間を広く取ると読みやすい。
          </p>
          <p className="mt-1 text-[11px]" style={{ color: c.inkMuted, fontFamily: ds.fonts.body }}>
            補足・キャプションはこの色（ink-muted）。
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className="rounded-lg px-4 py-2 text-[13px] font-bold"
              style={{ background: c.primary, color: c.onPrimary, fontFamily: ds.fonts.body }}
            >
              無料相談を予約する
            </span>
            <span
              className="rounded-lg border px-4 py-2 text-[13px]"
              style={{ borderColor: c.primary, color: c.primary, fontFamily: ds.fonts.body }}
            >
              料金を見る
            </span>
            <span className="text-[13px]" style={{ color: c.accent, fontFamily: ds.fonts.accent }}>
              — accent
            </span>
          </div>
        </div>
        <div className="border-t p-4" style={{ background: c.bgAlt, borderColor: c.border }}>
          <div className="rounded-lg border p-3" style={{ background: c.surface, borderColor: c.border }}>
            <p className="text-[12px] font-bold" style={{ color: c.heading, fontFamily: ds.fonts.heading }}>
              カード見出し（surface上）
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: c.ink, fontFamily: ds.fonts.body }}>
              bg-alt帯の上にsurfaceカードを重ねたときの見え方。
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {chips.map((chip) => (
          <div key={chip.name} className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="h-8" style={{ background: chip.value }} />
            <div className="px-1.5 py-1">
              <p className="truncate text-[9px] font-bold text-ink2">{chip.name}</p>
              <p className="font-mono text-[9px] text-ink3">{chip.value.toUpperCase()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== 本体 ===== */

/** 生成済み（未採用）画像。blobはidbにも一時保存してリロードに耐える */
interface GenImage {
  /** idbキー: {project}/mood/{ts}-{n} */
  key: string;
  url: string;
  blob: Blob;
  mime: string;
  prompt: string;
  model: string;
}

interface AdoptedImage {
  name: string;
  url: string | null;
}

export function ConceptPhase({ store, project, onToast }: PhaseProps) {
  const [step, setStep] = useState<Step>("concept");
  /** undefined = 読み込み中 / null = hearing.md 無し */
  const [hearing, setHearing] = useState<string | null | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [adoptedMoods, setAdoptedMoods] = useState<string[]>([]);
  const [adopted, setAdopted] = useState<AdoptedImage[]>([]);
  const [gen, setGen] = useState<GenImage[]>([]);
  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [savingTone, setSavingTone] = useState(false);

  /* ---- objectURLの後始末（アンマウント時に一括revoke） ---- */
  const urlsRef = useRef<Set<string>>(new Set());
  const makeUrl = useCallback((blob: Blob): string => {
    const u = URL.createObjectURL(blob);
    urlsRef.current.add(u);
    return u;
  }, []);
  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
    };
  }, []);

  /* ---- 壁打ちセッション（Step1: コンセプト） ---- */
  const conceptSystem = useMemo(() => {
    const base = buildConceptSystemPrompt();
    if (!hearing) return base;
    return `${base}\n\n## ヒアリング内容（hearing.md 全文・事実の根拠）\n${hearing}`;
  }, [hearing]);

  const conceptCo = useCoCreation<DesignConcept>({
    system: conceptSystem,
    artifactSchema: DESIGN_CONCEPT_SCHEMA,
    artifactLabel: "デザインコンセプト",
  });
  const concept = conceptCo.artifact;

  /* ---- 壁打ちセッション（Step3: デザインシステム） ---- */
  const dsSystem = useMemo(() => {
    const parts = [buildDesignSystemSystemPrompt()];
    if (concept) {
      parts.push(`## 確定済みデザインコンセプト（JSON）\n${JSON.stringify(concept, null, 2)}`);
    }
    if (adoptedMoods.length > 0) {
      parts.push(
        `## 採用済みムードボード\n採用画像: ${adoptedMoods.join(", ")}\nムードの方向性: ${concept?.moodDirection ?? "（コンセプト未確定）"}`,
      );
    }
    return parts.join("\n\n");
  }, [concept, adoptedMoods]);

  const dsCo = useCoCreation<DesignSystem>({
    system: dsSystem,
    artifactSchema: DESIGN_SYSTEM_SCHEMA,
    artifactLabel: "デザインシステム",
    validate: validateDesignSystem,
  });
  const ds = dsCo.artifact;

  const conceptReset = conceptCo.reset;
  const dsReset = dsCo.reset;

  /* ---- 採用済み一覧の再読込 ---- */
  const refreshAdopted = useCallback(async () => {
    const files = (await store.listFiles(projectPath(project, "moodboard"))).filter((f) => IMG_RE.test(f));
    const items: AdoptedImage[] = [];
    for (const name of files) {
      const blob = await store.readBlob(projectPath(project, `moodboard/${name}`));
      items.push({ name, url: blob ? URL.createObjectURL(blob) : null });
    }
    items.forEach((i) => i.url && urlsRef.current.add(i.url));
    setAdopted(items);
  }, [store, project]);

  /* ---- 初期読み込み（hearing / state.json / idb一時画像 / 採用済み） ---- */
  useEffect(() => {
    let alive = true;
    setLoaded(false);
    setStep("concept");
    setHearing(undefined);
    setGen([]);
    setGenError(null);
    void (async () => {
      const [text, state] = await Promise.all([
        store.readText(projectPath(project, "hearing.md")),
        readState(store, project),
      ]);
      if (!alive) return;
      setHearing(text);
      const cs = (state.concept ?? null) as ConceptState | null;
      conceptReset(cs?.concept ?? null);
      dsReset(cs?.designSystem ?? null);
      setAdoptedMoods(cs?.adoptedMoods ?? []);
      setLoaded(true);
      void refreshAdopted();

      // idbの一時画像（未採用の生成分）を復元
      const keys = await idb.listImageKeys();
      const prefix = `${project}/mood/`;
      const mine = keys.filter((k): k is string => typeof k === "string" && k.startsWith(prefix)).sort();
      const restored: GenImage[] = [];
      for (const k of mine) {
        const blob = await idb.getImage(k);
        if (!blob) continue;
        restored.push({
          key: k,
          url: makeUrl(blob),
          blob,
          mime: blob.type || "image/png",
          prompt: "",
          model: geminiImageProvider.modelId,
        });
      }
      if (!alive) return;
      setGen(restored);
    })();
    return () => {
      alive = false;
    };
  }, [store, project, conceptReset, dsReset, refreshAdopted, makeUrl]);

  /* ---- state.json へのデバウンス保存 ---- */
  useEffect(() => {
    if (!loaded) return;
    if (!concept && !ds && adoptedMoods.length === 0) return;
    const t = setTimeout(() => {
      const cs: ConceptState = { concept, designSystem: ds, adoptedMoods };
      void patchState(store, project, { concept: cs });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [concept, ds, adoptedMoods, loaded, store, project]);

  /* ---- Google Fontsのlinkを動的挿入（スペシメン用・重複挿入は避ける） ---- */
  const fontsUrl = ds?.fonts.googleFontsUrl;
  useEffect(() => {
    if (!fontsUrl || !fontsUrl.startsWith("https://fonts.googleapis.com/css2")) return;
    const existing = Array.from(document.head.querySelectorAll<HTMLLinkElement>("link[data-atelier-font]"));
    if (existing.some((l) => l.getAttribute("href") === fontsUrl)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontsUrl;
    link.setAttribute("data-atelier-font", "1");
    document.head.appendChild(link);
  }, [fontsUrl]);

  /* ---- ムードボード: 生成 ---- */
  const runGenerate = async () => {
    if (!concept) return;
    setGenBusy(true);
    setGenError(null);
    try {
      const prompt = buildMoodboardPrompt(concept);
      const images = await geminiImageProvider.generate({ prompt, count: MOOD_GEN_COUNT });
      const ts = Date.now();
      const added: GenImage[] = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const key = `${project}/mood/${ts}-${i + 1}`;
        await idb.putImage(key, img.blob);
        added.push({
          key,
          url: makeUrl(img.blob),
          blob: img.blob,
          mime: img.mime,
          prompt: img.promptUsed,
          model: img.modelId,
        });
      }
      setGen((g) => [...g, ...added]);
      onToast(
        images.length < MOOD_GEN_COUNT ? `${images.length}枚だけ生成できた（一部失敗）` : `${MOOD_GEN_COUNT}枚生成したよ`,
      );
    } catch (e) {
      setGenError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenBusy(false);
    }
  };

  /* ---- ムードボード: README追記 ---- */
  const appendReadme = useCallback(
    async (name: string, model: string, prompt: string) => {
      const path = projectPath(project, "moodboard/README.md");
      const existing = await store.readText(path);
      const head = existing?.trim() ? existing.replace(/\n+$/, "") : "# ムードボード採用ログ";
      const entry = [
        "",
        `## ${name}`,
        "",
        `- 日時: ${fmtNow()}`,
        `- モデル: ${model}`,
        "- プロンプト:",
        "",
        "```",
        prompt,
        "```",
        "",
      ].join("\n");
      await store.writeText(path, `${head}\n${entry}`, { backup: false });
    },
    [store, project],
  );

  /* ---- ムードボード: 採用 ---- */
  const adoptImage = async (img: GenImage) => {
    if (!concept) return;
    try {
      const files = (await store.listFiles(projectPath(project, "moodboard"))).filter((f) => IMG_RE.test(f));
      const name = `${nextSeq(files)}-${slugify(concept.title)}.${extFromMime(img.mime)}`;
      await store.writeBlob(projectPath(project, `moodboard/${name}`), img.blob);
      await appendReadme(name, img.model, img.prompt || "（記録なし: 再読み込み後に採用）");
      await idb.deleteImage(img.key);
      setGen((g) => g.filter((x) => x.key !== img.key));
      setAdoptedMoods((m) => [...m, name]);
      await refreshAdopted();
      onToast(`moodboard/${name} に採用したよ`);
    } catch (e) {
      onToast(e instanceof Error ? e.message : String(e));
    }
  };

  /* ---- ムードボード: 破棄 ---- */
  const discardImage = async (img: GenImage) => {
    await idb.deleteImage(img.key);
    URL.revokeObjectURL(img.url);
    urlsRef.current.delete(img.url);
    setGen((g) => g.filter((x) => x.key !== img.key));
  };

  /* ---- ムードボード: 手動アップロード ---- */
  const onUpload = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    try {
      let count = 0;
      for (const file of Array.from(list)) {
        if (!file.type.startsWith("image/")) continue;
        const files = (await store.listFiles(projectPath(project, "moodboard"))).filter((f) => IMG_RE.test(f));
        const name = `${nextSeq(files)}-${concept ? slugify(concept.title) : "upload"}.${fileExt(file)}`;
        await store.writeBlob(projectPath(project, `moodboard/${name}`), file);
        await appendReadme(name, "手動アップロード", `元ファイル: ${file.name}`);
        setAdoptedMoods((m) => [...m, name]);
        count++;
      }
      if (count === 0) {
        onToast("画像ファイルが無かった…");
        return;
      }
      await refreshAdopted();
      onToast(`${count}枚をムードボードに採用したよ`);
    } catch (e) {
      onToast(e instanceof Error ? e.message : String(e));
    }
  };

  /* ---- tone.md 書き出し ---- */
  const dsInvalid = ds ? validateDesignSystem(ds) : null;
  const saveTone = async () => {
    if (!concept || !ds) return;
    if (dsInvalid) {
      onToast("検証エラーが残ってる。壁打ちで直してから書き出してね");
      return;
    }
    setSavingTone(true);
    try {
      await store.writeText(projectPath(project, "tone.md"), renderToneMd(project, concept, ds));
      await store.writeText(projectPath(project, "tone-preview.html"), renderTonePreviewHtml(concept, ds));
      onToast("tone.md と tone-preview.html を書き出したよ");
    } catch (e) {
      onToast(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingTone(false);
    }
  };

  /* ---- 読み込み中 / hearing無しガイド ---- */
  if (hearing === undefined) {
    return (
      <div className="rounded-cardlg bg-surface p-8">
        <p className="animate-pulse text-center text-[13px] text-ink3">読み込み中…</p>
      </div>
    );
  }
  if (hearing === null || hearing.trim() === "") {
    return (
      <GuideCard
        title="先にヒアリングから"
        body={"コンセプト工房は hearing.md（ヒアリングの記録）を材料に進める。\n「ヒアリング」フェーズを済ませてから戻ってきてね"}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* ステップ切替 */}
      <section className="rounded-cardlg bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-label">Concept Studio</p>
            <h3 className="mt-1 text-[15px] font-bold text-ink">デザインコンセプト工房</h3>
          </div>
          <Segment options={STEP_OPTIONS} value={step} onChange={(v) => setStep(v as Step)} />
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink2">
          コンセプトを言葉で固め、ムードボードで空気を確かめ、デザインシステム（トークン）に落として tone.md へ書き出す
        </p>
      </section>

      {/* ===== Step1: コンセプト壁打ち ===== */}
      {step === "concept" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="h-[560px]">
            <CoCreatePanel
              cocreate={conceptCo}
              placeholder="指示を書く（例: hearingから方向性を出して）"
              suggestions={["hearingから方向性を2〜3案", "もっと大人に静かに", "遊び心を一滴だけ"]}
              onToast={onToast}
            />
          </div>
          <div className="min-w-0">
            {concept ? (
              <ConceptCard c={concept} />
            ) : (
              <GuideCard
                title="まだコンセプトが無い"
                body={"左の壁打ちで初案を作る。\nhearingの事実を根拠に「誰に・何を感じさせるか・質感」を言葉にしていく"}
              />
            )}
          </div>
        </div>
      ) : null}

      {/* ===== Step2: ムードボード ===== */}
      {step === "mood" ? (
        !concept ? (
          <GuideCard
            title="先にStep1でコンセプトを"
            body="ムードボードはコンセプト（キーワード・質感）から画像プロンプトを組み立てる。Step1を済ませてから戻ってきてね"
          />
        ) : (
          <div className="space-y-3">
            {/* 生成アクション */}
            <section className="rounded-cardlg bg-surface p-5">
              <p className="section-label">Moodboard</p>
              <h3 className="mt-1 text-[15px] font-bold text-ink">「{concept.title}」の空気を画像で確かめる</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink2">
                コンセプトから質感・配色・被写体のコラージュ画像を生成する（Webサイトの画面ではなく雰囲気ボード）。
                良いものだけ「採用」で moodboard/ に保存する
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <AiRunButton
                  label={`${MOOD_GEN_COUNT}枚生成`}
                  running={genBusy}
                  onRun={runGenerate}
                  fallbackPrompt={() => (concept ? buildMoodboardPrompt(concept) : null)}
                  onToast={onToast}
                  keyKind="gemini"
                />
                <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-surface-soft px-4 py-2.5 text-[13px] font-bold text-ink2 transition-colors active:opacity-70">
                  画像をアップロードして採用
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void onUpload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <span className="text-[11px] text-ink3">
                  {geminiImageProvider.modelId} ／ {geminiImageProvider.estimateCost(MOOD_GEN_COUNT).note}
                </span>
              </div>
              {!hasGeminiKey() ? (
                <p className="mt-2 text-[11px] leading-relaxed text-ink3">
                  Geminiキー未設定のためコピペモード: プロンプトをコピーして外部AIで画像を作り、上のアップロードから採用する
                </p>
              ) : null}
              {genError ? (
                <div className="mt-3 rounded-xl bg-bad-bg p-3 text-[12px] leading-relaxed text-bad">{genError}</div>
              ) : null}
            </section>

            {/* 生成結果（未採用） */}
            {genBusy ? (
              <section className="rounded-cardlg bg-surface p-5">
                <div className="grid animate-pulse grid-cols-2 gap-2 md:grid-cols-4">
                  {Array.from({ length: MOOD_GEN_COUNT }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-surface-soft" />
                  ))}
                </div>
                <p className="mt-3 animate-pulse text-center text-[12px] text-ink3">ムードボードを生成中…（1枚ずつ順に作る）</p>
              </section>
            ) : null}
            {gen.length > 0 ? (
              <section className="rounded-cardlg bg-surface p-5">
                <p className="section-label">Generated</p>
                <h3 className="mt-1 text-[15px] font-bold text-ink">生成結果（未採用 {gen.length}枚）</h3>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {gen.map((img) => (
                    <div key={img.key} className="overflow-hidden rounded-xl border border-line">
                      <img src={img.url} alt="" className="aspect-square w-full object-cover" />
                      <div className="flex">
                        <button
                          type="button"
                          onClick={() => void adoptImage(img)}
                          className="flex-1 bg-accent py-2 text-[12px] font-bold text-white transition-colors active:opacity-70"
                        >
                          採用
                        </button>
                        <button
                          type="button"
                          onClick={() => void discardImage(img)}
                          className="flex-1 bg-surface-soft py-2 text-[12px] text-ink2 transition-colors active:opacity-70"
                        >
                          破棄
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* 採用済み */}
            <section className="rounded-cardlg bg-surface p-5">
              <p className="section-label">Adopted</p>
              <h3 className="mt-1 text-[15px] font-bold text-ink">採用済み（moodboard/）</h3>
              {adopted.length === 0 ? (
                <p className="mt-2 text-[12px] text-ink3">まだ無い。生成結果から「採用」するとここに並ぶ</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {adopted.map((a) => (
                    <div key={a.name} className="overflow-hidden rounded-xl border border-line">
                      {a.url ? (
                        <img src={a.url} alt={a.name} className="aspect-square w-full object-cover" />
                      ) : (
                        <div className="flex aspect-square items-center justify-center bg-surface-soft text-[11px] text-ink3">
                          読めない
                        </div>
                      )}
                      <p className="truncate bg-surface-soft px-2 py-1.5 text-[10px] text-ink2">{a.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )
      ) : null}

      {/* ===== Step3: デザインシステム ===== */}
      {step === "system" ? (
        !concept ? (
          <GuideCard
            title="先にStep1でコンセプトを"
            body="デザインシステムはコンセプトと採用ムードを材料にトークンへ落とす。Step1（できればStep2も）を済ませてから戻ってきてね"
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="h-[640px]">
              <CoCreatePanel
                cocreate={dsCo}
                placeholder="指示を書く（例: 初案を作って / 見出しをもっと静かな明朝に）"
                suggestions={["コンセプトからデザインシステム初案を", "コントラストをもう少し強く", "余白をもっと贅沢に"]}
                onToast={onToast}
              />
            </div>
            <div className="min-w-0 space-y-3">
              {ds ? (
                <>
                  <section className="rounded-cardlg bg-surface p-5">
                    <p className="section-label">Live Specimen</p>
                    <h3 className="mb-3 mt-1 text-[15px] font-bold text-ink">
                      {ds.name}（{ds.slug}）— {ds.personality}
                    </h3>
                    <Specimen ds={ds} />
                  </section>

                  <section className="rounded-cardlg bg-surface p-5">
                    <p className="section-label">Contrast Check</p>
                    <h3 className="mb-3 mt-1 text-[15px] font-bold text-ink">コントラスト検証（WCAG AA）</h3>
                    <ContrastTable colors={ds.colors} />
                    {dsInvalid ? (
                      <div className="mt-3 whitespace-pre-line rounded-xl bg-bad-bg p-3 text-[12px] leading-relaxed text-bad">
                        {dsInvalid}
                      </div>
                    ) : null}
                  </section>

                  <section className="flex flex-wrap items-center justify-between gap-3 rounded-cardlg bg-surface p-5">
                    <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-ink2">
                      tone.md（トークン一式）と tone-preview.html（顧客に見せるスペシメン）を案件フォルダへ書き出す
                    </p>
                    <button
                      type="button"
                      onClick={() => void saveTone()}
                      disabled={savingTone || Boolean(dsInvalid)}
                      className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-[13px] font-bold text-white transition-colors active:opacity-70 disabled:opacity-40"
                    >
                      {savingTone ? "書き出し中…" : "tone.md を書き出し"}
                    </button>
                  </section>
                </>
              ) : (
                <GuideCard
                  title="まだデザインシステムが無い"
                  body={"左の壁打ちで初案を作る。\n10色・フォント・余白・装飾レシピ・写真トーン・禁止事項をトークン契約に沿って決めていく"}
                />
              )}
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
