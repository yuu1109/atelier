/**
 * AIプロバイダ抽象。
 * すべてのAI実行ポイントは AiRunButton（fallback.tsx）経由で呼び、
 * キー未設定時は「同じプロンプトをコピー」にフォールバックする。
 */

export interface TextGenOptions {
  system?: string;
  prompt: string;
  maxTokens?: number;
  /** adaptive thinking を有効化（要件定義・壁打ちなど判断系でON推奨） */
  thinking?: boolean;
}

export interface TextProvider {
  readonly id: string;
  readonly label: string;
  /** json_schema で構造を保証したJSON生成 */
  generateJson<T>(opts: TextGenOptions & { schema: object; schemaName?: string }): Promise<T>;
  /** テキスト生成（onDeltaでストリーミング受信） */
  generateText(opts: TextGenOptions, onDelta?: (text: string) => void): Promise<string>;
}

export interface ImageGenOptions {
  prompt: string;
  count: number;
  /** "16:9" | "1:1" | "9:16" 等（プロバイダが対応しない場合は無視してよい） */
  aspect?: string;
}

export interface GeneratedImage {
  blob: Blob;
  mime: string;
  promptUsed: string;
  modelId: string;
}

export interface CostEstimate {
  /** 概算金額（USD）。無料枠内の見込みなら0 */
  usd: number;
  /** 表示用の説明（例: "無料枠内の見込み（Gemini）" / "$0.08 × 4枚"） */
  note: string;
}

export interface ImageProvider {
  readonly id: string;
  readonly label: string;
  readonly modelId: string;
  generate(opts: ImageGenOptions): Promise<GeneratedImage[]>;
  estimateCost(count: number): CostEstimate;
}

export class AiError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }
}
