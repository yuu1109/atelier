import { useEffect, useMemo, useRef, useState } from "react";
import { TOOLS } from "./tools";
import type { ToolDef } from "./lib/types";
import { safeGetItem, safeSetItem, useToolState } from "./lib/store";
import { navigate, useHashRoute } from "./lib/router";
import { Header } from "./components/Header";
import { Section } from "./components/Section";
import { PromptPane } from "./components/PromptPane";
import { Toast } from "./components/Toast";
import { StudioApp } from "./studio/StudioApp";

const TAB_KEY = "atelier-tab";

export default function App() {
  const route = useHashRoute();

  const [toast, setToast] = useState({ message: "", visible: false });
  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = (message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ message, visible: true });
    toastTimer.current = window.setTimeout(() => setToast((t) => ({ ...t, visible: false })), 1800);
  };

  return (
    <div className="min-h-screen">
      {route.kind === "tools" ? (
        <ToolsMode toolId={route.toolId} onToast={showToast} />
      ) : (
        <StudioApp route={route} onToast={showToast} />
      )}
      <Toast message={toast.message} visible={toast.visible} />
      <footer className="mx-auto max-w-6xl px-5 pb-10 pt-4">
        <p className="text-[11px] text-ink3">
          入力はこの端末（localStorageと接続フォルダ）にだけ保存されます。サーバには送信されません。
        </p>
      </footer>
    </div>
  );
}

/** 既存の6ツールモード（挙動はv1のまま。タブ選択はハッシュに反映） */
function ToolsMode({ toolId, onToast }: { toolId: string | null; onToast: (msg: string) => void }) {
  const resolvedId = useMemo(() => {
    if (toolId && TOOLS.some((t) => t.id === toolId)) return toolId;
    const saved = safeGetItem(TAB_KEY);
    return TOOLS.some((t) => t.id === saved) ? (saved as string) : TOOLS[0].id;
  }, [toolId]);
  const tool = TOOLS.find((t) => t.id === resolvedId) ?? TOOLS[0];

  const select = (id: string) => {
    safeSetItem(TAB_KEY, id);
    navigate({ kind: "tools", toolId: id });
  };

  return (
    <>
      <Header
        tools={TOOLS}
        activeId={tool.id}
        onSelect={select}
        onReset={() => {
          // リセットは ToolView 側のボタンからも呼べるようイベントで届ける
          window.dispatchEvent(new CustomEvent("atelier:reset"));
          onToast("このツールの入力をリセットしたよ");
        }}
        onToast={onToast}
      />
      <ToolView key={tool.id} tool={tool} onToast={onToast} />
    </>
  );
}

function ToolView({ tool, onToast }: { tool: ToolDef; onToast: (msg: string) => void }) {
  const { state, set, reset } = useToolState(tool.id, tool.defaults);
  const built = useMemo(() => tool.build(state), [tool, state]);

  // Header のリセットボタン → 現在表示中のツールだけリセット
  useEffect(() => {
    const handler = () => reset();
    window.addEventListener("atelier:reset", handler);
    return () => window.removeEventListener("atelier:reset", handler);
  }, [reset]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-8">
      <p className="mb-4 text-[13px] leading-relaxed text-ink2">{tool.tagline}</p>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="space-y-4">
          {tool.sections.map((s) => (
            <Section key={s.id} def={s} state={state} onSet={set} />
          ))}
        </div>
        <div className="lg:sticky lg:top-[128px]">
          <PromptPane
            built={built}
            onCopied={() => onToast("プロンプトをコピーしたよ")}
            onCopyFailed={() => onToast("コピーできなかったよ。本文を選択して手動でコピーしてね")}
          />
        </div>
      </div>
    </main>
  );
}
