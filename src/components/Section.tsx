import type { SectionDef, ToolState } from "../lib/types";
import { Field } from "./Field";

/** ステップセクションの白カード（hisho: 白カード on グレー背景） */
export function Section({
  def,
  state,
  onSet,
}: {
  def: SectionDef;
  state: ToolState;
  onSet: (fieldId: string, value: ToolState[string]) => void;
}) {
  if (def.showIf && !def.showIf(state)) return null;
  return (
    <section className="rounded-cardlg bg-surface p-5">
      <div className="mb-4 flex items-baseline gap-2">
        {def.num ? <span className="section-label">{def.num}</span> : null}
        <h2 className="text-[15px] font-bold text-ink">{def.title}</h2>
        {def.badge === "required" ? (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">必須</span>
        ) : def.badge === "optional" ? (
          <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10px] text-ink3">任意</span>
        ) : null}
      </div>
      {def.desc ? <p className="-mt-2 mb-4 text-[12px] leading-relaxed text-ink2">{def.desc}</p> : null}
      <div className="space-y-5">
        {def.fields.map((f) => (
          <Field key={f.id} def={f} state={state} onSet={onSet} />
        ))}
      </div>
    </section>
  );
}
