import { useState } from "react";
import { MdContentCopy, MdOutlineWarningAmber } from "react-icons/md";
import type { BuiltPrompt } from "../lib/types";
import { copyText } from "../lib/clipboard";
import { charCount, estimateTokens } from "../lib/prompt";

/**
 * 生成プロンプトの表示・コピーペイン。
 * デスクトップでは右カラムに sticky、モバイルではフォーム下に出る。
 */
export function PromptPane({
  built,
  onCopied,
  onCopyFailed,
}: {
  built: BuiltPrompt;
  onCopied: () => void;
  onCopyFailed?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const chars = charCount(built.text);
  const tokens = estimateTokens(built.text);

  const copy = async () => {
    // フォールバック（execCommand）まで失敗したら成功表示にしない
    if (!(await copyText(built.text))) {
      onCopyFailed?.();
      return;
    }
    setCopied(true);
    onCopied();
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="rounded-cardlg bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="section-label">Generated Prompt</div>
          <div className="mt-0.5 text-[11px] text-ink3">
            {chars.toLocaleString()}字 / ~{tokens.toLocaleString()}tok
          </div>
        </div>
        <button
          type="button"
          onClick={copy}
          disabled={built.text.trim() === ""}
          className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-white transition-colors active:opacity-70 disabled:opacity-40 disabled:active:opacity-40"
        >
          <MdContentCopy size={15} />
          {copied ? "コピーした" : "コピー"}
        </button>
      </div>

      {built.meta && built.meta.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {built.meta.map((m) => (
            <span key={m.label} className="rounded-full bg-surface-soft px-2.5 py-1 text-[11px] text-ink2">
              <span className="text-ink3">{m.label}</span> <span className="font-bold text-ink">{m.value}</span>
            </span>
          ))}
        </div>
      ) : null}

      {built.warnings && built.warnings.length > 0 ? (
        <div className="mb-3 space-y-1 rounded-xl bg-warn-bg p-3">
          {built.warnings.map((w) => (
            <div key={w} className="flex items-start gap-1.5 text-[12px] leading-relaxed text-warn">
              <MdOutlineWarningAmber size={14} className="mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      ) : null}

      <pre className="max-h-[62vh] overflow-y-auto whitespace-pre-wrap rounded-xl bg-surface-soft p-4 font-sans text-[12.5px] leading-relaxed text-ink2">
        {built.text.trim() === "" ? "フォームを設定すると、ここにプロンプトが出ます。" : built.text}
      </pre>
    </div>
  );
}
