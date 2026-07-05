import { useEffect, useState } from "react";
import { Segment, TextArea, TextInput } from "../../components/controls";
import { anthropicProvider, hasAnthropicKey } from "../ai/anthropic";
import { AiRunButton } from "../ai/fallback";
import { findSection, parseMd, renderMd, upsertSection } from "../lib/markdown";
import { patchState, projectPath } from "../lib/project";
import { PURPOSE_LABEL, type PurposeType } from "../lib/types";
import type { PhaseProps } from "./PhaseProps";

/**
 * 要件定義フェーズ。
 * hearing.md を材料に、AIが 3C・ペルソナ・ジャーニー・USP・KPI・目的・推奨構成を提案し、
 * 人が編集・最終決定して hearing.md の「## 分析」と state.json の purposeType に確定保存する。
 */

/* ===== 成果物の型と json_schema（同期を保つこと） ===== */

interface RequirementsProposal {
  threeC: { company: string; customer: string; competitor: string; insight: string };
  /** 1名の具体像（名前・年齢・状況・悩み・きっかけ） */
  persona: string;
  /** 知る→比べる→行動 の3段落 */
  journey: { know: string; compare: string; act: string };
  usp: string;
  kpi: string;
  purposeType: PurposeType;
  purposeReason: string;
  recommendedSections: { name: string; reason: string }[];
  navLabels: string[];
}

const REQUIREMENTS_SCHEMA = {
  type: "object",
  properties: {
    threeC: {
      type: "object",
      properties: {
        company: { type: "string" },
        customer: { type: "string" },
        competitor: { type: "string" },
        insight: { type: "string" },
      },
      required: ["company", "customer", "competitor", "insight"],
      additionalProperties: false,
    },
    persona: { type: "string" },
    journey: {
      type: "object",
      properties: {
        know: { type: "string" },
        compare: { type: "string" },
        act: { type: "string" },
      },
      required: ["know", "compare", "act"],
      additionalProperties: false,
    },
    usp: { type: "string" },
    kpi: { type: "string" },
    purposeType: { type: "string", enum: ["inquiry", "visit", "reserve", "recruit"] },
    purposeReason: { type: "string" },
    recommendedSections: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, reason: { type: "string" } },
        required: ["name", "reason"],
        additionalProperties: false,
      },
    },
    navLabels: { type: "array", items: { type: "string" } },
  },
  required: [
    "threeC",
    "persona",
    "journey",
    "usp",
    "kpi",
    "purposeType",
    "purposeReason",
    "recommendedSections",
    "navLabels",
  ],
  additionalProperties: false,
} as const;

/* ===== AIプロンプト（wireframe-spec.md §2.1 / §2.2 / §3 の要約を知識として埋め込む） ===== */

const SPEC_KNOWLEDGE = `【サイト目的の4型と推奨セクション順序】（4型は業種ではなく「目的」で選ぶ）
- 問い合わせ型（士業・BtoB・教室の資料請求など。ゴール=フォーム送信/電話）:
  FV → 信頼の前倒し（実績/資格/対応エリア）→ 提供サービス → 選ばれる理由 → 料金/費用の目安 → 相談の流れ → 代表・事務所紹介 → よくある質問 → CTA（相談）
- 来店型（整骨院・飲食店・美容室・小売。ゴール=来店/電話）:
  FV → 信頼の前倒し（口コミ/実績数/メディア）→ メニュー/サービス → 選ばれる理由 → 料金 → 店内・雰囲気 → 店主・スタッフ紹介 → アクセス/営業時間 → よくある質問 → CTA（来店/電話）
- 予約型（サロン・レッスン・クリニック。ゴール=予約）:
  FV → 予約の空き/導線を前倒し → サービス/コース → 選ばれる理由 → 料金 → 当日の流れ → 施術者/講師紹介 → アクセス → よくある質問 → CTA（予約）
- 採用型（人手不足の店舗・事業者の求人。ゴール=応募）:
  FV → 働く魅力（数字/一言）→ 仕事内容 → 職場の雰囲気/先輩の声 → 待遇・募集要項 → 一日の流れ → 代表メッセージ → よくある質問 → CTA（応募）
- 業種の定番型と目的がズレる場合（例: 整骨院だがWeb予約がゴール）は目的の型を優先し、業種の武器になるセクションを上位へ前倒しする

【構成の根拠（各ブロックを置く理由）】
- FV: 「誰の・何の店で・どこにあって・次に何をすればいいか」を1スクロール以内で伝える。CTAを必ず1つ内包
- 信頼の前倒し: 小規模事業者は無名が前提。実績数・資格・口コミ・対応エリアを早い位置に置き、離脱前に安心させる
- サービス/メニュー: 「何をしてくれるか」。1セクション1メッセージで要点を絞る
- 選ばれる理由: 格安・大手との差。差別化の芯。3つ前後に絞る
- 料金: 隠すと離脱する。目安でよいので出す
- 流れ: 「来店/相談したら何が起きるか」の不安を消す。ステップ番号で
- 店主・スタッフ: 顔が見えることが小規模の最大の武器
- アクセス/FAQ: 実務情報。地図・営業時間・疑問の先回り
- 最終CTA: ページ末で行動を締める
- 組み替えの指針: hearingで最も強い訴求（例: 口コミが多い→信頼の前倒しを厚く上位に／安さが武器→料金を早めに）を上位へ。FVと最終CTAの位置は固定し、その間を入れ替える

【グローバルナビ】3〜7個・日本語2〜6文字・客が知りたい順（ホーム除き、サービス→料金→アクセス→問い合わせが基本骨格）`;

const SYSTEM_PROMPT = `あなたは小規模事業者ホームページの要件定義プランナー。渡されるヒアリング内容（hearing.md 全文）だけを根拠に、3C分析・ペルソナ・カスタマージャーニー・USP・KPI・サイトの目的・トップページの推奨セクション構成・グローバルナビ案を提案する。

規律（必ず守る）:
- hearing.md に書かれた事実を最優先する。実績数・料金・口コミ数・年数などの数字を捏造しない。hearingに無い情報は一般論として控えめに補い、断定しない
- サイトの目的（purposeType）は必ず1つに絞る。複数ありえても最も事業成果に直結する1つを選び、purposeReason にその根拠を書く
- ペルソナは1名の具体像（名前・年齢・職業・状況・悩み・サイトに来るきっかけ）として書く
- ジャーニーは「知る→比べる→行動」の3段落。各段階の行動と心理を書く
- 推奨セクション構成は、選んだ目的の型の順序をベースに、hearingで最も強い訴求を上位へ組み替える（FVは先頭・最終CTAは末尾で固定）。各セクションに置く理由を1文で添える
- ナビは3〜7個・日本語2〜6文字・客が知りたい順
- すべて日本語・簡潔体で書く（ですます調にしない）

${SPEC_KNOWLEDGE}`;

function buildUserPrompt(hearing: string): string {
  return `以下のヒアリング内容（hearing.md 全文）を分析して、要件定義を提案して。

--- hearing.md ---
${hearing}`;
}

function buildFallbackPrompt(hearing: string): string {
  return `${SYSTEM_PROMPT}

${buildUserPrompt(hearing)}

--- 出力形式 ---
以下のJSONだけを出力する（コードブロックや説明文は付けない）:
{
  "threeC": { "company": "自社の強み・資源", "customer": "顧客像と欲求", "competitor": "競合の状況", "insight": "3Cから導く勝ち筋" },
  "persona": "1名の具体像（名前・年齢・職業・状況・悩み・きっかけ）",
  "journey": { "know": "知る段階の行動と心理", "compare": "比べる段階の行動と心理", "act": "行動に至る決め手" },
  "usp": "一番の売り（1〜2文）",
  "kpi": "サイトの成果指標（例: 月の問い合わせ3件。hearingに数字が無ければ捏造せず目安と明記）",
  "purposeType": "inquiry / visit / reserve / recruit のどれか1つ",
  "purposeReason": "その目的を選んだ根拠",
  "recommendedSections": [{ "name": "セクション名", "reason": "置く理由（1文）" }],
  "navLabels": ["ホーム", "（3〜7個・日本語2〜6文字）"]
}`;
}

/* ===== 編集フォームとMD相互変換 ===== */

interface EditForm {
  company: string;
  customer: string;
  competitor: string;
  insight: string;
  persona: string;
  know: string;
  compare: string;
  act: string;
  usp: string;
  kpi: string;
  purposeType: PurposeType;
  purposeReason: string;
  sections: { name: string; reason: string }[];
  /** ナビは「/」区切りの1行テキストで編集する */
  navText: string;
}

const PURPOSE_ORDER: PurposeType[] = ["inquiry", "visit", "reserve", "recruit"];

function proposalToForm(p: RequirementsProposal): EditForm {
  return {
    company: p.threeC.company,
    customer: p.threeC.customer,
    competitor: p.threeC.competitor,
    insight: p.threeC.insight,
    persona: p.persona,
    know: p.journey.know,
    compare: p.journey.compare,
    act: p.journey.act,
    usp: p.usp,
    kpi: p.kpi,
    purposeType: p.purposeType,
    purposeReason: p.purposeReason,
    sections: p.recommendedSections.map((s) => ({ name: s.name, reason: s.reason })),
    navText: p.navLabels.join(" / "),
  };
}

function parseNavText(text: string): string[] {
  return text
    .split(/[/、,]/)
    .map((s) => s.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

/** 改行を潰して箇条書き1行に収める（往復パースを安定させるため） */
function oneLine(s: string): string {
  return s.replace(/\s*\n+\s*/g, " ").trim();
}

/** EditForm → 「## 分析」セクション本文（この形式が parseAnalysisMd と対） */
function formToMd(f: EditForm): string {
  const lines: string[] = [
    "### 3C分析",
    "",
    `- 自社: ${oneLine(f.company)}`,
    `- 顧客: ${oneLine(f.customer)}`,
    `- 競合: ${oneLine(f.competitor)}`,
    `- インサイト: ${oneLine(f.insight)}`,
    "",
    "### ペルソナ",
    "",
    f.persona.trim(),
    "",
    "### カスタマージャーニー",
    "",
    `- 知る: ${oneLine(f.know)}`,
    `- 比べる: ${oneLine(f.compare)}`,
    `- 行動: ${oneLine(f.act)}`,
    "",
    "### USP",
    "",
    f.usp.trim(),
    "",
    "### KPI",
    "",
    f.kpi.trim(),
    "",
    "### サイトの目的",
    "",
    `- 目的: ${PURPOSE_LABEL[f.purposeType]}（${f.purposeType}）`,
    `- 理由: ${oneLine(f.purposeReason)}`,
    "",
    "### 推奨セクション構成",
    "",
    ...f.sections
      .filter((s) => s.name.trim())
      .map((s, i) => `${i + 1}. ${oneLine(s.name)} — ${oneLine(s.reason)}`),
    "",
    "### ナビ案",
    "",
    parseNavText(f.navText).join(" / "),
  ];
  return lines.join("\n").trim();
}

function splitH3(body: string): { heading: string; body: string }[] {
  const out: { heading: string; body: string }[] = [];
  let cur: { heading: string; lines: string[] } | null = null;
  for (const line of body.split("\n")) {
    const m = line.match(/^###\s+(.+?)\s*$/);
    if (m) {
      if (cur) out.push({ heading: cur.heading, body: cur.lines.join("\n").trim() });
      cur = { heading: m[1], lines: [] };
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  if (cur) out.push({ heading: cur.heading, body: cur.lines.join("\n").trim() });
  return out;
}

/** 「- キー: 値」形式の箇条書きを拾う（継続行は前の値に連結） */
function parseBullets(block: string, keys: string[]): Record<string, string> {
  const res: Record<string, string> = {};
  let currentKey: string | null = null;
  for (const line of block.split("\n")) {
    let matched = false;
    for (const k of keys) {
      const m = line.match(new RegExp(`^[-*]\\s*${k}\\s*[:：]\\s*(.*)$`));
      if (m) {
        currentKey = k;
        res[k] = m[1].trim();
        matched = true;
        break;
      }
    }
    if (!matched && currentKey && line.trim()) {
      res[currentKey] = `${res[currentKey]} ${line.trim()}`.trim();
    }
  }
  return res;
}

function parseNumbered(block: string): { name: string; reason: string }[] {
  const out: { name: string; reason: string }[] = [];
  for (const line of block.split("\n")) {
    const m = line.match(/^\d+[.)]\s*(.+)$/);
    if (m) {
      const t = m[1];
      const sep = t.search(/\s+[—―–-]\s+/);
      if (sep >= 0) {
        const rest = t.slice(sep).replace(/^\s+[—―–-]\s+/, "");
        out.push({ name: t.slice(0, sep).trim(), reason: rest.trim() });
      } else {
        out.push({ name: t.trim(), reason: "" });
      }
    } else if (out.length > 0 && line.trim()) {
      const last = out[out.length - 1];
      last.reason = `${last.reason} ${line.trim()}`.trim();
    }
  }
  return out;
}

/**
 * 保存済み「## 分析」本文 → EditForm。
 * このツールが書いた形式（purposeTypeの英字トークン入り）だけ復元できればよく、
 * 手書きの分析は null を返して原文表示にフォールバックする。
 */
function parseAnalysisMd(body: string): EditForm | null {
  const typeMatch = body.match(/[（(](inquiry|visit|reserve|recruit)[）)]/);
  if (!typeMatch) return null;
  const subs = splitH3(body);
  if (subs.length === 0) return null;
  const pick = (kw: string) => subs.find((s) => s.heading.includes(kw))?.body ?? "";
  const c = parseBullets(pick("3C"), ["自社", "顧客", "競合", "インサイト"]);
  const j = parseBullets(pick("ジャーニー"), ["知る", "比べる", "行動"]);
  const p = parseBullets(pick("目的"), ["目的", "理由"]);
  return {
    company: c["自社"] ?? "",
    customer: c["顧客"] ?? "",
    competitor: c["競合"] ?? "",
    insight: c["インサイト"] ?? "",
    persona: pick("ペルソナ"),
    know: j["知る"] ?? "",
    compare: j["比べる"] ?? "",
    act: j["行動"] ?? "",
    usp: pick("USP"),
    kpi: pick("KPI"),
    purposeType: typeMatch[1] as PurposeType,
    purposeReason: p["理由"] ?? "",
    sections: parseNumbered(pick("セクション")),
    navText: parseNavText(pick("ナビ")).join(" / "),
  };
}

/* ===== コピペ戻し（キー無し運用）のJSON取り込み ===== */

function extractJson(text: string): unknown {
  const t = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "");
  try {
    return JSON.parse(t);
  } catch {
    /* 前後に説明文が付いている場合は最初の { から最後の } を試す */
  }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(t.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

function coerceProposal(v: unknown): RequirementsProposal | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === "string" ? x : "");
  const pt = o.purposeType;
  if (typeof pt !== "string" || !(PURPOSE_ORDER as string[]).includes(pt)) return null;
  const tc = (typeof o.threeC === "object" && o.threeC ? o.threeC : {}) as Record<string, unknown>;
  const jo = (typeof o.journey === "object" && o.journey ? o.journey : {}) as Record<string, unknown>;
  const sections = Array.isArray(o.recommendedSections)
    ? o.recommendedSections.flatMap((s) => {
        if (!s || typeof s !== "object") return [];
        const so = s as Record<string, unknown>;
        return typeof so.name === "string" ? [{ name: so.name, reason: str(so.reason) }] : [];
      })
    : [];
  const nav = Array.isArray(o.navLabels) ? o.navLabels.filter((x): x is string => typeof x === "string") : [];
  return {
    threeC: {
      company: str(tc.company),
      customer: str(tc.customer),
      competitor: str(tc.competitor),
      insight: str(tc.insight),
    },
    persona: str(o.persona),
    journey: { know: str(jo.know), compare: str(jo.compare), act: str(jo.act) },
    usp: str(o.usp),
    kpi: str(o.kpi),
    purposeType: pt as PurposeType,
    purposeReason: str(o.purposeReason),
    recommendedSections: sections,
    navLabels: nav,
  };
}

/* ===== UI部品（このフェーズ専用） ===== */

function Card({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-cardlg bg-surface p-5">
      <p className="section-label">{label}</p>
      <h3 className="mb-3 mt-1 text-[15px] font-bold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold text-ink2">{label}</p>
      <TextArea value={value} onChange={onChange} rows={rows} placeholder={placeholder} />
    </div>
  );
}

/* ===== 本体 ===== */

export function RequirementsPhase({ store, project, onToast }: PhaseProps) {
  /** undefined = 読み込み中 / null = hearing.md 無し */
  const [hearingText, setHearingText] = useState<string | null | undefined>(undefined);
  const [form, setForm] = useState<EditForm | null>(null);
  /** 編集ビューで開けない手書き分析の原文 */
  const [rawAnalysis, setRawAnalysis] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paste, setPaste] = useState("");

  useEffect(() => {
    let alive = true;
    setHearingText(undefined);
    setForm(null);
    setRawAnalysis(null);
    setError(null);
    setPaste("");
    void (async () => {
      const text = await store.readText(projectPath(project, "hearing.md"));
      if (!alive) return;
      setHearingText(text);
      if (!text) return;
      // 既に「分析」があれば読み込んで編集ビューへ（形式が違えば原文表示）
      const sec = findSection(parseMd(text), "分析");
      if (sec && sec.body.trim()) {
        const parsed = parseAnalysisMd(sec.body);
        if (parsed) setForm(parsed);
        else setRawAnalysis(sec.body);
      }
    })();
    return () => {
      alive = false;
    };
  }, [store, project]);

  const up = (patch: Partial<EditForm>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const runAi = async () => {
    if (!hearingText) return;
    setRunning(true);
    setError(null);
    try {
      const p = await anthropicProvider.generateJson<RequirementsProposal>({
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(hearingText),
        schema: REQUIREMENTS_SCHEMA,
        schemaName: "requirements_proposal",
        thinking: true,
      });
      const coerced = coerceProposal(p) ?? p;
      setForm(proposalToForm(coerced));
      setRawAnalysis(null);
      onToast("提案ができたよ。中身を確認して直してね");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const importPaste = () => {
    const p = coerceProposal(extractJson(paste));
    if (!p) {
      onToast("JSONを読み取れなかった…出力形式を確認してね");
      return;
    }
    setForm(proposalToForm(p));
    setRawAnalysis(null);
    setPaste("");
    setError(null);
    onToast("結果を取り込んだよ。中身を確認して直してね");
  };

  const save = async () => {
    if (!form || !hearingText) return;
    setSaving(true);
    setError(null);
    try {
      const doc = upsertSection(parseMd(hearingText), "分析", formToMd(form));
      const md = renderMd(doc);
      await store.writeText(projectPath(project, "hearing.md"), md);
      await patchState(store, project, { purposeType: form.purposeType });
      setHearingText(md);
      onToast("要件定義を保存したよ");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  /* ---- 読み込み中 ---- */
  if (hearingText === undefined) {
    return (
      <div className="rounded-cardlg bg-surface p-8">
        <p className="animate-pulse text-center text-[13px] text-ink3">hearing.md を読み込み中…</p>
      </div>
    );
  }

  /* ---- hearing.md 無し ---- */
  if (hearingText === null || hearingText.trim() === "") {
    return (
      <div className="rounded-cardlg bg-surface p-8 text-center">
        <p className="text-[15px] font-bold text-ink">先にヒアリングから</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink2">
          要件定義は hearing.md（ヒアリングの記録）を材料に作る。
          <br />
          「ヒアリング」フェーズを済ませてから戻ってきてね
        </p>
      </div>
    );
  }

  const hasProposal = form !== null || rawAnalysis !== null;

  return (
    <div className="space-y-3">
      {/* アクション */}
      <section className="rounded-cardlg bg-surface p-5">
        <p className="section-label">Requirements</p>
        <h3 className="mt-1 text-[15px] font-bold text-ink">ヒアリングから要件を固める</h3>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink2">
          hearing.md を材料に、3C・ペルソナ・ジャーニー・USP・KPI・サイトの目的・推奨セクション構成をAIが提案する。
          目的は1つに絞り、最後は人が確定する
        </p>
        <div className="mt-3">
          <AiRunButton
            label={hasProposal ? "AIで再提案" : "AIで要件定義を提案"}
            running={running}
            onRun={runAi}
            fallbackPrompt={() => buildFallbackPrompt(hearingText)}
            onToast={onToast}
          />
        </div>
        {!hasAnthropicKey() ? (
          <div className="mt-3 space-y-2 rounded-xl bg-surface-soft p-3">
            <p className="text-[11px] font-bold text-ink2">外部AIの結果（JSON）を貼り戻す</p>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={5}
              placeholder='{"threeC": { ... }, "persona": ...}'
              className="w-full resize-y rounded-lg bg-surface px-3 py-2 font-mono text-[12px] text-ink placeholder:text-ink3 outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="button"
              onClick={importPaste}
              disabled={!paste.trim()}
              className="rounded-full bg-accent px-4 py-2 text-[12px] font-bold text-white transition-colors active:opacity-70 disabled:opacity-40"
            >
              取り込む
            </button>
          </div>
        ) : null}
      </section>

      {/* エラー */}
      {error ? <div className="rounded-cardlg bg-bad-bg p-4 text-[13px] leading-relaxed text-bad">{error}</div> : null}

      {/* 生成中 */}
      {running ? (
        <div className="rounded-cardlg bg-surface p-8">
          <p className="animate-pulse text-center text-[13px] text-ink3">hearing を分析して提案を作成中…</p>
        </div>
      ) : null}

      {/* 手書き形式の既存分析（編集ビューで開けない場合の原文表示） */}
      {!running && rawAnalysis !== null && form === null ? (
        <section className="rounded-cardlg bg-surface p-5">
          <p className="section-label">Saved Analysis</p>
          <h3 className="mt-1 text-[15px] font-bold text-ink">保存済みの分析</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-ink2">
            この分析は編集ビューの形式と違うため原文のまま表示している。作り直すなら上の「AIで再提案」から
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-surface-soft p-4 text-[12px] leading-relaxed text-ink">
            {rawAnalysis}
          </pre>
        </section>
      ) : null}

      {/* 編集ビュー */}
      {!running && form !== null ? (
        <>
          <Card label="3C Analysis" title="3C分析">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="自社（Company）" value={form.company} onChange={(v) => up({ company: v })} />
              <Field label="顧客（Customer）" value={form.customer} onChange={(v) => up({ customer: v })} />
              <Field label="競合（Competitor）" value={form.competitor} onChange={(v) => up({ competitor: v })} />
              <Field label="インサイト（勝ち筋）" value={form.insight} onChange={(v) => up({ insight: v })} />
            </div>
          </Card>

          <Card label="Persona" title="ペルソナ（1名の具体像）">
            <TextArea
              value={form.persona}
              onChange={(v) => up({ persona: v })}
              rows={5}
              placeholder="名前・年齢・職業・状況・悩み・サイトに来るきっかけ"
            />
          </Card>

          <Card label="Journey" title="カスタマージャーニー">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="知る" value={form.know} onChange={(v) => up({ know: v })} rows={4} />
              <Field label="比べる" value={form.compare} onChange={(v) => up({ compare: v })} rows={4} />
              <Field label="行動" value={form.act} onChange={(v) => up({ act: v })} rows={4} />
            </div>
          </Card>

          <Card label="USP / KPI" title="USPとKPI">
            <div className="space-y-3">
              <Field label="USP（一番の売り）" value={form.usp} onChange={(v) => up({ usp: v })} rows={2} />
              <Field label="KPI（サイトの成果指標）" value={form.kpi} onChange={(v) => up({ kpi: v })} rows={2} />
            </div>
          </Card>

          <Card label="Site Purpose" title="サイトの目的（1つに絞って人が決める）">
            <Segment
              options={PURPOSE_ORDER.map((v) => ({ value: v, label: PURPOSE_LABEL[v] }))}
              value={form.purposeType}
              onChange={(v) => up({ purposeType: v as PurposeType })}
            />
            <div className="mt-3">
              <Field label="この目的にした理由" value={form.purposeReason} onChange={(v) => up({ purposeReason: v })} rows={2} />
            </div>
          </Card>

          <Card label="Sections" title="推奨セクション構成（FVが先頭・最終CTAが末尾）">
            <div className="space-y-2">
              {form.sections.map((s, i) => (
                <div key={i} className="rounded-xl bg-surface-soft p-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-center text-[12px] font-bold text-ink3">{i + 1}</span>
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) => {
                        const sections = form.sections.slice();
                        sections[i] = { ...sections[i], name: e.target.value };
                        up({ sections });
                      }}
                      placeholder="セクション名"
                      className="min-w-0 flex-1 rounded-lg bg-surface px-2.5 py-1.5 text-[13px] font-bold text-ink placeholder:text-ink3 outline-none focus:ring-2 focus:ring-accent"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (i <= 0) return;
                        const sections = form.sections.slice();
                        [sections[i - 1], sections[i]] = [sections[i], sections[i - 1]];
                        up({ sections });
                      }}
                      disabled={i === 0}
                      aria-label="上へ"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] text-ink2 transition-colors active:opacity-70 disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (i >= form.sections.length - 1) return;
                        const sections = form.sections.slice();
                        [sections[i], sections[i + 1]] = [sections[i + 1], sections[i]];
                        up({ sections });
                      }}
                      disabled={i === form.sections.length - 1}
                      aria-label="下へ"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] text-ink2 transition-colors active:opacity-70 disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => up({ sections: form.sections.filter((_, k) => k !== i) })}
                      aria-label="削除"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-[13px] text-ink3 transition-colors active:opacity-70"
                    >
                      ×
                    </button>
                  </div>
                  <textarea
                    value={s.reason}
                    onChange={(e) => {
                      const sections = form.sections.slice();
                      sections[i] = { ...sections[i], reason: e.target.value };
                      up({ sections });
                    }}
                    rows={2}
                    placeholder="このセクションを置く理由"
                    className="mt-2 w-full resize-y rounded-lg bg-surface px-2.5 py-1.5 text-[12px] leading-relaxed text-ink placeholder:text-ink3 outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => up({ sections: [...form.sections, { name: "", reason: "" }] })}
                className="rounded-full bg-surface-soft px-4 py-2 text-[12px] font-bold text-ink2 transition-colors active:opacity-70"
              >
                ＋ セクションを追加
              </button>
            </div>
          </Card>

          <Card label="Navigation" title="グローバルナビ案">
            <TextInput
              value={form.navText}
              onChange={(v) => up({ navText: v })}
              placeholder="ホーム / 施術案内 / 料金 / アクセス / お問い合わせ"
            />
            <p className="mt-1.5 text-[11px] text-ink3">「/」区切り・3〜7個・日本語2〜6文字が目安</p>
          </Card>

          {/* 確定バー */}
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-cardlg bg-surface p-5">
            <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-ink2">
              hearing.md の「分析」セクションを置き換えて、サイトの目的（
              {PURPOSE_LABEL[form.purposeType]}）を保存する
            </p>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-[13px] font-bold text-white transition-colors active:opacity-70 disabled:opacity-40"
            >
              {saving ? "保存中…" : "確定して保存"}
            </button>
          </section>
        </>
      ) : null}
    </div>
  );
}
