import { useCallback, useMemo, useRef, useState } from "react";
import { anthropicProvider } from "../ai/anthropic";
import { getKeys } from "../ai/keys";
import { AiError } from "../ai/types";

/**
 * 壁打ちエンジン（Chat-with-Artifact）。
 * チャット履歴と「構造化された成果物（artifact）」を対で更新する。
 * - キーあり: json_schema で {reply, artifact} を構造保証して受け取る
 * - キーなし: コピペモード（プロンプト全文コピー → 外部AIのJSONを貼り戻す）
 */

export interface CoCreateMessage {
  role: "user" | "assistant";
  text: string;
}

export interface CoCreateConfig<T> {
  /** 固定システムプロンプト（役割+知識ベース+規律。プレフィックスキャッシュが効くよう安定させる） */
  system: string;
  /** 成果物のjson_schema（artifact部分のみ。replyラッパーはエンジンが付ける） */
  artifactSchema: object;
  /** 成果物の要約ラベル（コピペモードの説明文に使う） */
  artifactLabel: string;
  /** 任意: 貼り戻しJSONの追加検証（エラー文字列を返すと拒否） */
  validate?: (artifact: T) => string | null;
  maxTokens?: number;
}

export interface CoCreation<T> {
  history: CoCreateMessage[];
  artifact: T | null;
  busy: boolean;
  error: string | null;
  /** キーあり実行。falseならコピペモードで動くべき */
  canRun: boolean;
  send: (input: string) => Promise<void>;
  /** コピペモード: 送信文をコピー用に組み立てる */
  buildCopyPrompt: (input: string) => string;
  /** コピペモード: 外部AIの返答JSONを貼り戻す */
  applyPasted: (jsonText: string, userInput?: string) => string | null;
  /** 成果物を外部から直接更新（手動編集の反映）。履歴には残さない */
  setArtifact: (artifact: T) => void;
  undo: () => void;
  canUndo: boolean;
  reset: (artifact?: T | null) => void;
}

interface TurnResponse<T> {
  reply: string;
  artifact: T;
}

export function useCoCreation<T>(config: CoCreateConfig<T>, initial?: T | null): CoCreation<T> {
  const [history, setHistory] = useState<CoCreateMessage[]>([]);
  const [artifact, setArtifactState] = useState<T | null>(initial ?? null);
  const versionsRef = useRef<T[]>(initial ? [initial] : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const responseSchema = useMemo(
    () => ({
      type: "object",
      properties: {
        reply: {
          type: "string",
          description: "ユーザーへの返答。何をどう変えたか/なぜかを簡潔に（日本語）",
        },
        artifact: config.artifactSchema,
      },
      required: ["reply", "artifact"],
      additionalProperties: false,
    }),
    [config.artifactSchema],
  );

  const buildTurnPrompt = useCallback(
    (input: string) => {
      const parts: string[] = [];
      if (history.length > 0) {
        parts.push("## これまでの会話");
        parts.push(
          history
            .slice(-12)
            .map((m) => `${m.role === "user" ? "ユーザー" : "あなた"}: ${m.text}`)
            .join("\n"),
        );
      }
      parts.push(`## 現在の${config.artifactLabel}（JSON）`);
      parts.push(artifact ? JSON.stringify(artifact, null, 2) : "（まだ無い。初案を作る）");
      parts.push("## ユーザーの指示");
      parts.push(input);
      parts.push(
        `## 出力の決まり\n指示を反映した${config.artifactLabel}の全体を artifact に、変更点の説明を reply に入れて返す。変更していない部分も省略せず全体を返すこと。`,
      );
      return parts.join("\n\n");
    },
    [history, artifact, config.artifactLabel],
  );

  const commit = useCallback((input: string, res: TurnResponse<T>) => {
    versionsRef.current.push(res.artifact);
    setHistory((h) => [...h, { role: "user", text: input }, { role: "assistant", text: res.reply }]);
    setArtifactState(res.artifact);
  }, []);

  const send = useCallback(
    async (input: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await anthropicProvider.generateJson<TurnResponse<T>>({
          system: config.system,
          prompt: buildTurnPrompt(input),
          schema: responseSchema,
          thinking: true,
          maxTokens: config.maxTokens ?? 32000,
        });
        const invalid = config.validate?.(res.artifact);
        if (invalid) {
          // 1回だけ修復を試みる
          const fixed = await anthropicProvider.generateJson<TurnResponse<T>>({
            system: config.system,
            prompt:
              buildTurnPrompt(input) +
              `\n\n## 直前の出力の問題\n${invalid}\nこの問題を直して、もう一度全体を返して。`,
            schema: responseSchema,
            thinking: true,
            maxTokens: config.maxTokens ?? 32000,
          });
          const still = config.validate?.(fixed.artifact);
          if (still) throw new AiError(`検証エラーが直らなかった: ${still}`);
          commit(input, fixed);
          return;
        }
        commit(input, res);
      } catch (e) {
        setError(e instanceof AiError ? e.message : String((e as Error).message ?? e));
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [config, buildTurnPrompt, responseSchema, commit],
  );

  const buildCopyPrompt = useCallback(
    (input: string) => {
      return [
        config.system,
        buildTurnPrompt(input),
        `## 返答形式（厳守）\n次のJSONだけを返す（コードブロックや前置きなし）:\n{"reply": "変更点の説明", "artifact": ${config.artifactLabel}のJSON}`,
      ].join("\n\n");
    },
    [config, buildTurnPrompt],
  );

  const applyPasted = useCallback(
    (jsonText: string, userInput?: string): string | null => {
      try {
        // コードブロックで囲まれていたら剥がす
        const cleaned = jsonText.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
        const parsed = JSON.parse(cleaned) as TurnResponse<T>;
        if (!parsed || typeof parsed !== "object" || parsed.artifact === undefined) {
          return "JSONに artifact が見つからない";
        }
        const invalid = config.validate?.(parsed.artifact);
        if (invalid) return invalid;
        commit(userInput ?? "（コピペモードでの指示）", {
          reply: parsed.reply ?? "（外部AIの返答を反映）",
          artifact: parsed.artifact,
        });
        return null;
      } catch {
        return "JSONとして読めなかった。外部AIの返答をそのまま貼ってね";
      }
    },
    [config, commit],
  );

  const setArtifact = useCallback((a: T) => {
    versionsRef.current.push(a);
    setArtifactState(a);
  }, []);

  const undo = useCallback(() => {
    if (versionsRef.current.length <= 1) return;
    versionsRef.current.pop();
    const prev = versionsRef.current[versionsRef.current.length - 1] ?? null;
    setArtifactState(prev);
    setHistory((h) => [...h, { role: "assistant", text: "（ひとつ前の状態に戻した）" }]);
  }, []);

  const reset = useCallback((a?: T | null) => {
    versionsRef.current = a ? [a] : [];
    setArtifactState(a ?? null);
    setHistory([]);
    setError(null);
  }, []);

  return {
    history,
    artifact,
    busy,
    error,
    canRun: Boolean(getKeys().anthropic),
    send,
    buildCopyPrompt,
    applyPasted,
    setArtifact,
    undo,
    canUndo: versionsRef.current.length > 1,
    reset,
  };
}
