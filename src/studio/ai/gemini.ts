import { getKeys, getModels } from "./keys";
import {
  AiError,
  type CostEstimate,
  type GeneratedImage,
  type ImageGenOptions,
  type ImageProvider,
} from "./types";

/**
 * Gemini 画像生成（generateContent + responseModalities: IMAGE）の最小実装。
 * 1リクエスト=1枚の前提で、count は複数回呼び出しで実現する。
 * キーは localStorage（keys.ts）のみ・クエリパラメータで渡す。
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function hasGeminiKey(): boolean {
  return Boolean(getKeys().gemini);
}

/* ===== レスポンス型（必要な部分だけ） ===== */

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
  error?: { message?: string };
}

/** base64 → Blob */
function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** 1枚生成（1リクエスト） */
async function generateOne(prompt: string, modelId: string, key: string): Promise<GeneratedImage> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${modelId}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });
  } catch (e) {
    throw new AiError(`Geminiに接続できなかった（ネットワークを確認してね）`, e);
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      throw new AiError("Gemini APIキーが無効（設定画面で確認してね）");
    }
    if (res.status === 429) {
      throw new AiError("Geminiのレート制限にかかった。少し待って再実行してね");
    }
    throw new AiError(`Gemini画像生成に失敗（HTTP ${res.status}）: ${bodyText.slice(0, 300)}`);
  }

  const json = (await res.json().catch(() => null)) as GeminiResponse | null;
  if (!json) throw new AiError("Geminiの応答をJSONとして読めなかった");
  if (json.error?.message) throw new AiError(`Gemini画像生成に失敗: ${json.error.message}`);

  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const inline = parts.find((p) => p.inlineData?.data)?.inlineData;
  if (!inline?.data) {
    // 画像が返らなかった場合はテキスト部分（拒否理由など）をエラーメッセージにする
    const text = parts
      .map((p) => p.text ?? "")
      .filter(Boolean)
      .join(" ")
      .trim();
    throw new AiError(text ? `画像が生成されなかった: ${text.slice(0, 300)}` : "画像が生成されなかった（応答に画像データが無い）");
  }

  const mime = inline.mimeType ?? "image/png";
  return {
    blob: base64ToBlob(inline.data, mime),
    mime,
    promptUsed: prompt,
    modelId,
  };
}

export const geminiImageProvider: ImageProvider = {
  id: "gemini",
  label: "Gemini",

  get modelId(): string {
    return getModels().geminiImageModel;
  },

  async generate(opts: ImageGenOptions): Promise<GeneratedImage[]> {
    const key = getKeys().gemini;
    if (!key) throw new AiError("GeminiのAPIキーが未設定（設定画面から登録）");
    const modelId = getModels().geminiImageModel;
    const count = Math.max(1, opts.count);

    const results: GeneratedImage[] = [];
    let firstError: AiError | null = null;
    // 1リクエスト=1枚の前提で順に呼ぶ（並列だとレート制限を踏みやすい）
    for (let i = 0; i < count; i++) {
      try {
        results.push(await generateOne(opts.prompt, modelId, key));
      } catch (e) {
        const err = e instanceof AiError ? e : new AiError(String((e as Error).message ?? e), e);
        if (!firstError) firstError = err;
      }
    }
    // 全滅したときだけ失敗にする（部分成功はそのまま返す）
    if (results.length === 0 && firstError) throw firstError;
    return results;
  },

  estimateCost(count: number): CostEstimate {
    void count;
    return { usd: 0, note: "無料枠の目安内（Gemini）。上限超過時のみ課金" };
  },
};
