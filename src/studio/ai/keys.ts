/**
 * APIキーとモデル設定の保存。
 * localStorage の専用キーに置き、既存の exportAll()（atelier-state-v1のみ）には
 * 決して含まれない = 設定エクスポートにキーが混ざらない。
 */

const KEYS_KEY = "atelier-keys-v1";
const MODELS_KEY = "atelier-models-v1";

export interface ApiKeys {
  anthropic?: string;
  gemini?: string;
  openai?: string;
}

export interface ModelSettings {
  /** テキスト生成モデル（既定: claude-opus-4-8） */
  textModel: string;
  /** 画像生成モデル（Gemini系。設定画面で上書き可能） */
  geminiImageModel: string;
  /** 画像生成モデル（OpenAI系） */
  openaiImageModel: string;
}

export const DEFAULT_MODELS: ModelSettings = {
  textModel: "claude-opus-4-8",
  // 2026-07-05 WebSearch確認（docs/research/imagegen-models-2026-07.md）。設定で上書き可能
  geminiImageModel: "gemini-2.5-flash-image",
  openaiImageModel: "gpt-image-2",
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 保存できない環境では諦める（UIは継続） */
  }
}

export function getKeys(): ApiKeys {
  return read<ApiKeys>(KEYS_KEY) ?? {};
}

export function setKeys(keys: ApiKeys) {
  write(KEYS_KEY, keys);
}

export function getModels(): ModelSettings {
  return { ...DEFAULT_MODELS, ...(read<Partial<ModelSettings>>(MODELS_KEY) ?? {}) };
}

export function setModels(models: Partial<ModelSettings>) {
  write(MODELS_KEY, { ...getModels(), ...models });
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}
