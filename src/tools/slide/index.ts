import type { BuiltPrompt, ItemState, ToolDef, ToolState } from "../../lib/types";
import { block, joinBlocks } from "../../lib/prompt";
import { BRAND_SWATCHES, LEGIBILITY, MEDIA, STYLES, TYPEFACES } from "./data";

/**
 * slide: ChatGPT Images 2.0 でスライドデッキ（1画像=1スライド）を
 * 生成するためのプロンプトを組み立てるツール。
 */

/** スライドの役割 */
type Role = "cover" | "intro" | "body" | "closing";

/** 枚数の上限（ChatGPT Images 2.0 の1回あたり生成上限） */
const MAX_SLIDES = 10;

// ── 状態の読み取りヘルパー ──────────────────────────

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function toNum(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function items(v: unknown): ItemState[] {
  return Array.isArray(v) ? (v as ItemState[]) : [];
}

/** 役割の自動割り当て: 1枚目=表紙、最終=まとめ、2枚目=イントロ（4枚以上のとき）、他=本編 */
function autoRole(index: number, total: number): Role {
  if (index === 0) return "cover";
  if (index === total - 1 && total >= 2) return "closing";
  if (index === 1 && total >= 4) return "intro";
  return "body";
}

// ── build ───────────────────────────────────────────

function build(s: ToolState): BuiltPrompt {
  const medium = MEDIA.find((m) => m.value === s.medium);
  const style = STYLES.find((st) => st.value === s.style);
  const count = clamp(toNum(s.count, 6), 1, MAX_SLIDES);

  const deckType = str(s.deckType) || "single";
  const isChapter = deckType !== "single";
  // 中間章は前後に章が必要なため、全体の章数は実質3章以上として扱う
  const chTotalRaw = clamp(toNum(s.chapterTotal, 3), 2, 10);
  const chTotal = deckType === "middle" ? Math.max(chTotalRaw, 3) : chTotalRaw;
  const chIndex =
    deckType === "first" ? 1
    : deckType === "last" ? chTotal
    : clamp(toNum(s.chapterIndex, 2), 2, Math.max(chTotal - 1, 2));

  // 章モードでの役割ラベル切替（表紙→章扉、まとめ→次章へのつなぎ）
  const coverLabel = deckType === "middle" || deckType === "last" ? "章扉" : "表紙";
  const closingLabel = deckType === "first" || deckType === "middle" ? "次章へのつなぎ" : "まとめ";
  const roleLabels: Record<Role, string> = {
    cover: coverLabel,
    intro: "イントロ",
    body: "本編",
    closing: closingLabel,
  };

  // ── 各スライドの役割・内容を確定 ──
  const slideItems = items(s.slides);
  const slides: { role: Role; content: string }[] = [];
  for (let i = 0; i < count; i++) {
    const item = slideItems[i];
    const roleRaw = item ? str(item.role) : "";
    const role: Role =
      roleRaw === "cover" || roleRaw === "intro" || roleRaw === "body" || roleRaw === "closing"
        ? roleRaw
        : autoRole(i, count);
    slides.push({ role, content: item ? str(item.content) : "" });
  }
  const usedRoles = new Set<Role>(slides.map((sl) => sl.role));

  // ── warnings ──
  const warnings: string[] = [];
  if (!medium) warnings.push("媒体が未選択。比率と見せ方の前提が決まらない");
  if (!style) warnings.push("ビジュアルスタイルが未選択。仕上がりが大きくブレる");
  if (deckType === "middle" && chTotalRaw < 3) {
    warnings.push("中間章には前後の章が必要なため、全体の章数を3章として扱った");
  }
  if (deckType === "middle" && toNum(s.chapterIndex, 2) !== chIndex) {
    warnings.push(`章番号が全体の章数と合わないため、第${chIndex}章に調整した`);
  }

  // ── 出力形式 ──
  const outputLines = [
    medium ? `- 用途: ${medium.label}。${medium.scene}` : null,
    medium ? `- 比率: ${medium.ratioLabel}` : null,
    `- 枚数: ${count}枚。それぞれ独立した1枚の画像として生成する`,
    `- 画像生成の回数: ${count}回。1回の生成で描くのは必ず1スライドだけ。${count === 1 ? "複数枚分" : `${count}枚分`}の内容を1枚に並べた一覧・グリッド・サムネイル集・コラージュ・カルーセルの見本は絶対に作らない`,
    "- 1枚目から順に生成し、どの画像も単独で完結した1枚のスライドとして成立させる",
  ].filter((l): l is string => l !== null);

  // ── 章の位置づけ ──
  let chapterBody = "";
  if (deckType === "first") {
    chapterBody = `- このデッキは全${chTotal}章構成の第1章。デッキ全体の入口として、1枚目はデッキの顔になる表紙にする\n- 最終スライドは締め切らず、次章への期待を残して終える`;
  } else if (deckType === "middle") {
    chapterBody = `- このデッキは全${chTotal}章構成の第${chIndex}章（中間章）。前章から話が続いている前提でトーンと世界観を保つ\n- 1枚目は章番号と章の主題を示す章扉、最終スライドは次章へのつなぎとして終える`;
  } else if (deckType === "last") {
    chapterBody = `- このデッキは全${chTotal}章構成の最終章（第${chTotal}章）。これまでの章とトーンと世界観を揃える\n- 1枚目は章扉、最終スライドはデッキ全体の締めくくりとして読後のアクションへ導く`;
  }

  // ── 進め方（構成プランニング先行） ──
  const planBody =
    str(s.flow) === "plan"
      ? `- いきなり画像を生成しない。まず全${count}枚の構成案（各スライドの役割・見出し案・内容の要点1行）をテキストで提示する\n- 私の承認を得てから、1枚目から順に1枚ずつ画像生成を始める`
      : "";

  // ── テーマ ──
  const themeLines = [
    str(s.deckTitle) && `- デッキタイトル: ${str(s.deckTitle)}`,
    str(s.audience) && `- 届けたい相手: ${str(s.audience)}`,
    str(s.claim) && `- 一番の主張: ${str(s.claim)}`,
    str(s.impression) && `- 感じてほしい印象: ${str(s.impression)}`,
  ].filter((l): l is string => typeof l === "string");

  // ── ビジュアルスタイル ──
  const brandColor = str(s.brandColor);
  const styleBody = [
    style?.prompt,
    // スタイル未選択時は「置き換える」対象が存在しないため文言を切り替える
    brandColor &&
      (style
        ? `ブランドカラー: ${brandColor} をこのデッキの基調アクセントとして最優先で使い、スタイル既定のアクセント色は ${brandColor} に置き換える。`
        : `ブランドカラー: ${brandColor} をこのデッキ唯一のアクセント色として最優先で使う。`),
  ]
    .filter((l): l is string => typeof l === "string" && l !== "")
    .join("\n");

  // ── 文字スタイル ──
  const typeface = TYPEFACES.find((t) => t.value === s.typeface) ?? TYPEFACES[0];
  const legibility = LEGIBILITY.find((l) => l.value === s.legibility) ?? LEGIBILITY[1];
  const typoBody = `- ${typeface.prompt}\n- ${legibility.prompt}`;

  // ── 共通ルール ──
  const deckTitle = str(s.deckTitle);
  const designRules = [
    // 複数枚前提のルールは1枚のときは意味を成さないためスキップ
    count > 1
      ? `- 世界観の統一: 全${count}枚を「同じ1人のデザイナーが通しで作った」ように見せる。配色・書体だけでなく、イラストの密度・図解の細かさ・装飾の量まで全枚で揃え、装飾密度のばらつきを出さない`
      : null,
    count > 1
      ? "- 構図の変化: 同じ構図を繰り返さない。主役に据える要素（大きな数字・短い言葉・図解・イラスト・箇条書きなど）をスライドごとに切り替える"
      : null,
    "- 情報量: 1スライドに載せるメッセージは1つだけ。箇条書きは最大3項目・各1行まで",
    "- 安全余白: 四辺に画像短辺の7〜8%の余白を確保し、すべての要素をその内側に収める。画面全体の余白率は30%以上を保つ",
    "- 欧文キャッチ: 見出しの近くに内容を象徴する短い欧文（1〜2語）を小さく添えてよい。ただし「COVER」「INTRO」のような種別名そのものは使わない",
    s.pageNumber === true
      ? `- ページ番号: 各スライドの下隅に「現在の番号/全${count}」を小さく入れる`
      : "- ページ番号: 入れない",
    s.footerTitle === true
      ? deckTitle
        ? `- フッター: 各スライドの下部にデッキタイトル「${deckTitle}」を小さく入れる`
        : `- フッター: ${coverLabel}に置いたタイトルと同じ文言を各スライドの下部に小さく入れる`
      : null,
  ].filter((l): l is string => l !== null);

  const prohibitions = [
    `- 複数スライドの一覧化（最重要）: 1回の画像生成で作るのは必ず1スライドだけ。${count === 1 ? "複数枚" : `${count}枚`}をまとめたグリッドやコラージュは絶対に作らない`,
    "- ありがちなAI構図の禁止: 白い角丸カードを3〜4枚横に並べるだけの構成は使わない。雑誌や編集デザイン寄りの非対称な組みを優先する",
    "- ステップフローの禁止: ①②③の番号バッジをアイコンと矢印でつなぐ定型フロー図は使わない",
    "- 文字の詰め込み禁止: 長文の段落をそのまま載せない。1枚で言い切れない情報は捨てる",
    "- 崩れた文字の禁止: 日本語・欧文とも判読できる正確な文字だけを描く",
  ];

  const rulesBody = `[デザインルール]\n${designRules.join("\n")}\n\n[禁止事項]\n${prohibitions.join("\n")}`;

  // ── 役割別レイアウト（使われている役割だけ出力） ──
  const coverAlign = str(s.coverAlign) === "right" ? "right" : "left";
  const msgSide = coverAlign === "right" ? "右" : "左";
  const visSide = coverAlign === "right" ? "左" : "右";

  const creditParts = [str(s.creditName), str(s.creditOrg), str(s.creditDate)].filter((p) => p !== "");
  const creditLine =
    creditParts.length > 0
      ? `作成者情報「${creditParts.join("／")}」は${coverLabel}の下辺の隅に小さな1行で置く。`
      : "";

  const contact = str(s.creditContact);
  const cta = str(s.cta);
  const finalParts = [contact && `連絡先「${contact}」`, cta && `CTA「${cta}」`].filter(
    (p): p is string => typeof p === "string" && p !== "",
  );
  const finalLine =
    finalParts.length > 0 ? `${finalParts.join("と")}は最終スライドの下部にまとめて配置する。` : "";

  // クレジット系の入力は表紙/まとめのレイアウト内にしか埋め込まれないため、役割が無ければ知らせる
  if (creditParts.length > 0 && !usedRoles.has("cover")) {
    warnings.push(`${coverLabel}の役割を持つスライドが無いため、作成者・所属・日付はプロンプトに反映されない`);
  }
  if (finalParts.length > 0 && !usedRoles.has("closing")) {
    warnings.push(`${closingLabel}の役割を持つスライドが無いため、連絡先・CTAはプロンプトに反映されない`);
  }

  const layoutBlocks: string[] = [];
  if (usedRoles.has("cover")) {
    const chapterNote =
      coverLabel === "章扉" ? `章番号（第${chIndex}章）と章タイトルを主役に据える。` : "タイトルはデッキ内で最大の文字サイズにする。";
    layoutBlocks.push(
      `■ ${coverLabel}: メッセージを${msgSide}側、ビジュアルを${visSide}側に置く左右並列の構成（分割比は自由に設計してよい）。${chapterNote}${creditLine}禁止: 上下二段の構成、アイコンを等間隔に並べただけの整理レイアウト`,
    );
  }
  if (usedRoles.has("intro")) {
    layoutBlocks.push(
      "■ イントロ: 上段にこの先への期待を高めるメッセージ、下段に目次・ロードマップ風の案内（線画アイコン3〜5個と短いラベル）を置く上下構成。上下の境目は罫線で区切らず余白で分け、背景は1枚の絵として連続させる。禁止: 左右分割、立体的な風景イラスト",
    );
  }
  if (usedRoles.has("body")) {
    layoutBlocks.push(
      "■ 本編: 上段に見出しとなるメッセージ、下段に図解を主役として大きく置く上下構成。図解は横幅を目一杯使い、スライドごとに表現の種類を変える（比較・推移・構造・関係・比喩など）。禁止: 左右分割、目次風のアイコン整理、同じ図解パターンの使い回し",
    );
  }
  if (usedRoles.has("closing")) {
    const actionDesc =
      closingLabel === "次章へのつなぎ"
        ? "次章の予告（次章のタイトルと扱う論点の紹介）"
        : "次のアクション（線画アイコン3〜4個と短いラベル）";
    const closingIsRows = str(s.closingLayout) === "rows";
    const structure = closingIsRows
      ? `上段に全体を振り返る短いメッセージ、下段に${actionDesc}を並べる上下二段の構成`
      : `左に全体を振り返る短いメッセージ、右に${actionDesc}を置く左右分割の構成`;
    const closingBan = closingIsRows ? "ビジュアルシーン中心の構成、左右分割" : "ビジュアルシーン中心の構成、上下二段";
    layoutBlocks.push(`■ ${closingLabel}: ${structure}。${finalLine}禁止: ${closingBan}`);
  }

  // ── スライド構成リスト ──
  const listLines = slides.map((sl, i) => {
    const content = sl.content !== "" ? sl.content : "内容はテーマと全体の流れから自動構成";
    return `${i + 1}. ${roleLabels[sl.role]}: ${content}`;
  });

  // ── 追加の指示 ──
  const extra = str(s.extra);

  const text = joinBlocks(
    "あなたは構成からビジュアルまで一貫して手がけるプレゼンテーションデザイナー。以下の仕様に従って、スライドデッキを1枚ずつ画像で制作する。",
    block("出力形式", outputLines.join("\n")),
    block("デッキの位置づけ", chapterBody),
    block("進め方", planBody),
    themeLines.length > 0 ? block("テーマ", themeLines.join("\n")) : null,
    block("ビジュアルスタイル", styleBody),
    block("文字スタイル", typoBody),
    block("共通ルール", rulesBody),
    block("役割別レイアウト", layoutBlocks.join("\n")),
    block(`スライド構成（全${count}枚）`, listLines.join("\n")),
    block("追加の指示", extra),
  );

  // ── meta ──
  const meta = [
    { label: "枚数", value: `${count}枚` },
    { label: "比率", value: medium ? medium.ratio : "未選択" },
    { label: "スタイル", value: style ? style.label : "未選択" },
    ...(isChapter ? [{ label: "デッキ", value: `全${chTotal}章の第${chIndex}章` }] : []),
  ];

  return { text, meta, warnings };
}

// ── ToolDef ─────────────────────────────────────────

export const def: ToolDef = {
  id: "slide",
  name: "スライド",
  tagline: "1画像=1スライドのデッキ生成プロンプトを組み立てる",
  sections: [
    {
      id: "usage",
      num: "01",
      title: "どこに使う",
      badge: "required",
      fields: [
        {
          id: "medium",
          kind: "pills",
          label: "媒体",
          help: "媒体で比率と見せ方の前提が決まる",
          options: MEDIA,
        },
      ],
    },
    {
      id: "theme",
      num: "02",
      title: "伝えたいこと",
      badge: "optional",
      desc: "空欄はAIがテーマから補って構成する",
      fields: [
        { id: "deckTitle", kind: "text", label: "デッキタイトル", placeholder: "例: 小さなチームのためのAI導入手順" },
        { id: "audience", kind: "text", label: "ターゲット", placeholder: "例: ITに詳しくない中小企業の経営者" },
        {
          id: "claim",
          kind: "textarea",
          label: "一番の主張",
          rows: 2,
          placeholder: "このデッキで言い切りたいことを1〜2文で",
        },
        { id: "impression", kind: "text", label: "感じてほしい印象", placeholder: "例: 自分にもできそう、と思える安心感" },
      ],
    },
    {
      id: "flow",
      title: "進め方",
      fields: [
        {
          id: "flow",
          kind: "segment",
          label: "生成の進め方",
          help: "プランニング先行は、構成案にOKを出してから1枚ずつ生成する",
          options: [
            { value: "now", label: "すぐ生成" },
            { value: "plan", label: "構成プランニング先行" },
          ],
        },
      ],
    },
    {
      id: "design",
      num: "03",
      title: "デザイン",
      badge: "required",
      fields: [
        {
          id: "count",
          kind: "number",
          label: "枚数",
          min: 1,
          max: MAX_SLIDES,
          help: "ChatGPT Imagesは1回の依頼で最大10枚。11枚以上は章に分けて複数回に分割する",
        },
        {
          id: "deckType",
          kind: "segment",
          label: "デッキタイプ",
          help: "章に分割したデッキは、ここで全体の中の位置づけを渡す",
          options: [
            { value: "single", label: "単独デッキ" },
            { value: "first", label: "最初の章" },
            { value: "middle", label: "中間章" },
            { value: "last", label: "最終章" },
          ],
        },
        {
          id: "chapterTotal",
          kind: "number",
          label: "全体の章数",
          min: 2,
          max: 10,
          showIf: (s) => s.deckType === "first" || s.deckType === "middle" || s.deckType === "last",
        },
        {
          id: "chapterIndex",
          kind: "number",
          label: "この章は第何章",
          min: 2,
          max: 9,
          help: "中間章のみ指定（最初の章=1、最終章=全体の章数として自動計算）",
          showIf: (s) => s.deckType === "middle",
        },
        {
          id: "style",
          kind: "cards",
          label: "ビジュアルスタイル",
          columns: 3,
          options: STYLES,
        },
        {
          id: "typeface",
          kind: "pills",
          label: "書体",
          options: TYPEFACES,
        },
        {
          id: "legibility",
          kind: "segment",
          label: "文字の視認性",
          options: LEGIBILITY,
        },
      ],
    },
    {
      id: "slides",
      num: "04",
      title: "各スライドの内容",
      badge: "optional",
      desc: "空欄のスライドはテーマと流れから自動構成される",
      fields: [
        {
          id: "slides",
          kind: "repeater",
          countField: "count",
          itemLabel: (i) => `Slide ${String(i + 1).padStart(2, "0")}`,
          itemFields: [
            {
              id: "role",
              kind: "segment",
              label: "役割",
              help: "未選択は「自動」と同じ（1枚目=表紙、最終=まとめ）",
              options: [
                { value: "auto", label: "自動" },
                { value: "cover", label: "表紙" },
                { value: "intro", label: "イントロ" },
                { value: "body", label: "本編" },
                { value: "closing", label: "まとめ・次行動" },
              ],
            },
            { id: "content", kind: "text", label: "内容", placeholder: "このスライドで伝えることを1行で" },
          ],
        },
      ],
    },
    {
      id: "detail",
      num: "05",
      title: "詳細設定",
      badge: "optional",
      fields: [
        {
          id: "brandColor",
          kind: "color",
          label: "ブランドカラー",
          help: "指定するとスタイル既定のアクセント色を置き換える",
          swatches: BRAND_SWATCHES,
        },
        { id: "pageNumber", kind: "toggle", label: "ページ番号" },
        { id: "footerTitle", kind: "toggle", label: "フッターにデッキタイトル" },
        {
          id: "coverAlign",
          kind: "segment",
          label: "表紙メッセージ位置",
          options: [
            { value: "left", label: "左" },
            { value: "right", label: "右" },
          ],
        },
        {
          id: "closingLayout",
          kind: "segment",
          label: "まとめレイアウト",
          options: [
            { value: "split", label: "左右分割" },
            { value: "rows", label: "上下二段" },
          ],
        },
        { id: "creditName", kind: "text", label: "作成者", placeholder: "表紙の隅に小さく入る" },
        { id: "creditOrg", kind: "text", label: "所属", placeholder: "会社名・チーム名など" },
        { id: "creditDate", kind: "text", label: "日付", placeholder: "例: 2026.07" },
        { id: "creditContact", kind: "text", label: "連絡先", placeholder: "最終スライドに入る（メール・SNSなど）" },
        { id: "cta", kind: "text", label: "CTA文言", placeholder: "例: まずは無料相談から" },
        {
          id: "extra",
          kind: "textarea",
          label: "追加の指示",
          rows: 3,
          placeholder: "スタイルや構成への補足があれば自由に",
        },
      ],
    },
  ],
  defaults: {
    medium: "",
    deckTitle: "",
    audience: "",
    claim: "",
    impression: "",
    flow: "now",
    count: 6,
    deckType: "single",
    chapterTotal: 3,
    chapterIndex: 2,
    style: "",
    typeface: "auto",
    legibility: "normal",
    slides: [],
    brandColor: "",
    pageNumber: false,
    footerTitle: false,
    coverAlign: "left",
    closingLayout: "split",
    creditName: "",
    creditOrg: "",
    creditDate: "",
    creditContact: "",
    cta: "",
    extra: "",
  },
  build,
};
