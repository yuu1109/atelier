import { useRef } from "react";
import { MdFileDownload, MdFileUpload, MdRestartAlt } from "react-icons/md";
import type { ToolDef } from "../lib/types";
import { exportAll, importAll } from "../lib/store";
import { ModeSwitch } from "../studio/components/StudioHeader";

/** ブランド + ツール切替タブ + ユーティリティ（書き出し/読み込み/リセット） */
export function Header({
  tools,
  activeId,
  onSelect,
  onReset,
  onToast,
}: {
  tools: ToolDef[];
  activeId: string;
  onSelect: (id: string) => void;
  onReset: () => void;
  onToast: (msg: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const blob = new Blob([exportAll()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "atelier-settings.json";
    a.click();
    URL.revokeObjectURL(url);
    onToast("設定を書き出したよ");
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    if (importAll(text)) {
      onToast("設定を読み込んだよ。再読み込みします");
      window.setTimeout(() => window.location.reload(), 600);
    } else {
      onToast("読み込めないファイルだった…");
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-6xl px-5 pb-3 pt-5">
        <div className="mb-3 flex items-end justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[24px] font-bold tracking-tight text-ink">atelier.</h1>
            <span className="hidden text-[12px] text-ink3 sm:inline">つくるための、プロンプト工房</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={doExport}
              title="設定をJSONで書き出し"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink2 transition-colors active:opacity-70"
              aria-label="設定を書き出し"
            >
              <MdFileDownload size={17} />
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="設定JSONを読み込み"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink2 transition-colors active:opacity-70"
              aria-label="設定を読み込み"
            >
              <MdFileUpload size={17} />
            </button>
            <button
              type="button"
              onClick={onReset}
              title="このツールの入力をリセット"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink2 transition-colors active:opacity-70"
              aria-label="このツールをリセット"
            >
              <MdRestartAlt size={17} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => void doImport(e.target.files?.[0])}
            />
            <ModeSwitch current="tools" />
          </div>
        </div>

        <nav className="scrollbar-none -mx-5 overflow-x-auto px-5">
          <div className="inline-flex gap-1 rounded-full bg-surface p-1">
            {tools.map((t) => {
              const active = t.id === activeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] transition-colors active:opacity-70 ${
                    active ? "bg-accent font-bold text-white" : "text-ink2"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}
