/**
 * トーン成果物の書き出し。
 * - renderToneMd: design-tonesスキルの出力書式に合わせた tone.md（:root一式を完全埋め込み。
 *   codingスキルがこのファイルだけで実装に入れる形にする）
 * - renderTonePreviewHtml: 顧客に見せられる self-contained なトーンスペシメンHTML
 */

import { contrastRatio } from "../../lib/color";
import type { DesignConcept, DesignSystem, DesignSystemColors } from "./schema";

/* ========== 共通ヘルパ ========== */

/** 派生色名を --c-* 変数名に正規化する（"primary-soft" / "c-primary-soft" / "--c-primary-soft" を許容） */
function derivedVarName(name: string): string {
  const bare = name.replace(/^--/, "").replace(/^c-/, "");
  return `--c-${bare}`;
}

/** HTMLエスケープ */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** CSSへ埋め込む文字列からタグ開始文字を除去（style/コメント破壊の防止） */
function cssSafe(s: string): string {
  return s.replace(/[<>]/g, "").replace(/\*\//g, "");
}

/**
 * DESIGN.md §1 のトークン契約に沿った :root 一式を組み立てる。
 * サイズ5段階・余白・形/影/線は DESIGN.md の標準値、色とフォントは案件固有値。
 */
function buildRootCss(ds: DesignSystem): string {
  const c = ds.colors;
  const derivedLines = (ds.derived ?? [])
    .map((d) => `  ${derivedVarName(d.name)}: ${cssSafe(d.value)};`)
    .join("\n");
  const headingLs = ds.fonts.headingLetterSpacing
    ? `\n  /* 見出し字間（トーンの態度） */\n  --heading-letter-spacing: ${cssSafe(ds.fonts.headingLetterSpacing)};`
    : "";

  return `:root {
  /* 地色 */
  --c-bg:         ${c.bg};  /* ページ基本の地色 */
  --c-bg-alt:     ${c.bgAlt};  /* 交互セクション・帯の地色 */
  --c-surface:    ${c.surface};  /* カード・パネルの地色 */

  /* テキスト */
  --c-ink:        ${c.ink};  /* 本文 */
  --c-ink-muted:  ${c.inkMuted};  /* 補足・キャプション */
  --c-heading:    ${c.heading};  /* 見出し */

  /* ブランド */
  --c-primary:    ${c.primary};  /* 主色。CTAの背景など「押してほしい色」 */
  --c-on-primary: ${c.onPrimary};  /* primaryの上に載せる文字色 */
  --c-accent:     ${c.accent};  /* 強調・マーカー・装飾線 */

  /* 構造 */
  --c-border:     ${c.border};  /* 罫線・区切り */
${derivedLines ? `\n  /* 派生色（最大3） */\n${derivedLines}\n` : ""}
  /* フォントファミリー */
  --font-heading: ${cssSafe(ds.fonts.heading)};
  --font-body:    ${cssSafe(ds.fonts.body)};
  --font-accent:  ${cssSafe(ds.fonts.accent)};${headingLs}

  /* サイズ5段階（DESIGN.md §1.2 標準値。モバイル→PCで流動） */
  --text-xl:   clamp(1.75rem, 1.3rem + 2.2vw, 3rem);      /* キャッチコピー・H1 */
  --text-lg:   clamp(1.375rem, 1.15rem + 1.1vw, 2rem);    /* セクション見出し・H2 */
  --text-md:   clamp(1.125rem, 1.05rem + 0.4vw, 1.375rem);/* 小見出し・H3 */
  --text-base: 1rem;                                       /* 本文（16px。これ未満にしない） */
  --text-sm:   0.875rem;                                   /* 補足・キャプション・注記 */

  /* 行間・行長 */
  --leading-tight: 1.35;   /* 見出し用 */
  --leading-body:  1.9;    /* 日本語本文は欧文より広く */
  --measure:       36em;   /* 本文1行の最大長 */

  /* 余白（8pxグリッド） */
  --space-1:  0.5rem;   /*   8px */
  --space-2:  1rem;     /*  16px */
  --space-3:  1.5rem;   /*  24px */
  --space-4:  2rem;     /*  32px */
  --space-6:  3rem;     /*  48px */
  --space-8:  4rem;     /*  64px */
  --space-12: 6rem;     /*  96px */
  --space-16: 8rem;     /* 128px */

  /* 形・影・線 */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-full: 999px;
  --shadow-soft:  0 2px 12px rgba(0, 0, 0, 0.06);
  --shadow-lift:  0 8px 24px rgba(0, 0, 0, 0.10);
  --border-width: 1px;
}`;
}

/** フォント読み込みタグ（preconnect 2本 + display=swap 付きURL） */
function buildFontLinkTags(ds: DesignSystem): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${ds.fonts.googleFontsUrl}" rel="stylesheet">`;
}

/** コントラスト検証の1行分 */
interface ContrastRow {
  label: string;
  fg: string;
  bg: string;
  /** 最低基準。null は参考測定 */
  min: number | null;
}

/** 主要組み合わせの検証行を組み立てる */
function contrastRows(c: DesignSystemColors): ContrastRow[] {
  return [
    { label: "ink × bg（本文）", fg: c.ink, bg: c.bg, min: 4.5 },
    { label: "on-primary × primary（CTA文字）", fg: c.onPrimary, bg: c.primary, min: 4.5 },
    { label: "ink-muted × bg（補足）", fg: c.inkMuted, bg: c.bg, min: 3 },
    { label: "heading × bg（見出し）", fg: c.heading, bg: c.bg, min: 3 },
    { label: "ink × surface（カード本文）", fg: c.ink, bg: c.surface, min: 4.5 },
    { label: "ink × bg-alt（帯の本文）", fg: c.ink, bg: c.bgAlt, min: 4.5 },
    { label: "accent × bg（装飾。参考）", fg: c.accent, bg: c.bg, min: null },
  ];
}

/** コントラスト検証のMarkdownテーブル */
function contrastTableMd(c: DesignSystemColors): string {
  const header = "| 組み合わせ | 実測比 | 基準 | 判定 |\n|---|---|---|---|";
  const rows = contrastRows(c).map((row) => {
    const ratio = contrastRatio(row.fg, row.bg);
    const measured = ratio === null ? "—" : `${ratio.toFixed(2)}:1`;
    const standard = row.min === null ? "—" : `${row.min}:1`;
    const verdict =
      row.min === null || ratio === null ? "参考" : ratio >= row.min ? "OK" : "NG";
    return `| ${row.label} | ${measured} | ${standard} | ${verdict} |`;
  });
  return [header, ...rows].join("\n");
}

/* ========== tone.md ========== */

/**
 * tone.md を組み立てる。design-tonesスキルの出力書式（選定トーン → 選定理由 → コンセプト →
 * デザイントークン → 装飾方針 → 写真のトーン → 禁止事項 → コントラスト検証）に合わせる。
 */
export function renderToneMd(project: string, concept: DesignConcept, ds: DesignSystem): string {
  const refTones =
    concept.referenceTones.length > 0
      ? `参照した既存トーン: ${concept.referenceTones.join(", ")}`
      : "参照した既存トーン: なし（完全カスタム）";

  const lines: string[] = [
    "# トーン選定",
    "",
    `案件: ${project}`,
    `選定トーン: ${ds.slug}（${ds.name}）`,
    `人格: ${ds.personality}`,
    "",
    "## 選定理由",
    "",
    concept.statement,
    "",
    `キーワード: ${concept.keywords.join(" / ")}`,
    refTones,
    "",
    "## コンセプト",
    "",
    `コンセプト名: ${concept.title}`,
    "",
    `質感の言語化:`,
    ...concept.textures.map((t) => `- ${t}`),
    "",
    `ムードボードの方向性: ${concept.moodDirection}`,
    "",
    "## デザイントークン",
    "",
    "```css",
    buildRootCss(ds),
    "```",
    "",
    "フォント読み込みタグ:",
    "",
    "```html",
    buildFontLinkTags(ds),
    "```",
    "",
    ...(ds.fonts.headingLetterSpacing
      ? [`見出し字間: ${ds.fonts.headingLetterSpacing}`, ""]
      : []),
    `セクション標準余白: var(--${ds.spacing.sectionDefault})（${ds.spacing.philosophy}）`,
    `角丸の態度: ${ds.radius.attitude}`,
    "",
    "## 装飾方針",
    "",
    "タイトル装飾（DESIGN.md §4 のT番号）:",
    ...ds.decorations.titleRecipes.map((r) => `- ${r}`),
    "",
    "ボタン（DESIGN.md §5 のB番号）:",
    ...ds.decorations.buttonRecipes.map((r) => `- ${r}`),
    "",
    "トーン固有の演出（最低2つ・必ず実装する）:",
    ...ds.decorations.extras.map((r) => `- ${r}`),
    "",
    "## 写真のトーン",
    "",
    `- 被写体: ${ds.photoTone.subject}`,
    `- 光: ${ds.photoTone.light}`,
    `- 色: ${ds.photoTone.color}`,
    `- 統一フィルタ: \`filter: ${ds.photoTone.filterCss};\``,
    "",
    "## やってはいけないこと",
    "",
    ...ds.forbidden.map((f) => `- ${f}`),
    "",
    "## コントラスト検証",
    "",
    contrastTableMd(ds.colors),
    "",
  ];
  return lines.join("\n");
}

/* ========== プレビューHTML ========== */

/** レシピ文字列からB/T番号を数値の集合として抜き出す（"B-10/11/38 立体レイヤー" → {10,11,38}） */
function recipeNumbers(recipes: string[]): Set<number> {
  const nums = new Set<number>();
  for (const r of recipes) {
    for (const m of r.matchAll(/\d+/g)) {
      nums.add(Number(m[0]));
    }
  }
  return nums;
}

/** プライマリCTAのボタンCSS（B指定の再現）。追加CSSと、skew用の内側spanが必要かを返す */
function primaryButtonStyle(buttonRecipes: string[]): { css: string; needsInnerSpan: boolean } {
  const nums = recipeNumbers(buttonRecipes);
  const has = (...ns: number[]) => ns.some((n) => nums.has(n));

  // 特殊形状を優先して判定する（B-19/22等のセカンダリ指定は無視）
  if (has(10, 11, 38)) {
    // 立体レイヤー
    return {
      css: `.btn-primary { background: var(--c-primary); color: var(--c-on-primary); border-radius: var(--radius-full); box-shadow: 0 4px 0 color-mix(in srgb, var(--c-primary) 60%, black); }
.btn-primary:active { transform: translateY(3px); box-shadow: 0 1px 0 color-mix(in srgb, var(--c-primary) 60%, black); }`,
      needsInnerSpan: false,
    };
  }
  if (has(7, 13)) {
    // コーナーカット
    return {
      css: `.btn-primary { background: var(--c-primary); color: var(--c-on-primary); clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%); }`,
      needsInnerSpan: false,
    };
  }
  if (has(15)) {
    // 平行四辺形（中身は逆スキューで水平に戻す）
    return {
      css: `.btn-primary { background: var(--c-primary); color: var(--c-on-primary); transform: skewX(-8deg); }
.btn-primary > span { display: inline-block; transform: skewX(8deg); }`,
      needsInnerSpan: true,
    };
  }
  if (has(5, 37)) {
    // 破線ボーダー
    return {
      css: `.btn-primary { background: var(--c-bg); color: var(--c-ink); border: 1.5px dashed var(--c-ink); border-radius: var(--radius-md); }`,
      needsInnerSpan: false,
    };
  }
  if (has(3)) {
    // 塗り四角（直角）
    return {
      css: `.btn-primary { background: var(--c-primary); color: var(--c-on-primary); border-radius: 0; }`,
      needsInnerSpan: false,
    };
  }
  if (has(9)) {
    // 塗りピル
    return {
      css: `.btn-primary { background: var(--c-primary); color: var(--c-on-primary); border-radius: var(--radius-full); }`,
      needsInnerSpan: false,
    };
  }
  // 指定なし: 塗り＋中庸の角丸
  return {
    css: `.btn-primary { background: var(--c-primary); color: var(--c-on-primary); border-radius: var(--radius-md); }`,
    needsInnerSpan: false,
  };
}

/** セカンダリ（アウトライン）の角丸をプライマリの形に合わせる */
function secondaryRadius(buttonRecipes: string[]): string {
  const nums = recipeNumbers(buttonRecipes);
  if (nums.has(3) || nums.has(7) || nums.has(13) || nums.has(15)) return "0";
  if (nums.has(9) || nums.has(10) || nums.has(11) || nums.has(38)) return "var(--radius-full)";
  return "var(--radius-md)";
}

/** 配色チップ10個分のHTML */
function paletteChipsHtml(c: DesignSystemColors): string {
  const chips: { varName: string; role: string; value: string }[] = [
    { varName: "--c-bg", role: "ページ地色", value: c.bg },
    { varName: "--c-bg-alt", role: "帯・交互セクション", value: c.bgAlt },
    { varName: "--c-surface", role: "カード・パネル", value: c.surface },
    { varName: "--c-ink", role: "本文", value: c.ink },
    { varName: "--c-ink-muted", role: "補足", value: c.inkMuted },
    { varName: "--c-heading", role: "見出し", value: c.heading },
    { varName: "--c-primary", role: "主色（CTA）", value: c.primary },
    { varName: "--c-on-primary", role: "CTA文字", value: c.onPrimary },
    { varName: "--c-accent", role: "強調・装飾", value: c.accent },
    { varName: "--c-border", role: "罫線", value: c.border },
  ];
  return chips
    .map(
      (chip) => `      <div class="chip">
        <div class="chip-swatch" style="background: ${esc(chip.value)};"></div>
        <div class="chip-meta">
          <span class="chip-name">${esc(chip.varName)}</span>
          <span class="chip-role">${esc(chip.role)}</span>
          <span class="chip-hex">${esc(chip.value.toUpperCase())}</span>
        </div>
      </div>`,
    )
    .join("\n");
}

/**
 * トーンスペシメンのプレビューHTML（self-contained 1ファイル）。
 * Google Fonts読み込み + :root適用で、見出し・本文・CTA（B指定再現）・配色チップ10個・
 * コンセプト文を顧客に見せられる品質で並べる。
 */
export function renderTonePreviewHtml(concept: DesignConcept, ds: DesignSystem): string {
  const btn = primaryButtonStyle(ds.decorations.buttonRecipes);
  const ctaLabel = "無料相談を予約する";
  const ctaInner = btn.needsInnerSpan ? `<span>${ctaLabel}</span>` : ctaLabel;
  const headingLs = ds.fonts.headingLetterSpacing
    ? `letter-spacing: ${cssSafe(ds.fonts.headingLetterSpacing)};`
    : "";
  const bodySample =
    "この段落は本文の見え方を確認するためのサンプルテキスト。書体・字間・行間・行長が、想定した読み心地になっているかを確かめる。日本語の本文は欧文より行間を広く取り、一行の長さを全角36字前後に抑えると読みやすい。";

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(ds.name)} — トーンプレビュー</title>
${buildFontLinkTags(ds)}
<style>
${buildRootCss(ds)}

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: var(--c-bg);
  color: var(--c-ink);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-body);
}
.wrap { max-width: 860px; margin-inline: auto; padding: var(--space-8) var(--space-3); }
section + section { margin-top: var(--space-8); }

.eyebrow {
  font-family: var(--font-accent);
  font-size: var(--text-sm);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--c-ink-muted);
  margin-bottom: var(--space-2);
}
.section-label {
  font-size: var(--text-sm);
  color: var(--c-ink-muted);
  letter-spacing: 0.08em;
  border-bottom: var(--border-width) solid var(--c-border);
  padding-bottom: var(--space-1);
  margin-bottom: var(--space-3);
}

h1, h2, h3 { font-family: var(--font-heading); color: var(--c-heading); line-height: var(--leading-tight); ${headingLs} }
.spec-xl { font-size: var(--text-xl); }
.spec-lg { font-size: var(--text-lg); margin-top: var(--space-3); }
.spec-md { font-size: var(--text-md); margin-top: var(--space-2); }
.spec-body { max-width: var(--measure); margin-top: var(--space-2); }
.spec-sm { font-size: var(--text-sm); color: var(--c-ink-muted); margin-top: var(--space-2); }

.statement {
  max-width: var(--measure);
  margin-top: var(--space-2);
}
.personality { font-size: var(--text-sm); color: var(--c-ink-muted); margin-top: var(--space-2); }

.band {
  background: var(--c-bg-alt);
  border-block: var(--border-width) solid var(--c-border);
  padding: var(--space-6) var(--space-3);
  margin-inline: calc(var(--space-3) * -1);
}
.btn-row { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; margin-top: var(--space-3); }
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  min-height: 48px;
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}
.btn:focus-visible { outline: 3px solid var(--c-accent); outline-offset: 2px; }
${btn.css}
.btn-secondary {
  background: transparent;
  color: var(--c-primary);
  border: var(--border-width) solid currentColor;
  border-radius: ${secondaryRadius(ds.decorations.buttonRecipes)};
}

.chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--space-2); }
.chip { background: var(--c-surface); border: var(--border-width) solid var(--c-border); border-radius: var(--radius-md); overflow: hidden; }
.chip-swatch { height: 56px; border-bottom: var(--border-width) solid var(--c-border); }
.chip-meta { display: flex; flex-direction: column; padding: var(--space-1) var(--space-2) var(--space-2); }
.chip-name { font-size: var(--text-sm); font-weight: 600; }
.chip-role { font-size: var(--text-sm); color: var(--c-ink-muted); }
.chip-hex { font-size: var(--text-sm); color: var(--c-ink-muted); font-family: monospace; }

.accent-line { color: var(--c-accent); font-family: var(--font-accent); font-size: var(--text-lg); }
footer { margin-top: var(--space-8); padding-top: var(--space-3); border-top: var(--border-width) solid var(--c-border); font-size: var(--text-sm); color: var(--c-ink-muted); }
</style>
</head>
<body>
<div class="wrap">

  <header>
    <p class="eyebrow">Design Tone Preview</p>
    <h1 class="spec-xl">${esc(concept.title)}</h1>
    <p class="statement">${esc(concept.statement)}</p>
    <p class="personality">${esc(ds.personality)} ／ ${esc(ds.name)}（${esc(ds.slug)}）</p>
  </header>

  <section>
    <p class="section-label">タイポグラフィ標本</p>
    <h1 class="spec-xl">見出しXL・${esc(concept.keywords[0] ?? "キャッチコピー")}</h1>
    <h2 class="spec-lg">見出しLG・セクションの見出しはこの大きさ</h2>
    <h3 class="spec-md">見出しMD・小見出しはこの大きさ</h3>
    <p class="spec-body">${esc(bodySample)}</p>
    <p class="spec-sm">補足・キャプション・注記はこの大きさ（--text-sm）。本文は16px未満にしない。</p>
    <p class="accent-line">Atelier — accent typeface specimen</p>
  </section>

  <section class="band">
    <p class="section-label">ボタン（CTA階層）</p>
    <p class="spec-body">プライマリ＝塗り、セカンダリ＝アウトライン。1画面のプライマリは1種類。</p>
    <div class="btn-row">
      <button type="button" class="btn btn-primary">${ctaInner}</button>
      <button type="button" class="btn btn-secondary">料金プランを見る</button>
    </div>
  </section>

  <section>
    <p class="section-label">配色トークン（10変数）</p>
    <div class="chips">
${paletteChipsHtml(ds.colors)}
    </div>
  </section>

  <section>
    <p class="section-label">質感キーワード</p>
    <p class="spec-body">${concept.textures.map((t) => esc(t)).join(" ／ ")}</p>
  </section>

  <footer>
    <p>写真の統一フィルタ: ${esc(ds.photoTone.filterCss)} ／ セクション標準余白: var(--${esc(
      ds.spacing.sectionDefault,
    )}) ／ 角丸: ${esc(ds.radius.attitude)}</p>
  </footer>

</div>
</body>
</html>
`;
}
