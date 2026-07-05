import { relativeLuminance } from "../../lib/color";
import { spRulesBody, textRulesBody } from "../../tools/web/build";
import type { DesignSystem } from "../tone/schema";
import type { LayoutSpec, WfPlan, WfSection } from "../wf/schema";

/**
 * デザインカンプ画像プロンプトの組み立て（スタジオ版）。
 * v1 webツール（tools/web/build.ts）の規律（GLOBAL STYLE厳守・TEXT RULES・禁止事項）を、
 * WfPlan（確定WF）+ DesignSystem（コンセプト工房の成果物）から自動で差し込む。
 * - buildCompImagePrompt: アプリ内生成用（1リクエスト=1セクション1枚）
 * - buildCompCopyPrompt: キー無しコピペ用（選択セクションを一括のマルチ画像プロンプトに）
 */

function bullets(lines: Array<string | false | null | undefined>): string {
  return lines
    .filter((l): l is string => typeof l === "string" && l !== "")
    .map((l) => `- ${l}`)
    .join("\n");
}

function block(title: string, body: string): string {
  return `【${title}】\n${body}`;
}

function joinBlocks(...blocks: Array<string | null>): string {
  return blocks.filter((b): b is string => Boolean(b)).join("\n\n");
}

export type CompViewport = "pc" | "sp";

/* ===== GLOBAL STYLE（DesignSystem由来） ===== */

/** デザインシステム → 全画像共通のGLOBAL STYLE本文 */
export function designGlobalStyleBody(ds: DesignSystem, siteName: string): string {
  const c = ds.colors;
  const derived =
    ds.derived && ds.derived.length > 0
      ? `- 派生色: ${ds.derived.map((d) => `${d.name} ${d.value}`).join(" / ")}`
      : null;
  const letterSpacing = ds.fonts.headingLetterSpacing
    ? `（字間 ${ds.fonts.headingLetterSpacing}）`
    : "";
  return [
    `サイト: ${siteName || "（屋号未定）"}`,
    `デザインシステム「${ds.name}」: ${ds.personality}`,
    "",
    "[配色 — 以下のHEXを厳密に守る。ここにない色相を勝手に足さない]",
    `- 背景: ${c.bg} / 交互セクションの背景: ${c.bgAlt} / カード・面: ${c.surface}`,
    `- 文字: ${c.ink} / 補助文字: ${c.inkMuted} / 見出し: ${c.heading}`,
    `- メインカラー: ${c.primary}（ボタン・リンク・強調のみに使う） / メインカラー上の文字: ${c.onPrimary}`,
    `- アクセント: ${c.accent}（細部の差し色のみ） / 罫線: ${c.border}`,
    ...(derived ? [derived] : []),
    "",
    "[文字の雰囲気]",
    `- 見出し: ${ds.fonts.heading} 系の書体感${letterSpacing}`,
    `- 本文: ${ds.fonts.body} 系。長文は読める文字で描かず灰色のダミー行にする`,
    `- 英字あしらい: ${ds.fonts.accent} 系`,
    "",
    "[余白・密度・角丸]",
    `- ${ds.spacing.philosophy}`,
    `- 角丸の態度: ${ds.radius.attitude}`,
    "",
    "[装飾の語彙 — この範囲でだけ飾る]",
    `- タイトル装飾: ${ds.decorations.titleRecipes.join(" / ")}`,
    `- ボタン: ${ds.decorations.buttonRecipes.join(" / ")}`,
    `- 固有の演出: ${ds.decorations.extras.join(" / ")}`,
    "",
    "[写真のトーン — 全画像で統一]",
    `- 被写体: ${ds.photoTone.subject}`,
    `- 光: ${ds.photoTone.light} / 色: ${ds.photoTone.color}`,
  ].join("\n");
}

/* ===== セクション内容（WfSection由来） ===== */

/** LayoutSpec → 1行のレイアウト指示 */
function layoutLine(l: LayoutSpec): string {
  const parts: string[] = [];
  if (l.type === "standard" && l.variant) parts.push(`標準パターン「${l.variant}」`);
  if (l.columns && l.columns.length > 0) {
    const ratio = l.columns.map((col) => col.ratio).join(":");
    const contents = l.columns.map((col) => col.content.join("+")).join(" | ");
    parts.push(`${ratio} のカラム構成（${contents}）`);
  }
  if (l.mediaPosition && l.mediaPosition !== "none") {
    const pos = { left: "左", right: "右", top: "上", bottom: "下", background: "背景全面" }[
      l.mediaPosition
    ];
    parts.push(`画像は${pos}`);
  }
  if (l.emphasis) {
    parts.push(
      { text: "テキスト主役", visual: "ビジュアル主役", balanced: "テキストとビジュアルを等分" }[
        l.emphasis
      ],
    );
  }
  if (l.asymmetric) parts.push("あえて非対称に組んで単調さを崩す");
  return parts.length > 0 ? parts.join("。") : "セクションの目的に合う定石レイアウトでよい";
}

/** セクション1枚ぶんの内容本文 */
export function compSectionBody(section: WfSection, isFv: boolean, viewport: CompViewport): string {
  const copy = section.copy;
  const lines: Array<string | false | null | undefined> = [];

  lines.push(viewport === "sp" ? "比率: 9:16（スマホ・幅390px相当の1カラム）" : "比率: 16:9（PC）");
  lines.push(`位置づけ: ${section.label}${section.isCta ? "（途中CTAバンド）" : ""}`);
  if (section.note) lines.push(`設計意図: ${section.note}`);
  lines.push(`レイアウト: ${layoutLine(section.layout)}`);

  // 「」で指定した文字列だけが描画対象（TEXT RULESと対）
  if (copy.heading) {
    lines.push(
      isFv
        ? `描く文字（一字一句正確に）: キャッチコピー「${copy.heading}」`
        : `描く文字（一字一句正確に）: 見出し「${copy.heading}」`,
    );
  }
  if (copy.sub) lines.push(`小ラベル・欧文サブ: 「${copy.sub}」`);
  if (copy.lead) lines.push(`リード文の内容（グリーキングでよい。雰囲気だけ合わせる）: ${copy.lead}`);
  if (copy.body) lines.push(`本文の内容（グリーキングでよい）: ${copy.body}`);
  if (copy.items && copy.items.length > 0) {
    lines.push(
      `カード・箇条書き ${copy.items.length}件。各見出しは正確に描く: ${copy.items
        .map((i) => `「${i.title}」`)
        .join(" ")}`,
    );
  }
  if (copy.buttonLabel) {
    lines.push(
      `CTAボタン「${copy.buttonLabel}」${copy.buttonNote ? `＋補足一言「${copy.buttonNote}」` : ""}。${isFv ? "FVで最も目立つ色にする" : "メインカラーのボタンにする"}`,
    );
  }
  if (copy.imageDesc && copy.imageDesc.length > 0) {
    lines.push(`写真の被写体: ${copy.imageDesc.join(" / ")}`);
  }

  if (isFv) {
    lines.push("ロゴ・グローバルナビを含むファーストビュー全体を描く");
  } else if (section.kind === "footer") {
    lines.push("ページ最下部のセクション。上に続きがある前提で上端を断つ");
  } else {
    lines.push(
      "ページ途中を切り出した1セクションのみを描く。ヘッダー・フッター・締めのCTAを勝手に足さず、上下は続きがある前提で断つ",
    );
  }
  lines.push("GLOBAL STYLEに厳密に揃える。配色・余白・角丸・影・写真トーンを一致させない画像は失敗");
  return bullets(lines);
}

/* ===== 禁止事項 ===== */

function compNegativeBody(ds: DesignSystem): string {
  const lum = relativeLuminance(ds.colors.bg);
  const isDark = lum !== null && lum < 0.3;
  const lines: Array<string | false> = [
    "紫〜青のグラデーション背景・ネオン発光・意味のない3D抽象オブジェクトを描かない",
    "どの業種にも使い回せる汎用ストックフォト風の写真を使わない。写真トーンで指定した被写体にする",
    "白い角丸カードを等間隔に横並びするだけの没個性なテンプレ構成にしない",
    "①②③を矢印でつなぐ定型のステップフロー図解を使わない",
    "指定したHEX以外の色相を使わない",
    isDark
      ? "このデザインはダーク基調が正。指定より明るい背景へ勝手に置き換えない"
      : "指定していないのにダークテーマへ反転しない",
    "実在する企業のロゴ・ブランド・人物を描かない（内容はすべて架空でよい）",
    "ウォーターマーク・署名・フレーム外の飾りを入れない",
  ];
  for (const f of ds.forbidden) lines.push(`デザインシステム固有の禁止: ${f}`);
  return bullets(lines);
}

/* ===== 組み立て（アプリ内生成用: 1枚） ===== */

export interface CompPromptInput {
  ds: DesignSystem;
  plan: WfPlan;
  section: WfSection;
  viewport: CompViewport;
  /** 再生成時の方向修正メモ（任意） */
  extraNote?: string;
}

/** 1セクション1枚のカンプ画像プロンプト */
export function buildCompImagePrompt(input: CompPromptInput): string {
  const { ds, plan, section, viewport, extraNote } = input;
  const isFv = section.kind === "hero";
  const output = bullets([
    "Webサイトのデザインモック画像を1枚だけ生成する",
    "すべてWebサイトUIのフラットな2Dスクリーンショットとして描く。ブラウザ枠・デバイスの写真・机・斜めのパース・画面への映り込みは入れない",
    "複数案や複数セクションを1枚にグリッド状へまとめるのは絶対禁止",
    "文字・ロゴ・CTAは画像の縁から短辺の7〜8%以上内側に置き、余白率は30%を下回らせない（写真の断ち落としは適用外）",
  ]);
  return joinBlocks(
    block("出力形式", output),
    block("GLOBAL STYLE — 一字も変えずに適用する", designGlobalStyleBody(ds, plan.siteName)),
    block("TEXT RULES — 日本語の文字化け対策", textRulesBody()),
    block(isFv ? "描く内容｜ファーストビュー" : `描く内容｜${section.label}`, compSectionBody(section, isFv, viewport)),
    viewport === "sp" ? block("スマホ再構成ルール", spRulesBody()) : null,
    extraNote?.trim() ? block("方向修正（最優先で反映）", bullets([extraNote.trim()])) : null,
    block("禁止事項", compNegativeBody(ds)),
  );
}

/* ===== 組み立て（キー無しコピペ用: 選択セクション一括） ===== */

export interface CompCopyPromptInput {
  ds: DesignSystem;
  plan: WfPlan;
  sections: WfSection[];
  viewport: CompViewport;
  extraNote?: string;
}

/** 外部AI（ChatGPT/Gemini）に貼る一括プロンプト。上から順に全枚数を生成させる */
export function buildCompCopyPrompt(input: CompCopyPromptInput): string {
  const { ds, plan, sections, viewport, extraNote } = input;
  const total = sections.length;
  const output = bullets([
    `Webサイトのデザインモック画像を合計${total}枚、下の一覧の順に生成する`,
    "1回の画像生成につき1枚＝1セクションだけを描く。複数セクションや複数案を1枚にまとめるのは絶対禁止",
    total > 1 && `1枚目から${total}枚目まで、途中で確認を挟まず上から順に生成しきる`,
    "すべてWebサイトUIのフラットな2Dスクリーンショットとして描く。ブラウザ枠・デバイスの写真・斜めのパース・映り込みは入れない",
    "文字・ロゴ・CTAは画像の縁から短辺の7〜8%以上内側に置き、余白率は30%を下回らせない",
    total > 1 && "2枚目以降は1枚目とGLOBAL STYLEを厳密に一致させ、配色・余白・密度・角丸をドリフトさせない",
    viewport === "sp"
      ? "画角はスマホ。全画像を9:16・幅390px相当の1カラムで構成する"
      : "画角はPC。全画像を16:9で構成する（縦に長いセクションは4:3でもよい）",
  ]);
  const sectionBlocks = sections.map((s, i) => {
    const isFv = s.kind === "hero";
    return `【${i + 1}枚目｜${isFv ? "ファーストビュー" : s.label}】\n${compSectionBody(s, isFv, viewport)}`;
  });
  return joinBlocks(
    block("出力形式", output),
    block("GLOBAL STYLE — 全画像共通。一字も変えずに毎回適用する", designGlobalStyleBody(ds, plan.siteName)),
    block("TEXT RULES — 日本語の文字化け対策", textRulesBody()),
    ...sectionBlocks,
    viewport === "sp" ? block("スマホ再構成ルール", spRulesBody()) : null,
    extraNote?.trim() ? block("方向修正（最優先で反映）", bullets([extraNote.trim()])) : null,
    block("禁止事項 — 全画像共通", compNegativeBody(ds)),
  );
}
