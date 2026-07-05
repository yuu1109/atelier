import type { FieldDef, ItemState, ToolState } from "../lib/types";
import { Cards, ColorField, Pills, Segment, Stepper, TextArea, TextInput, Toggle } from "./controls";

/**
 * FieldDef → コントロールのディスパッチャ。
 * ツール定義（データ）だけでフォームUIが組み上がる中核。
 */
export function Field({
  def,
  state,
  onSet,
}: {
  def: FieldDef;
  state: ToolState;
  onSet: (fieldId: string, value: ToolState[string]) => void;
}) {
  if (def.showIf && !def.showIf(state)) return null;
  const v = state[def.id];

  return (
    <div>
      {def.label ? <div className="mb-1.5 text-[13px] font-bold text-ink">{def.label}</div> : null}
      <FieldControl def={def} state={state} onSet={onSet} />
      {def.help ? <p className="mt-1.5 text-[11px] leading-relaxed text-ink3">{def.help}</p> : null}
      {def.kind === "repeater" ? null : null}
      {v === undefined && import.meta.env.DEV ? (
        <p className="mt-1 text-[11px] text-bad">defaults に {def.id} がありません</p>
      ) : null}
    </div>
  );
}

function FieldControl({
  def,
  state,
  onSet,
}: {
  def: FieldDef;
  state: ToolState;
  onSet: (fieldId: string, value: ToolState[string]) => void;
}) {
  const v = state[def.id];
  switch (def.kind) {
    case "segment":
      return <Segment options={def.options ?? []} value={String(v ?? "")} onChange={(x) => onSet(def.id, x)} />;
    case "pills":
      return (
        <Pills
          options={def.options ?? []}
          value={typeof v === "string" ? v : ""}
          onChange={(x) => onSet(def.id, x)}
        />
      );
    case "multi":
      return (
        <Pills
          multi
          options={def.options ?? []}
          value={Array.isArray(v) ? (v as string[]) : []}
          onChange={(x) => onSet(def.id, x)}
        />
      );
    case "cards":
      return (
        <Cards
          options={def.options ?? []}
          value={String(v ?? "")}
          onChange={(x) => onSet(def.id, x)}
          columns={def.columns}
        />
      );
    case "text":
      return <TextInput value={String(v ?? "")} onChange={(x) => onSet(def.id, x)} placeholder={def.placeholder} />;
    case "textarea":
      return (
        <TextArea
          value={String(v ?? "")}
          onChange={(x) => onSet(def.id, x)}
          placeholder={def.placeholder}
          rows={def.rows}
        />
      );
    case "number":
      return (
        <Stepper value={typeof v === "number" ? v : def.min ?? 1} onChange={(x) => onSet(def.id, x)} min={def.min} max={def.max} />
      );
    case "toggle":
      return <Toggle value={v === true} onChange={(x) => onSet(def.id, x)} />;
    case "color":
      return (
        <ColorField
          value={String(v ?? "")}
          onChange={(x) => onSet(def.id, x)}
          swatches={def.swatches}
          placeholder={def.placeholder}
        />
      );
    case "repeater":
      return <Repeater def={def} state={state} onSet={onSet} />;
    default:
      return null;
  }
}

/**
 * repeater: countField（number）の値ぶんアイテム設定カードを出す。
 * countField が無い場合は現在の配列長をそのまま使う。
 */
function Repeater({
  def,
  state,
  onSet,
}: {
  def: FieldDef;
  state: ToolState;
  onSet: (fieldId: string, value: ToolState[string]) => void;
}) {
  const items = Array.isArray(state[def.id]) ? (state[def.id] as ItemState[]) : [];
  const countRaw = def.countField ? state[def.countField] : items.length;
  const count = typeof countRaw === "number" ? countRaw : items.length;

  // アイテムごとの既定値（itemFields から組み立て）
  const itemDefaults: ItemState = {};
  for (const f of def.itemFields ?? []) {
    if (f.kind === "multi") itemDefaults[f.id] = [];
    else if (f.kind === "toggle") itemDefaults[f.id] = false;
    else if (f.kind === "number") itemDefaults[f.id] = f.min ?? 1;
    else itemDefaults[f.id] = "";
  }

  const resolved: ItemState[] = Array.from({ length: count }, (_, i) => ({
    ...itemDefaults,
    ...(items[i] ?? {}),
  }));

  const setItem = (index: number, fieldId: string, value: ItemState[string]) => {
    const next = resolved.map((it, i) => (i === index ? { ...it, [fieldId]: value } : it));
    onSet(def.id, next);
  };

  return (
    <div className="space-y-2">
      {resolved.map((item, i) => (
        <div key={i} className="rounded-xl bg-surface-soft p-3">
          <div className="section-label mb-2.5">
            {def.itemLabel ? def.itemLabel(i, item) : `ITEM ${String(i + 1).padStart(2, "0")}`}
          </div>
          <div className="space-y-3">
            {(def.itemFields ?? []).map((f) => (
              <ItemField key={f.id} def={f} item={item} onSet={(fid, val) => setItem(i, fid, val)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** repeater 内の1フィールド（入れ子repeaterは非対応） */
function ItemField({
  def,
  item,
  onSet,
}: {
  def: FieldDef;
  item: ItemState;
  onSet: (fieldId: string, value: ItemState[string]) => void;
}) {
  // itemFields の showIf は「アイテムの状態」を受け取る
  if (def.showIf && !def.showIf(item as ToolState)) return null;
  const v = item[def.id];
  return (
    <div>
      {def.label ? <div className="mb-1.5 text-[12px] font-bold text-ink2">{def.label}</div> : null}
      {def.kind === "segment" ? (
        <Segment options={def.options ?? []} value={String(v ?? "")} onChange={(x) => onSet(def.id, x)} />
      ) : def.kind === "pills" ? (
        <Pills options={def.options ?? []} value={typeof v === "string" ? v : ""} onChange={(x) => onSet(def.id, x as string)} />
      ) : def.kind === "multi" ? (
        <Pills multi options={def.options ?? []} value={Array.isArray(v) ? (v as string[]) : []} onChange={(x) => onSet(def.id, x as string[])} />
      ) : def.kind === "text" ? (
        <TextInput value={String(v ?? "")} onChange={(x) => onSet(def.id, x)} placeholder={def.placeholder} />
      ) : def.kind === "textarea" ? (
        <TextArea value={String(v ?? "")} onChange={(x) => onSet(def.id, x)} placeholder={def.placeholder} rows={def.rows ?? 2} />
      ) : def.kind === "toggle" ? (
        <Toggle value={v === true} onChange={(x) => onSet(def.id, x)} />
      ) : null}
      {def.help ? <p className="mt-1 text-[11px] text-ink3">{def.help}</p> : null}
    </div>
  );
}
