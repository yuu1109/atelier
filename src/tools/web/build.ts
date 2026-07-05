import { block, bullets, joinBlocks } from "../../lib/prompt";
import {
  BODY_TEXT_CONTRAST_MIN,
  contrastRatio as contrastRatioStrict,
} from "../../lib/color";
import { FV_ELEMENTS, SECTION_MAP, type FvLayout, type SectionSpec, type SiteType, type WebTone } from "./data";
import type { DesignSystem } from "../../studio/tone/schema";
import type { WfPlan } from "../../studio/wf/schema";
import { toAstroComponentName } from "../../studio/wf/idMap";

/**
 * web ツールのプロンプト/スペック組み立て（純関数群）。
 * - buildImagePrompt / buildSpecMd: フォーム（index.ts の ToolDef）から使う既存出力。挙動・文字列を変えないこと
 * - buildStudioSpecMd: スタジオの実装引き渡しフェーズ（HandoffPhase）から使う案件スペック
 */

/* ---------- コントラスト計算（WCAG） ---------- */

export { BODY_TEXT_CONTRAST_MIN };

/** #RGB を #RRGGBB に展開する（旧ローカル実装が3桁HEXも受けていた互換のため） */
function expandHex(hex: string): string {
  const h = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    return "#" + h.split("").map((ch) => ch + ch).join("");
  }
  return hex;
}

/** 2色のコントラスト比（1〜21）。どちらかが不正なHEXなら null */
export function contrastRatio(a: string, b: string): number | null {
  return contrastRatioStrict(expandHex(a), expandHex(b));
}

/* ---------- プロンプト組み立ての入力 ---------- */

/** 構成に組み込んだ1セクションぶんの計画 */
export interface PlannedSection {
  spec: SectionSpec;
  note: string;
  layoutWish: string;
}

export interface PromptContext {
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

/* ---------- 画像プロンプトの組み立て ---------- */

/** 【GLOBAL STYLE】の本文 */
export function globalStyleBody(c: PromptContext): string {
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
export function outputFormatBody(c: PromptContext): string {
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
export function textRulesBody(): string {
  return bullets([
    "画像内に描いてよい日本語は、各画像の指示で「」に入れて指定した文字列だけ。一字一句そのまま、正確な字形で描く",
    "それ以外の文章はすべてグリーキング＝読めない灰色のダミー行（細い線やぼかし）で表す。それらしい日本語や実在しない漢字で埋めるのは禁止",
    "英語のダミー文（lorem ipsum）を読める形で残さない",
    "描く文字は大きく、静かな背景の上に置く。読めないサイズの小さなキャプションは最初から描かない",
    "数字と短い英単語は描いてよい（価格・電話番号・英字ラベルなど）。桁数と語数は絞る",
  ]);
}

/** 【1枚目｜ファーストビュー】の本文 */
export function fvBody(c: PromptContext): string {
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
export function sectionImageBlock(n: number, p: PlannedSection): string {
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
export function negativeBody(c: PromptContext): string {
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
export function spRulesBody(): string {
  return bullets([
    "左右分割レイアウトは上下積みに組み替える（原則テキストが上・ビジュアルが下）",
    "ナビゲーションはロゴ＋ハンバーガーアイコンに集約する",
    "文字サイズの大小関係はPCと同じ階層を保ち、キャッチコピーを最大にする",
    "CTAボタンは画面幅いっぱいに近い幅で置く",
    "カードの横並びは縦積みにするか、横スクロールを示唆する見切れ表現にする",
  ]);
}

/** 画像プロンプト全体 */
export function buildImagePrompt(c: PromptContext): string {
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

export function buildSpecMd(c: PromptContext): string {
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

/* ---------- スタジオ引き渡し用スペックMD ---------- */

/** hearing.md から「屋号/住所/電話」等の事実を1行だけ拾う。無ければ null（捏造しない） */
function pickFact(hearingMd: string, keywords: string[]): string | null {
  for (const rawLine of hearingMd.split("\n")) {
    const line = rawLine.trim();
    const kw = keywords.find((k) => line.includes(k));
    if (!kw) continue;
    // テーブル行: | 電話 | 0422-xx-xxxx |
    if (line.startsWith("|")) {
      const cells = line.split("|").map((cell) => cell.trim()).filter((cell) => cell !== "");
      const i = cells.findIndex((cell) => cell.includes(kw));
      const value = i >= 0 ? cells[i + 1] : undefined;
      if (value && !/^[-:ー–—\s]+$/.test(value)) return value;
      continue;
    }
    // 箇条書き・行内: 「電話: 0422-xx-xxxx」「電話番号：0422…」
    const m = line.match(new RegExp(`${kw}[^:：]*[:：]\\s*(.+)$`));
    if (m && m[1].trim() !== "") return m[1].trim();
  }
  return null;
}

/** tone.md から最初の :root { ... } ブロックを抜き出す。無ければ null */
function extractRootBlock(toneMd: string): string | null {
  const m = toneMd.match(/:root\s*\{[^}]*\}/);
  return m ? m[0] : null;
}

const MOBILE_NAV_LABEL: Record<WfPlan["mobileNav"], string> = {
  "bottom-bar": "下部固定バー（主要CTA常設）",
  hamburger: "ハンバーガー＋ドロワー",
  both: "下部固定バー＋ハンバーガーの併用",
};

/** buildStudioSpecMd の入力 */
export interface StudioSpecInput {
  /** clients/ 直下の案件ディレクトリ名 */
  project: string;
  /** hearing.md 全文（無ければ ""） */
  hearingMd: string;
  /** コンセプト工房のデザインシステム（無ければ null → tone.md の :root を引用） */
  designSystem: DesignSystem | null;
  /** tone.md 全文（無ければ null） */
  toneMd: string | null;
  /** WF壁打ちの成果物（無ければ null → wireframe-fixed.html から読むよう指示） */
  wfPlan: WfPlan | null;
  /** design/ 直下の画像ファイル名一覧 */
  designFiles: string[];
}

/**
 * スタジオの実装引き渡し用 spec.md を組み立てる。
 * 情報の正典は hearing.md（事実）・wireframe-fixed.html（構造とコピー）・tone.md（デザイン）。
 * このスペックは3つの正典への「参照と実装規約」に徹し、事実や数字をここで新造しない。
 */
export function buildStudioSpecMd(input: StudioSpecInput): string {
  const { project, hearingMd, designSystem, toneMd, wfPlan, designFiles } = input;
  const md: string[] = [];
  const siteName = wfPlan?.siteName || pickFact(hearingMd, ["屋号", "店名", "会社名", "事業者名"]) || project;

  md.push(
    `# ${siteName} 実装スペック`,
    "",
    `clients/${project}/ の実装仕様書（atelier スタジオ生成）。この内容に従って site/ に静的サイトを実装する。`,
    "",
    bullets([
      "情報の正典は3つ。事実・数字 = hearing.md / 構造とコピー = wireframe/wireframe-fixed.html / デザイン = tone.md",
      "hearing.md に無い数字・実績・事実（件数、年数、価格、住所など）を捏造しない。不明な箇所は TODO コメントで残す",
      "モック画像（design/）は雰囲気の参考にとどめる。色・数値・文言はこのスペックと上の正典が正",
    ]),
  );

  /* 1. デザイントークン */
  md.push("", "## 1. デザイントークン", "");
  if (designSystem) {
    md.push(
      `デザインシステム「${designSystem.name}」（${designSystem.slug}）— ${designSystem.personality}`,
      "",
      "`:root` に次のCSS変数を定義し、色は必ず変数経由で使う（HEX直書き禁止）。",
      "",
      "```css",
      ":root {",
      `  --color-bg: ${designSystem.colors.bg};`,
      `  --color-bg-alt: ${designSystem.colors.bgAlt};`,
      `  --color-surface: ${designSystem.colors.surface};`,
      `  --color-ink: ${designSystem.colors.ink};`,
      `  --color-ink-muted: ${designSystem.colors.inkMuted};`,
      `  --color-heading: ${designSystem.colors.heading};`,
      `  --color-primary: ${designSystem.colors.primary};`,
      `  --color-on-primary: ${designSystem.colors.onPrimary};`,
      `  --color-accent: ${designSystem.colors.accent};`,
      `  --color-border: ${designSystem.colors.border};`,
      ...(designSystem.derived ?? []).map((d) => `  --color-${d.name}: ${d.value};`),
      `  --font-heading: ${designSystem.fonts.heading};`,
      `  --font-body: ${designSystem.fonts.body};`,
      `  --font-accent: ${designSystem.fonts.accent};`,
      "}",
      "```",
      "",
    );
    md.push(
      bullets([
        `Google Fonts: ${designSystem.fonts.googleFontsUrl}`,
        designSystem.fonts.headingLetterSpacing &&
          `見出しの字間: letter-spacing ${designSystem.fonts.headingLetterSpacing}`,
        `セクション上下余白の基準: ${designSystem.spacing.sectionDefault}（${designSystem.spacing.philosophy}）`,
        `角丸の態度: ${designSystem.radius.attitude}`,
        `タイトル装飾レシピ: ${designSystem.decorations.titleRecipes.join(" / ")}`,
        `ボタンレシピ: ${designSystem.decorations.buttonRecipes.join(" / ")}`,
        `トーン固有の演出: ${designSystem.decorations.extras.join(" / ")}`,
        `写真トーン: 被写体=${designSystem.photoTone.subject} / 光=${designSystem.photoTone.light} / 色=${designSystem.photoTone.color}`,
        `全写真に共通フィルタ: filter: ${designSystem.photoTone.filterCss}（ユーティリティクラス化して適用）`,
      ]),
    );
  } else if (toneMd) {
    const root = extractRootBlock(toneMd);
    if (root) {
      md.push(
        "tone.md のトークン定義をそのまま使う。`:root` は次の通り（tone.md から引用。改変しない）。",
        "",
        "```css",
        root,
        "```",
      );
    } else {
      md.push("tone.md をデザインの正とする。tone.md 内の配色・書体・余白の定義から `:root` のCSS変数を組むこと。");
    }
  } else {
    md.push("デザイントークン未確定。実装前に tone.md（コンセプトフェーズ）を確定させること。");
  }

  /* 2. ページ構造 */
  md.push("", "## 2. ページ構造", "");
  if (wfPlan) {
    md.push(
      "wireframe/wireframe-fixed.html のセクション列が正。順序の入れ替え・セクションの追加削除をしない。",
      "見出し・本文・ボタンのコピーも wireframe-fixed.html の文言をそのまま使う（このスペックにコピーは再掲しない）。",
      "",
      "| # | セクションID | 名前 | 種別 | Astroコンポーネント |",
      "| --- | --- | --- | --- | --- |",
      ...wfPlan.sections.map(
        (sec, i) =>
          `| ${i + 1} | ${sec.key} | ${sec.label} | ${sec.kind}${sec.isCta ? "（CTA）" : ""} | ${toAstroComponentName(sec.key)} |`,
      ),
      "",
      bullets([
        `グローバルナビ: ${wfPlan.nav.map((n) => `「${n.label}」→ #${n.sectionKey}`).join(" / ")}`,
        `モバイルナビ: ${MOBILE_NAV_LABEL[wfPlan.mobileNav]}`,
        `サイトの一番の目的: ${wfPlan.purposeType}。全セクションの導線を最終CTAへ収束させる`,
      ]),
    );
  } else {
    md.push(
      bullets([
        "WFプラン（state.json）が無いため、wireframe/wireframe-fixed.html の <section id> 列をそのまま構造の正とする",
        "1つの <section id> につき1つのAstroコンポーネントを src/components/sections/ に切る（IDをPascalCase化した名前）",
        "見出し・本文・ボタンのコピーは wireframe-fixed.html の文言をそのまま使う",
      ]),
    );
  }

  /* 3. レイアウト指示 */
  md.push("", "## 3. レイアウト指示", "");
  md.push(
    bullets([
      "レイアウト（カラム構成・画像位置・非対称）は wireframe-fixed.html のグレースケール設計を忠実に再現する",
      "その上に tone.md / 上記トークンの配色・書体・装飾を着せる。WFに無い装飾要素を勝手に足さない",
      "コンテンツ最大幅1200px・12カラムグリッド基準。セクションは全幅の背景＋中央寄せのコンテンツで組む",
      "画像プレースホルダは同じ位置・同じ比率のまま実写（またはダミー画像）に差し替える",
    ]),
  );
  md.push("", "### 参考ビジュアル（design/）", "");
  if (designFiles.length > 0) {
    md.push(
      bullets([
        "以下のデザインカンプ画像は雰囲気（密度・写真トーン・装飾の空気感）の参考。正はこのスペックと wireframe-fixed.html",
        "画像内の日本語は崩れていることがあるため、画像から文字を書き起こさない",
      ]),
      "",
      bullets(designFiles.map((f) => `design/${f}`)),
    );
  } else {
    md.push("design/ にカンプ画像なし。wireframe-fixed.html とトークンだけで実装する。");
  }

  /* 4. レスポンシブ方針 */
  md.push("", "## 4. レスポンシブ方針", "");
  md.push(
    bullets([
      "モバイルファーストで書く。ブレークポイント: SP <768px / TAB 768〜1023px / PC ≥1024px",
      "左右分割は上下積みへ（原則テキスト上・画像下）。カード列はSPで1カラムか横スクロール",
      wfPlan
        ? `SPのナビは「${MOBILE_NAV_LABEL[wfPlan.mobileNav]}」。ドロワーを使う場合は中にも主要CTAを置く`
        : "ナビはSPでハンバーガー＋ドロワー。ドロワー内にも主要CTAを置く",
      "見出しはclampで流動化し、セクション上下余白はSPで約60%に縮める",
      "電話番号はSPで tel: リンクのタップ発信にする",
    ]),
  );

  /* 5. アクセシビリティ */
  md.push("", "## 5. アクセシビリティ", "");
  md.push(
    bullets([
      "テキストと背景のコントラスト比は本文4.5:1以上・大きな見出し3:1以上を必ず満たす",
      "タップターゲットは44×44px以上。隣接するリンク・ボタンの間隔を確保する",
      "キーボードだけで全操作できるようにし、:focus-visible で2pxのアウトライン（--color-primary）を表示する",
      'すべての img に alt を付ける。装飾画像は alt=""。見出しレベルは階層順（h1は1ページ1つ）',
      "prefers-reduced-motion の指定時はスクロールアニメーションを無効化する",
    ]),
  );
  if (designSystem && designSystem.forbidden.length > 0) {
    md.push("", "このデザインでやってはいけないこと（tone固有の禁止事項）:", "");
    md.push(bullets(designSystem.forbidden));
  }

  /* 6. 技術前提 */
  md.push("", "## 6. 技術前提", "");
  md.push(
    bullets([
      "Astro + Tailwind CSS v4。トークンは global.css の :root / @theme で定義し、色は必ずCSS変数経由で使う（ユーティリティへのHEX直書き・任意値の直書き禁止）",
      "1セクション＝1コンポーネント（src/components/sections/Hero.astro など。上の対応表に従う）。ページはコンポーネントを並べるだけにする",
      'FV画像はLCPになるため loading="eager"・fetchpriority="high"。それ以外の画像はlazyで最適化する',
      "フォームの送信先は定数に切り出して実装する（送信先は後日差し替え）",
      "メタ情報: title・description・OGPを hearing.md の事実から設定する",
      "目標: Lighthouse（モバイル）で Performance / Accessibility / Best Practices / SEO すべて90以上",
    ]),
  );

  /* LocalBusiness JSON-LD（hearingの事実のみ） */
  md.push("", "### 構造化データ（LocalBusiness JSON-LD）", "");
  const facts = [
    { label: "屋号（name）", value: pickFact(hearingMd, ["屋号", "店名", "会社名", "事業者名"]) },
    { label: "住所（address）", value: pickFact(hearingMd, ["住所", "所在地"]) },
    { label: "営業時間（openingHours）", value: pickFact(hearingMd, ["営業時間", "診療時間", "受付時間"]) },
    { label: "電話（telephone）", value: pickFact(hearingMd, ["電話", "TEL"]) },
  ].filter((f): f is { label: string; value: string } => f.value !== null && f.value !== "");
  if (facts.length > 0) {
    md.push(
      "hearing.md から拾えた事実は次の通り。これだけで LocalBusiness JSON-LD を構成し、無い項目は入れない（捏造禁止）。",
      "",
      bullets(facts.map((f) => `${f.label}: ${f.value}`)),
    );
  } else {
    md.push("hearing.md から屋号・住所・営業時間・電話を機械抽出できなかった。hearing.md を直接読み、書かれている事実だけで JSON-LD を構成する（無い項目は入れない）。");
  }

  return md.join("\n");
}
