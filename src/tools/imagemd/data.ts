import type { Option } from "../../lib/types";

/**
 * imagemd（汎用1枚画像のMDスペック）のプリセットデータ。
 * ラベル・説明・プロンプト断片はすべてオリジナルの書き下ろし。
 */

/* ============================================================
 * 01 基本
 * ============================================================ */

export const USAGE_OPTIONS: Option[] = [
  { value: "thumbnail", label: "サムネイル" },
  { value: "diagram", label: "1枚図解" },
  { value: "manga", label: "漫画" },
];

/** 用途の仕様書向け説明 */
export const USAGE_DESC: Record<string, string> = {
  thumbnail: "サムネイル（記事・動画・SNS投稿の顔になる1枚）",
  diagram: "1枚図解（1つのテーマを1枚で説明しきる図解）",
  manga: "漫画（コマ割りのある1枚漫画）",
};

export const RATIO_OPTIONS: Option[] = [
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "16:9", label: "16:9" },
  { value: "5:2", label: "5:2" },
  { value: "9:16", label: "9:16" },
  { value: "3:2", label: "3:2" },
  { value: "2:3", label: "2:3" },
  { value: "21:9", label: "21:9" },
];

export const RATIO_HELP =
  "目安: 1:1=SNS正方形 / 4:3・3:4=資料・書籍系 / 16:9=YouTube・OGP / 5:2=X記事ヘッダー / 9:16=ストーリーズ / 3:2・2:3=写真系 / 21:9=ワイドバナー";

/* ============================================================
 * 02 サムネ設定
 * ============================================================ */

export const SUBCOPY_STYLE_OPTIONS: Option[] = [
  { value: "plain", label: "そのまま" },
  { value: "speech", label: "吹き出し" },
  { value: "box", label: "ボックス" },
  { value: "roundbox", label: "角丸ボックス" },
];

/** サブコピー表示形式の描画指示 */
export const SUBCOPY_STYLE_PROMPTS: Record<string, string> = {
  plain: "装飾なしのテキストとしてキャッチコピーの近くに小さく添える",
  speech: "吹き出しの中に収める。吹き出しの線・塗りは画風のルールに揃える",
  box: "直角の色面ボックスに載せる。地色はアクセント色または黒、文字は白抜きで可読性を確保する",
  roundbox:
    "角丸の色面ボックスに載せる。角丸半径は控えめに統一し、文字は白抜きで可読性を確保する",
};

export const THUMB_LAYOUT_OPTIONS: Option[] = [
  { value: "dynamic-center", label: "ダイナミック中央" },
  { value: "dynamic-topleft", label: "ダイナミック左上" },
  { value: "diagonal", label: "斜め" },
  { value: "elegant-center", label: "上品・中央" },
  { value: "elegant-topleft", label: "上品・左上" },
];

/** サムネのレイアウト指示（構図の書き下ろし） */
export const THUMB_LAYOUT_PROMPTS: Record<string, string> = {
  "dynamic-center":
    "キャッチコピーを画面中央に大きく据えて視線を一点に集める。単語ごとにサイズの強弱を付け、最重要語は他の1.5〜2倍にする",
  "dynamic-topleft":
    "キャッチコピーを左上に寄せ、右下にモチーフや抜けの余白を置く非対称構図。左上から右下へ視線が流れるよう要素を配置する",
  diagonal:
    "キャッチコピー全体を5度前後だけ傾けて勢いを出す。傾けるのは文字ブロックだけにし、他の要素は水平を保って可読性を守る",
  "elegant-center":
    "細めのウェイトの文字を中央揃えで置き、字間を広めに取る。載せる要素を最小限に絞り、静かな品位を出す",
  "elegant-topleft":
    "細めの文字を左上に小さめに配置し、画面の大部分を余白として残す。雑誌の扉ページのような構図にする",
};

export const BADGE_POS_OPTIONS: Option[] = [
  { value: "top-left", label: "左上" },
  { value: "top-right", label: "右上" },
  { value: "bottom-left", label: "左下" },
  { value: "bottom-right", label: "右下" },
];

export const CTA_POS_OPTIONS: Option[] = [
  { value: "bottom-center", label: "下中央" },
  { value: "bottom-right", label: "右下" },
  { value: "bottom-left", label: "左下" },
];

/** 配置値 → 日本語 */
export const POS_LABELS: Record<string, string> = {
  "top-left": "左上",
  "top-right": "右上",
  "bottom-left": "左下",
  "bottom-right": "右下",
  "bottom-center": "下中央",
};

/* ============================================================
 * 02' 図解設定
 * ============================================================ */

export const DIAGRAM_TYPE_OPTIONS: Option[] = [
  { value: "flow", label: "フロー" },
  { value: "compare", label: "比較" },
  { value: "concept", label: "概念" },
  { value: "data", label: "データ" },
  { value: "checklist", label: "チェックリスト" },
  { value: "correlation", label: "相関図" },
];

/** 図解タイプごとの構成指示（AIテンプレ回避込み） */
export const DIAGRAM_TYPE_PROMPTS: Record<string, string> = {
  flow: "手順を順に追うフロー図。ただし①②③を矢印でつなぐ定型は使わず、要素の大小と配置で視線の流れを作る",
  compare: "2つ以上の選択肢を対比する比較図。対比軸を1つに絞り、左右または上下で位置を揃えて見せる",
  concept: "中心概念と周辺要素の関係を示す概念図。中心を最も大きく描き、周辺は階層に応じてサイズを落とす",
  data: "数値をグラフ・チャートで見せるデータ図解。数字はアクセント色で強調し、目盛りなどの補助要素は無彩色で控えめにする",
  checklist:
    "項目を列挙するチェックリスト。チェック記号は画風と揃ったデザインで統一し、行間をたっぷり取る",
  correlation:
    "要素同士のつながりを線で結ぶ相関図。実線・点線など線種の描き分けで関係の性質を表現する",
};

/* ============================================================
 * 03 画風
 * ============================================================ */

export const STYLE_OPTIONS: Option[] = [
  {
    value: "minimal-line",
    label: "ミニマル線画",
    desc: "均一な細線と最小限の面。抽象概念やテック系の説明向き",
    tags: ["テック", "抽象"],
    preview: { colors: ["#FFFFFF", "#1A1A1A"], texture: "flat" },
  },
  {
    value: "corporate-flat",
    label: "コーポレートフラット図解",
    desc: "輪郭線なしの面構成。ビジネス記事全般に効く万能型",
    tags: ["万能", "ビジネス"],
    preview: { colors: ["#F4F6F8", "#2563EB"], texture: "flat" },
  },
  {
    value: "isometric",
    label: "アイソメ",
    desc: "等角投影の俯瞰ミニチュア。システム構成や全体像向き",
    tags: ["俯瞰", "構成図"],
    preview: { colors: ["#1E3A5F", "#F59E0B"], texture: "isometric" },
  },
  {
    value: "pictogram",
    label: "ピクトグラム",
    desc: "記号化した単色シルエット。標識級の即読性が欲しいとき",
    tags: ["即読性", "記号"],
    preview: { colors: ["#1A1A1A", "#FFFFFF"], texture: "flat" },
  },
  {
    value: "3d-pastel",
    label: "3Dパステル",
    desc: "マット質感の淡色3D。プロダクトやアプリの訴求向き",
    tags: ["プロダクト", "立体"],
    preview: { colors: ["#C4B5FD", "#FECACA"], texture: "illustration" },
  },
  {
    value: "yuru-illust",
    label: "ゆるイラスト",
    desc: "太めの線と低頭身。親しみ重視のライフスタイル系向き",
    tags: ["親しみ", "日常"],
    preview: { colors: ["#FFE8B8", "#F2A65A"], texture: "illustration" },
  },
  {
    value: "hand-drawn",
    label: "手書き風",
    desc: "鉛筆・マーカーの筆致を残す。個人ブログや体験談の温度感に",
    tags: ["温度感", "個人"],
    preview: { colors: ["#FAF7F2", "#3A3A3A"], texture: "illustration" },
  },
  {
    value: "risograph",
    label: "リソグラフ",
    desc: "粒子感と版ずれの2色刷り。カルチャー系・zine的な尖りに",
    tags: ["カルチャー", "印刷風"],
    preview: { colors: ["#2E5EAA", "#FF48B0"], texture: "duo" },
  },
  {
    value: "papercraft",
    label: "ペーパークラフト",
    desc: "紙の重なりと落ち影で奥行き。工程や階層の表現向き",
    tags: ["階層", "工作"],
    preview: { colors: ["#F0E4D0", "#D9C6A3"], texture: "illustration" },
  },
  {
    value: "cel-anime",
    label: "セル塗りアニメ",
    desc: "主線＋2階調のベタ影。人物を主役に立てるサムネ向き",
    tags: ["人物", "アニメ"],
    preview: { colors: ["#FFFFFF", "#FF6B5B", "#1A1A1A"], texture: "flat" },
  },
  {
    value: "none",
    label: "指定なし",
    desc: "画風を指定せず、添付する参考画像の作風に寄せる",
    tags: ["添付画像"],
  },
];

/** 画風ごとの描画指示と質感の禁止事項 */
export const STYLE_PROMPTS: Record<string, { body: string; taboo: string }> = {
  "minimal-line": {
    body: "均一な細線（画面幅の0.2%前後のストローク）で描くラインアート。塗りは要所の面に限定し、白場を広く残す",
    taboo: "グラデーション・ドロップシャドウ・3D質感・線幅のばらつき",
  },
  "corporate-flat": {
    body: "輪郭線を使わない面構成のフラットイラスト。単色の面と明度差だけで形を作り、ビジネス文脈に耐える端正さを保つ",
    taboo: "グラデーション・ドロップシャドウ・3D質感・写真の合成",
  },
  isometric: {
    body: "等角投影（アイソメトリック）の俯瞰。すべての立体を同じ角度・同じスケール感で揃え、ミニチュアの箱庭のように配置する",
    taboo: "消失点のある透視図法との混在・立体ごとの角度の不揃い",
  },
  pictogram: {
    body: "非常口サインのように記号化されたシルエット表現。人や物は細部を捨て、輪郭の形だけで意味が伝わるまで単純化する",
    taboo: "細部の描き込み・表情の付与・多色化",
  },
  "3d-pastel": {
    body: "彩度を抑えたパステル色の3Dレンダー。マットな質感にソフトな環境光、角の丸いプリミティブな形状で構成する",
    taboo: "金属光沢・強い反射・ハイコントラストな照明",
  },
  "yuru-illust": {
    body: "太めの均一線と点目のシンプルな顔で描くゆるいイラスト。頭身は低く、ポーズや動きは大げさにして愛嬌を出す",
    taboo: "リアルな人体比率・精密な陰影・写実的な質感",
  },
  "hand-drawn": {
    body: "鉛筆やマーカーの筆致を残した手描きタッチ。線の強弱や塗りのはみ出しをあえて残し、紙の上の温度感を出す",
    taboo: "機械的に均一な線・デジタル感の強いなめらかなグラデーション",
  },
  risograph: {
    body: "リソグラフ印刷の風合い。インクの粒子感とわずかな版ずれ、限られた刷り色の重ね合わせで色を作る",
    taboo: "なめらかなフルカラーグラデーション・写真的な連続階調",
  },
  papercraft: {
    body: "色紙を切って重ねたペーパークラフト。紙の層ごとに柔らかい落ち影を付け、物理的な奥行きを作る",
    taboo: "金属光沢・写真の合成・紙以外の素材感",
  },
  "cel-anime": {
    body: "セルアニメ塗り。はっきりした主線に、影は2階調のベタ塗り。ハイライトは最小限に抑える",
    taboo: "エアブラシ的なぼかし影・過剰な光沢・写実的な陰影",
  },
  none: {
    body: "画風は指定しない。添付した参考画像の作風・線・塗り・色使いに忠実に寄せる",
    taboo: "",
  },
};

export const BACKGROUND_OPTIONS: Option[] = [
  { value: "white", label: "白ベタ（推奨）" },
  { value: "accent-light", label: "アクセント薄" },
  { value: "accent-deep", label: "アクセント濃" },
  { value: "gradient-light", label: "グラデ薄" },
  { value: "gradient-deep", label: "グラデ濃" },
  { value: "grid-paper", label: "方眼紙" },
  { value: "dots", label: "ドット" },
];

/**
 * 背景の描画指示。アクセント依存の背景は基準色の呼び名を差し込む
 * （モノクロ時は「無彩色のライトグレー」が渡ってくる）。
 */
export function backgroundPrompt(bg: string, accentName: string): string {
  const map: Record<string, string> = {
    white:
      "純白（#FFFFFF）のフラットな単色。文字の視認性が最も高く、どの画風でも破綻しない",
    "accent-light": `${accentName}を白でおよそ90%薄めた淡い単色。ムラのないフラット塗りにする`,
    "accent-deep": `${accentName}をそのまま面に敷く濃色ベース。上に載る文字は白抜きで明度差を確保する`,
    "gradient-light": `${accentName}を基準にした同系色マルチストップの淡いグラデーション。極薄いノイズ（グレイン）を重ねてバンディング（縞割れ）を防ぐ。文字の視認性を最優先し、文字が載る領域は明度差を確保する`,
    "gradient-deep": `${accentName}の同系色で暗から明へ流れる深いグラデーション。極薄いノイズでバンディングを防ぎ、文字は白抜きで確保する。グラデーションは背景のみに使い、前景の要素には使わない`,
    "grid-paper":
      "白地に極細のライトグレー方眼。線は主役より前に出ない濃度（うっすら見える程度）に抑える",
    dots: "白地に小径ドットを均一に敷いたパターン。ドットは無彩色のライトグレーで控えめにする",
  };
  return map[bg] ?? "";
}

/* ============================================================
 * 04 配色
 * ============================================================ */

export const COLOR_RULE_OPTIONS: Option[] = [
  { value: "mono-plus-one", label: "白黒+1色" },
  { value: "mono", label: "モノクロのみ" },
  { value: "two-accent", label: "2色使い" },
];

export const COLOR_RULE_PROMPTS: Record<string, string> = {
  "mono-plus-one":
    "基調は白・黒・グレーの無彩色のみ。彩度を持つ色は下記のアクセント1色に限定する",
  mono: "白・黒・グレーの無彩色だけで構成する。彩度を持つ色は一切使わない",
  "two-accent":
    "無彩色の基調にアクセント2色。下記の指定色を主とし、従属色は主に調和する1色（同系の濃淡または低彩度の対照色）を選ぶ。面積比はおよそ主7:従3",
};

export const ACCENT_SWATCHES: { value: string; label: string }[] = [
  { value: "#EAB308", label: "黄" },
  { value: "#F97316", label: "オレンジ" },
  { value: "#DC2626", label: "赤" },
  { value: "#EC4899", label: "ピンク" },
  { value: "#8B5CF6", label: "紫" },
  { value: "#4F46E5", label: "インディゴ" },
  { value: "#2563EB", label: "青" },
  { value: "#0EA5E9", label: "スカイ" },
  { value: "#0D9488", label: "ティール" },
  { value: "#16A34A", label: "緑" },
  { value: "#C05F3C", label: "テラコッタ" },
  { value: "#C8A882", label: "ミルクティー" },
  { value: "#1E3A8A", label: "ネイビー" },
  { value: "#881337", label: "ワイン" },
  { value: "#708238", label: "オリーブ" },
  { value: "#374151", label: "チャコール" },
];

export const ACCENT_ROLE_OPTIONS: Option[] = [
  { value: "marker", label: "下線・マーカー" },
  { value: "keyword", label: "見出し重要語" },
  { value: "badge", label: "バッジ・帯" },
  { value: "icon", label: "アイコン" },
  { value: "frame", label: "枠・矢印" },
  { value: "fill", label: "面" },
  { value: "number", label: "数字・グラフ" },
];

export const ACCENT_ROLE_PROMPTS: Record<string, string> = {
  marker: "重要語の下線・マーカー塗りにのみ使う",
  keyword: "見出しの中の重要語の文字色にのみ使う",
  badge: "バッジや帯の面にのみ使う",
  icon: "アイコン類の色にのみ使う",
  frame: "枠線・矢印・接続線にのみ使う",
  fill: "背景の一部や図形の面にのみ使う",
  number: "数字とグラフの強調にのみ使う",
};

/* ============================================================
 * 05 文字・人物
 * ============================================================ */

export const LANG_OPTIONS: Option[] = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "英語" },
];

export const LANG_PROMPTS: Record<string, string> = {
  ja: "画像内の文字はすべて日本語。読みやすい位置での改行と自然な約物処理を守る",
  en: "画像内の文字はすべて英語。単語の途中で改行しない",
};

export const FONT_MOOD_OPTIONS: Option[] = [
  { value: "sans", label: "サンセリフ" },
  { value: "formal", label: "かため資料調" },
  { value: "soft", label: "やわらかめ" },
];

export const FONT_MOOD_PROMPTS: Record<string, string> = {
  sans: "現代的なサンセリフ（ゴシック体）。ウェイトの強弱だけで情報の階層を作る",
  formal: "端正でかための資料調。ビジネス文書に載っていて違和感のない書体感にする",
  soft: "丸みのあるやわらかい書体感。角の立たない優しい印象で統一する",
};

export const GENDER_OPTIONS: Option[] = [
  { value: "female", label: "女性" },
  { value: "male", label: "男性" },
  { value: "any", label: "指定なし" },
];

export const GENDER_LABELS: Record<string, string> = {
  female: "女性",
  male: "男性",
  any: "指定なし（自然な方を選ぶ）",
};

export const OUTFIT_OPTIONS: Option[] = [
  { value: "formal", label: "フォーマル" },
  { value: "casual", label: "カジュアル" },
  { value: "custom", label: "自由入力" },
];
