import type { SectionCopy, WfSection } from "../schema";

/**
 * WFセクションのパーシャル群（グレースケールHTMLの断片を返す純関数）。
 * - 既知kind（hero/features/pricing/flow/team/testimonials/faq/access/cta/menu/gallery/stats/contact）は専用パーシャル
 * - 未知kind・layout.type="custom" は汎用レンダラ（columns/mediaPosition/emphasis/asymmetricを解釈）
 * - layout.customHtml はサニタイズして検証枠に挿入
 * copy由来のテキストは必ず escapeHtml を通す。
 */

/** HTMLエスケープ（copy由来の全テキストに必ず通す） */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * customHtml の簡易サニタイズ（WFプレビュー用途）。
 * script/style等の危険タグ・イベントハンドラ属性・javascript:・外部URL参照を除去する。
 */
export function sanitizeCustomHtml(html: string): string {
  let out = html;
  // 危険タグを中身ごと除去
  out = out.replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  // 対にならず残った危険タグも除去
  out = out.replace(/<\/?(script|style|iframe|object|embed|link|meta|base|form)\b[^>]*>/gi, "");
  // on〜= のイベントハンドラ属性を除去
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // javascript: URL を無効化
  out = out.replace(/\b(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
  // 外部URL（http/https/プロトコル相対）参照を無効化（WFは1ファイル完結）
  out = out.replace(/\b(href|src)\s*=\s*(["'])(?:https?:)?\/\/[^"']*\2/gi, '$1="#"');
  out = out.replace(/url\(\s*["']?(?:https?:)?\/\/[^)]*\)/gi, "none");
  return out;
}

/** 画像プレースホルダ（斜線ボックス + 被写体説明。aspect-ratioでCLS対策） */
export function imgPlaceholder(desc: string, aspect = "16/9"): string {
  return `<div class="wf-img" style="aspect-ratio:${aspect}"><span>${escapeHtml(desc)}</span></div>`;
}

/** CTAバンド（isCta or kind: "cta"）かどうか。renderWireframe側の帯スタイル分岐にも使う */
export function isBandSection(section: WfSection): boolean {
  return section.isCta === true || section.kind === "cta";
}

// ---------------------------------------------------------------------------
// 内部ヘルパー
// ---------------------------------------------------------------------------

/** ステップ・理由の連番表示（01, 02, …） */
function pad(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/** カード数に応じたグリッド列クラス */
function gridCols(count: number): string {
  if (count >= 4) return "wf-cols-4";
  if (count === 3) return "wf-cols-3";
  if (count === 2) return "wf-cols-2";
  return "";
}

/** セクション見出しブロック（sub + h2 + lead） */
function headerBlock(copy: SectionCopy): string {
  const parts: string[] = [];
  if (copy.sub) parts.push(`<p class="wf-sub">${escapeHtml(copy.sub)}</p>`);
  if (copy.heading) parts.push(`<h2>${escapeHtml(copy.heading)}</h2>`);
  if (copy.lead) parts.push(`<p class="wf-lead">${escapeHtml(copy.lead)}</p>`);
  return parts.length > 0 ? `<div class="wf-head">${parts.join("")}</div>` : "";
}

/** 本文段落 */
function bodyBlock(copy: SectionCopy): string {
  return copy.body ? `<p class="wf-body">${escapeHtml(copy.body)}</p>` : "";
}

/** CTAボタン + 補足1行（「行動＋得られること」の2段構成） */
function ctaBlock(copy: SectionCopy, size: "md" | "lg" = "md"): string {
  if (!copy.buttonLabel) return "";
  const note = copy.buttonNote ? `<p class="wf-btn-note">${escapeHtml(copy.buttonNote)}</p>` : "";
  return `<div class="wf-cta${size === "lg" ? " wf-cta--lg" : ""}"><span class="wf-btn">${escapeHtml(copy.buttonLabel)}</span>${note}</div>`;
}

/** カード列（title + text）。schemaの目安に合わせ最大6件 */
function cardList(items: NonNullable<SectionCopy["items"]>, numbered = false): string {
  return items
    .slice(0, 6)
    .map((item, i) => {
      const num = numbered ? `<div class="wf-num">${pad(i)}</div>` : "";
      const text = item.text ? `<p>${escapeHtml(item.text)}</p>` : "";
      return `<div class="wf-card">${num}<h3>${escapeHtml(item.title)}</h3>${text}</div>`;
    })
    .join("");
}

/** ボタンをパーシャル内で使わなかったセクション向けに、末尾へ中央寄せCTAを付ける */
function withTrailingCta(html: string, copy: SectionCopy): string {
  if (!copy.buttonLabel) return html;
  return `${html}<div class="wf-center">${ctaBlock(copy)}</div>`;
}

// ---------------------------------------------------------------------------
// kind別パーシャル
// ---------------------------------------------------------------------------

/** FV（hero）: 誰の・何の店で・どこで・次に何を。CTAを必ず内包する */
function renderHero(section: WfSection): string {
  const { copy, layout } = section;
  const text = [
    copy.sub ? `<p class="wf-sub">${escapeHtml(copy.sub)}</p>` : "",
    copy.heading ? `<h1>${escapeHtml(copy.heading)}</h1>` : "",
    copy.lead ? `<p class="wf-lead">${escapeHtml(copy.lead)}</p>` : "",
    bodyBlock(copy),
    ctaBlock(copy, "lg"),
  ].join("");
  const desc = copy.imageDesc?.[0] ?? "メインビジュアル（誰の・何の店かが伝わる写真）";

  // variant "background": 全面写真にテキストを重ねる型（WFでは地の帯に注記で表現）
  if (layout.variant === "background" || layout.mediaPosition === "background") {
    return `<div class="wf-fv-bg"><p class="wf-img-note">背景写真: ${escapeHtml(desc)}</p>${text}</div>`;
  }

  // 既定はテキスト+写真の左右分割（mediaPosition: "left" で写真を左に）
  const img = imgPlaceholder(desc, "4/3");
  const imgLeft = layout.mediaPosition === "left";
  const cols = imgLeft ? "5fr 7fr" : "7fr 5fr";
  const cells = imgLeft ? `${img}<div>${text}</div>` : `<div>${text}</div>${img}`;
  return `<div class="wf-grid" style="grid-template-columns:${cols};align-items:center">${cells}</div>`;
}

/** CTAバンド: buttonLabel大きめ + buttonNote 1行の帯 */
function renderCtaBand(section: WfSection): string {
  const { copy } = section;
  const parts = [
    copy.heading ? `<h2>${escapeHtml(copy.heading)}</h2>` : "",
    copy.lead ? `<p class="wf-lead wf-lead--center">${escapeHtml(copy.lead)}</p>` : "",
    ctaBlock(copy.buttonLabel ? copy : { ...copy, buttonLabel: "お問い合わせ" }, "lg"),
  ].join("");
  return parts;
}

/** 特徴・選ばれる理由: 番号付きカード（variant "list" で縦リスト型） */
function renderFeatures(section: WfSection): string {
  const { copy, layout } = section;
  const items = copy.items ?? [];
  let content = "";
  if (items.length > 0) {
    if (layout.variant === "list") {
      // 縦リスト型: 番号を左に置いた行で1つずつ読ませる
      content = items
        .slice(0, 6)
        .map(
          (item, i) =>
            `<div class="wf-card wf-rowcard"><div class="wf-num wf-num--big">${pad(i)}</div><div><h3>${escapeHtml(item.title)}</h3>${item.text ? `<p>${escapeHtml(item.text)}</p>` : ""}</div></div>`,
        )
        .join("");
    } else {
      content = `<div class="wf-grid ${gridCols(Math.min(items.length, 3))}">${cardList(items, true)}</div>`;
    }
  }
  return headerBlock(copy) + bodyBlock(copy) + content;
}

/** 料金: variant "table" で料金一覧表、既定はプランカード */
function renderPricing(section: WfSection): string {
  const { copy, layout } = section;
  const items = copy.items ?? [];
  let content = "";
  if (items.length > 0) {
    if (layout.variant === "table") {
      const rows = items
        .map(
          (item) =>
            `<tr><th scope="row">${escapeHtml(item.title)}</th><td>${escapeHtml(item.text ?? "")}</td></tr>`,
        )
        .join("");
      content = `<table class="wf-table"><thead><tr><th>メニュー・プラン</th><th>料金・内容</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else {
      content = `<div class="wf-grid ${gridCols(Math.min(items.length, 3))}">${cardList(items)}</div>`;
    }
  }
  return headerBlock(copy) + bodyBlock(copy) + content;
}

/** 流れ: STEP番号カード（矢印ではつながない） */
function renderFlow(section: WfSection): string {
  const { copy } = section;
  const items = copy.items ?? [];
  const steps = items
    .slice(0, 6)
    .map(
      (item, i) =>
        `<div class="wf-card"><div class="wf-num">STEP ${pad(i)}</div><h3>${escapeHtml(item.title)}</h3>${item.text ? `<p>${escapeHtml(item.text)}</p>` : ""}</div>`,
    )
    .join("");
  const content = items.length > 0 ? `<div class="wf-grid ${gridCols(Math.min(items.length, 4))}">${steps}</div>` : "";
  return headerBlock(copy) + bodyBlock(copy) + content;
}

/** スタッフ・チーム: 顔写真 + 氏名 + 一言のプロフィールカード */
function renderTeam(section: WfSection): string {
  const { copy } = section;
  const items = copy.items ?? [];
  const cards = items
    .slice(0, 6)
    .map((item, i) => {
      const desc = copy.imageDesc?.[i] ?? `${item.title}の顔写真（笑顔・自然光）`;
      return `<div class="wf-card">${imgPlaceholder(desc, "1/1")}<h3>${escapeHtml(item.title)}</h3>${item.text ? `<p>${escapeHtml(item.text)}</p>` : ""}</div>`;
    })
    .join("");
  const content = items.length > 0 ? `<div class="wf-grid ${gridCols(Math.min(items.length, 3))}">${cards}</div>` : "";
  return headerBlock(copy) + bodyBlock(copy) + content;
}

/** お客様の声: 感想（text）を鉤括弧で、属性（title）を添える */
function renderTestimonials(section: WfSection): string {
  const { copy } = section;
  const items = copy.items ?? [];
  const cards = items
    .slice(0, 6)
    .map((item) => {
      const quote = item.text ?? item.title;
      return `<div class="wf-card"><p class="wf-quote">「${escapeHtml(quote)}」</p><p class="wf-attr">— ${escapeHtml(item.title)}</p></div>`;
    })
    .join("");
  const content = items.length > 0 ? `<div class="wf-grid ${gridCols(Math.min(items.length, 3))}">${cards}</div>` : "";
  return headerBlock(copy) + bodyBlock(copy) + content;
}

/** よくある質問: Q/Aの縦並び */
function renderFaq(section: WfSection): string {
  const { copy } = section;
  const items = copy.items ?? [];
  const rows = items
    .map(
      (item) =>
        `<div class="wf-qa"><dt>Q. ${escapeHtml(item.title)}</dt><dd>A. ${escapeHtml(item.text ?? "")}</dd></div>`,
    )
    .join("");
  const content = items.length > 0 ? `<dl class="wf-faq">${rows}</dl>` : "";
  return headerBlock(copy) + bodyBlock(copy) + content;
}

/** アクセス: 地図プレースホルダ + 店舗情報の定義リスト */
function renderAccess(section: WfSection): string {
  const { copy } = section;
  const items = copy.items ?? [];
  const mapDesc = copy.imageDesc?.[0] ?? "周辺地図（最寄り駅からの道順が分かる範囲）";
  const info =
    items.length > 0
      ? `<dl class="wf-def">${items
          .map(
            (item) => `<div><dt>${escapeHtml(item.title)}</dt><dd>${escapeHtml(item.text ?? "")}</dd></div>`,
          )
          .join("")}</dl>`
      : bodyBlock(copy);
  return `${headerBlock(copy)}<div class="wf-grid" style="grid-template-columns:3fr 2fr">${imgPlaceholder(mapDesc, "4/3")}<div>${info}</div></div>`;
}

/** メニュー・サービス一覧: 写真カード（写真 + 名称 + 価格/説明） */
function renderMenu(section: WfSection): string {
  const { copy } = section;
  const items = copy.items ?? [];
  const cards = items
    .slice(0, 6)
    .map((item, i) => {
      const desc = copy.imageDesc?.[i] ?? `${item.title}の写真`;
      return `<div class="wf-card">${imgPlaceholder(desc, "4/3")}<h3>${escapeHtml(item.title)}</h3>${item.text ? `<p>${escapeHtml(item.text)}</p>` : ""}</div>`;
    })
    .join("");
  const content = items.length > 0 ? `<div class="wf-grid ${gridCols(Math.min(items.length, 3))}">${cards}</div>` : "";
  return headerBlock(copy) + bodyBlock(copy) + content;
}

/** ギャラリー: 写真グリッド（imageDescの各要素が1枚） */
function renderGallery(section: WfSection): string {
  const { copy } = section;
  const descs =
    copy.imageDesc && copy.imageDesc.length > 0
      ? copy.imageDesc
      : (copy.items ?? []).map((item) => item.title);
  const fallback = ["店内の雰囲気が伝わる写真", "施術・作業中の写真", "外観の写真"];
  const list = descs.length > 0 ? descs : fallback;
  const grid = list
    .slice(0, 9)
    .map((desc) => imgPlaceholder(desc, "1/1"))
    .join("");
  return `${headerBlock(copy)}<div class="wf-grid ${gridCols(Math.min(list.length, 3))}">${grid}</div>`;
}

/** 数字で見る: 大きな数値（title） + ラベル（text）のグリッド */
function renderStats(section: WfSection): string {
  const { copy } = section;
  const items = copy.items ?? [];
  const cells = items
    .slice(0, 8)
    .map(
      (item) =>
        `<div class="wf-stat"><div class="wf-stat-num">${escapeHtml(item.title)}</div><div class="wf-stat-label">${escapeHtml(item.text ?? "")}</div></div>`,
    )
    .join("");
  const content = items.length > 0 ? `<div class="wf-grid ${gridCols(Math.min(items.length, 4))}">${cells}</div>` : "";
  return headerBlock(copy) + bodyBlock(copy) + content;
}

/** 問い合わせフォームのモック: 項目（items.title）+ 送信ボタン */
function renderContact(section: WfSection): string {
  const { copy } = section;
  const labels =
    copy.items && copy.items.length > 0
      ? copy.items.map((item) => item.title)
      : ["お名前", "ご連絡先", "ご相談内容"];
  const fields = labels
    .map((label, i) => {
      const isLast = i === labels.length - 1;
      return `<div class="wf-field"><label>${escapeHtml(label)}</label><div class="wf-input${isLast ? " wf-input--area" : ""}"></div></div>`;
    })
    .join("");
  // ボタンはこのパーシャルで送信ボタンとして消費する
  const button = ctaBlock(copy.buttonLabel ? copy : { ...copy, buttonLabel: "送信する" });
  return `${headerBlock(copy)}${bodyBlock(copy)}<div class="wf-form">${fields}${button}</div>`;
}

// ---------------------------------------------------------------------------
// 汎用レンダラ（未知kind / layout.type = "custom"）
// ---------------------------------------------------------------------------

/** customHtml をサニタイズして検証枠に入れる */
function customHtmlFrame(html: string): string {
  return `<div class="wf-custom-frame"><p class="wf-custom-note">AI直書きセクション（サニタイズ済み・グレースケール検証枠）</p>${sanitizeCustomHtml(html)}</div>`;
}

/** columns 指定の描画: 比率グリッドに text/image/items/button を順に流し込む */
function renderColumns(section: WfSection): string {
  const { copy } = section;
  const columns = section.layout.columns ?? [];
  const colsCss = columns.map((col) => `${col.ratio}fr`).join(" ");
  let imgIndex = 0;
  let textUsed = false;
  const cells = columns
    .map((col) => {
      const parts = col.content
        .map((slot) => {
          switch (slot) {
            case "text": {
              // 最初のtextスロットは見出しごと、2つ目以降は本文のみ
              if (!textUsed) {
                textUsed = true;
                return headerBlock(copy) + bodyBlock(copy);
              }
              return bodyBlock(copy);
            }
            case "image": {
              const desc = copy.imageDesc?.[imgIndex] ?? "内容が伝わる写真";
              imgIndex += 1;
              return imgPlaceholder(desc, "4/3");
            }
            case "items":
              return copy.items && copy.items.length > 0
                ? `<div class="wf-grid" style="gap:16px">${cardList(copy.items)}</div>`
                : "";
            case "button":
              return ctaBlock(copy);
          }
        })
        .join("");
      return `<div>${parts}</div>`;
    })
    .join("");
  return `<div class="wf-grid" style="grid-template-columns:${colsCss}">${cells}</div>`;
}

/** 汎用レンダラ本体: columns > mediaPosition の優先で解釈する */
function renderGeneric(section: WfSection): string {
  const { copy, layout } = section;

  if (layout.columns && layout.columns.length > 0) {
    const consumesButton = layout.columns.some((col) => col.content.includes("button"));
    const html = renderColumns(section);
    return consumesButton ? html : withTrailingCta(html, copy);
  }

  const head = headerBlock(copy);
  const body = bodyBlock(copy);
  const itemsHtml =
    copy.items && copy.items.length > 0
      ? `<div class="wf-grid ${gridCols(Math.min(copy.items.length, 3))}" style="margin-top:24px">${cardList(copy.items)}</div>`
      : "";
  const base = head + body + itemsHtml;

  // 画像位置: 指定が無ければ imageDesc がある場合のみ右に置く
  const mp = layout.mediaPosition ?? (copy.imageDesc && copy.imageDesc.length > 0 ? "right" : "none");
  if (mp === "none") {
    const fallback = base !== "" ? base : `<p class="wf-body wf-muted">（内容未定のセクション）</p>`;
    return withTrailingCta(fallback, copy);
  }

  const desc = copy.imageDesc?.[0] ?? "セクションの内容が伝わる写真";
  if (mp === "background") {
    // 全面写真型: WFでは地の帯 + 注記で表現
    return withTrailingCta(`<div class="wf-fv-bg"><p class="wf-img-note">背景写真: ${escapeHtml(desc)}</p>${base}</div>`, copy);
  }
  if (mp === "top") {
    return withTrailingCta(`${imgPlaceholder(desc, "21/9")}<div class="wf-after-img">${base}</div>`, copy);
  }
  if (mp === "bottom") {
    return withTrailingCta(`${base}<div class="wf-after-img">${imgPlaceholder(desc, "21/9")}</div>`, copy);
  }

  // left / right の2カラム。asymmetric なら比率を崩し、emphasis で主役側を広げる
  const [textRatio, imgRatio] = layout.asymmetric
    ? layout.emphasis === "visual"
      ? ["2fr", "3fr"]
      : ["3fr", "2fr"]
    : ["1fr", "1fr"];
  const img = imgPlaceholder(desc, "4/3");
  const cols = mp === "left" ? `${imgRatio} ${textRatio}` : `${textRatio} ${imgRatio}`;
  const cells = mp === "left" ? `${img}<div>${base}</div>` : `<div>${base}</div>${img}`;
  return withTrailingCta(
    `<div class="wf-grid" style="grid-template-columns:${cols};align-items:center">${cells}</div>`,
    copy,
  );
}

// ---------------------------------------------------------------------------
// ディスパッチ
// ---------------------------------------------------------------------------

/**
 * セクションの中身（<section>の内側）を描画する。
 * 優先順: customHtml → hero → CTAバンド → kind別パーシャル → 汎用レンダラ
 */
export function renderSectionInner(section: WfSection): string {
  const { layout, copy } = section;

  // 逃げ道: AI直書きHTML（サニタイズして検証枠で描画）
  if (layout.customHtml) {
    return withTrailingCta(customHtmlFrame(layout.customHtml), copy);
  }

  // FVはCTA内包の専用レイアウト
  if (section.kind === "hero" || section.kind.startsWith("hero-")) {
    return renderHero(section);
  }

  // CTAバンド（途中CTA・最終CTA）
  if (isBandSection(section)) {
    return renderCtaBand(section);
  }

  // 独自レイアウト指定は汎用レンダラ（CTAは内部で処理）
  if (layout.type === "custom") {
    return renderGeneric(section);
  }

  switch (section.kind) {
    case "features":
      return withTrailingCta(renderFeatures(section), copy);
    case "pricing":
    case "pricing-table":
      return withTrailingCta(renderPricing(section), copy);
    case "flow":
      return withTrailingCta(renderFlow(section), copy);
    case "team":
      return withTrailingCta(renderTeam(section), copy);
    case "testimonials":
      return withTrailingCta(renderTestimonials(section), copy);
    case "faq":
      return withTrailingCta(renderFaq(section), copy);
    case "access":
      return withTrailingCta(renderAccess(section), copy);
    case "menu":
    case "service-list":
      return withTrailingCta(renderMenu(section), copy);
    case "gallery":
      return withTrailingCta(renderGallery(section), copy);
    case "stats":
      return withTrailingCta(renderStats(section), copy);
    case "contact":
      // 送信ボタンとしてbuttonLabelを消費するので trailing CTA は付けない
      return renderContact(section);
    default:
      return renderGeneric(section);
  }
}
