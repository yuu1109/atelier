/**
 * atelier. の中核契約。
 * 各ツール（slide / thumb / diagram / writer / imagemd / web）は
 * ToolDef ひとつを export し、UIはすべてこのスキーマから自動生成される。
 * ツール実装者が書くのは「フィールド定義（データ）」と「build（プロンプト組み立て）」だけ。
 */

/** repeater の1アイテムぶんの状態 */
export type ItemState = Record<string, string | number | boolean | string[]>;

/** フィールドの値 */
export type FieldValue = string | number | boolean | string[] | ItemState[];

/** ツール1つぶんの状態（fieldId → 値） */
export type ToolState = Record<string, FieldValue>;

export interface Option {
  value: string;
  label: string;
  /** 補足説明（cards で表示される） */
  desc?: string;
  /** タグチップ（cards で表示される） */
  tags?: string[];
  /**
   * cards 用のミニプレビュー。
   * image があれば最優先で表示（読み込み失敗時は自動で colors のスウォッチにフォールバック）。
   * colors はそのプリセットのプロンプト本文に書かれているHEXをそのまま転記する。
   */
  preview?: {
    image?: string;
    colors?: string[];
    texture?: "flat" | "duo" | "isometric" | "mono" | "illustration";
  };
}

export type FieldKind =
  /** 単一選択・少数（2〜5択）。iOS風セグメントコントロール */
  | "segment"
  /** 単一選択・多数。ピル群 */
  | "pills"
  /** 複数選択ピル */
  | "multi"
  /** 単一選択・リッチカード（スタイルプリセット等の大きい選択肢） */
  | "cards"
  | "text"
  | "textarea"
  /** 数値ステッパー（− n ＋） */
  | "number"
  /** iOSスイッチ（ONは緑） */
  | "toggle"
  /** カラースウォッチ＋自由入力 */
  | "color"
  /** アイテム別設定の繰り返し（スライド別・画像別・セクション別） */
  | "repeater";

export interface FieldDef {
  id: string;
  kind: FieldKind;
  label?: string;
  /** フィールド下の補足テキスト */
  help?: string;
  placeholder?: string;
  /** segment / pills / multi / cards の選択肢 */
  options?: Option[];
  /** cards のグリッド列数（デフォルト2） */
  columns?: 2 | 3;
  /** number の範囲 */
  min?: number;
  max?: number;
  /** color のスウォッチ候補 */
  swatches?: { value: string; label: string }[];
  /** textarea の行数（デフォルト4） */
  rows?: number;
  /** repeater: 各アイテムに表示するフィールド（kind: repeater は入れ子不可） */
  itemFields?: FieldDef[];
  /** repeater: アイテム数を駆動する number フィールドの id */
  countField?: string;
  /** repeater: アイテムの見出し（"Image 01" 等） */
  itemLabel?: (index: number, item: ItemState) => string;
  /** 表示条件。false なら描画もプロンプト反映もしない */
  showIf?: (s: ToolState) => boolean;
}

export interface SectionDef {
  id: string;
  /** "01" などのステップ番号。省略可 */
  num?: string;
  title: string;
  badge?: "required" | "optional";
  desc?: string;
  fields: FieldDef[];
  showIf?: (s: ToolState) => boolean;
}

export interface BuiltPrompt {
  /** 生成されたプロンプト本文（コピー対象） */
  text: string;
  /** プロンプトペイン上部に出すメタ表示（枚数 / 比率 / トーン等） */
  meta?: { label: string; value: string }[];
  /** 未入力・矛盾などの注意表示 */
  warnings?: string[];
}

export interface ToolDef {
  id: string;
  /** タブ表示名（短く。例: スライド） */
  name: string;
  /** ヘッダーに出す一言説明 */
  tagline: string;
  sections: SectionDef[];
  /** 初期状態。全フィールドのキーを含めること（repeater は [] でよい） */
  defaults: ToolState;
  build: (s: ToolState) => BuiltPrompt;
}
