import type { Option } from "../../lib/types";

/**
 * diagram（note図解プロンプト）のプリセットデータ。
 * prompt はそのまま生成プロンプトの【ビジュアルスタイル】等に流し込まれる文なので、
 * デザイナーが読んで再現可能な具体性（HEX・禁止事項）まで書き切る。
 */

/** 選択肢 + プロンプト片 */
export interface PromptOption extends Option {
  prompt: string;
}

const img = (id: string) => `/style-previews/diagram-${id}.webp`;

/* ===== 質感（パレットと組み合わせて使う） ===== */

export const SURFACES: PromptOption[] = [
  {
    value: "flat",
    label: "フラット",
    prompt:
      "質感は完全なフラット。グラデーション・ドロップシャドウ・グロウ・エンボス・写真テクスチャ・3D表現をすべて排し、均一な塗り面と細い線画アイコンだけで構成する。",
  },
  {
    value: "isometric",
    label: "アイソメ",
    prompt:
      "質感はアイソメトリック。要素を30度見下ろしの等角投影による小さな立体として描き、立体感は面ごとの明度差2〜3段だけでつくる。光沢・映り込み・被写界深度・写実的なレンダリングは禁止。",
  },
  {
    value: "soft3d",
    label: "ソフト3D",
    prompt:
      "質感はソフト3D。角に丸みのあるマットな立体オブジェクトで構成し、光源は1つ、影は淡いソフトシャドウのみ。金属光沢・強い反射・ガラス表現・写実的な質感は禁止。",
  },
];

/* ===== パレット14種（基準色はHEXで厳密指定） ===== */

export const PALETTES: PromptOption[] = [
  // --- 2色系 ---
  {
    value: "navy-coral",
    label: "ネイビー×コーラル",
    desc: "信頼感の紺に体温のあるコーラルを一滴。仕事術・キャリア系noteの定番解",
    tags: ["#1B2A4A", "#FF6F61"],
    preview: { image: img("navy-coral") },
    prompt:
      "深いネイビー #1B2A4A を文字・線・主要図形の基調色として厳密に使い、コーラル #FF6F61 は強調したい1〜2箇所だけに効かせる。中間トーンはネイビーを薄めたブルーグレー（#8B99B3 目安）でつくり、この2系統以外の有彩色は足さない。",
  },
  {
    value: "navy-gold",
    label: "ネイビー×ゴールド",
    desc: "濃紺に落ち着いた金茶。金融・資産・格を出したい記事に",
    tags: ["#14213D", "#C9A227"],
    preview: { image: img("navy-gold") },
    prompt:
      "濃紺 #14213D を基調に、落ち着いたゴールド #C9A227 を要点の強調にだけ使う。金色はグラデーションや光沢で表現せず、必ずマットな平塗りにする。補助色は紺の明度違いのみで、他の有彩色は禁止。",
  },
  {
    value: "blue-orange",
    label: "ブルー×オレンジ",
    desc: "補色コンビの王道。明快で動きが出る。ノウハウ・手順系向き",
    tags: ["#2563EB", "#F97316"],
    preview: { image: img("blue-orange") },
    prompt:
      "明快なブルー #2563EB を基調色、オレンジ #F97316 を対比のアクセントに使う補色構成。2色を同時に大面積で使わず、面積比はおよそ7:3以内に抑える。本文文字はチャコール #1F2937。",
  },
  {
    value: "teal-mustard",
    label: "ティール×マスタード",
    desc: "青緑×からし色のレトロモダン。既視感のある配色を避けたいとき",
    tags: ["#0F766E", "#D9A62E"],
    preview: { image: img("teal-mustard") },
    prompt:
      "ティール #0F766E を基調に、マスタード #D9A62E をアクセントに使うレトロモダンな2色構成。どちらも彩度を上げすぎず、少しくすませたトーンで統一する。地色として淡いアイボリー（#F7F3E8 目安）の面を使ってよい。",
  },
  {
    value: "green-navy",
    label: "グリーン×ネイビー",
    desc: "緑を主役に紺で締める。健康・習慣・環境系の記事と好相性",
    tags: ["#2E9E6B", "#1B2A4A"],
    preview: { image: img("green-navy") },
    prompt:
      "グリーン #2E9E6B を主役の面に、ネイビー #1B2A4A を文字と締めの線に使う。グリーンは面で・ネイビーは線と文字で、と役割を分けて2色を混ぜた濁り色をつくらない。他の有彩色は足さない。",
  },
  {
    value: "forest-terracotta",
    label: "フォレスト×テラコッタ",
    desc: "深緑×赤土のアースカラー。暮らし・クラフト・食の記事に",
    tags: ["#2F5233", "#C96F4A"],
    preview: { image: img("forest-terracotta") },
    prompt:
      "深いフォレストグリーン #2F5233 とテラコッタ #C96F4A のアースカラー2色構成。全体の彩度は低めに保ち、土や紙のような温度感でまとめる。蛍光色・純色は一切混ぜない。",
  },
  {
    value: "burgundy-beige",
    label: "バーガンディ×ベージュ",
    desc: "ワインレッド×生成り。エッセイや大人向けの落ち着いた記事に",
    tags: ["#7A2E3A", "#E8DCC8"],
    preview: { image: img("burgundy-beige") },
    prompt:
      "バーガンディ #7A2E3A を基調色に、ベージュ #E8DCC8 を地色・補助色に使う落ち着いた構成。コントラストは彩度ではなく明度差で確保し、赤を鮮やかな方向に振らない。",
  },
  {
    value: "purple-coral",
    label: "パープル×コーラル",
    desc: "紫×コーラルのクリエイティブ寄り。個性を出しつつ読みやすさは保つ",
    tags: ["#6D28D9", "#FF7A6B"],
    preview: { image: img("purple-coral") },
    prompt:
      "パープル #6D28D9 を基調に、コーラル #FF7A6B をアクセントに使う。2色とも彩度が高いので白場を広く取って画面に休符をつくる。本文文字は濃紫かチャコールで、2色を重ね塗りしない。",
  },
  {
    value: "plum-sage",
    label: "プラム×セージ",
    desc: "くすんだ紫×灰緑の低彩度ペア。静かで内省的なトーン",
    tags: ["#7C4A6B", "#A8BCA1"],
    preview: { image: img("plum-sage") },
    prompt:
      "くすんだプラム #7C4A6B とセージグリーン #A8BCA1 の低彩度2色構成。静かで内省的なトーンを最後まで保ち、強い純色・ビビッドカラーは一切足さない。地は白か淡いグレージュ。",
  },
  // --- 1色系 ---
  {
    value: "vivid-blue",
    label: "ビビッドブルー",
    desc: "クリアな青の1色勝負。テック・仕事術のド定番で外さない",
    tags: ["#1D6FE0", "1色系"],
    preview: { image: img("vivid-blue") },
    prompt:
      "クリアなビビッドブルー #1D6FE0 の1色構成。青の濃淡3段（#1D6FE0 / #7FA8EF / #DCE8FB 目安）だけで情報の階層をつくり、他の有彩色は使わない。本文文字は墨色 #1A1A1A。",
  },
  {
    value: "vivid-orange",
    label: "ビビッドオレンジ",
    desc: "行動を促す暖色1色。前向きなハウツー記事に",
    tags: ["#F97316", "1色系"],
    preview: { image: img("vivid-orange") },
    prompt:
      "ビビッドオレンジ #F97316 の1色構成。オレンジは主要図形と強調に絞り、地は白、本文文字は墨色 #1A1A1A。オレンジの濃淡2〜3段以外の有彩色は禁止。",
  },
  {
    value: "vivid-red",
    label: "ビビッドレッド",
    desc: "強い赤1色。注意喚起・失敗談・やってはいけない系に",
    tags: ["#E0303B", "1色系"],
    preview: { image: img("vivid-red") },
    prompt:
      "強い赤 #E0303B の1色構成。赤の面積は画面の2割以内に抑え、警告色としての強さを薄めない。地は白、本文文字は墨色 #1A1A1A。赤以外の有彩色は使わない。",
  },
  {
    value: "vivid-yellow",
    label: "ビビッドイエロー",
    desc: "明るく目を引く黄+墨。文字は必ず黒で読ませる",
    tags: ["#F5C518", "1色系"],
    preview: { image: img("vivid-yellow") },
    prompt:
      "ビビッドイエロー #F5C518 の1色構成。黄色は面とマーカー的な下線強調に使い、文字は必ず墨色 #1A1A1A で読ませる。黄色地に白文字は視認性が崩れるため禁止。",
  },
  // --- モノ+1色 ---
  {
    value: "mono-accent",
    label: "モノ+1色",
    desc: "無彩色ベースに効かせ色1つ。どんな記事にも馴染む安全牌",
    tags: ["#1A1A1A", "+1色"],
    preview: { image: img("mono-accent") },
    prompt:
      "墨色 #1A1A1A とグレー2〜3段（#6B7280 / #D1D5DB 目安）の無彩色を基調に、アクセント1色（既定 #FF5A36。ブランドカラーの指定があればそちらを厳密に使用）を効かせ色として1〜2箇所だけに置く。アクセント以外の有彩色は禁止。",
  },
];

/* ===== 完結系スタイル10種（質感・パレット指定を使わず単体で世界観が決まる） ===== */

export const STYLE_SETS: PromptOption[] = [
  {
    value: "chara-guide",
    label: "キャラ解説",
    desc: "同一キャラが全枚に登場して案内する。連載感と親しみが出る",
    tags: ["キャラ固定", "吹き出し"],
    preview: { image: img("chara-guide") },
    prompt:
      "シンプルな線で描かれた同一の解説キャラクター1人が全枚に登場し、内容を案内するスタイル。キャラの頭身・線幅・目鼻の描き方を全枚で完全に固定する。吹き出しは白地+細い輪郭線の角丸で統一し、キャラの面積は画面の2〜3割まで。主役はあくまで図解本体で、キャラはそれを指し示す役に徹する。",
  },
  {
    value: "manga-panel",
    label: "マンガ風コマ",
    desc: "モノクロ原稿+網点。ビフォーアフターや失敗談の再現に強い",
    tags: ["コマ割り", "モノクロ"],
    preview: { image: img("manga-panel") },
    prompt:
      "モノクロのマンガ原稿風。1枚を2〜4コマのコマ割りで構成し、太めの主線・スクリーントーン風の網点・手描き調の擬音で展開を描く。コマ枠は直線、集中線は要所のみ。カラーは使ってもアクセント1色までとし、フルカラー化は禁止。",
  },
  {
    value: "stickman",
    label: "棒人間ミニマル",
    desc: "均一線の棒人間+小道具だけ。最速で状況が伝わる省略表現",
    tags: ["線画", "最小限"],
    preview: { image: img("stickman") },
    prompt:
      "均一な線幅の棒人間と最小限の小道具だけで状況を描くスタイル。背景は白、線は濃いグレー1色、強調のみアクセント1色。表情は点と短い線だけで感情を表現し、塗り面や装飾を増やさない。1画面に登場する棒人間は3人まで。",
  },
  {
    value: "pictogram",
    label: "ピクトグラム",
    desc: "公共サイン風の単色シルエット。抽象度が高く固い話も整う",
    tags: ["シルエット", "単色"],
    preview: { image: img("pictogram") },
    prompt:
      "公共サインのような単色シルエットのピクトグラムで構成する。人型・アイコンは角の処理と線の太さを全枚で統一し、顔や服などの細部は描き込まない。1画面の要素は3つまでに絞り、シルエットの明快さを最優先する。",
  },
  {
    value: "pen-mono",
    label: "ペン画モノクロ",
    desc: "インクペンの手描き線画+ハッチング陰影。落ち着いた読み物向き",
    tags: ["手描き線", "ハッチング"],
    preview: { image: img("pen-mono") },
    prompt:
      "インクペンで描いたモノクロの手描き線画スタイル。陰影は線の強弱とハッチング（斜線の重ね）でつくり、ベタ塗りは要所のみ。紙は白のまま残し、デジタル的なグラデーションや均一塗りは使わない。",
  },
  {
    value: "watercolor",
    label: "水彩絵本",
    desc: "淡い水彩のにじみ+鉛筆調の輪郭。感情や体験談をやわらかく",
    tags: ["水彩", "低彩度"],
    preview: { image: img("watercolor") },
    prompt:
      "淡い水彩の絵本挿絵風。にじみと紙の質感を残したやわらかい塗りで、輪郭線は細い鉛筆調。彩度は低めに抑え、白場を多く残す。暗い色での塗りつぶしと、くっきりしたデジタル塗りは禁止。",
  },
  {
    value: "yuru-chara",
    label: "ゆるキャラ案内",
    desc: "ゆるい線のマスコットが案内。ほのぼの系・初心者向け記事に",
    tags: ["マスコット", "3色まで"],
    preview: { image: img("yuru-chara") },
    prompt:
      "ゆるい手描き線のマスコットキャラクターが案内するスタイル。線はやや不揃いでよいが、キャラクターのデザイン（形・色・表情の描き方）は全枚で固定する。色数は3色まで、余白の多いほのぼのした画面にする。緻密な描き込みは禁止。",
  },
  {
    value: "clay3d",
    label: "クレイ風3D",
    desc: "粘土質感のマットな3D。柔らかい立体で概念をかわいく見せる",
    tags: ["マット", "立体"],
    preview: { image: img("clay3d") },
    prompt:
      "粘土（クレイ）でつくったようなマットな3D表現。表面にわずかな凹凸や指跡のような質感を残し、色は彩度中程度のやさしいトーンでまとめる。光源は1つ、背景は無地。金属光沢・鋭いエッジ・写実的レンダリングは禁止。",
  },
  {
    value: "natural-illust",
    label: "大人ナチュラルイラスト",
    desc: "くすみ中間色+線と塗りのズレ。ライフスタイル系の定番手描き",
    tags: ["くすみ色", "ラフ塗り"],
    preview: { image: img("natural-illust") },
    prompt:
      "くすんだ中間色（ベージュ・グレイッシュグリーン・スモーキーブルー系）でまとめた大人向けの手描きイラストスタイル。細い線に対して塗りをわずかにずらし、ラフな筆致を残す。装飾は最小限にして余白を広めに取る。ビビッドな純色は禁止。",
  },
  {
    value: "photo-collage",
    label: "実写コラージュ",
    desc: "写真の切り抜き+手描きの矢印やマーカー線。雑誌の誌面感",
    tags: ["実写", "切り抜き"],
    preview: { image: img("photo-collage") },
    prompt:
      "実写写真の切り抜きに、手描きの矢印・マーカー線・短い手書き文字を重ねた雑誌コラージュ風。写真は1枚につき1〜2点までとし、切り抜きの縁は白フチかラフな切り口で全枚統一する。要素を重ねすぎず、余白をしっかり残す。",
  },
];

/* ===== 02 仕様まわりの選択肢とルール文 ===== */

export const RATIO_OPTIONS: Option[] = [
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
];

export const DENSITY_OPTIONS: Option[] = [
  { value: "1", label: "極小" },
  { value: "2", label: "少なめ" },
  { value: "3", label: "標準" },
  { value: "4", label: "多め" },
  { value: "5", label: "読み物" },
];

export const DENSITY_RULES: Record<string, string> = {
  "1": "図形と単語レベルの最小要素だけで構成する。文は使わず、1画面の要素は2〜3個まで",
  "2": "要素は3個まで、ラベルは各8字以内。補足の文章は入れない",
  "3": "要点は3個まで。必要な場合のみ12字以内の補足を各1行だけ許可する",
  "4": "要点は4〜5個まで。各要点に短い補足1行を付けてよいが、段落はつくらない",
  "5": "図+短い説明文で、画像単体でも要旨が伝わる密度にする。ただし文章の段落をそのまま載せることは禁止",
};

export const HEADING_OPTIONS: Option[] = [
  { value: "auto", label: "おまかせ" },
  { value: "on", label: "あり" },
  { value: "sub", label: "欧文サブのみ" },
  { value: "off", label: "なし" },
];

export const HEADING_RULES: Record<string, string> = {
  auto: "見出しの有無と文言は、各図解の内容に合わせて最適に判断する",
  on: "各図解の上部に10字前後の日本語見出しを置く。位置・サイズ・書体は全枚で統一する",
  sub: "日本語見出しは置かず、内容を象徴する1〜2語の短い欧文ラベルだけを控えめに添える",
  off: "見出し・ラベルの類は一切置かず、図とキャプションだけで成立させる",
};

export const CAPTION_OPTIONS: Option[] = [
  { value: "auto", label: "おまかせ" },
  { value: "on", label: "入れる" },
  { value: "off", label: "入れない" },
];

export const CAPTION_RULES: Record<string, string> = {
  auto: "キャプションは必要な図解にだけ入れる。入れる場合は図の下部に1行・中央揃えとし、罫線や帯で囲わず余白だけで図本体と区切る",
  on: "各図解の下部に1行のキャプションを置く。中央揃え・罫線や帯は使わない・図本体との間は余白だけでゾーニングする",
  off: "キャプションは入れない",
};

export const BG_OPTIONS: Option[] = [
  { value: "white", label: "白" },
  { value: "auto", label: "おまかせ" },
  { value: "custom", label: "指定" },
];

export const BG_SWATCHES = [
  { value: "#FFFFFF", label: "白" },
  { value: "#FAF7F2", label: "生成り" },
  { value: "#F5F7FA", label: "青みグレー" },
  { value: "#FFF9EC", label: "クリーム" },
];

export const BORDER_OPTIONS: Option[] = [
  { value: "none", label: "なし" },
  { value: "on", label: "あり" },
  { value: "auto", label: "おまかせ" },
];

export const BORDER_RULES: Record<string, string> = {
  none: "外周の枠線は引かない。余白で図版の範囲を示す",
  on: "図版の外周に細い罫線を1本だけ引く。二重線・角飾り・影付きの枠は禁止",
  auto: "枠線の有無は図解ごとの収まりで判断する。使う場合は細い1本線のみ",
};

/* ===== 03 各図解の選択肢 ===== */

export const ROLE_OPTIONS: Option[] = [
  { value: "auto", label: "自動" },
  { value: "thumb", label: "サムネイル" },
  { value: "inline", label: "図解・挿絵" },
  { value: "summary", label: "まとめ" },
];

export const ROLE_LABELS: Record<string, string> = {
  auto: "おまかせ（本文の流れから判断）",
  thumb: "サムネイル",
  inline: "図解・挿絵",
  summary: "まとめ",
};

export const DTYPE_OPTIONS: Option[] = [
  { value: "auto", label: "おまかせ" },
  { value: "flow", label: "フロー図" },
  { value: "compare", label: "比較・対比" },
  { value: "concept", label: "概念図" },
  { value: "data", label: "データ図解" },
  { value: "metaphor", label: "比喩イラスト" },
  { value: "checklist", label: "チェックリスト" },
];

export const DTYPE_LABELS: Record<string, string> = {
  auto: "おまかせ（内容に最適な型を選ぶ）",
  flow: "フロー図（手順・時系列）",
  compare: "比較・対比（左右または上下で並べる）",
  concept: "概念図（関係・構造）",
  data: "データ図解（数値・割合）",
  metaphor: "比喩イラスト（たとえで直感に落とす）",
  checklist: "チェックリスト（確認項目）",
};

/* ===== 04 詳細 ===== */

export const BRAND_SWATCHES = [
  { value: "#007AFF", label: "ブルー" },
  { value: "#FF6F61", label: "コーラル" },
  { value: "#2E9E6B", label: "グリーン" },
  { value: "#C9A227", label: "ゴールド" },
];
