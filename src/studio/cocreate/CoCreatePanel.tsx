import { useRef, useState } from "react";
import { MdContentCopy, MdSend, MdUndo } from "react-icons/md";
import { copyText } from "../../lib/clipboard";
import type { CoCreation } from "./session";

/**
 * 壁打ちパネル（チャットUI）。成果物のプレビューは呼び出し側が別ペインで描画する。
 * キーなし環境ではコピペモード（プロンプトコピー→JSON貼り戻し）に自動で切り替わる。
 */
export function CoCreatePanel<T>({
  cocreate,
  placeholder = "指示を書く（例: 料金を上に移動して、FVはもっと大胆に）",
  suggestions = [],
  onToast,
}: {
  cocreate: CoCreation<T>;
  placeholder?: string;
  suggestions?: string[];
  onToast: (msg: string) => void;
}) {
  const [input, setInput] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [lastCopied, setLastCopied] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
    });
  };

  const runSend = async () => {
    const text = input.trim();
    if (!text) return;
    if (cocreate.canRun) {
      setInput("");
      try {
        await cocreate.send(text);
      } catch {
        setInput(text); // 失敗したら入力を戻す
      }
      scrollToBottom();
    } else {
      // コピペモード: プロンプトをコピーして貼り戻し欄を開く
      const prompt = cocreate.buildCopyPrompt(text);
      if (await copyText(prompt)) {
        setLastCopied(text);
        setPasteOpen(true);
        onToast("プロンプトをコピーした。外部AIの返答JSONを下に貼ってね");
      } else {
        onToast("コピーできなかった…");
      }
    }
  };

  const applyPaste = () => {
    const err = cocreate.applyPasted(pasted, lastCopied ?? undefined);
    if (err) {
      onToast(err);
      return;
    }
    setPasted("");
    setPasteOpen(false);
    setInput("");
    setLastCopied(null);
    onToast("反映したよ");
    scrollToBottom();
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-cardlg bg-surface">
      <div className="flex items-center justify-between px-4 pt-4">
        <span className="section-label">Co-Create</span>
        <button
          type="button"
          disabled={!cocreate.canUndo}
          onClick={cocreate.undo}
          className="flex items-center gap-1 rounded-full bg-surface-soft px-2.5 py-1 text-[11px] text-ink2 transition-colors active:opacity-70 disabled:opacity-40"
        >
          <MdUndo size={12} />
          ひとつ戻す
        </button>
      </div>

      <div ref={logRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {cocreate.history.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-ink3">
            ここでAIと壁打ちしながら作っていく。
            {cocreate.canRun ? "" : "（キー未設定のためコピペモード: プロンプトを外部AIに貼って、返答JSONを戻す）"}
          </p>
        ) : null}
        {cocreate.history.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                m.role === "user" ? "bg-accent text-white" : "bg-surface-soft text-ink"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {cocreate.busy ? (
          <div className="flex justify-start">
            <div className="animate-pulse rounded-2xl bg-surface-soft px-3.5 py-2.5 text-[13px] text-ink3">
              考え中…
            </div>
          </div>
        ) : null}
        {cocreate.error ? (
          <div className="rounded-xl bg-bad-bg p-3 text-[12px] leading-relaxed text-bad">{cocreate.error}</div>
        ) : null}
      </div>

      {suggestions.length > 0 && cocreate.history.length === 0 ? (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInput(s)}
              className="rounded-full bg-surface-soft px-3 py-1.5 text-[12px] text-ink2 transition-colors active:opacity-70"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {pasteOpen ? (
        <div className="border-t border-line p-4">
          <div className="mb-1.5 text-[12px] font-bold text-ink">外部AIの返答JSONを貼る</div>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={4}
            placeholder='{"reply": "...", "artifact": {...}}'
            className="mb-2 w-full resize-y rounded-xl bg-surface-soft px-3 py-2 font-mono text-[12px] text-ink outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyPaste}
              className="rounded-full bg-accent px-4 py-2 text-[12px] font-bold text-white active:opacity-70"
            >
              反映する
            </button>
            <button
              type="button"
              onClick={() => setPasteOpen(false)}
              className="rounded-full bg-surface-soft px-4 py-2 text-[12px] text-ink2 active:opacity-70"
            >
              閉じる
            </button>
          </div>
        </div>
      ) : null}

      <div className="border-t border-line p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void runSend();
            }}
            rows={2}
            placeholder={placeholder}
            className="w-full resize-none rounded-xl bg-surface-soft px-3 py-2.5 text-[13px] leading-relaxed text-ink placeholder:text-ink3 outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="button"
            disabled={cocreate.busy || !input.trim()}
            onClick={() => void runSend()}
            aria-label={cocreate.canRun ? "送信" : "プロンプトをコピー"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors active:opacity-70 disabled:opacity-40"
          >
            {cocreate.canRun ? <MdSend size={16} /> : <MdContentCopy size={15} />}
          </button>
        </div>
        <p className="mt-1 text-[10px] text-ink4">⌘+Enterで送信</p>
      </div>
    </div>
  );
}
