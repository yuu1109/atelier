import type { Option, SectionDef, ToolState } from "../../lib/types";
import { PURPOSE_LABEL, type PurposeType } from "../lib/types";

/**
 * ヒアリングフェーズのデータ定義。
 * HP/templates/hearing-form.md（第1部 コア36問×8カテゴリ）を1箇所でデータ化し、
 * ここから次の4つを導出する（二重管理しない）:
 * - フォームUI（SectionDef[] → components/Section.tsx でレンダリング）
 * - AI構造化の json_schema（anthropicProvider.generateJson 用）
 * - キー無し時のフォールバックプロンプト（コピペモード）
 * - hearing.md のレンダリング（clients/_sample/hearing.md と同じ見出し構成:
 *   基本情報 / 顧客 / 競合 / サイトの目的 / 現状 / 素材 / デザイン / 運用）
 */

/** ヒアリング結果（フラットな fieldId → 値。purpose_type のみ PurposeType or ""） */
export type HearingDoc = Record<string, string>;

/** ヒアリング1項目の定義（フォーム・AIスキーマ・MD書式の共通データ） */
export interface HearingFieldDef {
  /** HearingDoc のキー（例: basic_name） */
  id: string;
  /** hearing.md の箇条書きラベル（例: 屋号 / 店名） */
  label: string;
  /** フォームの設問文（hearing-form.md のQ番号付き。無ければ label を使う） */
  question?: string;
  kind: "text" | "textarea" | "pills" | "segment";
  options?: Option[];
  placeholder?: string;
  help?: string;
}

export interface HearingSectionDef {
  /** セクションID（例: basic） */
  id: string;
  /** hearing.md の見出し（## {heading}） */
  heading: string;
  /** フォームのステップ番号 */
  num: string;
  /** フォームの表示タイトル */
  title: string;
  badge?: "required" | "optional";
  desc?: string;
  fields: HearingFieldDef[];
}

const PURPOSE_VALUES: PurposeType[] = ["inquiry", "visit", "reserve", "recruit"];

/** Q4-1 の4択（値は PurposeType、表示は日本語） */
export const PURPOSE_OPTIONS: Option[] = PURPOSE_VALUES.map((v) => ({
  value: v,
  label: PURPOSE_LABEL[v],
}));

/** 文字列が PurposeType なら返す（違えば null） */
export function asPurposeType(v: string): PurposeType | null {
  return (PURPOSE_VALUES as string[]).includes(v) ? (v as PurposeType) : null;
}

/** Q7-1: お店を一言で表すと（A〜L） */
const CHARACTER_OPTIONS: Option[] = [
  "革新的",
  "思いやりのある",
  "上質な",
  "楽しい",
  "魅力的",
  "信頼できる",
  "純粋",
  "自由な",
  "知的",
  "変革をもたらす",
  "親しみやすい",
  "個性的",
].map((w) => ({ value: w, label: w }));

/** Q7-2: 与えたい第一印象（A〜L） */
const IMPRESSION_OPTIONS: Option[] = [
  "洗練された",
  "あたたかい",
  "高級感のある",
  "元気な",
  "目を引く",
  "誠実な",
  "清潔な",
  "開放的な",
  "専門的な",
  "先進的な",
  "気さくな",
  "こだわりのある",
].map((w) => ({ value: w, label: w }));

/** Q8-3: 料金3プラン */
const PLAN_OPTIONS: Option[] = [
  { value: "ライト", label: "ライト", desc: "初期10万+月8千" },
  { value: "スタンダード", label: "スタンダード", desc: "初期25万+月1.5万" },
  { value: "ブランド", label: "ブランド", desc: "初期40万+月3万" },
];

/** 8カテゴリ×36問（+屋号・補足メモ等の運用上必要な項目）の正典データ */
export const HEARING_SECTIONS: HearingSectionDef[] = [
  {
    id: "basic",
    heading: "基本情報",
    num: "01",
    title: "お店・事業について",
    desc: "事業の実態とサイトの「顔」になる情報。全部埋めなくてよい、わかる範囲で（空欄も情報）",
    fields: [
      { id: "basic_name", label: "屋号 / 店名", question: "屋号・店名", kind: "text", placeholder: "例: みどり整骨院" },
      {
        id: "basic_summary",
        label: "業種・事業のひと言",
        question: "Q1-1. どんな事業・お店？（ひと言で）",
        kind: "textarea",
        placeholder: "例: 交通事故とスポーツ外傷が得意な、駅前の整骨院",
      },
      {
        id: "basic_services",
        label: "主なサービスと価格帯",
        question: "Q1-2. 主なサービス（メニュー）と価格帯",
        kind: "textarea",
        placeholder: "例: 保険施術のほか、自費の骨盤矯正5,500円が主力",
      },
      {
        id: "basic_strengths",
        label: "選ばれる理由・強み",
        question: "Q1-3. お客さまに選ばれる理由・強み",
        kind: "textarea",
        placeholder: "例: 出汁を毎朝引いている。40年通う常連がいる",
      },
      {
        id: "basic_owner",
        label: "店主・代表の経歴と人柄",
        question: "Q1-4. 店主・代表の経歴や人柄（サイトの「顔」になる）",
        kind: "textarea",
        placeholder: "例: 元プロチームのトレーナー。無口だけど施術は丁寧と言われる",
      },
      {
        id: "basic_hours",
        label: "営業時間 / 定休日 / 場所",
        question: "Q1-5. 営業時間・定休日・場所",
        kind: "textarea",
        placeholder: "例: 平日9:00〜18:00、日曜定休。○○駅から徒歩3分",
      },
      {
        id: "basic_history",
        label: "沿革とこれからの目標",
        question: "Q1-6. お店の沿革と、これからの目標",
        kind: "textarea",
        placeholder: "例: 2018年開業。口コミ中心なのでWebからの新規予約を増やしたい",
      },
    ],
  },
  {
    id: "customer",
    heading: "顧客",
    num: "02",
    title: "お客さまについて",
    fields: [
      {
        id: "customer_target",
        label: "ターゲット像（年齢・性別・エリア）",
        question: "Q2-1. 主な客層（年齢・性別・住んでいるエリア）",
        kind: "textarea",
        placeholder: "例: 30〜50代・やや女性多め・半径2km以内の近隣住民",
      },
      {
        id: "customer_trigger",
        label: "来店のきっかけ",
        question: "Q2-2. お客さまが来店するきっかけは何が多い？",
        kind: "textarea",
        placeholder: "例: 近所の口コミと通りがかりの看板。常連の紹介",
      },
      {
        id: "customer_needs",
        label: "悩み・来店の目的",
        question: "Q2-3. お客さまが抱えている悩みや、来店の目的",
        kind: "textarea",
        placeholder: "例: 「どこに行っても腰痛が治らない」という声が多い",
      },
      {
        id: "customer_praise",
        label: "常連に言われる褒め言葉",
        question: "Q2-4. 常連さんによく言われる褒め言葉（キャッチコピーの種）",
        kind: "textarea",
        placeholder: "例: 「ここの味噌汁を飲むと落ち着く」「値段が変わらないのがありがたい」",
      },
      {
        id: "customer_new",
        label: "新しく来てほしい客層",
        question: "Q2-5. これから新しく来てほしい客層",
        kind: "textarea",
        placeholder: "例: 定年後の大人の趣味レッスン層を増やしたい",
      },
    ],
  },
  {
    id: "competitor",
    heading: "競合",
    num: "03",
    title: "競合・地域について",
    fields: [
      {
        id: "competitor_rivals",
        label: "近隣の同業（競合）",
        question: "Q3-1. 近隣の同業（ライバル）はどこ？",
        kind: "textarea",
        placeholder: "例: 駅の反対側に大手チェーン、徒歩5分に個人の接骨院",
      },
      {
        id: "competitor_sites",
        label: "競合サイトの良い点・気になる点",
        question: "Q3-2. 競合サイトの「良い点」と「気になる点」",
        kind: "textarea",
        placeholder: "例: 良い点=料金がわかりやすい。気になる点=テンプレで個性がない",
      },
      {
        id: "competitor_diff",
        label: "競合との違い・強み",
        question: "Q3-3. その競合と比べた、御社の違い・強み",
        kind: "textarea",
        placeholder: "例: チェーンにはない手作りの惣菜と、常連との距離の近さ",
      },
      {
        id: "competitor_edge",
        label: "サイトで差をつけたい点",
        question: "Q3-4. サイトで特に差をつけたい点",
        kind: "textarea",
        placeholder: "例: 先生の人柄が伝わる写真で「安心して行ける感」を出したい",
      },
    ],
  },
  {
    id: "purpose",
    heading: "サイトの目的",
    num: "04",
    title: "サイトの目的",
    badge: "required",
    desc: "サイト全体の設計を決める背骨。特に「一番の目的」は必ず1つに絞る",
    fields: [
      {
        id: "purpose_type",
        label: "一番の目的（1つに絞る）",
        question: "Q4-1.【最重要】このサイトの一番の目的（1つ選ぶ）",
        kind: "segment",
        options: PURPOSE_OPTIONS,
        help: "「全部」にしない。優先順位1位だけを選び、2位以降は次点へ",
      },
      {
        id: "purpose_second",
        label: "次点・補足",
        question: "次点（2番目の目的）があればメモ",
        kind: "text",
        placeholder: "例: 次点で新規来店を増やす",
      },
      {
        id: "purpose_goal",
        label: "数値目標",
        question: "Q4-2. 目標の数字（あれば具体的に）",
        kind: "text",
        placeholder: "例: 公開3か月でWeb経由の新規予約 月10件",
      },
      {
        id: "purpose_cta",
        label: "サイトを見た人に取ってほしい行動（CTA）",
        question: "Q4-3. サイトを見た人に、最終的に取ってほしい行動",
        kind: "textarea",
        placeholder: "例: 体験レッスンの申し込みフォームを送ってほしい",
      },
      {
        id: "purpose_pages",
        label: "必ず載せたいページ",
        question: "Q4-4. 必ず載せたいページ・情報",
        kind: "textarea",
        placeholder: "例: トップ、メニューと料金、先生紹介、アクセス、予約導線",
      },
      {
        id: "purpose_reference",
        label: "参考にしたいサイト",
        question: "Q4-5. 参考にしたいサイト・「こういう雰囲気がいい」サイト",
        kind: "textarea",
        placeholder: "例: 近所の○○ピアノ教室のサイトが明るくて親しみやすくて好き",
      },
    ],
  },
  {
    id: "current",
    heading: "現状",
    num: "05",
    title: "現在のサイト・発信",
    fields: [
      {
        id: "current_site",
        label: "今のホームページ（有無・URL）",
        question: "Q5-1. 今のホームページの有無とURL",
        kind: "textarea",
        placeholder: "例: あり（https://example.com/）。10年前に作ったきり未更新",
      },
      {
        id: "current_sns",
        label: "SNS・ポータルの運用状況",
        question: "Q5-2. SNSやポータルサイトはどれを、どのくらい運用している？",
        kind: "textarea",
        placeholder: "例: Instagramを週1更新。食べログとホットペッパーに登録",
      },
      {
        id: "current_gbp",
        label: "Googleビジネスプロフィール",
        question: "Q5-3. Googleビジネスプロフィール（マップのお店情報）の登録状況",
        kind: "textarea",
        placeholder: "例: 登録済みだが写真が古く、口コミに返信できていない",
      },
      {
        id: "current_problems",
        label: "今の発信の困りごと・不満",
        question: "Q5-4. 今の発信・サイトで困っていること・不満",
        kind: "textarea",
        placeholder: "例: スマホで見ると崩れる。自分で更新できない。問い合わせが来ない",
      },
    ],
  },
  {
    id: "assets",
    heading: "素材",
    num: "06",
    title: "素材・コンテンツ",
    fields: [
      {
        id: "assets_photos",
        label: "写真・ロゴの有無",
        question: "Q6-1. 使える写真・ロゴはある？",
        kind: "textarea",
        placeholder: "例: 料理写真はスマホ撮影が少し。ロゴは無し（暖簾はある）",
      },
      {
        id: "assets_shoot",
        label: "新規撮影の可否",
        question: "Q6-2. 新しく写真撮影はできそう？（訪問撮影・スマホ撮影など）",
        kind: "textarea",
        placeholder: "例: レッスン風景の撮影はOK。生徒の顔出しは要確認",
      },
      {
        id: "assets_docs",
        label: "文章の素材",
        question: "Q6-3. 文章の素材（メニュー表・料金表・パンフレット等）はある？",
        kind: "textarea",
        placeholder: "例: 院内に貼っている料金表と、施術の説明チラシがある",
      },
      {
        id: "assets_update",
        label: "公開後の更新頻度・内容",
        question: "Q6-4. 公開後、どのくらいの頻度で・何を更新したい？",
        kind: "textarea",
        placeholder: "例: 月替わりのおすすめメニューを、月1で自分で変えたい",
      },
    ],
  },
  {
    id: "design",
    heading: "デザイン",
    num: "07",
    title: "デザインの好み",
    desc: "Q7-1・Q7-2 の選択は Phase C（トーン選定）の直接の入力になる。直感で1つ選ぶ",
    fields: [
      {
        id: "design_character",
        label: "お店を一言で表すと",
        question: "Q7-1. お店を一言で表すとしたら？（直感で1つ）",
        kind: "pills",
        options: CHARACTER_OPTIONS,
      },
      {
        id: "design_impression",
        label: "与えたい第一印象",
        question: "Q7-2. お客さまに与えたい第一印象は？（1つ）",
        kind: "pills",
        options: IMPRESSION_OPTIONS,
        help: "Q7-1が「お店の性格」、Q7-2が「どう見られたいか」。ズレてもそれも情報",
      },
      {
        id: "design_ng",
        label: "NGカラー・避けたい表現",
        question: "Q7-3. 使ってほしくない色・避けたい表現（NG）",
        kind: "textarea",
        placeholder: "例: 派手な赤やチャラい感じはNG。落ち着いた色で",
        help: "ここのNGは tone.md に必ず反映される",
      },
      {
        id: "design_tools",
        label: "既存ツールとの統一",
        question: "Q7-4. ロゴ・名刺・看板など、既存ツールとの色や雰囲気の統一",
        kind: "textarea",
        placeholder: "例: 暖簾の紺色と、看板の筆文字の雰囲気に合わせたい",
      },
      {
        id: "design_note",
        label: "補足メモ",
        question: "補足メモ（Q7-1・Q7-2の第2候補など）",
        kind: "textarea",
        placeholder: "例: 第2候補は「信頼できる」＋「誠実な」",
      },
    ],
  },
  {
    id: "operation",
    heading: "運用",
    num: "08",
    title: "運用・契約",
    fields: [
      {
        id: "ops_decision",
        label: "決裁者",
        question: "Q8-1. サイト制作の決定はご自身でできる？（決裁者の確認）",
        kind: "textarea",
        placeholder: "例: 私が代表なので、私の判断で決められる",
      },
      {
        id: "ops_launch",
        label: "公開したい時期",
        question: "Q8-2. 公開したい時期はいつ頃？",
        kind: "text",
        placeholder: "例: 春の生徒募集に間に合わせたい（2月末まで）",
      },
      {
        id: "ops_plan",
        label: "希望プラン",
        question: "Q8-3. ご希望のプラン",
        kind: "pills",
        options: PLAN_OPTIONS,
        help: "ライト=初期10万+月8千 / スタンダード=初期25万+月1.5万 / ブランド=初期40万+月3万",
      },
      {
        id: "ops_budget",
        label: "予算感",
        question: "予算感（Q8-3つづき）",
        kind: "text",
        placeholder: "例: 月々は1.5万円くらいまでなら出せる",
      },
      {
        id: "ops_domain",
        label: "ドメイン・サーバーの現状",
        question: "Q8-4. ドメイン（サイトの住所）・サーバーは今どうなっている？",
        kind: "textarea",
        placeholder: "例: ドメインは前の業者が取ったもので、詳細がわからない",
      },
    ],
  },
];

/* ===== HearingDoc の生成・正規化 ===== */

/** 全キーを空文字で持つ HearingDoc */
export function emptyHearingDoc(): HearingDoc {
  const doc: HearingDoc = {};
  for (const s of HEARING_SECTIONS) for (const f of s.fields) doc[f.id] = "";
  return doc;
}

/**
 * AI・外部JSONの取り込み。既知キーだけ拾って文字列化し、
 * purpose_type は PurposeType に正規化する（日本語ラベルで返ってきた場合も救済）。
 */
export function normalizeHearingDoc(raw: unknown): HearingDoc {
  const doc = emptyHearingDoc();
  if (raw && typeof raw === "object") {
    const rec = raw as Record<string, unknown>;
    for (const key of Object.keys(doc)) {
      const v = rec[key];
      if (typeof v === "string") doc[key] = v;
      else if (typeof v === "number" || typeof v === "boolean") doc[key] = String(v);
    }
  }
  const pt = doc.purpose_type.trim();
  if (!asPurposeType(pt)) {
    const hit = PURPOSE_VALUES.find((p) => pt.includes(PURPOSE_LABEL[p]));
    doc.purpose_type = hit ?? "";
  }
  return doc;
}

/** 外部AIの返答テキストから最初のJSONオブジェクトを取り出して正規化 */
export function parseHearingJson(text: string): HearingDoc {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("JSONが見つからない。返答の { から } までを貼って");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("JSONとして読めなかった。返答のJSON部分だけを貼って");
  }
  return normalizeHearingDoc(parsed);
}

/* ===== フォーム（Section.tsx 用の SectionDef[]） ===== */

/** 全フィールドを "" で初期化した ToolState */
export function hearingFormDefaults(): ToolState {
  const st: ToolState = {};
  for (const s of HEARING_SECTIONS) for (const f of s.fields) st[f.id] = "";
  return st;
}

/** HEARING_SECTIONS → 既存の Section.tsx でレンダリングできる SectionDef[] */
export function hearingFormSections(): SectionDef[] {
  return HEARING_SECTIONS.map((s) => ({
    id: s.id,
    num: s.num,
    title: s.title,
    badge: s.badge,
    desc: s.desc,
    fields: s.fields.map((f) => ({
      id: f.id,
      kind: f.kind,
      label: f.question ?? f.label,
      options: f.options,
      placeholder: f.placeholder,
      help: f.help,
      rows: f.kind === "textarea" ? 2 : undefined,
    })),
  }));
}

/** フォームの ToolState → HearingDoc */
export function docFromFormState(state: ToolState): HearingDoc {
  const doc = emptyHearingDoc();
  for (const key of Object.keys(doc)) {
    const v = state[key];
    if (typeof v === "string") doc[key] = v;
    else if (Array.isArray(v)) doc[key] = (v as string[]).join("、");
  }
  return doc;
}

/* ===== AI構造化（json_schema・プロンプト） ===== */

/** anthropicProvider.generateJson 用の json_schema（HEARING_SECTIONS から導出） */
export function hearingJsonSchema(): object {
  const properties: Record<string, object> = {};
  for (const s of HEARING_SECTIONS) {
    for (const f of s.fields) {
      if (f.id === "purpose_type") {
        properties[f.id] = {
          type: "string",
          enum: ["inquiry", "visit", "reserve", "recruit", ""],
          description:
            "サイトの一番の目的。inquiry=問い合わせ / visit=来店・集客 / reserve=予約 / recruit=採用。明確な根拠が無ければ空文字",
        };
      } else {
        properties[f.id] = {
          type: "string",
          description: `${s.heading} / ${f.label}${f.question ? `（${f.question}）` : ""}。メモに無ければ空文字`,
        };
      }
    }
  }
  return { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
}

/** AI構造化のsystemプロンプト（事実優先・数字の捏造禁止を明示） */
export const HEARING_SYSTEM_PROMPT = `あなたはホームページ制作スタジオのアシスタント。地域の小規模事業者へのヒアリングのメモ・議事録を、hearing.md（案件の唯一の情報源）用の構造化データに整理する。

厳守事項:
- メモに書かれている事実だけを使う。価格・件数・目標値・営業時間などの数字は、メモにある数字をそのまま使い、決して捏造しない
- メモに無い項目は空文字 "" にする（無理に埋めない。空欄そのものが情報になる）
- 文脈からの推測で埋めた項目（根拠が薄い項目）は、値の末尾に「（AI推定・要確認）」を付ける
- purpose_type は「サイトの一番の目的」を inquiry（問い合わせ）/ visit（来店・集客）/ reserve（予約）/ recruit（採用）の4択から推定する。明確な根拠が無ければ空文字にし、候補があれば purpose_second に日本語でメモする
- 顧客の言い回し・固有名詞・具体的なエピソードはできるだけ原文のまま残す。要約しすぎない
- 出力はすべて日本語`;

/** キー無し時にコピーする全文プロンプト（同じ指示＋スキーマ説明＋貼り付けテキスト） */
export function buildHearingFallbackPrompt(memo: string): string {
  const fieldLines = HEARING_SECTIONS.map(
    (s) =>
      `### ${s.heading}\n${s.fields
        .map((f) => `- ${f.id}: ${f.label}${f.question ? `（${f.question}）` : ""}`)
        .join("\n")}`,
  ).join("\n\n");
  return `${HEARING_SYSTEM_PROMPT}

## 出力形式
次のキーをすべて持つJSONオブジェクトを1つだけ返す（説明文・コードブロックは不要）。値はすべて文字列。purpose_type だけは "inquiry" / "visit" / "reserve" / "recruit" / ""（不明）のいずれか。

${fieldLines}

## ヒアリングのメモ・議事録
---
${memo}`;
}

/* ===== hearing.md のレンダリング ===== */

/** 今日の日付（ローカルタイムゾーンの YYYY-MM-DD。sv-SEロケールはこの書式） */
function todayStr(): string {
  return new Date().toLocaleDateString("sv-SE");
}

/** 箇条書き値の整形（未記入マーク・改行のインデント継続・purpose_type のラベル化） */
function formatValue(fieldId: string, raw: string): string {
  const v = raw.trim();
  if (!v) return "（未記入）";
  if (fieldId === "purpose_type") {
    const pt = asPurposeType(v);
    if (pt) return `${PURPOSE_LABEL[pt]}（${pt}）`;
  }
  // 複数行の値は箇条書きの継続行としてインデント
  return v.replace(/\n/g, "\n  ");
}

/**
 * HearingDoc → hearing.md（clients/_sample/hearing.md と同じ見出し構成）。
 * 見出しは「## 基本情報 / 顧客 / 競合 / サイトの目的 / 現状 / 素材 / デザイン / 運用」。
 * 分析（## 分析）は要件定義フェーズが upsertSection で追記する想定なのでここでは書かない。
 */
export function renderHearingMd(doc: HearingDoc, fallbackName: string): string {
  const name = (doc.basic_name ?? "").trim() || fallbackName;
  const lines: string[] = [`# ヒアリング結果: ${name}`, "", `- 記入日: ${todayStr()}`, ""];
  for (const sec of HEARING_SECTIONS) {
    lines.push(`## ${sec.heading}`, "");
    for (const f of sec.fields) {
      lines.push(`- ${f.label}: ${formatValue(f.id, doc[f.id] ?? "")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
