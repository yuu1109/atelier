import { estimateImageCost } from "./cost";
import { getKeys, getModels } from "./keys";
import {
  AiError,
  type CostEstimate,
  type GeneratedImage,
  type ImageGenOptions,
  type ImageProvider,
} from "./types";

/**
 * OpenAI Images（gpt-image系）の最小実装。
 * ブラウザからの直接呼び出しはCORSで弾かれる可能性がある（2026-07時点で実地未検証）ため、
 * 接続失敗時はコピペモードへの誘導メッセージを出して縮退する。
 * 1リクエスト=1枚の逐次呼び出し（Geminiプロバイダと同じ流儀）。
 */

const API_URL = "https://api.openai.com/v1/images/generations";

export function hasOpenaiKey(): boolean {
  return Boolean(getKeys().openai);
}

/** アスペクト指定 → gpt-image系のsizeパラメータ */
function sizeForAspect(aspect?: string): string {
  if (aspect === "9:16") return "1024x1536";
  if (aspect === "1:1") return "1024x1024";
  // 16:9相当の横長はネイティブに無いので最も近い1536x1024を使う
  if (aspect === "16:9" || aspect === "4:3") return "1536x1024";
  return "auto";
}

interface OpenaiImageResponse {
  data?: { b64_json?: string }[];
  error?: { message?: string };
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function generateOne(
  prompt: string,
  modelId: string,
  key: string,
  aspect?: string,
): Promise<GeneratedImage> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: modelId,
        prompt,
        n: 1,
        size: sizeForAspect(aspect),
      }),
    });
  } catch (e) {
    // ネットワーク失敗 or CORS拒否。ブラウザ直呼びが塞がれている場合はここに落ちる
    throw new AiError(
      "OpenAIに接続できなかった。ブラウザからの直接呼び出しが制限されている可能性があるよ。その場合は「プロンプトをコピー」で外部AIに貼って、画像を手動アップロードしてね",
      e,
    );
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    if (res.status === 401) throw new AiError("OpenAI APIキーが無効（設定画面で確認してね）");
    if (res.status === 403) {
      throw new AiError("OpenAI APIの権限がない（組織の設定で画像生成が許可されているか確認してね）");
    }
    if (res.status === 429) throw new AiError("OpenAIのレート制限にかかった。少し待って再実行してね");
    throw new AiError(`OpenAI画像生成に失敗（HTTP ${res.status}）: ${bodyText.slice(0, 300)}`);
  }

  const json = (await res.json().catch(() => null)) as OpenaiImageResponse | null;
  if (!json) throw new AiError("OpenAIの応答をJSONとして読めなかった");
  if (json.error?.message) throw new AiError(`OpenAI画像生成に失敗: ${json.error.message}`);

  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new AiError("画像が生成されなかった（応答に画像データが無い）");

  // gpt-image系の出力はPNG
  return {
    blob: base64ToBlob(b64, "image/png"),
    mime: "image/png",
    promptUsed: prompt,
    modelId,
  };
}

export const openaiImageProvider: ImageProvider = {
  id: "openai",
  label: "OpenAI",

  get modelId(): string {
    return getModels().openaiImageModel;
  },

  async generate(opts: ImageGenOptions): Promise<GeneratedImage[]> {
    const key = getKeys().openai;
    if (!key) throw new AiError("OpenAIのAPIキーが未設定（設定画面から登録）");
    const modelId = getModels().openaiImageModel;
    const count = Math.max(1, opts.count);

    const results: GeneratedImage[] = [];
    let firstError: AiError | null = null;
    for (let i = 0; i < count; i++) {
      try {
        results.push(await generateOne(opts.prompt, modelId, key, opts.aspect));
      } catch (e) {
        const err = e instanceof AiError ? e : new AiError(String((e as Error).message ?? e), e);
        if (!firstError) firstError = err;
      }
    }
    if (results.length === 0 && firstError) throw firstError;
    return results;
  },

  estimateCost(count: number): CostEstimate {
    return estimateImageCost("openai", getModels().openaiImageModel, count);
  },
};
