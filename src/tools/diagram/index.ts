import type { ItemState, ToolDef } from "../../lib/types";
import { block, bullets, charCount, joinBlocks, splitLines } from "../../lib/prompt";
import {
  BG_OPTIONS,
  BG_SWATCHES,
  BORDER_OPTIONS,
  BORDER_RULES,
  BRAND_SWATCHES,
  CAPTION_OPTIONS,
  CAPTION_RULES,
  DENSITY_OPTIONS,
  DENSITY_RULES,
  DTYPE_LABELS,
  DTYPE_OPTIONS,
  HEADING_OPTIONS,
  HEADING_RULES,
  PALETTES,
  RATIO_OPTIONS,
  ROLE_LABELS,
  ROLE_OPTIONS,
  STYLE_SETS,
  SURFACES,
} from "./data";

/** [図解] / [図解：テーマ] マーカーの検出 */
const MARKER_RE = /\[図解([：:][^\]]*)?\]/g;

/** ## 以降の見出し行の検出 */
const HEADING_RE = /^#{2,}\s/gm;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown, fallback: number): number => (typeof v === "number" ? v : fallback);

/** 完結系スタイルが未選択のときだけ質感・パレットを見せる */
const usesPalette = (s: Record<string, unknown>): boolean => str(s.styleSet) === "";

export const def: ToolDef = {
  id: "diagram",
  name: "note図解",
  tagline: "記事本文を貼ると、本文の文脈ごと同梱した挿入図解のプロンプトを組む",
  sections: [
    {
      id: "body",
      num: "00",
      title: "記事本文",
      badge: "required",
      fields: [
        {
          id: "body",
          kind: "textarea",
          rows: 12,
          placeholder: "note記事の本文をそのまま貼り付ける",
          help: "[図解] と書いた場所が図解候補になる。[図解：テーマ] でテーマ指定可",
        },
      ],
    },
    {
      id: "tone",
      num: "01",
      title: "デザイントーン",
      badge: "required",
      desc: "質感×パレットで組むか、完結系スタイル1つで決めるかの二択",
      fields: [
        {
          id: "surface",
          kind: "segment",
          label: "質感",
          options: SURFACES.map(({ value, label }) => ({ value, label })),
          showIf: usesPalette,
        },
        {
          id: "palette",
          kind: "cards",
          label: "パレット",
          columns: 3,
          options: PALETTES,
          help: "基調1色+強調1色。カードのHEXがそのままプロンプトに厳密指定される",
          showIf: usesPalette,
        },
        {
          id: "styleSet",
          kind: "cards",
          label: "完結系スタイル",
          columns: 2,
          options: STYLE_SETS,
          help: "選ぶと質感とパレットは無効になり、このスタイル単体で世界観が決まる。もう一度押すと解除",
        },
      ],
    },
    {
      id: "spec",
      num: "02",
      title: "仕様",
      fields: [
        { id: "ratio", kind: "segment", label: "比率", options: RATIO_OPTIONS },
        {
          id: "density",
          kind: "segment",
          label: "情報密度",
          options: DENSITY_OPTIONS,
          help: "1枚に載せる要素の量。迷ったら標準",
        },
        { id: "heading", kind: "segment", label: "見出し", options: HEADING_OPTIONS },
        { id: "caption", kind: "segment", label: "キャプション", options: CAPTION_OPTIONS },
        { id: "bg", kind: "segment", label: "背景", options: BG_OPTIONS },
        {
          id: "bgColor",
          kind: "color",
          label: "背景色の指定",
          swatches: BG_SWATCHES,
          placeholder: "#FFFFFF",
          showIf: (s) => str(s.bg) === "custom",
        },
        { id: "border", kind: "segment", label: "枠線", options: BORDER_OPTIONS },
      ],
    },
    {
      id: "images",
      num: "03",
      title: "各図解",
      fields: [
        {
          id: "count",
          kind: "number",
          label: "枚数",
          min: 1,
          max: 10,
          help: "サムネイルを含める場合はその1枚も数に入れる",
        },
        {
          id: "items",
          kind: "repeater",
          countField: "count",
          itemLabel: (i) => `図解 ${String(i + 1).padStart(2, "0")}`,
          itemFields: [
            { id: "role", kind: "segment", label: "役割", options: ROLE_OPTIONS },
            {
              id: "theme",
              kind: "text",
              label: "扱うテーマ",
              placeholder: "空欄なら本文から自動で選ぶ",
            },
            { id: "dtype", kind: "pills", label: "図解タイプ", options: DTYPE_OPTIONS },
          ],
        },
      ],
    },
    {
      id: "detail",
      num: "04",
      title: "詳細",
      badge: "optional",
      fields: [
        {
          id: "brandColor",
          kind: "color",
          label: "ブランドカラー",
          swatches: BRAND_SWATCHES,
          placeholder: "#007AFF",
          help: "指定すると強調色がこの色に置き換わる",
        },
        {
          id: "toneCarry",
          kind: "toggle",
          label: "トーンの引き継ぎ",
          help: "回答が分割されても、直近の画像と同じトーンで続ける一文を追加",
        },
        {
          id: "selfChara",
          kind: "toggle",
          label: "自分のキャラ画像を使う",
          help: "チャットに添付した画像の人物へ置き換える指示を追加",
        },
        {
          id: "extra",
          kind: "textarea",
          label: "追加の指示",
          rows: 3,
          placeholder: "例: 数字は大きく見せたい / 矢印は最小限に",
        },
      ],
    },
  ],
  defaults: {
    body: "",
    surface: "flat",
    palette: "navy-coral",
    styleSet: "",
    ratio: "16:9",
    density: "3",
    heading: "auto",
    caption: "auto",
    bg: "white",
    bgColor: "",
    border: "none",
    count: 3,
    items: [],
    brandColor: "",
    toneCarry: false,
    selfChara: false,
    extra: "",
  },
  build: (s) => {
    /* ----- 本文のパース ----- */
    const body = str(s.body);
    const chars = charCount(body);
    const markers = [...body.matchAll(MARKER_RE)].map((m) => (m[1] ? m[1].slice(1).trim() : ""));
    const hasThemedMarker = markers.some((t) => t !== "");
    const headingCount = (body.match(HEADING_RE) ?? []).length;

    /* ----- トーンの解決 ----- */
    const styleSet = STYLE_SETS.find((o) => o.value === str(s.styleSet));
    const palette = PALETTES.find((o) => o.value === str(s.palette));
    const surface = SURFACES.find((o) => o.value === str(s.surface)) ?? SURFACES[0];

    const visualStyle = styleSet
      ? styleSet.prompt
      : joinBlocks(
          palette
            ? palette.prompt
            : "配色はおまかせ。記事の内容に合う低〜中彩度の2色構成（基調1色+強調1色）を自分で決め、全枚で厳密に固定する。",
          surface.prompt
        ).replace(/\n\n/g, "\n");

    /* ----- 仕様の解決 ----- */
    const ratio = str(s.ratio) || "16:9";
    const densityRule = DENSITY_RULES[str(s.density)] ?? DENSITY_RULES["3"] ?? "";
    const headingRule = HEADING_RULES[str(s.heading)] ?? HEADING_RULES.auto ?? "";
    const captionRule = CAPTION_RULES[str(s.caption)] ?? CAPTION_RULES.auto ?? "";
    const borderRule = BORDER_RULES[str(s.border)] ?? BORDER_RULES.none ?? "";

    const bg = str(s.bg);
    const bgColor = str(s.bgColor).trim();
    const bgRule =
      bg === "auto"
        ? "トーンに合う明るい無地1色を選び、全枚で統一する。柄・グラデーション・写真の背景は禁止"
        : bg === "custom" && bgColor !== ""
          ? `${bgColor} の無地で全枚統一する。柄・グラデーション背景は禁止`
          : "白 #FFFFFF の無地で全枚統一する（note本文の白地と地続きに見せる）";

    /* ----- 各図解の解決 ----- */
    const count = Math.min(10, Math.max(1, num(s.count, 3)));
    const rawItems = Array.isArray(s.items) ? (s.items as ItemState[]) : [];
    const itemLines = Array.from({ length: count }, (_, i) => {
      const item = rawItems[i] ?? {};
      const role = str(item.role) || "auto";
      const theme = str(item.theme).trim();
      const dtype = str(item.dtype) || "auto";
      const roleLabel = ROLE_LABELS[role] ?? ROLE_LABELS.auto ?? "";
      const dtypeLabel = DTYPE_LABELS[dtype] ?? DTYPE_LABELS.auto ?? "";
      return `${i + 1}. 役割: ${roleLabel} ／ テーマ: ${theme !== "" ? theme : "本文から自動で選ぶ"} ／ 図解タイプ: ${dtypeLabel}`;
    });

    /* ----- 詳細指定 ----- */
    const brandColor = str(s.brandColor).trim();
    const detailLines = [
      brandColor !== "" &&
        `強調に使う色はブランドカラー ${brandColor} に置き換え、全枚で厳密に統一する`,
      s.toneCarry === true &&
        "回答が複数回に分割される場合、2回目以降も直近に生成した画像と同じ配色・質感・線のタッチを厳密に引き継いで続きを生成する",
      s.selfChara === true &&
        "人物・キャラクターを描く箇所は、添付画像の人物（キャラクター）に置き換える。髪型・服装・体型・タッチの特徴を添付画像に忠実に合わせ、全枚で同一人物として描く",
      ...splitLines(str(s.extra)),
    ];

    /* ----- プロンプト本文 ----- */
    const text = joinBlocks(
      "あなたはプロの編集デザイナーです。以下の指示に従って、note記事の本文に挿入する図解画像を制作してください。",
      block(
        "出力形式",
        bullets([
          `枚数: ${count}枚（独立した画像${count}枚。1枚ずつ別々に生成する）`,
          count > 1
            ? `画像生成の呼び出し回数: ${count}回（1回の画像生成 = 図解1枚。${count}枚分を1枚の画像に一覧・グリッド・コラージュとしてまとめることは絶対に禁止）`
            : "画像生成の呼び出し回数: 1回（この1枚単体で完結させる。複数案を並べた一覧・グリッド・コラージュにしない）",
          `比率: ${ratio}（全枚共通）`,
        ])
      ),
      block(
        "コンセプト",
        bullets([
          "図解は記事の主役ではない。本文の読み流れを支える編集的な図版として、押し出しを抑えたトーンで作る",
          body.trim() !== ""
            ? "各図解が扱うテーマは、個別の指定がない限り末尾の【参考：記事本文】から読み取る"
            : "記事本文の同梱はない。各図解のテーマは【図解の構成】の指定だけに従い、本文の内容を推測で補わない",
          markers.length > 0 &&
            `本文中の [図解] マーカー（${markers.length}箇所）の位置では、その前後の文脈をその画像の主題として最優先する`,
          hasThemedMarker &&
            "[図解：テーマ] の形でテーマ名が書かれたマーカーは、そのテーマ名をそのまま扱う",
        ])
      ),
      block("ビジュアルスタイル", visualStyle),
      block(
        "共通ルール",
        joinBlocks(
          "[デザインルール]\n" +
            bullets([
              count > 1
                ? `世界観統一: 全${count}枚は「同じ1人のデザイナーが同じ記事のために作った」ように見えること。配色・書体・線幅・図解の細かさ・装飾の密度まで全枚で揃える`
                : "世界観統一: この1枚の中で配色・書体・線幅・装飾の密度を一貫させ、記事の編集的トーンと地続きに見せる",
              "本文との馴染み: note本文の白地に置かれたときに浮かない、静かな編集的トーンを保つ。広告バナーのような押し出しは禁止",
              "1枚1メッセージ: 図解1枚につき伝える要点は1つに絞る",
              `情報密度: ${densityRule}`,
              "安全余白: 四辺に画像短辺の7〜8%の余白を確保し、すべての要素をその内側に収める。画面全体の余白率は30%以上",
              `見出し: ${headingRule}`,
              `キャプション: ${captionRule}`,
              `背景: ${bgRule}`,
              `枠線: ${borderRule}`,
            ]),
          "[禁止事項]\n" +
            bullets([
              count > 1
                ? `1画像複数図解の禁止（最重要）: 必ず1回の生成で1枚だけを描き、${count}枚を並べた一覧・グリッド・カルーセルプレビューを作らない`
                : "1画像複数図解の禁止（最重要）: 1枚の画像の中に複数の図解案・バリエーションを並べた一覧・グリッド・カルーセルプレビューを作らない",
              "AIテンプレの禁止1: 白い角丸カードを3〜4枚横に並べる構成は使わない。非対称でエディトリアル寄りのレイアウトを優先する",
              "AIテンプレの禁止2: ①②③の番号バッジをアイコンと矢印でつないだステップフロー図は使わない",
              "本文転載の禁止: 記事の文章をそのまま画像に書き写さない。要点だけを抽出し、図と最小限の言葉に変換する",
              "詰め込みの禁止: 長い文章の段落を画像内に置かない",
            ])
        )
      ),
      block(
        "役割別の作り方",
        [
          "■ サムネイル: 記事の顔になる1枚。タイムラインで単独で見られても関心を引く強さを持たせる。視覚的な主役感を強めてよいが、配色と書体の世界観は他の図解と共通に保つ",
          "■ 図解・挿絵: 本文の途中に入る静かな理解補助。読者の視線を奪いすぎない控えめな存在感で、要点が一目で掴めるようにする",
          "■ まとめ: 読了の余韻をつくる締めの1枚。要点の振り返りを落ち着いた構成でまとめる。ボタン風・UI風の装飾やCTA的な煽り表現は禁止",
        ].join("\n")
      ),
      block(`図解の構成（全${count}枚）`, itemLines.join("\n")),
      block("詳細指定", bullets(detailLines)),
      body.trim() !== "" ? block("参考：記事本文", body.trim()) : null
    );

    /* ----- meta / warnings ----- */
    const toneValue = styleSet
      ? styleSet.label
      : palette
        ? `${surface.label}・${palette.label}`
        : "未選択";

    const warnings: string[] = [];
    if (body.trim() === "") warnings.push("本文が空。文脈なしで生成される");
    if (!styleSet && !palette) warnings.push("デザイントーン未選択。配色はAIまかせになる");
    if (bg === "custom" && bgColor === "") warnings.push("背景の指定色が未入力。白として扱う");
    // サムネイルはタイムライン用で本文に [図解] マーカーを持たないため、マーカー数の比較から除く
    const thumbCount = Array.from({ length: count }, (_, i) => rawItems[i] ?? {}).filter(
      (item) => str(item.role) === "thumb"
    ).length;
    const inlineCount = count - thumbCount;
    if (markers.length > 0 && markers.length !== inlineCount)
      warnings.push(
        `[図解]マーカー${markers.length}箇所に対して本文挿入分の枚数が${inlineCount}枚。位置と枚数を合わせると精度が上がる`
      );

    return {
      text,
      meta: [
        { label: "枚数", value: `${count}枚` },
        { label: "比率", value: ratio },
        { label: "トーン", value: toneValue },
        { label: "本文", value: `${chars}字` },
        { label: "[図解]", value: `${markers.length}箇所` },
        { label: "見出し", value: `${headingCount}個` },
      ],
      warnings,
    };
  },
};
