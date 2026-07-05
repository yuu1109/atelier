import { useState } from "react";
import { useProjectContext } from "../ProjectContext";
import { DEFAULT_MODELS, getKeys, getModels, maskKey, setKeys, setModels, type ApiKeys } from "../ai/keys";

/** 設定: APIキー・モデル・フォルダ接続 */
export function SettingsPage({ onToast }: { onToast: (msg: string) => void }) {
  const { connection, connect, disconnect } = useProjectContext();
  const [keys, setKeysState] = useState<ApiKeys>(() => getKeys());
  const [models, setModelsState] = useState(() => getModels());

  const saveKey = (name: keyof ApiKeys, value: string) => {
    const next = { ...keys, [name]: value.trim() || undefined };
    setKeysState(next);
    setKeys(next);
  };

  const saveModel = (name: keyof typeof models, value: string) => {
    const next = { ...models, [name]: value.trim() || DEFAULT_MODELS[name] };
    setModelsState(next);
    setModels(next);
  };

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-5 pb-10">
      <section className="rounded-cardlg bg-surface p-5">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="section-label">Folder</span>
          <h2 className="text-[15px] font-bold text-ink">HP制作ファクトリー接続</h2>
        </div>
        <p className="mb-4 text-[12px] leading-relaxed text-ink2">
          ~/Desktop/01_project/HP を接続すると案件（clients/）を直接読み書きする。Chrome系ブラウザ専用。
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void connect().catch((e) => onToast(String(e.message ?? e)))}
            className="rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-white transition-colors active:opacity-70"
          >
            {connection.kind === "connected" ? "別のフォルダに接続し直す" : "フォルダを選んで接続"}
          </button>
          {connection.kind === "connected" ? (
            <button
              type="button"
              onClick={() => void disconnect()}
              className="rounded-full bg-surface-soft px-4 py-2 text-[13px] text-ink2 transition-colors active:opacity-70"
            >
              接続を解除
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-cardlg bg-surface p-5">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="section-label">API Keys</span>
          <h2 className="text-[15px] font-bold text-ink">AI連携キー</h2>
        </div>
        <p className="mb-4 text-[12px] leading-relaxed text-ink2">
          キーはこの端末のlocalStorageにだけ保存され、設定エクスポートには含まれない。
          未設定でも全機能が「プロンプトをコピー」方式で使える。
        </p>
        <div className="space-y-4">
          <KeyField
            label="Anthropic（テキスト: 構成・コピー・壁打ち）"
            placeholder="sk-ant-..."
            value={keys.anthropic ?? ""}
            onSave={(v) => saveKey("anthropic", v)}
          />
          <KeyField
            label="Google Gemini（画像: ムードボード・カンプ。無料枠あり）"
            placeholder="AIza..."
            value={keys.gemini ?? ""}
            onSave={(v) => saveKey("gemini", v)}
          />
          <KeyField
            label="OpenAI（画像: 任意）"
            placeholder="sk-..."
            value={keys.openai ?? ""}
            onSave={(v) => saveKey("openai", v)}
          />
        </div>
      </section>

      <section className="rounded-cardlg bg-surface p-5">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="section-label">Models</span>
          <h2 className="text-[15px] font-bold text-ink">モデル設定</h2>
        </div>
        <p className="mb-4 text-[12px] leading-relaxed text-ink2">
          画像モデルは更新が速いので、うまく動かないときはここで最新のモデルIDに差し替えられる。
        </p>
        <div className="space-y-4">
          <ModelField label="テキストモデル" value={models.textModel} onSave={(v) => saveModel("textModel", v)} />
          <ModelField
            label="Gemini画像モデル"
            value={models.geminiImageModel}
            onSave={(v) => saveModel("geminiImageModel", v)}
          />
          <ModelField
            label="OpenAI画像モデル"
            value={models.openaiImageModel}
            onSave={(v) => saveModel("openaiImageModel", v)}
          />
        </div>
      </section>
    </main>
  );
}

function KeyField({
  label,
  placeholder,
  value,
  onSave,
}: {
  label: string;
  placeholder: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div>
      <div className="mb-1.5 text-[13px] font-bold text-ink">{label}</div>
      {editing ? (
        <div className="flex gap-2">
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl bg-surface-soft px-3 py-2 text-[13px] text-ink placeholder:text-ink3 outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              setDraft("");
              setEditing(false);
            }}
            className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-bold text-white active:opacity-70"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="shrink-0 rounded-full bg-surface-soft px-3.5 py-1.5 text-[12px] text-ink2 active:opacity-70"
          >
            やめる
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="flex-1 rounded-xl bg-surface-soft px-3 py-2 font-mono text-[12px] text-ink2">
            {value ? maskKey(value) : "未設定"}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-full bg-surface-soft px-3.5 py-1.5 text-[12px] text-ink2 active:opacity-70"
          >
            変更
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => onSave("")}
              className="shrink-0 rounded-full bg-bad-bg px-3.5 py-1.5 text-[12px] font-bold text-bad active:opacity-70"
            >
              削除
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ModelField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  return (
    <div>
      <div className="mb-1.5 text-[13px] font-bold text-ink">{label}</div>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onSave(draft)}
        className="w-full rounded-xl bg-surface-soft px-3 py-2 font-mono text-[12px] text-ink outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  );
}
