import { useCallback, useEffect, useMemo, useState } from "react";
import { Section } from "../../components/Section";
import { Segment, TextArea, TextInput } from "../../components/controls";
import type { Option, ToolState } from "../../lib/types";
import { anthropicProvider, hasAnthropicKey } from "../ai/anthropic";
import { AiRunButton } from "../ai/fallback";
import { type MdDoc, parseMd, renderMd } from "../lib/markdown";
import { patchState, projectPath } from "../lib/project";
import type { PhaseProps } from "./PhaseProps";
import {
  HEARING_SECTIONS,
  HEARING_SYSTEM_PROMPT,
  PURPOSE_OPTIONS,
  type HearingDoc,
  asPurposeType,
  buildHearingFallbackPrompt,
  docFromFormState,
  hearingFormDefaults,
  hearingFormSections,
  hearingJsonSchema,
  normalizeHearingDoc,
  parseHearingJson,
  renderHearingMd,
} from "./hearingForm";

/**
 * ヒアリングフェーズ。hearing.md（案件のSSOT）を作る3経路:
 * 1. 読み込み: 既存 hearing.md を見出し単位で軽編集
 * 2. 貼り付け→AI: メモ・議事録をAIで構造化 → 確認・修正 → 保存
 * 3. フォーム入力: hearing-form.md の36問（8カテゴリ）に直接回答 → 保存
 */

type TabId = "read" | "paste" | "form";

const BTN_PRIMARY =
  "rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-white transition-colors active:opacity-70 disabled:opacity-40";
const BTN_GHOST =
  "rounded-full bg-surface-soft px-4 py-2.5 text-[13px] font-bold text-ink2 transition-colors active:opacity-70 disabled:opacity-40";

export function HearingPhase({ store, project, onToast }: PhaseProps) {
  const [tab, setTab] = useState<TabId>("read");
  const [reloadKey, setReloadKey] = useState(0);

  /** HearingDoc を hearing.md に保存（既存があれば確認 → 保存 → 読み込みタブへ）。成功で true */
  const saveDoc = useCallback(
    async (doc: HearingDoc): Promise<boolean> => {
      const path = projectPath(project, "hearing.md");
      try {
        const existing = await store.readText(path);
        if (existing !== null && existing.trim() !== "") {
          const ok = window.confirm(
            "既存の hearing.md を上書きする？（旧内容は _atelier/backups/ に退避される）",
          );
          if (!ok) return false;
        }
        await store.writeText(path, renderHearingMd(doc, project));
        // Q4-1 が確定していれば state.json の purposeType にも反映（要件定義以降の分岐キー）
        const pt = asPurposeType(doc.purpose_type ?? "");
        if (pt) await patchState(store, project, { purposeType: pt });
        onToast("hearing.md に保存した");
        setReloadKey((k) => k + 1);
        setTab("read");
        return true;
      } catch (e) {
        onToast(`保存に失敗: ${e instanceof Error ? e.message : String(e)}`);
        return false;
      }
    },
    [store, project, onToast],
  );

  return (
    <div className="space-y-4">
      <Segment
        options={[
          { value: "read", label: "読み込み" },
          { value: "paste", label: "貼り付け→AI" },
          { value: "form", label: "フォーム入力" },
        ]}
        value={tab}
        onChange={(v) => setTab(v as TabId)}
      />
      {tab === "read" ? (
        <ReadTab store={store} project={project} onToast={onToast} reloadKey={reloadKey} />
      ) : tab === "paste" ? (
        <PasteTab onSave={saveDoc} onToast={onToast} />
      ) : (
        <FormTab onSave={saveDoc} />
      )}
    </div>
  );
}

/* ===== 経路1: 読み込み（既存 hearing.md の見出し単位編集） ===== */

function ReadTab({ store, project, onToast, reloadKey }: PhaseProps & { reloadKey: number }) {
  const [doc, setDoc] = useState<MdDoc | null>(null);
  const [status, setStatus] = useState<"loading" | "missing" | "ready">("loading");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    void store.readText(projectPath(project, "hearing.md")).then((text) => {
      if (!alive) return;
      if (text === null || text.trim() === "") {
        setDoc(null);
        setStatus("missing");
      } else {
        setDoc(parseMd(text));
        setStatus("ready");
      }
    });
    return () => {
      alive = false;
    };
  }, [store, project, reloadKey]);

  if (status === "loading") {
    return (
      <div className="rounded-cardlg bg-surface p-5">
        <p className="animate-pulse text-[13px] text-ink3">hearing.md を読み込み中…</p>
      </div>
    );
  }

  if (status === "missing" || !doc) {
    return (
      <div className="rounded-cardlg bg-surface p-8 text-center">
        <p className="text-[13px] text-ink3">clients/{project}/hearing.md がまだ無い</p>
        <p className="mt-1.5 text-[12px] text-ink3">「貼り付け→AI」か「フォーム入力」から作成する</p>
      </div>
    );
  }

  const updatePreamble = (v: string) => setDoc((d) => (d ? { ...d, preamble: v } : d));
  const updateSection = (i: number, body: string) =>
    setDoc((d) =>
      d ? { ...d, sections: d.sections.map((s, j) => (j === i ? { ...s, body } : s)) } : d,
    );

  const save = async () => {
    if (!window.confirm("hearing.md を上書き保存する？（旧内容は _atelier/backups/ に退避される）")) return;
    setSaving(true);
    try {
      await store.writeText(projectPath(project, "hearing.md"), renderMd(doc));
      onToast("hearing.md を保存した");
    } catch (e) {
      onToast(`保存に失敗: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const rowsFor = (body: string) => Math.min(16, Math.max(3, body.split("\n").length + 1));

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-ink3">clients/{project}/hearing.md（見出し単位で軽編集できる）</p>
      <section className="rounded-cardlg bg-surface p-5">
        <div className="section-label mb-2.5">冒頭（タイトル・メモ）</div>
        <TextArea value={doc.preamble} onChange={updatePreamble} rows={rowsFor(doc.preamble)} />
      </section>
      {doc.sections.map((s, i) => (
        <section key={`${s.heading}-${i}`} className="rounded-cardlg bg-surface p-5">
          <div className="section-label mb-2.5">{s.heading}</div>
          <TextArea value={s.body} onChange={(v) => updateSection(i, v)} rows={rowsFor(s.body)} />
        </section>
      ))}
      <div className="flex justify-end">
        <button type="button" disabled={saving} onClick={() => void save()} className={BTN_PRIMARY}>
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  );
}

/* ===== 経路2: 貼り付け→AI構造化 ===== */

function PasteTab({
  onSave,
  onToast,
}: {
  onSave: (doc: HearingDoc) => Promise<boolean>;
  onToast: (msg: string) => void;
}) {
  const [memo, setMemo] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<HearingDoc | null>(null);
  const [jsonBack, setJsonBack] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const hasKey = hasAnthropicKey();

  const run = async () => {
    if (!memo.trim()) {
      onToast("先にメモを貼って");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const raw = await anthropicProvider.generateJson<HearingDoc>({
        system: HEARING_SYSTEM_PROMPT,
        prompt: `以下がヒアリングのメモ・議事録。ここから各項目を埋めて。\n\n---\n${memo}`,
        schema: hearingJsonSchema(),
        schemaName: "hearing_doc",
        thinking: true,
      });
      setDraft(normalizeHearingDoc(raw));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const importJson = () => {
    try {
      setDraft(parseHearingJson(jsonBack));
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : String(e));
    }
  };

  if (draft) {
    return (
      <DraftEditor draft={draft} onChange={setDraft} onSave={onSave} onDiscard={() => setDraft(null)} />
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-cardlg bg-surface p-5">
        <div className="section-label mb-2.5">メモ・議事録</div>
        <p className="mb-3 text-[12px] leading-relaxed text-ink2">
          打ち合わせメモ・録音の書き起こし・チャットのやり取りをそのまま貼る。AIが hearing.md
          の書式（8カテゴリ）に構造化する。メモに無い項目は空欄、根拠が薄い項目は「（AI推定・要確認）」付きになる
        </p>
        <TextArea value={memo} onChange={setMemo} rows={12} placeholder="ここにメモ・議事録を貼り付け" />
        <div className="mt-3 flex items-center gap-2">
          <AiRunButton
            label="AIで構造化"
            running={running}
            onRun={run}
            fallbackPrompt={() => (memo.trim() ? buildHearingFallbackPrompt(memo) : null)}
            onToast={onToast}
          />
        </div>
        {running ? (
          <div className="mt-3 animate-pulse rounded-xl bg-surface-soft p-3 text-[12px] text-ink3">
            AIがメモを構造化中…
          </div>
        ) : null}
        {error ? (
          <div className="mt-3 rounded-xl bg-bad-bg p-3 text-[12px] leading-relaxed text-bad">{error}</div>
        ) : null}
      </section>
      {!hasKey ? (
        <section className="rounded-cardlg bg-surface p-5">
          <div className="section-label mb-2.5">AIの返答JSONを貼り戻す</div>
          <p className="mb-3 text-[12px] leading-relaxed text-ink2">
            上のボタンでコピーしたプロンプトを外部AIに投げ、返ってきたJSONをここに貼って取り込む
          </p>
          <TextArea
            value={jsonBack}
            onChange={setJsonBack}
            rows={8}
            placeholder='{"basic_name": "みどり整骨院", ...}'
          />
          <div className="mt-3">
            <button type="button" onClick={importJson} className={BTN_PRIMARY}>
              JSONを取り込む
            </button>
          </div>
          {jsonError ? (
            <div className="mt-3 rounded-xl bg-bad-bg p-3 text-[12px] leading-relaxed text-bad">
              {jsonError}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

/** AI構造化結果の確認・修正ビュー（各フィールド編集可 → hearing.md に保存） */
function DraftEditor({
  draft,
  onChange,
  onSave,
  onDiscard,
}: {
  draft: HearingDoc;
  onChange: (doc: HearingDoc) => void;
  onSave: (doc: HearingDoc) => Promise<boolean>;
  onDiscard: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const set = (id: string, v: string) => onChange({ ...draft, [id]: v });
  // 「未定」に戻せるよう空値の選択肢を足す
  const purposeOptions: Option[] = [...PURPOSE_OPTIONS, { value: "", label: "未定" }];

  return (
    <div className="space-y-4">
      <div className="rounded-cardlg bg-surface p-5">
        <p className="text-[12px] leading-relaxed text-ink2">
          構造化の結果。「（AI推定・要確認）」付きの項目は根拠が薄いので、確認して直すか消す。空欄はそのまま保存してよい（空欄も情報）
        </p>
      </div>
      {HEARING_SECTIONS.map((sec) => (
        <section key={sec.id} className="rounded-cardlg bg-surface p-5">
          <div className="mb-4 flex items-baseline gap-2">
            <span className="section-label">{sec.num}</span>
            <h2 className="text-[15px] font-bold text-ink">{sec.heading}</h2>
          </div>
          <div className="space-y-4">
            {sec.fields.map((f) => (
              <div key={f.id}>
                <div className="mb-1.5 text-[13px] font-bold text-ink">{f.label}</div>
                {f.id === "purpose_type" ? (
                  <Segment
                    options={purposeOptions}
                    value={draft.purpose_type ?? ""}
                    onChange={(v) => set("purpose_type", v)}
                  />
                ) : f.kind === "textarea" ? (
                  <TextArea
                    value={draft[f.id] ?? ""}
                    onChange={(v) => set(f.id, v)}
                    rows={2}
                    placeholder={f.placeholder}
                  />
                ) : (
                  <TextInput
                    value={draft[f.id] ?? ""}
                    onChange={(v) => set(f.id, v)}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onDiscard} className={BTN_GHOST}>
          破棄して戻る
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(draft);
            } finally {
              setSaving(false);
            }
          }}
          className={BTN_PRIMARY}
        >
          {saving ? "保存中…" : "hearing.md に保存"}
        </button>
      </div>
    </div>
  );
}

/* ===== 経路3: フォーム入力（36問×8カテゴリ） ===== */

function FormTab({ onSave }: { onSave: (doc: HearingDoc) => Promise<boolean> }) {
  const sections = useMemo(() => hearingFormSections(), []);
  const [state, setState] = useState<ToolState>(() => hearingFormDefaults());
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-4">
      <div className="rounded-cardlg bg-surface p-5">
        <p className="text-[12px] leading-relaxed text-ink2">
          hearing-form.md の36問（8カテゴリ）。全部埋めなくてよい、わかる範囲で（空欄も情報）。回答は
          hearing.md の書式で保存される
        </p>
      </div>
      {sections.map((def) => (
        <Section
          key={def.id}
          def={def}
          state={state}
          onSet={(id, v) => setState((s) => ({ ...s, [id]: v }))}
        />
      ))}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(docFromFormState(state));
            } finally {
              setSaving(false);
            }
          }}
          className={BTN_PRIMARY}
        >
          {saving ? "保存中…" : "hearing.md に保存"}
        </button>
      </div>
    </div>
  );
}
