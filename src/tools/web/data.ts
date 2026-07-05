/**
 * web ツールのマスターデータ。
 * - トーン8種: docs/research/hp-tones.json から HEX・フォント・余白・装飾方針・photoTone・forbidden を転記
 * - サイト種別11種と推奨構成・セクション定義: docs/research/sections.json から転記
 * - FVレイアウト16種の配置記述文: docs/research/firstview.json の検証済みプロンプト文を収録
 */

/* ========== デザイントーン ========== */

export interface WebToneColors {
  bg: string;
  bgAlt: string;
  surface: string;
  ink: string;
  inkMuted: string;
  primary: string;
  onPrimary: string;
  accent: string;
  border: string;
}

export interface WebTone {
  id: string;
  name: string;
  /** カードのdesc用: 人格＋向く業種を1行 */
  cardDesc: string;
  /** GLOBAL STYLEに載せる人格の一文 */
  personality: string;
  keywords: string[];
  colors: WebToneColors;
  /** 画像プロンプト用のフォントの雰囲気（日本語で翻訳済み） */
  fontFeel: { heading: string; body: string; accentEn: string };
  /** スペックMD用のCSS font-family 値 */
  fontCss: { heading: string; body: string; accentEn: string };
  /** 余白の性格（画像プロンプト用） */
  spacingFeel: string;
  /** セクション上下パディングの実装基準 */
  sectionPadding: string;
  /** 角丸・影・罫線の方針（転記） */
  decoration: string;
  /** 写真トーン（転記） */
  photoTone: string;
  /** トーン固有の禁止事項（転記） */
  forbidden: string[];
  /** ダーク基調トーンか（禁止事項の文言切替に使う） */
  isDark?: boolean;
}

export const WEB_TONES: WebTone[] = [
  {
    id: "wa-modern",
    name: "和モダン",
    cardDesc: "声を張らずに信頼させる、落ち着いた和の主人。治療院・和食店・老舗や工芸に",
    personality: "声を張らずに信頼させる、落ち着いた和の主人",
    keywords: ["生成りと墨", "静けさと間", "手仕事の質感"],
    colors: {
      bg: "#F6F1E7",
      bgAlt: "#EFE8DA",
      surface: "#FBF7EF",
      ink: "#2A2724",
      inkMuted: "#6B6055",
      primary: "#2E4A3B",
      onPrimary: "#F6F1E7",
      accent: "#B04A2F",
      border: "#DBD2C2",
    },
    fontFeel: {
      heading: "品格のある日本語の明朝体（Shippori Mincho系）。字間はゆったり",
      body: "癖のない日本語ゴシック体（Noto Sans JP系）",
      accentEn: "細身でクラシカルなセリフ欧文（Cormorant系）を小さな英字ラベルに",
    },
    fontCss: {
      heading: '"Shippori Mincho", serif',
      body: '"Noto Sans JP", sans-serif',
      accentEn: '"Cormorant", serif',
    },
    spacingFeel: "余白はゆったり。セクションの上下に大きく間を取り、要素を急いで詰めない",
    sectionPadding: "96px",
    decoration: "角丸0（直角基調）。影は使わず細い罫線と地色差で階層を作る",
    photoTone:
      "自然光・低彩度（-15〜-25%）やや暖色の実写。filter: saturate(0.8) contrast(1.05) brightness(0.98) sepia(0.05)、微細グレイン4〜8%可",
    forbidden: [
      "効果・効能の断定表現（柔道整復師法の広告制限。「腰痛が治る」等）",
      "淡い差し色（primary-soft等）を本文文字色に使う",
      "紫〜青グラデ背景・汎用ストック写真・理由なきダーク基調",
    ],
  },
  {
    id: "clean-trust",
    name: "クリーン&トラスト",
    cardDesc: "相談の敷居を下げる誠実で明快な専門家。士業・クリニック・相談型サービスに",
    personality: "相談していいのか迷っている人の肩の力を抜く、誠実で敷居の低い専門家",
    keywords: ["誠実", "明快", "敷居を下げる"],
    colors: {
      bg: "#FBFAF7",
      bgAlt: "#F1EFEA",
      surface: "#FFFFFF",
      ink: "#20272E",
      inkMuted: "#5A636C",
      primary: "#1F3A5F",
      onPrimary: "#FFFFFF",
      accent: "#E7DFCF",
      border: "#E3DFD7",
    },
    fontFeel: {
      heading: "読み間違いのないユニバーサルデザインのゴシック体（BIZ UDゴシック系）",
      body: "見出しと同じUDゴシック体。行間広めで読みやすく",
      accentEn: "古典的なセリフ欧文（EB Garamond系）をごく小さなあしらいに",
    },
    fontCss: {
      heading: '"BIZ UDPGothic", sans-serif',
      body: '"BIZ UDPGothic", sans-serif',
      accentEn: '"EB Garamond", serif',
    },
    spacingFeel: "余白はゆったり。1画面の情報を絞り、迷わせない静かな密度にする",
    sectionPadding: "96px",
    decoration: "サイト全体を--radius-sm（4px）で統一。影は控えめ（--shadow-soft 1画面2箇所まで）、罫線と地色差で階層",
    photoTone:
      "明るい均一な室内光・低彩度ほんのり暖色の実写（代表・スタッフ・院内）。filter: saturate(0.94) contrast(1.02) brightness(1.02)",
    forbidden: [
      "誇大・誤認表示（税理士会広告規則・医療広告ガイドライン。「必ず還付」「絶対安全」等）",
      "AIブルー（高彩度indigo）・紫〜青のグラデーション背景",
      "料金を隠して「お問い合わせください」を多用する",
    ],
  },
  {
    id: "warm-craft",
    name: "ウォーム&クラフト",
    cardDesc: "手仕事の温もりと焼き色のシズル。ベーカリー・工房・素材にこだわる個人店に",
    personality: "焼きたての湯気の向こうで、作り手が手を止めずに「いらっしゃい」と笑う、素朴で温かい個人店",
    keywords: ["手仕事の温もり", "焼き色とシズル", "素朴な密度"],
    colors: {
      bg: "#F5EFE6",
      bgAlt: "#EDE4D6",
      surface: "#FBF7F0",
      ink: "#3E2C23",
      inkMuted: "#6E5548",
      primary: "#A85035",
      onPrimary: "#FBF7F0",
      accent: "#C8912F",
      border: "#DBCDB8",
    },
    fontFeel: {
      heading: "手書きの温度が残る楷書風の書体（Klee One系）",
      body: "やわらかい印象の角ゴシック（Zen Kaku Gothic Antique系）",
      accentEn: "ぬくもりのあるセリフ欧文（Fraunces系）",
    },
    fontCss: {
      heading: '"Klee One", cursive',
      body: '"Zen Kaku Gothic Antique", sans-serif',
      accentEn: '"Fraunces", serif',
    },
    spacingFeel: "余白は標準的。手仕事の写真を主役に、テンポよく素朴な密度で刻む",
    sectionPadding: "64px",
    decoration: "角丸大きめ（カード--radius-md 8px、CTAはピル--radius-full）。影は--shadow-soft標準・ホバーのみlift",
    photoTone:
      "ナチュラル光・暖色強め・彩度やや高めのシズル（気泡・湯気・手元）。filter: saturate(1.1) contrast(0.94) brightness(1.04) sepia(0.08)、グレイン6〜12%推奨",
    forbidden: [
      "テラコッタprimary・マスタードaccentを本文文字色に使う（WCAG未達）",
      "景表法・優良誤認（「自家製」「無添加」等が実態と不一致な表示）",
      "彩度全開のビビッドカラー・紫グラデ・ネオン",
    ],
  },
  {
    id: "editorial-minimal",
    name: "エディトリアル・ミニマル",
    cardDesc: "余白と特大タイポで語る寡黙な編集者。デザイン事務所・建築・ポートフォリオに",
    personality: "余白と特大タイポグラフィだけで「センスがある」と言い切る、無駄口を叩かない編集者",
    keywords: ["引き算の美学", "特大タイポグラフィ", "非対称グリッド"],
    colors: {
      bg: "#FFFFFF",
      bgAlt: "#F4F2EE",
      surface: "#FFFFFF",
      ink: "#111111",
      inkMuted: "#6E6E6E",
      primary: "#141414",
      onPrimary: "#FFFFFF",
      accent: "#C8352B",
      border: "#E4E1DB",
    },
    fontFeel: {
      heading: "オールドスタイルの日本語明朝体（Zen Old Mincho系）を特大サイズで使う",
      body: "ニュートラルでモダンなゴシック体（Murecho系）",
      accentEn: "太細のコントラストが強いセリフ欧文（Playfair Display系）",
    },
    fontCss: {
      heading: '"Zen Old Mincho", serif',
      body: '"Murecho", sans-serif',
      accentEn: '"Playfair Display", serif',
    },
    spacingFeel: "余白は最大級。要素を極限まで絞り、間そのものをデザインとして見せる",
    sectionPadding: "128px",
    decoration: "角丸ゼロ（直角・硬質）。影は使わない（box-shadow: none）、区切りは1px罫線のみ",
    photoTone:
      "自然光・大胆な脱彩度（-20〜-30%）寒色寄り・高コントラスト。filter: saturate(0.7) contrast(1.15) brightness(0.97) grayscale(0.1)、グレイン原則不使用",
    forbidden: [
      "ミニマルを履き違えて問い合わせ導線を余白に埋もれさせる",
      "根拠のない最上級表現（景表法・優良誤認。「業界No.1」等）",
      "角丸・影・カードを足す（直角・1px罫線・影ゼロを崩さない）",
    ],
  },
  {
    id: "pop-friendly",
    name: "ポップ&フレンドリー",
    cardDesc: "明るくて面倒見のいい近所の先生。子ども向け教室・学習塾・親子向けサービスに",
    personality: "明るくて面倒見のいい、近所の頼れる先生",
    keywords: ["元気", "安心", "まるっこい"],
    colors: {
      bg: "#FFFFFF",
      bgAlt: "#FFF6EC",
      surface: "#FFFFFF",
      ink: "#2B2740",
      inkMuted: "#655F73",
      primary: "#D24310",
      onPrimary: "#FFFFFF",
      accent: "#2E9BCB",
      border: "#F3E7D8",
    },
    fontFeel: {
      heading: "太めの丸ゴシック体（M PLUS Rounded 1c系）",
      body: "見出しと同じ丸ゴシック体",
      accentEn: "幾何学的なサンセリフ欧文（Josefin Sans系）",
    },
    fontCss: {
      heading: '"M PLUS Rounded 1c", sans-serif',
      body: '"M PLUS Rounded 1c", sans-serif',
      accentEn: '"Josefin Sans", sans-serif',
    },
    spacingFeel: "余白は標準的。にぎやかだが整列は崩さず、リズムよく情報を刻む",
    sectionPadding: "64px",
    decoration: "--radius-full多用（ボタン・バッジ・タグは全部ピル、カードは--radius-md 8px）。影はB-10立体影と--shadow-softの2種まで",
    photoTone:
      "明るい自然光・高彩度・クリーンなデジタル質感（グレイン禁止）。filter: saturate(1.25) contrast(1.1) brightness(1.06)",
    forbidden: [
      "明るい黄色・パステル・空色の面に白文字を載せる（コントラスト不足）",
      "合格実績の優良誤認（景表法。対象範囲・年度・根拠の明示なしや「全員合格」等）",
      "紫グラデ背景・意味のない絵文字装飾・中央寄せの単調な縦積み",
    ],
  },
  {
    id: "luxury",
    name: "ラグジュアリー",
    cardDesc: "余白と陰影だけで特別を語る伏し目がちの上質。高単価サロン・ブライダルに",
    personality: "言葉少なに、余白と陰影だけで「特別」を語る、伏し目がちの上質",
    keywords: ["静寂", "気品", "非日常"],
    colors: {
      bg: "#F7F4EF",
      bgAlt: "#EFEBE3",
      surface: "#FCFAF6",
      ink: "#232020",
      inkMuted: "#615C58",
      primary: "#2B1418",
      onPrimary: "#F7F4EF",
      accent: "#A67C3D",
      border: "#DED8CE",
    },
    fontFeel: {
      heading: "太めで端正な日本語明朝体（Shippori Mincho B1系）。字間を広く",
      body: "オールドスタイルの明朝体（Zen Old Mincho系）",
      accentEn: "極細でエレガントな欧文（Italiana系）",
    },
    fontCss: {
      heading: '"Shippori Mincho B1", serif',
      body: '"Zen Old Mincho", serif',
      accentEn: '"Italiana", serif',
    },
    spacingFeel: "余白は最大級。「間」が主役。1画面に見せる要素は最小限に絞る",
    sectionPadding: "128px",
    decoration: "角丸0（直角）でサイト内統一。影はほぼ使わない（罫線と余白で面を分ける。使っても--shadow-soft 1画面1箇所）",
    photoTone:
      "大きく・暗め・被写界深度浅め。ティール&オレンジ系スプリットトーン・低彩度（-20〜-30%）。filter: saturate(0.75) contrast(1.12) brightness(0.95)、グレイン極薄2〜5%まで",
    forbidden: [
      "金accentを本文・小さな文字に使う（明るい地で3.44:1、本文基準未達）",
      "余白を詰めて情報を敷き詰める（--space-16の「間」がこのトーンの武器）",
      "ビフォーアフター写真の誇張演出・打消し表示頼みの体験談（景表法）",
    ],
  },
  {
    id: "urban-bold",
    name: "アーバン・ボールド",
    cardDesc: "汗と鉄と規律のハードコア。パーソナルジム・格闘技・メンズ美容・バーバーに",
    personality: "汗と鉄と規律。甘えを削ぎ落とした、都会のストリート・ハードコア",
    keywords: ["ハイコントラスト", "スポーティ", "硬質"],
    colors: {
      bg: "#0E0E0F",
      bgAlt: "#161618",
      surface: "#1C1C1F",
      ink: "#F5F5F3",
      inkMuted: "#A8A8A5",
      primary: "#E8FF3C",
      onPrimary: "#111111",
      accent: "#E8FF3C",
      border: "#2E2E31",
    },
    fontFeel: {
      heading: "極太のディスプレイ用ゴシック体（Dela Gothic One系）",
      body: "モダンな角ゴシック（M PLUS 1系）",
      accentEn: "縦長コンデンスの欧文（Bebas Neue系）を大きな飾り英字に",
    },
    fontCss: {
      heading: '"Dela Gothic One", sans-serif',
      body: '"M PLUS 1", sans-serif',
      accentEn: '"Bebas Neue", sans-serif',
    },
    spacingFeel: "余白は標準的。黒の面積で緊張感を保ち、要素はエッジを立てて配置する",
    sectionPadding: "64px",
    decoration: "角丸0（直角基調・硬質）。影は最小限（ホバーのlift相当1箇所まで）、階層は明度差・罫線・斜め境界（clip-path）で作る",
    photoTone:
      "硬い強コントラスト光・モノクロ〜低彩度（-40%以上）。filter: grayscale(0.85) contrast(1.3) brightness(0.96)、グレイン強め8〜15%",
    forbidden: [
      "断定的な効果保証（景表法・優良誤認。「絶対痩せる」「必ず結果が出る」等）",
      "ビフォーアフター写真を期間・頻度・食事指導の条件明示なしで載せる",
      "黒×赤を強くしすぎる（威圧的になり初心者層・女性層を遠ざける）",
    ],
    isDark: true,
  },
  {
    id: "local-simple",
    name: "ローカル・シンプル",
    cardDesc: "飾らず実物のまま見せる実直さ。町工場・個人商店・地域のBtoB事業者に",
    personality: "飾らない誠実さ。実物のままを見せ、電話番号と営業時間へ最短で届かせる実直な事業者",
    keywords: ["誠実", "実直", "即到達"],
    colors: {
      bg: "#FAF7F1",
      bgAlt: "#F0EBE1",
      surface: "#FFFFFF",
      ink: "#2A2723",
      inkMuted: "#5E574C",
      primary: "#1E3A5A",
      onPrimary: "#FFFFFF",
      accent: "#C06B33",
      border: "#DED7CA",
    },
    fontFeel: {
      heading: "癖のない角ゴシック体（Zen Kaku Gothic New系）",
      body: "見出しと同じ角ゴシック体",
      accentEn: "端正なローマン系欧文（Forum系）をごく控えめに",
    },
    fontCss: {
      heading: '"Zen Kaku Gothic New", sans-serif',
      body: '"Zen Kaku Gothic New", sans-serif',
      accentEn: '"Forum", serif',
    },
    spacingFeel: "余白はゆったり。飾りより情報の到達を優先し、探させない配置にする",
    sectionPadding: "96px",
    decoration: "角丸0（直角で統一。カード・画像・ボタンすべて）。影は最小限（--shadow-softを料金表・実績カードのみ）、境界は罫線で引く",
    photoTone:
      "現場・機械・手元をほぼ素通しで見せるドキュメンタリー調（グレイン不使用）。filter: saturate(0.96) contrast(1.02)",
    forbidden: [
      "採用ページの労働条件を実態と異なる内容で書く（職業安定法）",
      "accent橙を小さい本文・キャプションの文字色に使う（3.64:1でAA未達）",
      "電話番号・営業時間・所在地を装飾やスクロール演出の奥に隠す",
    ],
  },
];

/* ========== サイト種別と推奨構成 ========== */

export interface SiteType {
  id: string;
  name: string;
  /** 推奨セクション構成（header-nav / hero は画像ではFVに統合される） */
  preset: string[];
}

export const SITE_TYPES: SiteType[] = [
  {
    id: "lp",
    name: "ランディングページ",
    preset: ["header-nav", "hero", "problem", "solution", "features", "benefits", "testimonials", "comparison", "campaign", "pricing", "guarantee", "flow", "faq", "cta", "contact", "footer"],
  },
  {
    id: "corporate",
    name: "コーポレートサイト",
    preset: ["header-nav", "hero", "news", "service-list", "features", "case-study", "concept", "message", "stats", "about", "history", "blog", "recruit-message", "cta", "contact", "access", "footer"],
  },
  {
    id: "clinic",
    name: "治療院・クリニック",
    preset: ["header-nav", "hero", "problem", "features", "campaign", "menu", "pricing", "before-after", "testimonials", "message", "team", "gallery", "flow", "faq", "access", "reservation", "footer"],
  },
  {
    id: "restaurant",
    name: "飲食店",
    preset: ["header-nav", "hero", "concept", "features", "menu", "gallery", "news", "sns-feed", "access", "reservation", "footer"],
  },
  {
    id: "salon",
    name: "美容室・サロン",
    preset: ["header-nav", "hero", "concept", "features", "campaign", "menu", "pricing", "gallery", "team", "testimonials", "sns-feed", "flow", "faq", "access", "reservation", "footer"],
  },
  {
    id: "professional",
    name: "士業事務所",
    preset: ["header-nav", "hero", "problem", "features", "service-list", "pricing", "case-study", "testimonials", "profile", "team", "flow", "faq", "about", "access", "cta", "contact", "footer"],
  },
  {
    id: "recruit",
    name: "採用サイト",
    preset: ["header-nav", "hero", "recruit-message", "stats", "about", "interview", "culture", "job-openings", "flow", "faq", "cta", "footer"],
  },
  {
    id: "portfolio",
    name: "ポートフォリオ",
    preset: ["header-nav", "hero", "works", "profile", "service-list", "testimonials", "blog", "sns-feed", "contact", "footer"],
  },
  {
    id: "saas",
    name: "SaaS・プロダクト",
    preset: ["header-nav", "hero", "logos-media", "problem", "features", "demo-video", "benefits", "integration", "case-study", "testimonials", "pricing", "comparison", "faq", "blog", "cta", "footer"],
  },
  {
    id: "ec",
    name: "ECサイト",
    preset: ["header-nav", "hero", "campaign", "product-list", "features", "testimonials", "guarantee", "faq", "news", "newsletter", "sns-feed", "footer"],
  },
  {
    id: "school",
    name: "スクール・教室",
    preset: ["header-nav", "hero", "problem", "features", "curriculum", "pricing", "team", "interview", "testimonials", "campaign", "flow", "faq", "access", "cta", "contact", "footer"],
  },
];

/* ========== セクション定義 ========== */

export interface SectionSpec {
  id: string;
  name: string;
  /** そのセクションが果たす役割 */
  purpose: string;
  /** 置くべき内容スロット */
  slots: string[];
  /** 既定のレイアウト（sections.json の代表variantを具体化した記述） */
  layout: string;
}

export const WEB_SECTIONS: SectionSpec[] = [
  {
    id: "header-nav",
    name: "ヘッダー・グローバルナビ",
    purpose: "サイト全体の回遊導線と主要CTAへの常時アクセスを提供する",
    slots: ["ロゴ", "グローバルメニュー", "電話番号", "CTAボタン", "ハンバーガーメニュー"],
    layout: "ロゴ左・メニュー右の横一列。右端に電話番号と塗りのCTAボタンを置く高さの細いバー",
  },
  {
    id: "hero",
    name: "ヒーロー（ファーストビュー）",
    purpose: "3秒で価値提案を伝え、スクロールとコンバージョンの動機を作る",
    slots: ["キャッチコピー", "サブコピー", "メインビジュアル", "CTAボタン", "権威付けバッジ"],
    layout: "選択したFVレイアウトの配置記述に従う",
  },
  {
    id: "problem",
    name: "課題提起・お悩み共感",
    purpose: "訪問者の悩みを言語化して自分ごと化させ、読み進める理由を作る",
    slots: ["見出し（こんなお悩みありませんか）", "お悩みリスト", "共感イラスト・写真", "導入文"],
    layout: "チェックリスト型: チェックボックス風の箇条書きでお悩みを4〜6個列挙し、共感を誘う写真かイラストを1点添える",
  },
  {
    id: "solution",
    name: "解決策の提示",
    purpose: "提示した悩みへの答えとして商品・サービスを位置づける",
    slots: ["ブリッジコピー", "サービス概要", "イメージ画像", "解決できる根拠の一言"],
    layout: "ブリッジバナー型: 帯状の転換コピーで課題パートから解決パートへ橋渡しし、サービス画像と根拠の一言を続ける",
  },
  {
    id: "features",
    name: "特徴・選ばれる理由",
    purpose: "他と違う強みを整理し「ここを選ぶ根拠」を与える",
    slots: ["見出し", "特徴カード（アイコン＋タイトル＋説明）×3〜6", "理由のナンバリング", "補足画像"],
    layout: "アイコングリッド型: アイコン＋タイトル＋短文のカードを3列で並べる。番号の強弱で選ぶ根拠を立てる",
  },
  {
    id: "benefits",
    name: "ベネフィット・導入効果",
    purpose: "機能ではなく得られる未来・変化を提示し欲求を高める",
    slots: ["導入前→導入後の変化", "効果の数値", "利用シーン画像", "見出し"],
    layout: "変化対比型: 導入前と導入後を左右で対比し、効果の数値を大きく添える",
  },
  {
    id: "concept",
    name: "コンセプト・理念",
    purpose: "ブランドの世界観・価値観を伝え共感と愛着を作る",
    slots: ["コンセプトコピー", "ステートメント本文", "ブランド写真", "ミッション・ビジョン・バリュー"],
    layout: "ステートメント型: 大きな文字組みのコピーを主役に本文は短く。静かで品のある構成",
  },
  {
    id: "message",
    name: "代表挨拶・メッセージ",
    purpose: "代表・院長の人柄と想いを見せ、人への信頼を作る",
    slots: ["顔写真", "挨拶文", "氏名・肩書き", "経歴・資格", "サイン"],
    layout: "写真横並び型: 代表のポートレートと挨拶文を横に並べ、氏名・肩書き・経歴を添える",
  },
  {
    id: "about",
    name: "会社・事務所概要",
    purpose: "基本情報を開示し実在性・信頼性を担保する",
    slots: ["会社名・屋号", "所在地", "設立", "代表者", "事業内容", "連絡先", "許認可・登録番号"],
    layout: "定義リスト表型: 会社名・所在地・設立などを2列のテーブルで整然と開示する",
  },
  {
    id: "history",
    name: "沿革",
    purpose: "創業からの歩みを示し継続性と信頼を伝える",
    slots: ["年表（年＋出来事）", "節目の写真", "創業ストーリー"],
    layout: "縦タイムライン型: 中央線に沿って年と出来事を並べ、節目に写真を添える",
  },
  {
    id: "service-list",
    name: "事業・サービス一覧",
    purpose: "提供サービスの全体像を見せ、各詳細ページへ誘導する",
    slots: ["サービスカード（画像＋名称＋説明＋リンク）", "カテゴリ見出し", "詳細へのボタン"],
    layout: "カードグリッド型: 画像＋名称＋説明＋リンクのサービスカードを2〜3列で並べる",
  },
  {
    id: "product-detail",
    name: "商品・機能詳細",
    purpose: "主力商品・機能を深掘りし具体的な理解と欲求を作る",
    slots: ["商品・機能名", "説明文", "商品画像・スクリーンショット", "スペック表", "特長リスト"],
    layout: "交互紹介型: 機能・商品ごとに画像とテキストを左右交互に展開し、1つずつ深く説明する",
  },
  {
    id: "demo-video",
    name: "デモ・動画紹介",
    purpose: "動きで魅力を直感的に伝え、テキストで伝わらない体験を補う",
    slots: ["動画埋め込み", "再生ボタン", "キャプション", "サムネイル画像"],
    layout: "動画・説明並列型: サムネイル＋再生ボタンの動画枠の隣に要点テキストを置いて理解を補助する",
  },
  {
    id: "pricing",
    name: "料金表・プラン",
    purpose: "価格の透明性で「いくらかかるか不安」を解消し比較検討を促す",
    slots: ["プラン名", "価格", "期間・単位", "含まれる内容リスト", "おすすめバッジ", "注記（税込・初回価格）"],
    layout: "プランカード型: 2〜4プランをカードで横並びにし、おすすめプランを中央で強調。税込等の注記を小さく添える（メニュー数が多い業種は料金一覧表でもよい）",
  },
  {
    id: "menu",
    name: "メニュー一覧",
    purpose: "施術・料理などの提供メニューを価格つきで魅力的に一覧化する",
    slots: ["メニュー名", "価格", "説明文", "写真", "カテゴリ", "おすすめマーク"],
    layout: "写真カード型: 料理・施術の写真を主役にしたカードグリッド。名前と価格をセットで載せる",
  },
  {
    id: "campaign",
    name: "キャンペーン・特典",
    purpose: "初回特典・期間限定オファーで「今行動する理由」を作る",
    slots: ["特典内容", "通常価格→特別価格", "期限・条件", "CTAボタン"],
    layout: "バナー帯型: 目立つ色の帯で特典と期限を訴求し、CTAボタンへつなぐ",
  },
  {
    id: "comparison",
    name: "比較表",
    purpose: "他社・他手段との違いを一目で示し優位性を証明する",
    slots: ["比較軸（項目）", "自社列（強調）", "他社・他手段の列", "◯✕△マーク"],
    layout: "自社強調比較表型: 比較軸×各社のマトリクスで自社列を色とサイズで強調する",
  },
  {
    id: "guarantee",
    name: "保証・安心サポート",
    purpose: "返金・返品・サポート体制でCV直前の最後の不安を除去する",
    slots: ["保証内容", "保証バッジ", "適用条件の注記", "サポート窓口"],
    layout: "保証カード型: 返金・サポートなど各保証の内容をカードで丁寧に説明し、適用条件の注記を添える",
  },
  {
    id: "product-list",
    name: "商品一覧",
    purpose: "商品を回遊しやすく並べ、商品詳細・購入へ誘導する",
    slots: ["商品カード（画像＋名称＋価格）", "カテゴリフィルタ", "ランキングバッジ", "もっと見るリンク"],
    layout: "グリッド型: 商品カード（画像＋名称＋価格）を3〜4列の均等グリッドで並べ、もっと見るリンクへ誘導する",
  },
  {
    id: "case-study",
    name: "導入事例・実績",
    purpose: "第三者の成功例で効果を証明し「自社でもできそう」と思わせる",
    slots: ["顧客名・業種", "課題→施策→成果", "数値成果", "担当者コメント", "顧客ロゴ・写真"],
    layout: "事例カード型: 顧客名・業種と数値成果を載せたカードを並べ、詳細へ誘導する",
  },
  {
    id: "before-after",
    name: "症例・ビフォーアフター",
    purpose: "施術・改善の変化を視覚的に証明し効果への確信を作る",
    slots: ["Before写真", "After写真", "症状・施術内容", "期間・回数", "注意書き（効果には個人差があります）"],
    layout: "左右比較型: BeforeとAfterの写真を左右に並べ、施術内容・期間と「効果には個人差があります」の注意書きを添える",
  },
  {
    id: "testimonials",
    name: "お客様の声",
    purpose: "実際の利用者の声で信頼と共感を獲得し不安を打ち消す",
    slots: ["顔写真・イニシャル", "属性（年代・職業・地域）", "星評価", "感想本文"],
    layout: "カード並列型: 顔写真かイニシャル＋属性＋感想本文の声カードを3件前後並べる",
  },
  {
    id: "logos-media",
    name: "取引先・メディア掲載・受賞",
    purpose: "取引実績・掲載歴・受賞をロゴとバッジで見せ権威性を瞬時に伝える",
    slots: ["企業ロゴ列", "メディア名", "受賞・認証バッジ", "導入社数・掲載数"],
    layout: "ロゴ帯型: グレースケールの取引先・掲載メディアのロゴを1〜2行で並べる",
  },
  {
    id: "stats",
    name: "数字で見る",
    purpose: "実績・規模・特徴を数値化し瞬時に説得力を持たせる",
    slots: ["数値（大きく表示）", "単位", "ラベル", "アイコン", "集計時点の注記"],
    layout: "数値グリッド型: 大きな数値＋単位＋ラベルを4〜8個グリッドで並べ、集計時点の注記を小さく添える",
  },
  {
    id: "gallery",
    name: "ギャラリー",
    purpose: "店内・スタイル・料理・設備を写真で追体験させ来店イメージを作る",
    slots: ["写真グリッド", "キャプション", "カテゴリ"],
    layout: "均等グリッド型: 同一トーンに揃えた写真を整然と敷き詰める。キャプションは最小限",
  },
  {
    id: "works",
    name: "制作実績・作品集",
    purpose: "制作物・実績を見せスキルとテイストを証明する",
    slots: ["作品サムネイル", "タイトル", "担当領域・使用技術", "クライアント名", "詳細リンク"],
    layout: "サムネイルグリッド型: 作品サムネイル＋タイトル＋担当領域を均等グリッドで一覧させる",
  },
  {
    id: "team",
    name: "スタッフ・チーム紹介",
    purpose: "「誰が対応してくれるのか」を見せ人への安心感を作る",
    slots: ["顔写真", "氏名", "役職・資格", "得意分野・一言コメント"],
    layout: "プロフィールカード型: 顔写真＋氏名＋役職・資格＋一言コメントのカードを並べる",
  },
  {
    id: "profile",
    name: "プロフィール",
    purpose: "個人の経歴・スキル・実績を伝え指名・依頼につなげる",
    slots: ["ポートレート", "名前・肩書き", "経歴", "スキル・使用ツール", "受賞・登壇歴"],
    layout: "写真・経歴並列型: ポートレートと自己紹介文を並べ、スキルや受賞歴をタグで整理する",
  },
  {
    id: "interview",
    name: "インタビュー",
    purpose: "社員・生徒のリアルな声で入社後・入会後の具体的イメージを作る",
    slots: ["人物写真", "属性（部署・入社年次・コース）", "Q&A本文", "他インタビューへのリンク"],
    layout: "一覧カード型: 人物写真＋印象的な一言のカードを並べ、属性（部署・入社年次など）を添える",
  },
  {
    id: "culture",
    name: "働く環境・福利厚生",
    purpose: "制度・環境・社風を見せ「ここで働く自分」を想像させる",
    slots: ["制度リスト（アイコン＋名称＋説明）", "オフィス写真", "社内イベント写真", "環境データ"],
    layout: "制度アイコングリッド型: 福利厚生・制度をアイコン付きカードで網羅し、オフィス写真を添える",
  },
  {
    id: "recruit-message",
    name: "採用メッセージ",
    purpose: "会社の想いと求める人物像を伝え応募の熱量を上げる",
    slots: ["採用キャッチコピー", "メッセージ本文", "代表・人事の写真", "求める人物像"],
    layout: "全面写真型: 働く人の写真を全面に敷き、採用キャッチコピーを重ねて感情に訴える",
  },
  {
    id: "job-openings",
    name: "募集要項",
    purpose: "職種・条件を明確に提示しミスマッチなく応募へつなげる",
    slots: ["職種名", "雇用形態", "仕事内容", "給与・勤務時間・休日", "応募資格", "エントリーボタン"],
    layout: "要項テーブル型: 職種・給与・勤務時間などの労働条件を表形式で正確に記載し、エントリーボタンへつなぐ",
  },
  {
    id: "curriculum",
    name: "コース・カリキュラム",
    purpose: "学べる内容と成長ステップを具体的に示し入会後を想像させる",
    slots: ["コース名", "対象レベル", "学習内容", "期間・回数", "料金へのリンク"],
    layout: "コースカード型: コースごとの対象・内容・期間・料金をカードで比較させる",
  },
  {
    id: "flow",
    name: "ご利用の流れ",
    purpose: "申込〜利用開始までの手順を可視化し「面倒・不安」を消す",
    slots: ["ステップ番号", "ステップ名", "説明文", "アイコン・写真", "所要時間"],
    layout: "番号カード型: 大きなステップ番号＋写真のカードで手順を順に見せる（矢印ではつながない）",
  },
  {
    id: "faq",
    name: "よくある質問",
    purpose: "疑問と不安を先回りで解消し離脱と問い合わせ負荷を減らす",
    slots: ["質問文", "回答文", "カテゴリ", "Q・Aアイコン"],
    layout: "アコーディオン型: クリックで回答を開閉するQ&Aを縦に並べる",
  },
  {
    id: "news",
    name: "お知らせ・ニュース",
    purpose: "最新情報の発信で「今も活動している」安心感を伝える",
    slots: ["日付", "カテゴリラベル", "タイトル", "一覧ページへのリンク"],
    layout: "リスト型: 日付＋カテゴリラベル＋タイトルの行を縦に並べ、一覧ページへのリンクを添える",
  },
  {
    id: "blog",
    name: "ブログ・コラム",
    purpose: "専門知識の発信でSEO流入と専門性への信頼を積み上げる",
    slots: ["記事カード（サムネイル＋タイトル＋日付＋カテゴリ）", "人気記事", "タグ一覧"],
    layout: "カードグリッド型: サムネイル＋タイトル＋日付の記事カードを3件前後で並べる",
  },
  {
    id: "sns-feed",
    name: "SNSフィード",
    purpose: "日々の投稿を見せて鮮度と親近感を伝えフォローにつなげる",
    slots: ["Instagram・Xの埋め込みグリッド", "アカウント名", "フォローボタン"],
    layout: "Instagramグリッド型: 最新投稿を正方形グリッドで見せ、アカウント名とフォローボタンを添える",
  },
  {
    id: "access",
    name: "アクセス・店舗情報",
    purpose: "場所・行き方・営業時間を明確に伝え来店の障壁を下げる",
    slots: ["地図", "住所", "最寄り駅・道順", "営業時間・定休日", "駐車場情報", "電話番号"],
    layout: "地図・情報並列型: 地図と住所・最寄り駅・営業時間・駐車場のテーブルを左右に並べる",
  },
  {
    id: "reservation",
    name: "予約・申込",
    purpose: "予約手段を1か所に集約し「今すぐの行動」につなげる",
    slots: ["電話番号（タップ発信）", "Web予約ボタン", "LINE予約", "受付時間の注記"],
    layout: "電話・Web・LINE並列型: 3つの予約手段を大きなボタンで並べ、受付時間の注記を添える",
  },
  {
    id: "cta",
    name: "CTA・コンバージョンエリア",
    purpose: "ページの要所で行動を促す締めの誘導セクション",
    slots: ["訴求コピー", "CTAボタン（最大2種）", "電話番号", "特典・保証の再掲"],
    layout: "クロージング型: 訴求コピー＋主要CTAボタンに特典・保証の再掲を添えて背中を押す",
  },
  {
    id: "contact",
    name: "お問い合わせフォーム",
    purpose: "問い合わせのハードルを下げ確実に送信まで完了させる",
    slots: ["入力フィールド（名前・連絡先・内容）", "プライバシーポリシー同意", "送信ボタン", "電話の代替導線"],
    layout: "シンプル1カラム型: 項目最小限の縦1列フォーム＋同意チェック＋送信ボタン。電話の代替導線を隣に添える",
  },
  {
    id: "newsletter",
    name: "メルマガ・LINE登録",
    purpose: "今すぐ買わない層と接点を作り再訪・再購入を促す",
    slots: ["登録特典の提示", "メールアドレス入力", "LINE友だち追加ボタン", "QRコード"],
    layout: "特典カード型: 登録メリットを前面に出し、メール入力欄とLINE友だち追加ボタンを並べる",
  },
  {
    id: "integration",
    name: "連携・対応環境",
    purpose: "既存ツール・環境との親和性を示し導入の障壁を下げる",
    slots: ["連携サービスのロゴ", "連携カテゴリ", "対応OS・ブラウザ"],
    layout: "ロゴタイル型: 連携サービスのロゴをタイル状に並べ、対応環境を短く言及する",
  },
  {
    id: "footer",
    name: "フッター",
    purpose: "全ページ共通の情報整理と迷ったユーザーの最後の受け皿",
    slots: ["ロゴ", "サイトマップリンク", "会社情報・住所・電話", "SNSアイコン", "法的リンク", "コピーライト"],
    layout: "マルチカラム型: サイトマップリンクを3〜4列で整理し、会社情報・SNS・法的リンク・コピーライトを収める（LPはロゴと最小リンクの中央寄せでよい）",
  },
];

/** id からセクション定義を引く */
export const SECTION_MAP: Record<string, SectionSpec> = Object.fromEntries(
  WEB_SECTIONS.map((s) => [s.id, s]),
);

/** 自由構成モードで選べるセクション（core+commonから厳選） */
export const SECTION_PILL_IDS: string[] = [
  "problem",
  "solution",
  "features",
  "benefits",
  "concept",
  "message",
  "about",
  "service-list",
  "menu",
  "pricing",
  "campaign",
  "case-study",
  "testimonials",
  "logos-media",
  "stats",
  "gallery",
  "works",
  "team",
  "flow",
  "faq",
  "news",
  "access",
  "reservation",
  "cta",
  "contact",
  "footer",
];

/** サイト種別未選択時の汎用フォールバック構成 */
export const GENERIC_PRESET: string[] = [
  "features",
  "testimonials",
  "pricing",
  "flow",
  "faq",
  "cta",
  "footer",
];

/* ========== FVレイアウト ========== */

export interface FvLayout {
  id: string;
  name: string;
  /** カードのdesc用の1行要約 */
  cardDesc: string;
  tags: string[];
  /** 画像生成用の配置記述文（比率の指定は含めない） */
  spec: string;
}

export const FV_LAYOUTS: FvLayout[] = [
  {
    id: "split-text-left",
    name: "左テキスト×右ビジュアル",
    cardDesc: "左にコピーとCTA・右に写真。読み順が自然で情報とビジュアルを両立する最汎用型",
    tags: ["誠実", "クリーン", "SaaS・士業"],
    spec: "画面上端に高さの細いナビゲーションバー（左端にロゴ、右端に5つのテキストメニューと角丸の問い合わせボタン）。本文エリアは左右分割：左45%は明るい無地背景のテキストエリアで、上から順に大きな太字キャッチコピー2行、その下に小さめのサブコピー1行、その下に塗りつぶし角丸のCTAボタン1つと枠線のみのサブボタン1つを横並び、さらにその下に小さな実績バッジを3つ横並び。右55%は縁まで裁ち落とした大きな写真で、被写体は写真の中央やや右に配置し、視線や体の向きが左（テキスト側）を向いている。全体に余白が多く整然としたレイアウト。",
  },
  {
    id: "split-text-right",
    name: "右テキスト×左ビジュアル",
    cardDesc: "写真を先に見せて感情を掴み、視線の終点の右下にCTAを収めるミラー型",
    tags: ["エモーショナル", "上質", "美容・ブライダル"],
    spec: "上端に細いナビゲーションバー（左にロゴ、右にメニュー）。本文エリアは左右分割：左55%は縁まで裁ち落とした大きな写真で、被写体は中央やや左に置き、視線や動きが右（テキスト側）へ向かう。右45%は無地背景のテキストエリアで、大きなキャッチコピー2行、サブコピー1行、その下に目立つ色の角丸CTAボタン1つを縦に積む。テキストブロックは左揃えで、右下にCTAが視線の終点として収まる構図。",
  },
  {
    id: "full-bleed-overlay",
    name: "全面写真×オーバーレイ",
    cardDesc: "画面全体を1枚の写真で覆い白文字コピーを重ねる没入型。写真の質がすべて",
    tags: ["ドラマチック", "高級感", "宿・飲食"],
    spec: "画面全体を縁まで1枚の高品質な写真が覆う。写真の下半分に黒の半透明グラデーションオーバーレイ（下端が濃く上に向かって透明になる）。左下エリアに白文字で大きなキャッチコピー2行とその下に小さなサブコピー1行、白い枠線のみのCTAボタン1つ。上端のナビゲーションは背景透過で白いロゴとメニューのみ。写真の主要被写体はコピーと重ならないよう画面右寄りか中央に配置。",
  },
  {
    id: "center-stack",
    name: "センター積み",
    cardDesc: "キャッチ→サブ→CTAを中央に縦積み。1つの強いメッセージに集中させる定番",
    tags: ["ミニマル", "先進的", "SaaS・LP"],
    spec: "背景は淡いグラデーション（1色から近い明度の別色へ）で、うっすらとした抽象的な図形やドットが浮かぶ。全要素を画面の水平中央に中央揃えで縦に積む：上端に細いナビゲーションバー、その下に小さなラベルバッジ（お知らせ風のピル型）、大きな太字キャッチコピー2行、サブコピー1行、塗りつぶしCTAボタンと枠線サブボタンの横並び、最下部に利用企業ロゴを5つ淡い色で横一列。左右対称の安定した構図で余白を広く取る。",
  },
  {
    id: "typography-hero",
    name: "タイポグラフィ主役",
    cardDesc: "画面幅いっぱいの巨大な文字がビジュアル。態度と個性を最短距離で見せる",
    tags: ["尖った", "アート", "デザイン事務所"],
    spec: "背景はほぼ無地（オフホワイトまたは濃色1色）。画面幅の85%を占める超巨大なタイポグラフィのキャッチコピーを2〜3行、左揃えで大胆に配置し、一部の単語だけ書体やスタイル（イタリック・アウトライン文字）を変えてリズムを作る。文字の行間に小さな切り抜き写真か図形を1つだけ挟み込む。右下に小さなサブコピーと下線付きテキストリンクのCTA。上端に極小のロゴとハンバーガーメニューのみ。写真より文字が主役の構図。",
  },
  {
    id: "diagonal-split",
    name: "斜め分割",
    cardDesc: "色面と写真を斜めラインで分割し動きとスピード感を出す。角度は20度前後",
    tags: ["エネルギッシュ", "スポーティ", "ジム・採用"],
    spec: "画面を左下から右上へ約20度の斜めラインで2分割。左側はビビッドな単色の色面で、太いサンセリフのキャッチコピー2行を水平に置き、下に角丸CTAボタン。右側は動きのある写真（人物が動いている瞬間）を斜めの境界で裁ち落とす。境界線に沿って細いアクセントカラーのラインを1本走らせる。上端に横断するナビゲーションバー。全体にスピード感と勢いのある構図。",
  },
  {
    id: "collage-hero",
    name: "コラージュ",
    cardDesc: "切り抜き写真やシール・手書き線を散らす賑やかな手作り感。視線の中心は1つに",
    tags: ["ポップ", "手作り感", "イベント・雑貨"],
    spec: "紙のテクスチャの背景に、白フチ付きの切り抜き写真を4〜5枚、角度を少しずつ傾けて散らしたコラージュ。マスキングテープや丸いステッカー、手書き風の矢印と星の落書きを写真の周囲に添える。画面中央に最も大きな要素として、太いポップな書体のキャッチコピーを紙のラベルに載せて配置。左下にサブコピー、右下に手描き風の枠のCTAボタン。上端にシンプルなロゴとメニュー。賑やかだが中央のコピーに視線が集まる構成。",
  },
  {
    id: "product-hero",
    name: "商品ヒーロー",
    cardDesc: "商品そのものを中央に大きく置く物撮り型。D2C・ECの定番でライティングが命",
    tags: ["高級感", "シズル感", "コスメ・食品EC"],
    spec: "中央に商品を1つだけ大きく配置したスタジオ撮影風のビジュアル。背景は商品の色と調和した無地からのなだらかなグラデーションで、商品の下に柔らかい影、斜め上からのライティングでハイライトが立つ。商品の左上の空間に細めの上品な書体でキャッチコピー2行、その下にサブコピー1行。商品の右下の空間に価格表記と塗りつぶしの購入CTAボタン。周囲に商品の素材（花びら・水滴・原料など）を小さく浮遊させて世界観を補強。上端に細いナビゲーション。",
  },
  {
    id: "vertical-jp",
    name: "縦書き和風",
    cardDesc: "縦書き明朝と余白の「間」で組む和の構え。旅館・和食・伝統工芸に",
    tags: ["和モダン", "静謐", "格式"],
    spec: "背景は生成り色の和紙テクスチャ。画面右端から1割ほど内側に、明朝体の縦書きキャッチコピーを1〜2行、上端から下へ流す。画面左60%に和の被写体（料理・庭園・職人の手元）の写真を縦長にトリミングして配置し、写真の縁は裁ち落とすか細い墨色の罫線で囲む。右下に小さな朱印風の赤いロゴマーク。余白を非常に広く取り、要素は少なく、静けさと格式を感じる構図。ナビゲーションは上端に極小の横書きメニュー。",
  },
  {
    id: "photo-grid",
    name: "グリッド写真",
    cardDesc: "写真を敷き詰め実例の量と幅で信頼を作る。中央のテキストボックスに視線を集める",
    tags: ["実績重視", "ギャラリー", "美容・施工事例"],
    spec: "画面全体に大小さまざまな写真を6枚、隙間の細いグリッド状に敷き詰める（大きい写真1枚＋中2枚＋小3枚のマソンリー構成）。写真はすべて同一トーンで統一。画面中央に白い長方形のテキストボックスを写真の上に重ね、その中に中央揃えでキャッチコピー2行、サブコピー1行、CTAボタン1つ。テキストボックスの周囲にわずかな影を付けて浮かせる。上端に細いナビゲーションバー。写真の物量で実績を語る構図。",
  },
  {
    id: "cinematic-still",
    name: "シネマティック",
    cardDesc: "映画のワンシーンのような1枚と字幕風コピー。レターボックスで映像感を演出",
    tags: ["ドラマチック", "ストーリー", "ブランド・採用"],
    spec: "画面全体が映画のワンシーンのような写真：浅い被写界深度、逆光やマジックアワーの色温度、粒子感のあるシネマティックなカラーグレーディング。画面の上下に細い黒帯（レターボックス）を敷いて映像らしさを強調。画面下部中央に映画字幕風の細い白文字でキャッチコピー1行、その下にさらに小さくサブコピー。右下に小さな再生ボタン風の円形アイコンとCTAテキスト。ナビゲーションは透過で最小限。物語の途中を切り取ったような余韻のある構図。",
  },
  {
    id: "card-float",
    name: "カード浮遊（ガラス質感）",
    cardDesc: "すりガラス風カードを背景に浮かべ、世界観と可読性を両立する今風の質感",
    tags: ["先進的", "透明感", "金融・SaaS"],
    spec: "背景全面に少しぼかした写真または深い色のグラデーション。画面左寄りに、白の半透明ですりガラス質感（背景が透けてぼける）の大きな角丸カードを浮かべ、細い光の縁取りと柔らかい影を付ける。カードの中に左揃えでキャッチコピー2行、サブコピー1行、塗りつぶしCTAボタン、その下に小さな信頼バッジ（星評価と導入数）。背景の右側には被写体やUI要素をぼんやり見せる。上端に透過ナビゲーション。奥行きと透明感のあるレイヤー構成。",
  },
  {
    id: "magazine-editorial",
    name: "雑誌風エディトリアル",
    cardDesc: "誌面見開きのような非対称グリッドと細身セリフ。文字と写真の緊張感で見せる",
    tags: ["ハイセンス", "上質", "アパレル・メディア"],
    spec: "雑誌の見開きのような非対称レイアウト。右側3分の2に人物のファッション写真を縁まで裁ち落とし、左側3分の1はオフホワイトの余白に細身のセリフ体で大きなキャッチコピーを縦に3行、行頭を少しずつずらして配置。コピーの上に号数風の小さな飾りテキスト（vol.やissue風の英字）、下に細い罫線とサブコピー。左下に小さな正方形の添え写真を1枚。ナビゲーションは上端に細い英字メニュー。文字と写真の間の緊張感がある洗練された構図。",
  },
  {
    id: "illustration-hero",
    name: "イラスト主役",
    cardDesc: "フラットイラストが主役。抽象的なサービスの可視化と親しみやすさに強い",
    tags: ["親しみやすい", "柔らかい", "教育・公共"],
    spec: "左40%は無地背景のテキストエリアで、丸みのあるサンセリフの太いキャッチコピー2行、サブコピー1行、角丸の塗りつぶしCTAボタン。右60%に温かみのある配色のフラットイラスト：サービスを利用して笑顔になっている複数の人物、周囲に浮かぶアイコンや吹き出し、足元に抽象的な地面の形。イラストの一部（葉っぱや図形）が画面の縁からはみ出す。背景の下部を波形の色面で区切ってやわらかさを出す。上端にナビゲーションバー。全体に親しみやすく明るい印象。",
  },
  {
    id: "ui-screenshot-hero",
    name: "プロダクトUI提示型",
    cardDesc: "ブラウザモックに入れた画面を大きく見せ「何ができるか」を一瞬で伝えるSaaS定番",
    tags: ["プロダクト主導", "テック", "SaaS・アプリ"],
    spec: "上半分は中央揃えのテキスト：小さなピル型バッジ、大きな太字キャッチコピー2行、サブコピー1行、CTAボタン2つ横並び。下半分に、ブラウザウィンドウ枠（上部に3つの丸いボタン）に入ったプロダクトのダッシュボード画面を大きく配置し、下端は画面外に見切れさせる。ブラウザモックには柔らかい大きな影を付け、少しだけ奥に傾けた遠近感。その左右に小さなフローティングUIカード（グラフや通知）を浮かべる。背景は淡いグラデーションと細いグリッド線。上端にナビゲーションバー。",
  },
  {
    id: "bento-grid",
    name: "ベントーグリッド",
    cardDesc: "大小の角丸タイルにキャッチ・写真・数字を並列で敷き詰める情報整理のトレンド型",
    tags: ["整理された", "情報密度", "多機能SaaS"],
    spec: "画面全体を隙間が均等な角丸カードのグリッド（ベントーグリッド）で構成：左上に最も大きいカードを置き、その中に太いキャッチコピー2行とCTAボタン。残りのスペースに大きさの違うカードを5〜6枚敷き詰め、それぞれに写真1枚、大きな数字の実績（例：導入社数）、簡単なグラフ、機能アイコンと短いラベル、顔写真入りの一言コメントを入れる。カードの背景色は白ベースに1〜2枚だけアクセントカラー。背景はごく淡いグレー。上端に細いナビゲーションバー。整然としてリズムのあるタイル構成。",
  },
];

/* ========== FVに置く要素 ========== */

export const FV_ELEMENTS: { value: string; label: string }[] = [
  { value: "catch", label: "キャッチコピー" },
  { value: "sub", label: "サブコピー" },
  { value: "cta", label: "CTAボタン" },
  { value: "nav", label: "グローバルナビ" },
  { value: "phone", label: "電話番号" },
  { value: "hours", label: "営業時間" },
  { value: "badges", label: "実績・受賞バッジ" },
  { value: "visual", label: "写真・ビジュアル" },
  { value: "scroll", label: "スクロールサイン" },
];
