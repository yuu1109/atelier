import type { ItemState, ToolDef, ToolState } from "../../lib/types";
import { block, joinBlocks } from "../../lib/prompt";
import {
  FV_ELEMENTS,
  FV_LAYOUTS,
  GENERIC_PRESET,
  SECTION_MAP,
  SECTION_PILL_IDS,
  SITE_TYPES,
  WEB_TONES,
} from "./data";
import {
  BODY_TEXT_CONTRAST_MIN,
  buildImagePrompt,
  buildSpecMd,
  contrastRatio,
  type PlannedSection,
  type PromptContext,
} from "./build";

/* ---------- 値の取り出しヘルパー ---------- */

const asStr = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const asStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const asItems = (v: unknown): ItemState[] =>
  Array.isArray(v) ? (v as ItemState[]).filter((x) => typeof x === "object" && x !== null) : [];

/* ---------- 選択肢 ---------- */

const CTA_OPTIONS = [
  "予約する",
  "問い合わせる",
  "資料請求",
  "購入する",
  "LINE登録",
  "電話する",
  "採用に応募",
  "来店を促す",
].map((v) => ({ value: v, label: v }));

const BRAND_SWATCHES = [
  { value: "#1F3A5F", label: "藍" },
  { value: "#2E4A3B", label: "深緑" },
  { value: "#A85035", label: "テラコッタ" },
  { value: "#C8352B", label: "朱" },
  { value: "#C8912F", label: "山吹" },
  { value: "#2E9BCB", label: "空" },
];

/* ---------- ToolDef ---------- */

export const def: ToolDef = {
  id: "web",
  name: "Webデザイン",
  tagline: "HP制作の入口。モック画像プロンプトと実装スペックMDをフォームから組み立てる。",
  sections: [
    {
      id: "site-type",
      num: "01",
      title: "サイト種別",
      badge: "required",
      desc: "何のサイトを作るか。推奨セクション構成の土台になる",
      fields: [
        {
          id: "siteType",
          kind: "pills",
          options: SITE_TYPES.map((t) => ({ value: t.id, label: t.name })),
          help: "選ぶと06の推奨セクション構成が切り替わる",
        },
      ],
    },
    {
      id: "site-info",
      num: "02",
      title: "サイトの情報",
      badge: "optional",
      desc: "書くほどコピーと被写体が具体的になる",
      fields: [
        { id: "siteName", kind: "text", label: "サイト名・屋号", placeholder: "例: みどり整骨院" },
        { id: "industry", kind: "text", label: "業種・商材", placeholder: "例: 肩こり・腰痛専門の整骨院" },
        { id: "target", kind: "text", label: "ターゲット", placeholder: "例: デスクワークで肩を痛めた30〜50代" },
        {
          id: "area",
          kind: "text",
          label: "エリア",
          placeholder: "例: 三鷹駅徒歩3分",
          help: "店舗・地域商圏なら駅名や市区名まで。FVとアクセスに効く",
        },
        {
          id: "strength",
          kind: "textarea",
          label: "一番の強み",
          rows: 2,
          placeholder: "例: 国家資格者のみが施術。夜21時まで・土日も営業",
        },
        { id: "mainCta", kind: "pills", label: "主要CTA", options: CTA_OPTIONS },
        {
          id: "catchCopy",
          kind: "text",
          label: "キャッチコピー",
          placeholder: "例: 夜、肩の痛みで目が覚めるあなたへ。",
          help: "空欄ならAIに10〜25文字で提案させる指示が入る",
        },
      ],
    },
    {
      id: "output-mode",
      num: "03",
      title: "つくるもの",
      badge: "required",
      fields: [
        {
          id: "outputMode",
          kind: "segment",
          options: [
            { value: "mock", label: "デザインモック画像" },
            { value: "spec", label: "実装スペックMD" },
            { value: "both", label: "両方" },
          ],
          help: "画像プロンプトは画像生成AIへ、スペックMDは Claude Code / Codex へ貼る",
        },
      ],
    },
    {
      id: "design-tone",
      num: "04",
      title: "デザイントーン",
      badge: "required",
      desc: "配色・書体・余白・写真の色調まで決まるサイトの人格",
      fields: [
        {
          id: "tone",
          kind: "cards",
          columns: 2,
          options: WEB_TONES.map((t) => ({
            value: t.id,
            label: t.name,
            desc: t.cardDesc,
            tags: t.keywords,
          })),
        },
        {
          id: "brandColor",
          kind: "color",
          label: "ブランドカラー上書き",
          swatches: BRAND_SWATCHES,
          help: "指定するとトーンのメインカラーをこの色に差し替える",
        },
      ],
    },
    {
      id: "first-view",
      num: "05",
      title: "ファーストビュー",
      badge: "optional",
      desc: "3秒で「誰の・何の・次に何をすべきか」に答える1枚目",
      fields: [
        {
          id: "fvLayout",
          kind: "cards",
          columns: 3,
          label: "FVレイアウト",
          options: FV_LAYOUTS.map((l) => ({
            value: l.id,
            label: l.name,
            desc: l.cardDesc,
            tags: l.tags,
          })),
        },
        {
          id: "fvElements",
          kind: "multi",
          label: "FVに置く要素",
          options: FV_ELEMENTS.map((e) => ({ value: e.value, label: e.label })),
          help: "未選択ならキャッチ・CTA・メインビジュアルの定石構成になる",
        },
        {
          id: "fvNote",
          kind: "text",
          label: "FVの補足メモ",
          placeholder: "例: 施術中の手元の写真を使ってほしい",
        },
      ],
    },
    {
      id: "sections",
      num: "06",
      title: "セクション構成",
      badge: "optional",
      desc: "ページ本体の並び。1画像=1セクションで生成される",
      fields: [
        {
          id: "usePreset",
          kind: "toggle",
          label: "推奨構成におまかせ",
          help: "ONでサイト種別ごとの推奨構成を使う。細かく決めたいときはOFF",
        },
        {
          id: "sectionCount",
          kind: "number",
          label: "セクション数",
          min: 1,
          max: 10,
          showIf: (s: ToolState) => s.usePreset !== true,
        },
        {
          id: "sections",
          kind: "repeater",
          countField: "sectionCount",
          showIf: (s: ToolState) => s.usePreset !== true,
          itemLabel: (i: number, item: ItemState) => {
            const spec = SECTION_MAP[asStr(item.sectionType)];
            return `${String(i + 1).padStart(2, "0")} ${spec ? spec.name : "セクション"}`;
          },
          help: "画像は1回の生成で10枚まで。多い構成は分割して依頼する",
          itemFields: [
            {
              id: "sectionType",
              kind: "pills",
              label: "セクション種類",
              options: SECTION_PILL_IDS.map((id) => ({
                value: id,
                label: SECTION_MAP[id]?.name ?? id,
              })),
            },
            {
              id: "note",
              kind: "text",
              label: "内容メモ",
              placeholder: "例: 初回限定2,980円のキャンペーンを載せる",
            },
            {
              id: "layoutWish",
              kind: "text",
              label: "レイアウトの希望（任意）",
              placeholder: "例: 写真を左、テキストを右に",
            },
          ],
        },
      ],
    },
    {
      id: "output-settings",
      num: "07",
      title: "出力設定",
      badge: "optional",
      fields: [
        {
          id: "viewport",
          kind: "segment",
          label: "画角",
          options: [
            { value: "pc", label: "PC" },
            { value: "sp", label: "スマホ" },
            { value: "both", label: "PC+スマホ両方" },
          ],
          help: "両方は同じ構成を2画角で生成するため枚数が2倍になる",
          showIf: (s: ToolState) => s.outputMode !== "spec",
        },
        {
          id: "fvRatio",
          kind: "segment",
          label: "FVの比率",
          options: [
            { value: "16:9", label: "16:9" },
            { value: "3:2", label: "3:2" },
          ],
          help: "16:9=画面ちょうど、3:2=次セクションのチラ見せまで入る",
          showIf: (s: ToolState) => s.outputMode !== "spec" && s.viewport !== "sp",
        },
        {
          id: "textSafety",
          kind: "toggle",
          label: "日本語文字の精度対策",
          help: "画像内の日本語を指定文字列だけに絞り、他はダミー行で描かせる崩れ対策",
          showIf: (s: ToolState) => s.outputMode !== "spec",
        },
        {
          id: "extra",
          kind: "textarea",
          label: "追加の指示",
          rows: 3,
          placeholder: "例: 写真は人物より物・空間を中心に",
        },
      ],
    },
  ],
  defaults: {
    siteType: "",
    siteName: "",
    industry: "",
    target: "",
    area: "",
    strength: "",
    mainCta: "",
    catchCopy: "",
    outputMode: "both",
    tone: "",
    brandColor: "",
    fvLayout: "",
    fvElements: [],
    fvNote: "",
    usePreset: true,
    sectionCount: 5,
    sections: [],
    viewport: "pc",
    fvRatio: "16:9",
    textSafety: true,
    extra: "",
  },
  build: (s: ToolState) => {
    const warnings: string[] = [];
    const siteType = SITE_TYPES.find((t) => t.id === asStr(s.siteType));
    const tone = WEB_TONES.find((t) => t.id === asStr(s.tone));
    const fv = FV_LAYOUTS.find((l) => l.id === asStr(s.fvLayout));
    const mode = asStr(s.outputMode) || "both";
    const withImages = mode !== "spec";
    const withSpec = mode !== "mock";
    const viewport = withImages ? asStr(s.viewport) || "pc" : "pc";
    const usePreset = s.usePreset !== false;

    const brandColor = asStr(s.brandColor);
    if (!siteType) warnings.push("サイト種別が未選択。推奨構成が使えず被写体の文脈も薄くなる");
    if (!tone) warnings.push("デザイントーンが未選択。配色・書体が確定せずGLOBAL STYLEが組めない");
    if (!tone && brandColor) {
      warnings.push(`トーン未選択のためブランドカラー（${brandColor}）が出力に反映されない`);
    }
    if (tone && brandColor) {
      const ratio = contrastRatio(brandColor, tone.colors.onPrimary);
      if (ratio !== null && ratio < BODY_TEXT_CONTRAST_MIN) {
        warnings.push(
          `ブランドカラー${brandColor}とメインカラー上の文字${tone.colors.onPrimary}のコントラスト比が約${ratio.toFixed(1)}:1で、本文基準${BODY_TEXT_CONTRAST_MIN}:1を満たさない。ボタン文字が読めなくなるため色の見直しを検討する`,
        );
      }
    }

    /* セクション構成の解決 */
    const planned: PlannedSection[] = [];
    if (usePreset) {
      const ids = siteType ? siteType.preset : GENERIC_PRESET;
      for (const id of ids) {
        if (id === "header-nav" || id === "hero") continue; // FVに統合
        const spec = SECTION_MAP[id];
        if (spec) planned.push({ spec, note: "", layoutWish: "" });
      }
      if (!siteType) warnings.push("種別未選択のため汎用のセクション構成で代用した");
    } else {
      let skipped = 0;
      // UIは sectionCount ぶんしか描画しないため、減らした後の残骸行を構成に混入させない
      const visibleCount = typeof s.sectionCount === "number" ? s.sectionCount : Infinity;
      for (const item of asItems(s.sections).slice(0, visibleCount)) {
        const spec = SECTION_MAP[asStr(item.sectionType)];
        if (!spec) {
          skipped++;
          continue;
        }
        planned.push({ spec, note: asStr(item.note), layoutWish: asStr(item.layoutWish) });
      }
      if (skipped > 0) warnings.push(`セクション種類が未選択の行が${skipped}件あり、構成から除外した`);
      if (planned.length === 0) warnings.push("セクションが1つもない。06でセクション種類を選ぶ");
    }

    const perSet = 1 + planned.length;
    const total = viewport === "both" ? perSet * 2 : perSet;
    if (withImages && !fv) warnings.push("FVレイアウトが未選択。1枚目の構図が生成AIまかせになる");
    if (withImages && total > 10) {
      warnings.push(
        `画像が合計${total}枚で1回の生成上限10枚を超える。まず1〜10枚目まで生成させ、続きは「GLOBAL STYLEを維持したまま11枚目以降を生成」と分けて依頼する`,
      );
    }

    const ctx: PromptContext = {
      siteType,
      tone,
      fv,
      planned,
      siteName: asStr(s.siteName),
      industry: asStr(s.industry),
      target: asStr(s.target),
      area: asStr(s.area),
      strength: asStr(s.strength),
      mainCta: asStr(s.mainCta),
      catchCopy: asStr(s.catchCopy),
      fvElements: asStrArr(s.fvElements),
      fvNote: asStr(s.fvNote),
      viewport,
      ratio: asStr(s.fvRatio) || "16:9",
      textSafety: s.textSafety !== false,
      brandColor,
      perSet,
      total,
    };

    const extra = asStr(s.extra);
    const parts: string[] = [];
    if (withImages) {
      const img = joinBlocks(buildImagePrompt(ctx), block("追加の指示", extra));
      parts.push(
        mode === "both"
          ? `■ 出力1｜デザインモック画像プロンプト — ChatGPT Images 2.0 / Nanobanana に貼る\n\n${img}`
          : img,
      );
    }
    if (withSpec) {
      const spec = joinBlocks(buildSpecMd(ctx), extra ? `## 補足（追加の指示）\n\n${extra}` : null);
      parts.push(
        mode === "both" ? `■ 出力2｜実装スペックMD — Claude Code / Codex に貼る\n\n${spec}` : spec,
      );
    }
    const text = parts.join(`\n\n${"─".repeat(40)}\n\n`);

    const modeLabel = mode === "mock" ? "モック画像" : mode === "spec" ? "スペックMD" : "画像+スペックMD";
    const meta: { label: string; value: string }[] = [
      { label: "サイト種別", value: siteType?.name ?? "未選択" },
      { label: "トーン", value: tone?.name ?? "未選択" },
      { label: "セクション", value: `FV+${planned.length}` },
      { label: "出力", value: modeLabel },
    ];
    if (withImages) meta.push({ label: "画像", value: `${total}枚` });

    return { text, meta, warnings };
  },
};
