/**
 * スタジオ（案件パイプライン）の中核型。
 * フェーズ進捗は clients/{案件}/ の「ファイル存在」から導出するのが正
 * （Claude Code側スキルで進めた案件も正しい進捗で表示するため）。
 * state.json はUI復元用の補助にすぎない。
 */

export type PhaseId =
  | "hearing" // ヒアリング（hearing.md）
  | "requirements" // 要件定義（hearing.md の ## 分析 + purposeType）
  | "wireframe" // WF壁打ち（wireframe/index.html → wireframe-fixed.html）
  | "concept" // デザインコンセプト工房（tone.md + moodboard/）
  | "design" // デザインカンプ（design/）
  | "handoff" // 実装引き渡し（spec.md → site/）
  | "tuning"; // 微調整（site/src/styles/tokens.css）

export const PHASE_ORDER: PhaseId[] = [
  "hearing",
  "requirements",
  "wireframe",
  "concept",
  "design",
  "handoff",
  "tuning",
];

export const PHASE_LABEL: Record<PhaseId, string> = {
  hearing: "ヒアリング",
  requirements: "要件定義",
  wireframe: "ワイヤーフレーム",
  concept: "コンセプト",
  design: "デザインカンプ",
  handoff: "実装引き渡し",
  tuning: "微調整",
};

export type PhaseStatus = "empty" | "draft" | "done" | "frozen";

export interface PhaseState {
  status: PhaseStatus;
  /** 表示用の補足（例: "実装済み"） */
  note?: string;
}

export interface Project {
  /** clients/ 直下のディレクトリ名（= 案件ID） */
  dirName: string;
  phases: Record<PhaseId, PhaseState>;
  /** _sample や _ 始まりのテンプレート類 */
  isSample: boolean;
}

/** サイトの一番の目的（hearing Q4-1 → 構成の分岐キー） */
export type PurposeType = "inquiry" | "visit" | "reserve" | "recruit";

export const PURPOSE_LABEL: Record<PurposeType, string> = {
  inquiry: "問い合わせ",
  visit: "来店",
  reserve: "予約",
  recruit: "採用",
};

/** clients/{案件}/_atelier/state.json の中身（補助状態） */
export interface StudioState {
  version: 1;
  purposeType?: PurposeType;
  /** WF壁打ちの成果物（wf/schema.ts の WfPlan をJSONで保持） */
  wfPlan?: unknown;
  /** コンセプト工房の成果物（tone/schema.ts の ConceptState をJSONで保持） */
  concept?: unknown;
  /** 引き渡し記録 */
  handoffAt?: string;
  /** 決定ログ（壁打ちでの重要決定を1行ずつ） */
  decisions?: { at: string; phase: PhaseId; text: string }[];
}

export const EMPTY_STUDIO_STATE: StudioState = { version: 1 };
