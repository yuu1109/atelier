import type { PurposeType } from "../lib/types";
import type { WfPlan, WfSection } from "./schema";
import { toAstroComponentName, toSectionId } from "./idMap";
import { escapeHtml, isBandSection, renderSectionInner } from "./partials/index";

/**
 * WfPlan → 1ファイル完結のグレースケールHTML（wireframe-spec.md §1 準拠）。
 * - 外部参照ゼロ（CSSは<style>に内包・画像はプレースホルダ）
 * - 各セクションを <section id={spec§8のID}> でラップ（AstroコンポーネントIDの元）
 * - モバイルファースト検証のためSP幅は1カラム化・下部固定バー対応
 */

/** HTMLコメント内に入れるテキストの無害化（コメント終端の混入防止） */
function escapeComment(text: string): string {
  return text.replace(/--/g, "—").replace(/>/g, "＞");
}

/** WF共通スタイル（spec§1.2のグレートークン + 最小レイアウトCSS） */
const WF_STYLE = `
    /* --- グレー階調トークン（wireframe-spec.md §1.2 の6変数） --- */
    :root {
      --wf-ink:   #111111; /* 見出し・強い文字 */
      --wf-text:  #444444; /* 本文 */
      --wf-muted: #888888; /* 補足・プレースホルダー説明文 */
      --wf-line:  #CCCCCC; /* 罫線・区切り */
      --wf-fill:  #E4E4E4; /* 画像ボックス・帯の地色 */
      --wf-bg:    #F5F5F5; /* ページ地色 */
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; color: var(--wf-text); background: #fff; line-height: 1.8; }
    h1, h2, h3 { color: var(--wf-ink); line-height: 1.4; }
    h1 { font-size: 32px; }
    h2 { font-size: 24px; }
    h3 { font-size: 17px; margin-bottom: 6px; }
    /* --- レイアウトの骨格 --- */
    .wf-container { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
    .wf-section { padding: 72px 0; }
    .wf-section--fv { background: var(--wf-bg); padding: 88px 0; }
    .wf-section--band { background: var(--wf-fill); padding: 56px 0; text-align: center; }
    .wf-center { text-align: center; }
    .wf-muted { color: var(--wf-muted); }
    .wf-after-img { margin-top: 28px; }
    /* --- ヘッダー --- */
    .wf-header { border-bottom: 1px solid var(--wf-line); background: #fff; position: sticky; top: 0; z-index: 10; }
    .wf-header .wf-container { display: flex; align-items: center; justify-content: space-between; min-height: 64px; gap: 16px; }
    .wf-logo { font-weight: 700; color: var(--wf-ink); font-size: 18px; }
    .wf-nav { display: flex; gap: 20px; font-size: 14px; flex-wrap: wrap; }
    .wf-nav a { text-decoration: none; color: var(--wf-text); }
    .wf-menu-btn { display: none; border: 1px solid var(--wf-line); padding: 6px 12px; font-size: 13px; color: var(--wf-ink); }
    /* --- グリッドユーティリティ --- */
    .wf-grid { display: grid; gap: 28px; align-items: start; }
    .wf-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .wf-cols-3 { grid-template-columns: repeat(3, 1fr); }
    .wf-cols-4 { grid-template-columns: repeat(4, 1fr); }
    /* --- 画像プレースホルダ（斜線ボックス + 被写体説明。aspect-ratioでCLS対策） --- */
    .wf-img {
      width: 100%;
      background-color: var(--wf-fill);
      background-image:
        linear-gradient(to top right, transparent calc(50% - 0.5px), var(--wf-line) calc(50% - 0.5px), var(--wf-line) calc(50% + 0.5px), transparent calc(50% + 0.5px)),
        linear-gradient(to bottom right, transparent calc(50% - 0.5px), var(--wf-line) calc(50% - 0.5px), var(--wf-line) calc(50% + 0.5px), transparent calc(50% + 0.5px));
      border: 1px dashed var(--wf-line);
      display: flex; align-items: center; justify-content: center;
      color: var(--wf-muted); font-size: 13px; text-align: center; padding: 12px;
    }
    .wf-img span { background: var(--wf-fill); padding: 2px 8px; }
    .wf-img-note { font-size: 12px; color: var(--wf-muted); margin-bottom: 20px; }
    .wf-fv-bg { background: var(--wf-fill); border: 1px dashed var(--wf-line); padding: 64px 32px; }
    /* --- カード・見出しブロック --- */
    .wf-card { border: 1px solid var(--wf-line); background: #fff; padding: 24px; font-size: 14px; }
    .wf-card .wf-img { margin-bottom: 14px; }
    .wf-rowcard { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 16px; }
    .wf-num { font-size: 12px; color: var(--wf-muted); letter-spacing: 0.12em; margin-bottom: 8px; }
    .wf-num--big { font-size: 24px; font-weight: 700; color: var(--wf-ink); margin-bottom: 0; }
    .wf-head { margin-bottom: 36px; }
    .wf-sub { font-size: 12px; letter-spacing: 0.14em; color: var(--wf-muted); text-transform: uppercase; margin-bottom: 8px; }
    .wf-lead { margin-top: 12px; max-width: 640px; }
    .wf-lead--center { margin-left: auto; margin-right: auto; }
    .wf-body { margin-top: 16px; max-width: 680px; }
    .wf-section--band .wf-head { margin-bottom: 8px; }
    /* --- CTA --- */
    .wf-cta { margin-top: 24px; }
    .wf-btn { display: inline-block; background: var(--wf-ink); color: #fff; padding: 14px 40px; font-size: 15px; }
    .wf-cta--lg .wf-btn { padding: 18px 56px; font-size: 17px; }
    .wf-btn-note { font-size: 13px; color: var(--wf-muted); margin-top: 8px; }
    /* --- 表・FAQ・定義リスト --- */
    .wf-table { width: 100%; border-collapse: collapse; background: #fff; }
    .wf-table th, .wf-table td { border: 1px solid var(--wf-line); padding: 14px 16px; text-align: left; font-size: 14px; }
    .wf-table thead th { background: var(--wf-fill); color: var(--wf-ink); white-space: nowrap; }
    .wf-faq { max-width: 760px; }
    .wf-qa { border-bottom: 1px solid var(--wf-line); padding: 18px 0; }
    .wf-qa dt { color: var(--wf-ink); font-weight: 700; margin-bottom: 6px; }
    .wf-def { font-size: 14px; }
    .wf-def > div { display: grid; grid-template-columns: 120px 1fr; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--wf-line); }
    .wf-def dt { color: var(--wf-ink); font-weight: 700; }
    /* --- 数字・お客様の声 --- */
    .wf-stat { text-align: center; padding: 24px 8px; border: 1px solid var(--wf-line); background: #fff; }
    .wf-stat-num { font-size: 34px; font-weight: 700; color: var(--wf-ink); line-height: 1.2; }
    .wf-stat-label { font-size: 13px; color: var(--wf-muted); margin-top: 6px; }
    .wf-quote { color: var(--wf-ink); }
    .wf-attr { font-size: 13px; color: var(--wf-muted); margin-top: 10px; }
    /* --- フォームモック --- */
    .wf-form { max-width: 560px; }
    .wf-field { margin-bottom: 16px; }
    .wf-field label { display: block; font-size: 13px; color: var(--wf-ink); margin-bottom: 6px; }
    .wf-input { height: 44px; border: 1px solid var(--wf-line); background: #fff; }
    .wf-input--area { height: 120px; }
    /* --- customHtml検証枠 --- */
    .wf-custom-frame { border: 1px dashed var(--wf-muted); padding: 20px; }
    .wf-custom-note { font-size: 11px; color: var(--wf-muted); margin-bottom: 12px; }
    /* --- フッター --- */
    .wf-footer { border-top: 1px solid var(--wf-line); background: var(--wf-bg); padding: 40px 0; }
    .wf-footer-name { font-weight: 700; color: var(--wf-ink); }
    .wf-copy { font-size: 12px; color: var(--wf-muted); margin-top: 8px; }
    /* --- 下部固定バー（SPのみ表示） --- */
    .wf-bottom-bar { display: none; position: fixed; left: 0; right: 0; bottom: 0; background: var(--wf-ink); z-index: 20; }
    .wf-bottom-bar a { flex: 1; color: #fff; text-align: center; padding: 14px 8px; font-size: 14px; text-decoration: none; border-left: 1px solid var(--wf-muted); }
    .wf-bottom-bar a:first-child { border-left: none; }
    /* --- SP（モバイルファースト検証用） --- */
    @media (max-width: 640px) {
      h1 { font-size: 24px; }
      h2 { font-size: 20px; }
      .wf-section { padding: 48px 0; }
      .wf-section--fv { padding: 56px 0; }
      .wf-grid, .wf-cols-2, .wf-cols-3, .wf-cols-4 { grid-template-columns: 1fr !important; }
      .wf-header--sp-menu .wf-nav { display: none; }
      .wf-header--sp-menu .wf-menu-btn { display: inline-block; }
      .wf-bottom-bar { display: flex; }
      body.has-bottom-bar { padding-bottom: 52px; }
    }
`;

/** 下部固定バーのダミーボタン（目的別。実サイトでは電話は tel: リンクになる想定） */
function renderBottomBar(
  purposeType: PurposeType,
  entries: { section: WfSection; id: string }[],
): string {
  if (entries.length === 0) return "";
  // 最終CTA（無ければ最後のセクション）へのアンカー
  const lastCta = [...entries].reverse().find((e) => isBandSection(e.section)) ?? entries[entries.length - 1];
  const ctaHref = `#${lastCta.id}`;
  const access = entries.find((e) => e.id === "access" || e.section.kind === "access");
  const mapHref = access ? `#${access.id}` : ctaHref;

  const buttons: Record<PurposeType, { label: string; href: string }[]> = {
    inquiry: [
      { label: "電話する", href: ctaHref },
      { label: "相談する", href: ctaHref },
    ],
    visit: [
      { label: "電話する", href: ctaHref },
      { label: "地図を見る", href: mapHref },
    ],
    reserve: [
      { label: "電話する", href: ctaHref },
      { label: "予約する", href: ctaHref },
    ],
    recruit: [
      { label: "電話する", href: ctaHref },
      { label: "応募する", href: ctaHref },
    ],
  };
  const links = buttons[purposeType]
    .map((b) => `<a href="${b.href}">${escapeHtml(b.label)}</a>`)
    .join("");
  return `  <!-- 下部固定バー（SP幅のみ表示。実装時は電話= tel: リンク） -->
  <nav class="wf-bottom-bar">${links}</nav>`;
}

/** WfPlan を1ファイル完結のグレースケールHTMLへ描画する */
export function renderWireframe(plan: WfPlan): string {
  // セクションID採番（spec§8。key→id の対応をナビのアンカーにも使う）
  const used = new Set<string>();
  const entries = plan.sections.map((section, i) => ({
    section,
    id: toSectionId(section.kind === "custom" ? section.key : section.kind, i, used),
  }));
  const keyToId = new Map(entries.map((e) => [e.section.key, e.id] as const));

  const siteName = escapeHtml(plan.siteName);
  const useBottomBar = plan.mobileNav === "bottom-bar" || plan.mobileNav === "both";
  const useHamburger = plan.mobileNav === "hamburger" || plan.mobileNav === "both";

  // ヘッダー: サイト名 + アンカーナビ（hamburger系はSPで折りたたみモック表示）
  const navLinks = plan.nav
    .map((item) => `<a href="#${keyToId.get(item.sectionKey) ?? ""}">${escapeHtml(item.label)}</a>`)
    .join("");
  const menuBtn = useHamburger ? `<span class="wf-menu-btn">≡ メニュー</span>` : "";
  const headerCls = useHamburger ? "wf-header wf-header--sp-menu" : "wf-header";

  // 各セクション（<section id> ラップ + 実装引き継ぎ用の日本語コメント）
  const sectionsHtml = entries
    .map(({ section, id }, i) => {
      const band = isBandSection(section);
      const cls = ["wf-section", i === 0 ? "wf-section--fv" : "", band ? "wf-section--band" : ""]
        .filter((c) => c !== "")
        .join(" ");
      const noteComment = section.note ? `\n  <!-- 意図: ${escapeComment(section.note)} -->` : "";
      return `  <!-- ${escapeComment(section.label)}（kind: ${escapeComment(section.kind)} → 実装想定: ${toAstroComponentName(id)}） -->${noteComment}
  <section id="${id}" class="${cls}">
    <div class="wf-container">
      ${renderSectionInner(section)}
    </div>
  </section>`;
    })
    .join("\n\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteName}｜ワイヤーフレーム</title>
  <style>${WF_STYLE}  </style>
</head>
<body${useBottomBar ? ` class="has-bottom-bar"` : ""}>
  <!-- ヘッダー: サイト名 + グローバルナビ（アンカーリンク） -->
  <header class="${headerCls}">
    <div class="wf-container">
      <div class="wf-logo">${siteName}</div>
      <nav class="wf-nav">${navLinks}</nav>
      ${menuBtn}
    </div>
  </header>

  <main>
${sectionsHtml}
  </main>

  <!-- フッター: サイト名 + コピーライト -->
  <footer class="wf-footer">
    <div class="wf-container">
      <p class="wf-footer-name">${siteName}</p>
      <p class="wf-copy">&copy; ${siteName}</p>
    </div>
  </footer>

${useBottomBar ? renderBottomBar(plan.purposeType, entries) : ""}
</body>
</html>
`;
}
