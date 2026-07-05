import { useState } from "react";
import { MdAutoAwesome, MdContentCopy } from "react-icons/md";
import { copyText } from "../../lib/clipboard";
import { getKeys } from "./keys";

/**
 * すべてのAI実行ポイントはこのボタン経由にする（両対応の実装規約）。
 * - キーあり: 「label」ボタン → onRun 実行
 * - キーなし: 「プロンプトをコピー」に変わり、同じ内容をコピペで外部AIに投げられる
 */
export function AiRunButton({
  label,
  running = false,
  disabled = false,
  onRun,
  fallbackPrompt,
  onToast,
  keyKind = "anthropic",
  size = "md",
}: {
  label: string;
  running?: boolean;
  disabled?: boolean;
  onRun: () => void | Promise<void>;
  /** キー未設定時にコピーする全文プロンプト。null なら入力不足でコピー不可 */
  fallbackPrompt: () => string | null;
  onToast: (msg: string) => void;
  keyKind?: "anthropic" | "gemini" | "openai";
  size?: "md" | "sm";
}) {
  const hasKey = Boolean(getKeys()[keyKind]);
  const cls =
    size === "sm"
      ? "gap-1 rounded-full px-3 py-1.5 text-[12px]"
      : "gap-1.5 rounded-full px-4 py-2.5 text-[13px]";

  if (!hasKey) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={async () => {
          const prompt = fallbackPrompt();
          if (!prompt) {
            onToast("先に入力を埋めてね");
            return;
          }
          if (await copyText(prompt)) onToast("プロンプトをコピーしたよ。外部AIに貼って、結果を戻してね");
          else onToast("コピーできなかった…");
        }}
        className={`flex items-center font-bold ${cls} bg-surface-soft text-ink2 transition-colors active:opacity-70 disabled:opacity-40`}
        title="APIキー未設定のためコピペモード（設定画面でキーを入れるとワンクリック実行になる）"
      >
        <MdContentCopy size={size === "sm" ? 13 : 15} />
        プロンプトをコピー
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || running}
      onClick={() => void onRun()}
      className={`flex items-center font-bold ${cls} bg-accent text-white transition-colors active:opacity-70 disabled:opacity-40`}
    >
      <MdAutoAwesome size={size === "sm" ? 13 : 15} className={running ? "animate-pulse" : ""} />
      {running ? "生成中…" : label}
    </button>
  );
}
