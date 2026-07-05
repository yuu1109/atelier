import Anthropic from "@anthropic-ai/sdk";
import { getKeys, getModels } from "./keys";
import { AiError, type TextGenOptions, type TextProvider } from "./types";

/**
 * Anthropic Messages API のブラウザ直コール実装。
 * 個人利用ツールのため dangerouslyAllowBrowser を明示オプトインする
 * （キーはこの端末のlocalStorageのみ・外部スクリプト読み込みゼロの構成が前提）。
 */

export function hasAnthropicKey(): boolean {
  return Boolean(getKeys().anthropic);
}

function client(): Anthropic {
  const key = getKeys().anthropic;
  if (!key) throw new AiError("AnthropicのAPIキーが未設定（設定画面から登録）");
  return new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
}

export const anthropicProvider: TextProvider = {
  id: "anthropic",
  label: "Claude",

  async generateJson<T>(opts: TextGenOptions & { schema: object; schemaName?: string }): Promise<T> {
    const c = client();
    try {
      const res = await c.messages.create({
        model: getModels().textModel,
        max_tokens: opts.maxTokens ?? 16000,
        system: opts.system,
        ...(opts.thinking ? { thinking: { type: "adaptive" as const } } : {}),
        output_config: {
          format: {
            type: "json_schema",
            schema: opts.schema,
          },
        },
        messages: [{ role: "user", content: opts.prompt }],
      } as Parameters<typeof c.messages.create>[0]);
      const msg = res as { stop_reason?: string; content: { type: string; text?: string }[] };
      if (msg.stop_reason === "refusal") throw new AiError("AIが生成を拒否した（プロンプトを見直してね）");
      const text = msg.content.find((b) => b.type === "text")?.text;
      if (!text) throw new AiError("AIの応答が空だった");
      return JSON.parse(text) as T;
    } catch (e) {
      throw toAiError(e);
    }
  },

  async generateText(opts: TextGenOptions, onDelta?: (text: string) => void): Promise<string> {
    const c = client();
    try {
      const stream = c.messages.stream({
        model: getModels().textModel,
        max_tokens: opts.maxTokens ?? 16000,
        system: opts.system,
        ...(opts.thinking ? { thinking: { type: "adaptive" as const } } : {}),
        messages: [{ role: "user", content: opts.prompt }],
      } as Parameters<typeof c.messages.stream>[0]);
      if (onDelta) stream.on("text", (t) => onDelta(t));
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") throw new AiError("AIが生成を拒否した（プロンプトを見直してね）");
      return final.content
        .filter((b): b is Extract<(typeof final.content)[number], { type: "text" }> => b.type === "text")
        .map((b) => b.text)
        .join("");
    } catch (e) {
      throw toAiError(e);
    }
  },
};

function toAiError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  const err = e as { status?: number; message?: string };
  if (err.status === 401) return new AiError("Anthropic APIキーが無効（設定画面で確認）", e);
  if (err.status === 429) return new AiError("レート制限にかかった。少し待って再実行してね", e);
  if (err.status === 529) return new AiError("Anthropic側が混雑中。少し待って再実行してね", e);
  return new AiError(`AI呼び出しに失敗: ${err.message ?? String(e)}`, e);
}
