import type { ItemState, ToolDef, ToolState } from "../../lib/types";
import { block, bullets, joinBlocks } from "../../lib/prompt";
import {
  FV_ELEMENTS,
  FV_LAYOUTS,
  GENERIC_PRESET,
  SECTION_MAP,
  SECTION_PILL_IDS,
  SITE_TYPES,
  WEB_TONES,
  type FvLayout,
  type SectionSpec,
  type SiteType,
  type WebTone,
} from "./data";

/* ---------- 値の取り出しヘルパー ---------- */

const asStr = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const asStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const asItems = (v: unknown): ItemState[] =>
  Array.isArray(v) ? (v as ItemState[]).filter((x) => typeof x === "object" && x !== null) : [];

/* ---------- コントラスト計算（WCAG） ---------- */

/** 本文テキストに求めるコントラスト比の下限（WCAG AA） */
const BODY_TEXT_CONTRAST_MIN = 4.5;

/** #RGB / #RRGGBB を相対輝度に変換する。解釈できないHEXは null */
function relativeLuminance(hex: string): number | null {
  let h = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split("").map((ch) => ch + ch).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 2色のコントラスト比（1〜21）。どちらかが不正なHEXなら null */
function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* ---------- 選択肢 ---------- */

const CTA_OPTIONS = [
  "予約する",
  "問い合わせる",
  "資料請求",
  "購入する",
  "LINE登録",
  "電話する",
  "採用に応募",
  "来店を促す",
].map((v) => ({ value: v, label: v }));

const BRAND_SWATCHES = [
  { value: "#1F3A5F", label: "藍" },
  { value: "#2E4A3B", label: "深緑" },
  { value: "#A85035", label: "テラコッタ" },
  { value: "#C8352B", label: "朱" },
  { value: "#C8912F", label: "山吹" },
  { value: "#2E9BCB", label: "空" },
];

/** 構成に組み込んだ1セクションぶんの計画 */
interface PlannedSection {
  spec: SectionSpec;
  note: string;
  layoutWish: string;
}

/* ---------- 画像プロンプトの組み立て ---------- */

interface PromptContext {
  siteType?: SiteType;
  tone?: WebTone;
  fv?: FvLayout;
  planned: PlannedSection[];
  siteName: string;
  industry: string;
  target: string;
  area: string;
  strength: string;
  mainCta: string;
  catchCopy: string;
  fvElements: string[];
  fvNote: string;
  viewport: string;
  ratio: string;
  textSafety: boolean;
  brandColor: string;
  perSet: number;
  total: number;
}

/** 【GLOBAL STYLE】の本文 */
function globalStyleBody(c: PromptContext): string {
  const lines: string[] = [];
  const head = [
    `サイト: ${c.siteName || "（屋号未定）"}${c.industry ? ` — ${c.industry}` : ""}${c.siteType ? `（${c.siteType.name}）` : ""}`,
    c.target && `ターゲット: ${c.target}`,
    c.area && `エリア: ${c.area}`,
    c.strength && `一番の強み: ${c.strength}`,
  ].filter((l): l is string => typeof l === "string" && l !== "");
  lines.push(...head);

  const t = c.tone;
  if (!t) {
    lines.push("デザイントーン未選択。配色・書体の統一指定なし（トーンを選ぶと全画像に同じスタイルが強制される）");
    return lines.join("\n");
  }

  const primary = c.brandColor || t.colors.primary;
  const primaryNote = c.brandColor
    ? `。ブランドカラー指定によりトーン標準の${t.colors.primary}から差し替え済み`
    : "";
  lines.push(
    `トーン「${t.name}」: ${t.personality}`,
    "",
    "[配色 — 以下のHEXを厳密に守る。ここにない色相を勝手に足さない]",
    `- 背景: ${t.colors.bg} / 交互セクションの背景: ${t.colors.bgAlt} / カード・面: ${t.colors.surface}`,
    `- 文字: ${t.colors.ink} / 補助文字: ${t.colors.inkMuted}`,
    `- メインカラー: ${primary}（ボタン・リンク・強調のみに使う${primaryNote}） / メインカラー上の文字: ${t.colors.onPrimary}`,
    `- アクセント: ${t.colors.accent}（細部の差し色のみ） / 罫線: ${t.colors.border}`,
    "",
    "[文字の雰囲気]",
    `- 見出し: ${t.fontFeel.heading}`,
    `- 本文: ${t.fontFeel.body}。長文は読める文字で描かず灰色のダミー行にする`,
    `- 英字あしらい: ${t.fontFeel.accentEn}`,
    "",
    "[余白・密度・角丸]",
    `- ${t.spacingFeel}`,
    `- ${t.decoration}`,
    "",
    "[写真のトーン — 全画像で統一]",
    `- ${t.photoTone}`,
  );
  return lines.join("\n");
}

/** 【出力形式】の本文 */
function outputFormatBody(c: PromptContext): string {
  const lines: Array<string | false> = [
    `Webサイトのデザインモック画像を合計${c.total}枚、下の一覧の順に生成する`,
    "1回の画像生成につき1枚＝1セクションだけを描く。複数セクションや複数案を1枚にグリッド状へまとめるのは絶対禁止",
    c.total > 1 && `1枚目から${c.total}枚目まで、途中で確認を挟まず上から順に生成しきる`,
    "すべてWebサイトUIのフラットな2Dスクリーンショットとして描く。ブラウザ枠・デバイスの写真・机・斜めのパース・画面への映り込みは入れない",
    "文字・ロゴ・CTAは画像の縁から短辺の7〜8%以上内側に置き、各画像の余白率は30%を下回らせない（写真を画面端まで断ち落とす表現は適用外）",
    c.total > 1 && "2枚目以降は1枚目とGLOBAL STYLEを厳密に一致させ、配色・余白・密度・角丸をドリフトさせない",
  ];
  if (c.viewport === "pc") {
    lines.push(`画角はPC。FVは${c.ratio}、各セクションは16:9（料金表・カード群のように縦へ伸びるセクションは4:3でもよい）`);
  } else if (c.viewport === "sp") {
    lines.push("画角はスマホ。全画像を9:16・幅390px相当の1カラムで構成する");
  } else {
    lines.push(
      `まずPC画角で${c.perSet}枚（FVは${c.ratio}、セクションは16:9）を生成し、続けて同じ内容をスマホ画角（9:16・幅390px相当の1カラム）に再構成した${c.perSet}枚を生成する`,
    );
  }
  return bullets(lines);
}

/** 【TEXT RULES】の本文（日本語文字化け対策） */
function textRulesBody(): string {
  return bullets([
    "画像内に描いてよい日本語は、各画像の指示で「」に入れて指定した文字列だけ。一字一句そのまま、正確な字形で描く",
    "それ以外の文章はすべてグリーキング＝読めない灰色のダミー行（細い線やぼかし）で表す。それらしい日本語や実在しない漢字で埋めるのは禁止",
    "英語のダミー文（lorem ipsum）を読める形で残さない",
    "描く文字は大きく、静かな背景の上に置く。読めないサイズの小さなキャプションは最初から描かない",
    "数字と短い英単語は描いてよい（価格・電話番号・英字ラベルなど）。桁数と語数は絞る",
  ]);
}

/** 【1枚目｜ファーストビュー】の本文 */
function fvBody(c: PromptContext): string {
  const lines: string[] = [];
  lines.push(c.viewport === "sp" ? "比率: 9:16（スマホ）" : `比率: ${c.ratio}（PC）`);
  if (c.fv) {
    lines.push(`レイアウト「${c.fv.name}」: ${c.fv.spec}`);
    lines.push("配置記述内の色・質感の表現よりGLOBAL STYLEの配色・写真トーンを優先する");
  } else {
    lines.push("レイアウト指定なし。ロゴ・キャッチコピー・メインビジュアル・主CTAが3秒で伝わる構図を組む");
  }

  const labels = c.fvElements
    .map((v) => FV_ELEMENTS.find((e) => e.value === v)?.label)
    .filter((l): l is string => typeof l === "string");
  if (labels.length > 0) {
    lines.push(
      `置く要素: ${labels.join("、")}（配置記述と食い違うときはこの要素指定を優先。ここにない装飾要素は省いてよい）`,
    );
  } else {
    lines.push("置く要素: 指定なし。ロゴ・キャッチコピー・主CTA・メインビジュアルの定石構成でよい");
  }

  if (c.catchCopy) {
    lines.push(`描く文字（一字一句正確に）: キャッチコピー「${c.catchCopy}」`);
  } else {
    lines.push(
      `キャッチコピーは未定。${c.industry || "この事業"}の強み${c.strength ? `（${c.strength}）` : ""}が3秒で伝わる10〜25文字の日本語コピーを1案つくり、それを見出しとして描く。どの会社でも言える抽象フレーズは禁止`,
    );
  }
  if (c.mainCta) {
    lines.push(`主要CTA: 「${c.mainCta}」を目的とした動詞ラベルのボタン1つに絞り、FVで最も目立つ色にする`);
  }
  if (c.area) lines.push(`エリア「${c.area}」が伝わる地名・アクセスの一言を小さく添える`);
  if (c.fvNote) lines.push(`補足: ${c.fvNote}`);
  return bullets(lines);
}

/** セクション1枚ぶんのブロック */
function sectionImageBlock(n: number, p: PlannedSection): string {
  const cropLine =
    p.spec.id === "footer"
      ? "ページ最下部のセクション。上に続きがある前提で上端を断つ"
      : p.spec.id === "cta"
        ? "ページ終盤のCTAセクション単体を描く。ヘッダーやフッターは描かない"
        : "ページ途中を切り出した1セクションのみを描く。ヘッダー・フッター・締めのCTAを勝手に足さず、上下は続きがある前提で断つ";
  const body = bullets([
    `目的: ${p.spec.purpose}`,
    `構成要素: ${p.spec.slots.join(" / ")}`,
    `レイアウト: ${p.layoutWish || p.spec.layout}`,
    p.note && `内容: ${p.note}`,
    "1枚目（FV）とGLOBAL STYLEに厳密に揃える。配色・余白・角丸・影・写真トーンを一致させる",
    cropLine,
  ]);
  return `【${n}枚目｜${p.spec.name}】\n${body}`;
}

/** 【禁止事項】の本文 */
function negativeBody(c: PromptContext): string {
  const lines: Array<string | false | undefined> = [
    "紫〜青のグラデーション背景・ネオン発光・意味のない3D抽象オブジェクトを描かない",
    `どの業種にも使い回せる汎用ストックフォト風の写真を使わない。被写体は${c.industry || "この事業"}の実物・現場・人にする`,
    "白い角丸カードを等間隔に横並びするだけの没個性なテンプレ構成にしない。カードを使う場合もトーンの角丸・罫線・地色ルールに従う",
    "①②③を矢印でつなぐ定型のステップフロー図解を使わない",
    c.tone && "指定したHEX以外の色相を使わない",
    c.tone?.isDark
      ? "このトーンはダーク基調が正。指定より明るい背景へ勝手に置き換えない"
      : "指定していないのにダークテーマへ反転しない",
    "実在する企業のロゴ・ブランド・人物を描かない（内容はすべて架空でよい）",
    "ウォーターマーク・署名・フレーム外の飾りを入れない",
  ];
  if (c.tone) {
    for (const f of c.tone.forbidden) lines.push(`トーン固有の禁止: ${f}`);
  }
  return bullets(lines);
}

/** スマホ再構成ルール */
function spRulesBody(): string {
  return bullets([
    "左右分割レイアウトは上下積みに組み替える（原則テキストが上・ビジュアルが下）",
    "ナビゲーションはロゴ＋ハンバーガーアイコンに集約する",
    "文字サイズの大小関係はPCと同じ階層を保ち、キャッチコピーを最大にする",
    "CTAボタンは画面幅いっぱいに近い幅で置く",
    "カードの横並びは縦積みにするか、横スクロールを示唆する見切れ表現にする",
  ]);
}

/** 画像プロンプト全体 */
function buildImagePrompt(c: PromptContext): string {
  const sectionBlocks = c.planned.map((p, i) => sectionImageBlock(i + 2, p));
  const bothTail =
    c.viewport === "both"
      ? c.perSet === 1
        ? `【2枚目｜スマホ画角】\n` +
          bullets([
            "1枚目と同じ内容を、下のスマホ再構成ルールに従って9:16で生成する",
            "GLOBAL STYLEと内容指定はPC版と完全に同一のまま使う",
          ])
        : `【${c.perSet + 1}〜${c.total}枚目｜スマホ画角セット】\n` +
          bullets([
            `1〜${c.perSet}枚目と同じ順序・同じ内容を、下のスマホ再構成ルールに従って9:16で生成する`,
            "GLOBAL STYLEと各セクションの内容指定はPC版と完全に同一のまま使う",
          ])
      : null;
  return joinBlocks(
    block("出力形式", outputFormatBody(c)),
    block("GLOBAL STYLE — 全画像共通。一字も変えずに毎回適用する", globalStyleBody(c)),
    c.textSafety ? block("TEXT RULES — 日本語の文字化け対策", textRulesBody()) : null,
    `【1枚目｜ファーストビュー】\n${fvBody(c)}`,
    ...sectionBlocks,
    bothTail,
    c.viewport !== "pc" ? block("スマホ再構成ルール", spRulesBody()) : null,
    block("禁止事項 — 全画像共通", negativeBody(c)),
  );
}

/* ---------- 実装スペックMDの組み立て ---------- */

function buildSpecMd(c: PromptContext): string {
  const md: string[] = [];
  const title = c.siteName || c.siteType?.name || "Webサイト";
  md.push(
    `# ${title} 実装スペック`,
    "",
    `これは${c.siteType ? c.siteType.name : "Webサイト"}の実装仕様書。この内容に従って静的サイトを実装する。`,
    "",
    "- モック画像を渡した場合、画像は雰囲気の参考にとどめる。色・数値・文言はこのスペックが正",
    "- 画像内の日本語は崩れていることがあるため、画像から文字を書き起こさない",
  );
  const profile = [
    c.industry && `- 業種・商材: ${c.industry}`,
    c.target && `- ターゲット: ${c.target}`,
    c.area && `- エリア: ${c.area}`,
    c.strength && `- 一番の強み: ${c.strength}`,
    c.mainCta && `- 主要CTA: ${c.mainCta}（全セクションの導線はここへ収束させる）`,
  ].filter((l): l is string => typeof l === "string" && l !== "");
  if (profile.length > 0) md.push("", ...profile);

  /* 1. デザイントークン */
  md.push("", "## 1. デザイントークン", "");
  const t = c.tone;
  if (t) {
    const primary = c.brandColor || t.colors.primary;
    md.push(
      `トーン「${t.name}」— ${t.personality}`,
      "",
      "`:root` に次のCSS変数を定義し、色は必ず変数経由で使う（HEX直書き禁止）。",
      "",
      "```css",
      ":root {",
      `  --color-bg: ${t.colors.bg};`,
      `  --color-bg-alt: ${t.colors.bgAlt};`,
      `  --color-surface: ${t.colors.surface};`,
      `  --color-ink: ${t.colors.ink};`,
      `  --color-ink-muted: ${t.colors.inkMuted};`,
      `  --color-primary: ${primary};`,
      `  --color-on-primary: ${t.colors.onPrimary};`,
      `  --color-accent: ${t.colors.accent};`,
      `  --color-border: ${t.colors.border};`,
      `  --font-heading: ${t.fontCss.heading};`,
      `  --font-body: ${t.fontCss.body};`,
      `  --font-accent-en: ${t.fontCss.accentEn};`,
      "}",
      "```",
      "",
    );
    const tokenNotes = [
      "余白スケール: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128px の段階のみ使用",
      `セクション上下パディングの基準: ${t.sectionPadding}（SPでは約60%に縮小）`,
      `角丸・影: ${t.decoration}`,
      `写真の色調: ${t.photoTone}。CSSフィルタはユーティリティクラス化して全写真に適用`,
      "見出しスケール: h1 clamp(32px, 5vw, 48px) / h2 clamp(24px, 3.5vw, 34px) / h3 20px。本文16px・行間1.8",
      c.brandColor &&
        `--color-primary はブランドカラー指定（${c.brandColor}）で、トーン標準の ${t.colors.primary} を差し替えている`,
    ];
    md.push(bullets(tokenNotes));
  } else {
    md.push("デザイントーン未選択。実装前にトーンを確定させ、色・フォントのトークンをここへ記載すること。");
  }

  /* 2. ページ構造 */
  md.push("", "## 2. ページ構造", "", "上から順に実装する。id はアンカー名・コンポーネント名に使う。", "");
  const structure: string[] = [];
  const header = SECTION_MAP["header-nav"];
  if (header) {
    structure.push(`1. header — ${header.name}: ${header.purpose}。内容: ${header.slots.join("、")}`);
  }
  const fvLine = [
    `2. hero — ファーストビュー: 3秒で価値提案を伝える`,
    c.fv ? `レイアウト「${c.fv.name}」` : "レイアウトは実装時に提案",
    c.catchCopy
      ? `キャッチコピー（確定）: 「${c.catchCopy}」`
      : "キャッチコピー未確定。強みが3秒で伝わる10〜25文字で提案し、代替案2つをコメントで残す",
  ].join("。");
  structure.push(fvLine);
  let idx = 3;
  for (const p of c.planned) {
    const noteTail = p.note ? `。内容メモ: ${p.note}` : "";
    structure.push(`${idx}. ${p.spec.id} — ${p.spec.name}: ${p.spec.purpose}。内容: ${p.spec.slots.join("、")}${noteTail}`);
    idx++;
  }
  const footer = SECTION_MAP["footer"];
  if (footer && !c.planned.some((p) => p.spec.id === "footer")) {
    structure.push(`${idx}. footer — ${footer.name}: ${footer.purpose}（構成に無かったため自動で追加。全サイト必須）`);
  }
  md.push(structure.join("\n"));

  /* 3. レイアウト指示 */
  md.push("", "## 3. レイアウト指示", "");
  const layoutGeneral = [
    "コンテンツ最大幅1200px・12カラムグリッド基準。セクションは全幅の背景＋中央寄せのコンテンツで組む",
    "1画面（1セクション）につき1箇所まで、意図した非対称（左右比の崩し・要素のオフセット）を入れて単調さを避ける",
    "画像とテキストが並ぶセクションが連続するときは、左右を交互に入れ替えてリズムを作る",
    "写真は要所でコンテンツ幅を破り、画面端まで断ち落としてよい（1ページに数回まで）",
    c.fv && `FV: ${c.fv.spec}`,
  ];
  md.push(bullets(layoutGeneral));
  if (c.planned.length > 0) {
    md.push("", "セクション別の当て込み:", "");
    md.push(bullets(c.planned.map((p) => `${p.spec.name}: ${p.layoutWish || p.spec.layout}`)));
  }

  /* 4. レスポンシブ方針 */
  md.push("", "## 4. レスポンシブ方針", "");
  md.push(
    bullets([
      "モバイルファーストで書く。ブレークポイント: SP <768px / TAB 768〜1023px / PC ≥1024px",
      "左右分割は上下積みへ（原則テキスト上・画像下）。カード列はSPで1カラムか横スクロール",
      "ナビはSPでハンバーガー＋ドロワー。ドロワー内にも主要CTAを置く",
      "見出しはclampで流動化し、セクション上下余白はSPで約60%に縮める",
      "電話番号はSPで tel: リンクのタップ発信にする",
    ]),
  );

  /* 5. アクセシビリティ */
  md.push("", "## 5. アクセシビリティ", "");
  const a11y = [
    "テキストと背景のコントラスト比は本文4.5:1以上・大きな見出し3:1以上を必ず満たす",
    "タップターゲットは44×44px以上。隣接するリンク・ボタンの間隔を確保する",
    "キーボードだけで全操作できるようにし、:focus-visible で2pxのアウトライン（--color-primary）を表示する",
    'すべての img に alt を付ける。装飾画像は alt=""。見出しレベルは階層順（h1は1ページ1つ）',
    "prefers-reduced-motion の指定時はスクロールアニメーションを無効化する",
  ];
  md.push(bullets(a11y));
  if (t) {
    md.push("", "トーン固有の注意（表現・配色の禁止事項）:", "");
    md.push(bullets(t.forbidden));
  }

  /* 6. 技術前提 */
  md.push("", "## 6. 技術前提", "");
  md.push(
    bullets([
      "Astro + Tailwind CSS v4。トークンは global.css の :root / @theme で定義し、色は必ずCSS変数経由で使う（ユーティリティへのHEX直書き・任意値の直書き禁止）",
      "1セクション＝1コンポーネント（src/components/sections/Hero.astro など）。ページはコンポーネントを並べるだけにする",
      'FV画像はLCPになるため loading="eager"・fetchpriority="high"。それ以外の画像はlazyで最適化する',
      "フォームの送信先は定数に切り出して実装する（送信先は後日差し替え）",
      `メタ情報: title・description・OGPを設定${c.area ? `。見出しや alt に「${c.area}」などの地域語を自然に含める` : ""}`,
      "目標: Lighthouse（モバイル）で Performance / Accessibility / Best Practices / SEO すべて90以上",
    ]),
  );

  return md.join("\n");
}

/* ---------- ToolDef ---------- */

export const def: ToolDef = {
  id: "web",
  name: "Webデザイン",
  tagline: "HP制作の入口。モック画像プロンプトと実装スペックMDをフォームから組み立てる。",
  sections: [
    {
      id: "site-type",
      num: "01",
      title: "サイト種別",
      badge: "required",
      desc: "何のサイトを作るか。推奨セクション構成の土台になる",
      fields: [
        {
          id: "siteType",
          kind: "pills",
          options: SITE_TYPES.map((t) => ({ value: t.id, label: t.name })),
          help: "選ぶと06の推奨セクション構成が切り替わる",
        },
      ],
    },
    {
      id: "site-info",
      num: "02",
      title: "サイトの情報",
      badge: "optional",
      desc: "書くほどコピーと被写体が具体的になる",
      fields: [
        { id: "siteName", kind: "text", label: "サイト名・屋号", placeholder: "例: みどり整骨院" },
        { id: "industry", kind: "text", label: "業種・商材", placeholder: "例: 肩こり・腰痛専門の整骨院" },
        { id: "target", kind: "text", label: "ターゲット", placeholder: "例: デスクワークで肩を痛めた30〜50代" },
        {
          id: "area",
          kind: "text",
          label: "エリア",
          placeholder: "例: 三鷹駅徒歩3分",
          help: "店舗・地域商圏なら駅名や市区名まで。FVとアクセスに効く",
        },
        {
          id: "strength",
          kind: "textarea",
          label: "一番の強み",
          rows: 2,
          placeholder: "例: 国家資格者のみが施術。夜21時まで・土日も営業",
        },
        { id: "mainCta", kind: "pills", label: "主要CTA", options: CTA_OPTIONS },
        {
          id: "catchCopy",
          kind: "text",
          label: "キャッチコピー",
          placeholder: "例: 夜、肩の痛みで目が覚めるあなたへ。",
          help: "空欄ならAIに10〜25文字で提案させる指示が入る",
        },
      ],
    },
    {
      id: "output-mode",
      num: "03",
      title: "つくるもの",
      badge: "required",
      fields: [
        {
          id: "outputMode",
          kind: "segment",
          options: [
            { value: "mock", label: "デザインモック画像" },
            { value: "spec", label: "実装スペックMD" },
            { value: "both", label: "両方" },
          ],
          help: "画像プロンプトは画像生成AIへ、スペックMDは Claude Code / Codex へ貼る",
        },
      ],
    },
    {
      id: "design-tone",
      num: "04",
      title: "デザイントーン",
      badge: "required",
      desc: "配色・書体・余白・写真の色調まで決まるサイトの人格",
      fields: [
        {
          id: "tone",
          kind: "cards",
          columns: 2,
          options: WEB_TONES.map((t) => ({
            value: t.id,
            label: t.name,
            desc: t.cardDesc,
            tags: t.keywords,
          })),
        },
        {
          id: "brandColor",
          kind: "color",
          label: "ブランドカラー上書き",
          swatches: BRAND_SWATCHES,
          help: "指定するとトーンのメインカラーをこの色に差し替える",
        },
      ],
    },
    {
      id: "first-view",
      num: "05",
      title: "ファーストビュー",
      badge: "optional",
      desc: "3秒で「誰の・何の・次に何をすべきか」に答える1枚目",
      fields: [
        {
          id: "fvLayout",
          kind: "cards",
          columns: 3,
          label: "FVレイアウト",
          options: FV_LAYOUTS.map((l) => ({
            value: l.id,
            label: l.name,
            desc: l.cardDesc,
            tags: l.tags,
          })),
        },
        {
          id: "fvElements",
          kind: "multi",
          label: "FVに置く要素",
          options: FV_ELEMENTS.map((e) => ({ value: e.value, label: e.label })),
          help: "未選択ならキャッチ・CTA・メインビジュアルの定石構成になる",
        },
        {
          id: "fvNote",
          kind: "text",
          label: "FVの補足メモ",
          placeholder: "例: 施術中の手元の写真を使ってほしい",
        },
      ],
    },
    {
      id: "sections",
      num: "06",
      title: "セクション構成",
      badge: "optional",
      desc: "ページ本体の並び。1画像=1セクションで生成される",
      fields: [
        {
          id: "usePreset",
          kind: "toggle",
          label: "推奨構成におまかせ",
          help: "ONでサイト種別ごとの推奨構成を使う。細かく決めたいときはOFF",
        },
        {
          id: "sectionCount",
          kind: "number",
          label: "セクション数",
          min: 1,
          max: 10,
          showIf: (s: ToolState) => s.usePreset !== true,
        },
        {
          id: "sections",
          kind: "repeater",
          countField: "sectionCount",
          showIf: (s: ToolState) => s.usePreset !== true,
          itemLabel: (i: number, item: ItemState) => {
            const spec = SECTION_MAP[asStr(item.sectionType)];
            return `${String(i + 1).padStart(2, "0")} ${spec ? spec.name : "セクション"}`;
          },
          help: "画像は1回の生成で10枚まで。多い構成は分割して依頼する",
          itemFields: [
            {
              id: "sectionType",
              kind: "pills",
              label: "セクション種類",
              options: SECTION_PILL_IDS.map((id) => ({
                value: id,
                label: SECTION_MAP[id]?.name ?? id,
              })),
            },
            {
              id: "note",
              kind: "text",
              label: "内容メモ",
              placeholder: "例: 初回限定2,980円のキャンペーンを載せる",
            },
            {
              id: "layoutWish",
              kind: "text",
              label: "レイアウトの希望（任意）",
              placeholder: "例: 写真を左、テキストを右に",
            },
          ],
        },
      ],
    },
    {
      id: "output-settings",
      num: "07",
      title: "出力設定",
      badge: "optional",
      fields: [
        {
          id: "viewport",
          kind: "segment",
          label: "画角",
          options: [
            { value: "pc", label: "PC" },
            { value: "sp", label: "スマホ" },
            { value: "both", label: "PC+スマホ両方" },
          ],
          help: "両方は同じ構成を2画角で生成するため枚数が2倍になる",
          showIf: (s: ToolState) => s.outputMode !== "spec",
        },
        {
          id: "fvRatio",
          kind: "segment",
          label: "FVの比率",
          options: [
            { value: "16:9", label: "16:9" },
            { value: "3:2", label: "3:2" },
          ],
          help: "16:9=画面ちょうど、3:2=次セクションのチラ見せまで入る",
          showIf: (s: ToolState) => s.outputMode !== "spec" && s.viewport !== "sp",
        },
        {
          id: "textSafety",
          kind: "toggle",
          label: "日本語文字の精度対策",
          help: "画像内の日本語を指定文字列だけに絞り、他はダミー行で描かせる崩れ対策",
          showIf: (s: ToolState) => s.outputMode !== "spec",
        },
        {
          id: "extra",
          kind: "textarea",
          label: "追加の指示",
          rows: 3,
          placeholder: "例: 写真は人物より物・空間を中心に",
        },
      ],
    },
  ],
  defaults: {
    siteType: "",
    siteName: "",
    industry: "",
    target: "",
    area: "",
    strength: "",
    mainCta: "",
    catchCopy: "",
    outputMode: "both",
    tone: "",
    brandColor: "",
    fvLayout: "",
    fvElements: [],
    fvNote: "",
    usePreset: true,
    sectionCount: 5,
    sections: [],
    viewport: "pc",
    fvRatio: "16:9",
    textSafety: true,
    extra: "",
  },
  build: (s: ToolState) => {
    const warnings: string[] = [];
    const siteType = SITE_TYPES.find((t) => t.id === asStr(s.siteType));
    const tone = WEB_TONES.find((t) => t.id === asStr(s.tone));
    const fv = FV_LAYOUTS.find((l) => l.id === asStr(s.fvLayout));
    const mode = asStr(s.outputMode) || "both";
    const withImages = mode !== "spec";
    const withSpec = mode !== "mock";
    const viewport = withImages ? asStr(s.viewport) || "pc" : "pc";
    const usePreset = s.usePreset !== false;

    const brandColor = asStr(s.brandColor);
    if (!siteType) warnings.push("サイト種別が未選択。推奨構成が使えず被写体の文脈も薄くなる");
    if (!tone) warnings.push("デザイントーンが未選択。配色・書体が確定せずGLOBAL STYLEが組めない");
    if (!tone && brandColor) {
      warnings.push(`トーン未選択のためブランドカラー（${brandColor}）が出力に反映されない`);
    }
    if (tone && brandColor) {
      const ratio = contrastRatio(brandColor, tone.colors.onPrimary);
      if (ratio !== null && ratio < BODY_TEXT_CONTRAST_MIN) {
        warnings.push(
          `ブランドカラー${brandColor}とメインカラー上の文字${tone.colors.onPrimary}のコントラスト比が約${ratio.toFixed(1)}:1で、本文基準${BODY_TEXT_CONTRAST_MIN}:1を満たさない。ボタン文字が読めなくなるため色の見直しを検討する`,
        );
      }
    }

    /* セクション構成の解決 */
    const planned: PlannedSection[] = [];
    if (usePreset) {
      const ids = siteType ? siteType.preset : GENERIC_PRESET;
      for (const id of ids) {
        if (id === "header-nav" || id === "hero") continue; // FVに統合
        const spec = SECTION_MAP[id];
        if (spec) planned.push({ spec, note: "", layoutWish: "" });
      }
      if (!siteType) warnings.push("種別未選択のため汎用のセクション構成で代用した");
    } else {
      let skipped = 0;
      // UIは sectionCount ぶんしか描画しないため、減らした後の残骸行を構成に混入させない
      const visibleCount = typeof s.sectionCount === "number" ? s.sectionCount : Infinity;
      for (const item of asItems(s.sections).slice(0, visibleCount)) {
        const spec = SECTION_MAP[asStr(item.sectionType)];
        if (!spec) {
          skipped++;
          continue;
        }
        planned.push({ spec, note: asStr(item.note), layoutWish: asStr(item.layoutWish) });
      }
      if (skipped > 0) warnings.push(`セクション種類が未選択の行が${skipped}件あり、構成から除外した`);
      if (planned.length === 0) warnings.push("セクションが1つもない。06でセクション種類を選ぶ");
    }

    const perSet = 1 + planned.length;
    const total = viewport === "both" ? perSet * 2 : perSet;
    if (withImages && !fv) warnings.push("FVレイアウトが未選択。1枚目の構図が生成AIまかせになる");
    if (withImages && total > 10) {
      warnings.push(
        `画像が合計${total}枚で1回の生成上限10枚を超える。まず1〜10枚目まで生成させ、続きは「GLOBAL STYLEを維持したまま11枚目以降を生成」と分けて依頼する`,
      );
    }

    const ctx: PromptContext = {
      siteType,
      tone,
      fv,
      planned,
      siteName: asStr(s.siteName),
      industry: asStr(s.industry),
      target: asStr(s.target),
      area: asStr(s.area),
      strength: asStr(s.strength),
      mainCta: asStr(s.mainCta),
      catchCopy: asStr(s.catchCopy),
      fvElements: asStrArr(s.fvElements),
      fvNote: asStr(s.fvNote),
      viewport,
      ratio: asStr(s.fvRatio) || "16:9",
      textSafety: s.textSafety !== false,
      brandColor,
      perSet,
      total,
    };

    const extra = asStr(s.extra);
    const parts: string[] = [];
    if (withImages) {
      const img = joinBlocks(buildImagePrompt(ctx), block("追加の指示", extra));
      parts.push(
        mode === "both"
          ? `■ 出力1｜デザインモック画像プロンプト — ChatGPT Images 2.0 / Nanobanana に貼る\n\n${img}`
          : img,
      );
    }
    if (withSpec) {
      const spec = joinBlocks(buildSpecMd(ctx), extra ? `## 補足（追加の指示）\n\n${extra}` : null);
      parts.push(
        mode === "both" ? `■ 出力2｜実装スペックMD — Claude Code / Codex に貼る\n\n${spec}` : spec,
      );
    }
    const text = parts.join(`\n\n${"─".repeat(40)}\n\n`);

    const modeLabel = mode === "mock" ? "モック画像" : mode === "spec" ? "スペックMD" : "画像+スペックMD";
    const meta: { label: string; value: string }[] = [
      { label: "サイト種別", value: siteType?.name ?? "未選択" },
      { label: "トーン", value: tone?.name ?? "未選択" },
      { label: "セクション", value: `FV+${planned.length}` },
      { label: "出力", value: modeLabel },
    ];
    if (withImages) meta.push({ label: "画像", value: `${total}枚` });

    return { text, meta, warnings };
  },
};
