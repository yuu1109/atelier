/**
 * デザインコンセプト工房の成果物スキーマ。
 * DESIGN.md のトークン契約（カラー10変数・タイポ・余白・装飾T/B・写真トーン・禁止事項）に準拠。
 * TS型とjson_schemaを必ず同期させること。
 */

export interface DesignConcept {
  /** コンセプト名（例: 湯気と木漏れ日） */
  title: string;
  /** コンセプト文（2〜3文。誰に何をどう感じさせるか） */
  statement: string;
  keywords: string[];
  /** 質感の言語化（例: 和紙のざらつき, 淹れたてのコントラスト） */
  textures: string[];
  /** 参照した既存トーンslug（あれば。完全カスタムなら空） */
  referenceTones: string[];
  /** ムードボード画像生成の方向性メモ */
  moodDirection: string;
}

export interface DesignSystemColors {
  bg: string;
  bgAlt: string;
  surface: string;
  ink: string;
  inkMuted: string;
  heading: string;
  primary: string;
  onPrimary: string;
  accent: string;
  border: string;
}

export interface DesignSystem {
  /** custom-{案件名} 形式。既存トーン準拠なら 01-wa-modern 等 */
  slug: string;
  name: string;
  /** 人格ひと言（例: 静けさで信頼させる和の設え） */
  personality: string;
  colors: DesignSystemColors;
  /** 派生色（最大3。例: primary-soft） */
  derived?: { name: string; value: string }[];
  fonts: {
    /** 例: "Zen Old Mincho", serif */
    heading: string;
    body: string;
    accent: string;
    /** Google Fonts の読み込みURL（family=...&display=swap） */
    googleFontsUrl: string;
    headingLetterSpacing?: string;
  };
  spacing: {
    /** セクション上下の標準余白 */
    sectionDefault: "space-8" | "space-12" | "space-16";
    philosophy: string;
  };
  radius: {
    /** 例: "直角基調（硬質）" / "カード8px・ボタンはピル" */
    attitude: string;
  };
  decorations: {
    /** タイトル装飾レシピ（T-01〜T-35。DESIGN.md §4） */
    titleRecipes: string[];
    /** ボタンレシピ（B-03〜B-31。DESIGN.md §5） */
    buttonRecipes: string[];
    /** トーン固有の演出（透かし英字・縦書き・grain等。最低2つ） */
    extras: string[];
  };
  photoTone: {
    subject: string;
    light: string;
    color: string;
    /** 全画像共通フィルタCSS（例: saturate(0.92) contrast(1.04)） */
    filterCss: string;
  };
  /** このトーンでやってはいけないこと（5つ以上） */
  forbidden: string[];
}

/** state.json に保存するコンセプト工房の状態 */
export interface ConceptState {
  concept: DesignConcept | null;
  designSystem: DesignSystem | null;
  /** moodboard/ に採用済みのファイル名 */
  adoptedMoods: string[];
}

const COLOR_PROP = { type: "string", pattern: "^#[0-9a-fA-F]{6}$" };

export const DESIGN_CONCEPT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    statement: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
    textures: { type: "array", items: { type: "string" } },
    referenceTones: { type: "array", items: { type: "string" } },
    moodDirection: { type: "string" },
  },
  required: ["title", "statement", "keywords", "textures", "referenceTones", "moodDirection"],
  additionalProperties: false,
} as const;

export const DESIGN_SYSTEM_SCHEMA = {
  type: "object",
  properties: {
    slug: { type: "string" },
    name: { type: "string" },
    personality: { type: "string" },
    colors: {
      type: "object",
      properties: {
        bg: COLOR_PROP,
        bgAlt: COLOR_PROP,
        surface: COLOR_PROP,
        ink: COLOR_PROP,
        inkMuted: COLOR_PROP,
        heading: COLOR_PROP,
        primary: COLOR_PROP,
        onPrimary: COLOR_PROP,
        accent: COLOR_PROP,
        border: COLOR_PROP,
      },
      required: [
        "bg",
        "bgAlt",
        "surface",
        "ink",
        "inkMuted",
        "heading",
        "primary",
        "onPrimary",
        "accent",
        "border",
      ],
      additionalProperties: false,
    },
    derived: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, value: { type: "string" } },
        required: ["name", "value"],
        additionalProperties: false,
      },
    },
    fonts: {
      type: "object",
      properties: {
        heading: { type: "string" },
        body: { type: "string" },
        accent: { type: "string" },
        googleFontsUrl: { type: "string" },
        headingLetterSpacing: { type: "string" },
      },
      required: ["heading", "body", "accent", "googleFontsUrl"],
      additionalProperties: false,
    },
    spacing: {
      type: "object",
      properties: {
        sectionDefault: { type: "string", enum: ["space-8", "space-12", "space-16"] },
        philosophy: { type: "string" },
      },
      required: ["sectionDefault", "philosophy"],
      additionalProperties: false,
    },
    radius: {
      type: "object",
      properties: { attitude: { type: "string" } },
      required: ["attitude"],
      additionalProperties: false,
    },
    decorations: {
      type: "object",
      properties: {
        titleRecipes: { type: "array", items: { type: "string" } },
        buttonRecipes: { type: "array", items: { type: "string" } },
        extras: { type: "array", items: { type: "string" } },
      },
      required: ["titleRecipes", "buttonRecipes", "extras"],
      additionalProperties: false,
    },
    photoTone: {
      type: "object",
      properties: {
        subject: { type: "string" },
        light: { type: "string" },
        color: { type: "string" },
        filterCss: { type: "string" },
      },
      required: ["subject", "light", "color", "filterCss"],
      additionalProperties: false,
    },
    forbidden: { type: "array", items: { type: "string" } },
  },
  required: [
    "slug",
    "name",
    "personality",
    "colors",
    "fonts",
    "spacing",
    "radius",
    "decorations",
    "photoTone",
    "forbidden",
  ],
  additionalProperties: false,
} as const;
