import type { ItemState, ToolDef, ToolState } from "../../lib/types";
import { splitLines } from "../../lib/prompt";
import {
  ACCENT_ROLE_OPTIONS,
  ACCENT_ROLE_PROMPTS,
  ACCENT_SWATCHES,
  BACKGROUND_OPTIONS,
  BADGE_POS_OPTIONS,
  COLOR_RULE_OPTIONS,
  COLOR_RULE_PROMPTS,
  CTA_POS_OPTIONS,
  DIAGRAM_TYPE_OPTIONS,
  DIAGRAM_TYPE_PROMPTS,
  FONT_MOOD_OPTIONS,
  FONT_MOOD_PROMPTS,
  GENDER_LABELS,
  GENDER_OPTIONS,
  LANG_OPTIONS,
  LANG_PROMPTS,
  OUTFIT_OPTIONS,
  POS_LABELS,
  RATIO_HELP,
  RATIO_OPTIONS,
  STYLE_OPTIONS,
  STYLE_PROMPTS,
  SUBCOPY_STYLE_OPTIONS,
  SUBCOPY_STYLE_PROMPTS,
  THUMB_LAYOUT_OPTIONS,
  THUMB_LAYOUT_PROMPTS,
  USAGE_DESC,
  USAGE_OPTIONS,
  backgroundPrompt,
} from "./data";

/* ============================================================
 * 小さなユーティリティ
 * ============================================================ */

/** state から文字列を安全に取り出す */
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** 選択肢配列から value に対応する label を引く */
function labelOf(options: { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

/** 「## 見出し + 箇条書き」のMDセクション。空行は落とし、全部空ならnull */
function mdSection(title: string, lines: Array<string | false | null | undefined>): string | null {
  const body = lines.filter((l): l is string => typeof l === "string" && l.trim() !== "");
  if (body.length === 0) return null;
  return `## ${title}\n${body.map((l) => `- ${l}`).join("\n")}`;
}

/* ============================================================
 * 用途別のレイアウト行を組み立てる
 * ============================================================ */

/** サムネイル用のレイアウト行 */
function thumbLayoutLines(s: ToolState): string[] {
  const lines: string[] = [];
  const layout = str(s.thumbLayout);
  if (layout) {
    lines.push(`構図: ${THUMB_LAYOUT_PROMPTS[layout] ?? labelOf(THUMB_LAYOUT_OPTIONS, layout)}`);
  }

  const catches = [str(s.catch1), str(s.catch2), str(s.catch3)].filter((c) => c !== "");
  if (catches.length > 0) {
    lines.push(
      `キャッチコピー（メインの文字）: ${catches.map((c, i) => `${i + 1}行目「${c}」`).join(" / ")}`
    );
    lines.push(
      "キャッチコピーの焼き込み: 上記の文言を一字一句そのまま描く。省略・言い換え・行の追加は不可"
    );
  }

  const subCopy = str(s.subCopy);
  if (subCopy) {
    const style = str(s.subCopyStyle);
    lines.push(
      `サブコピー: 「${subCopy}」。${SUBCOPY_STYLE_PROMPTS[style] ?? SUBCOPY_STYLE_PROMPTS.plain}`
    );
  }

  if (s.badge === true) {
    const badgeText = str(s.badgeText);
    if (badgeText) {
      const pos = POS_LABELS[str(s.badgePos)] ?? "左上";
      lines.push(
        `バッジ: 「${badgeText}」を${pos}に置く。小さな色面のラベルとし、キャッチコピーより目立たせない`
      );
    }
  }

  if (s.cta === true) {
    const ctaText = str(s.ctaText);
    if (ctaText) {
      const pos = POS_LABELS[str(s.ctaPos)] ?? "右下";
      lines.push(
        `ボタン風CTA: 「${ctaText}」を${pos}に置く。押せそうなボタンの形にするが、過剰な立体感や光沢は付けない`
      );
    }
  }

  return lines;
}

/** 1枚図解用のレイアウト行 */
function diagramLayoutLines(s: ToolState): string[] {
  const lines: string[] = [];
  const theme = str(s.diagramTheme);
  if (theme) lines.push(`図解のテーマ: ${theme}`);

  const type = str(s.diagramType);
  if (type) {
    lines.push(`図解タイプ: ${labelOf(DIAGRAM_TYPE_OPTIONS, type)}。${DIAGRAM_TYPE_PROMPTS[type]}`);
  } else {
    lines.push("図解タイプ: 指定なし。テーマに最も合う構成を選ぶ");
  }

  const items = splitLines(str(s.diagramItems));
  if (items.length > 0) {
    lines.push(`含める要素: ${items.join(" / ")}（この要素だけで構成し、勝手に増やさない）`);
  }

  lines.push("情報の階層: 最重要の1メッセージを最も大きく描く。全要素を同じ大きさで並べない");
  return lines;
}

/** 漫画用のレイアウト行 */
function mangaLayoutLines(s: ToolState): string[] {
  const lines: string[] = [];
  const count = Number(s.panelCount) || 1;
  lines.push(`コマ数: ${count}コマ`);
  lines.push(
    str(s.lang) === "en"
      ? "読み順: 左上から右下へ（英語の読み進み方向）"
      : "読み順: 右上から左下へ（日本語の読み進み方向）"
  );
  lines.push("コマ割り: 枠線は均一な太さ、コマ間の溝は一定幅で揃える。1コマにつき1つの出来事に絞る");

  const script = splitLines(str(s.mangaScript));
  script.forEach((line, i) => {
    lines.push(`コマ${i + 1}: ${line}`);
  });
  if (script.length > 0) {
    lines.push("セリフの焼き込み: 記載した文言を一字一句そのまま吹き出しに描く");
  }
  return lines;
}

/* ============================================================
 * ToolDef 本体
 * ============================================================ */

export const def: ToolDef = {
  id: "imagemd",
  name: "画像MD",
  tagline: "Nanobanana / ChatGPT に貼る、Markdown仕様書型の1枚画像プロンプトを組む",

  sections: [
    /* ---------- 01 基本 ---------- */
    {
      id: "basic",
      num: "01",
      title: "基本",
      badge: "required",
      fields: [
        {
          id: "usage",
          kind: "segment",
          label: "利用用途",
          help: "用途で下の設定項目が切り替わる",
          options: USAGE_OPTIONS,
        },
        {
          id: "ratio",
          kind: "pills",
          label: "比率",
          help: RATIO_HELP,
          options: RATIO_OPTIONS,
        },
      ],
    },

    /* ---------- 02 サムネ設定 ---------- */
    {
      id: "thumbSettings",
      num: "02",
      title: "サムネ設定",
      badge: "required",
      showIf: (s) => s.usage === "thumbnail",
      fields: [
        {
          id: "catch1",
          kind: "text",
          label: "キャッチコピー 1行目",
          help: "1行8〜14字目安。未入力の行は無視される",
          placeholder: "例: デザインは、削る仕事",
        },
        {
          id: "catch2",
          kind: "text",
          label: "キャッチコピー 2行目",
          placeholder: "例: 余白が語る",
        },
        {
          id: "catch3",
          kind: "text",
          label: "キャッチコピー 3行目",
          placeholder: "空欄なら2行構成",
        },
        {
          id: "subCopy",
          kind: "text",
          label: "サブコピー",
          help: "キャッチに添える一言。空欄なら省略",
          placeholder: "例: 現役UIデザイナーが解説",
        },
        {
          id: "subCopyStyle",
          kind: "segment",
          label: "サブコピーの表示形式",
          options: SUBCOPY_STYLE_OPTIONS,
          showIf: (s) => str(s.subCopy) !== "",
        },
        {
          id: "thumbLayout",
          kind: "segment",
          label: "レイアウト",
          help: "ダイナミック=強弱大きめ、上品=細め・余白広め",
          options: THUMB_LAYOUT_OPTIONS,
        },
        {
          id: "badge",
          kind: "toggle",
          label: "バッジを入れる",
          help: "「保存版」「初心者向け」などの小ラベル",
        },
        {
          id: "badgeText",
          kind: "text",
          label: "バッジのテキスト",
          placeholder: "例: 保存版",
          showIf: (s) => s.badge === true,
        },
        {
          id: "badgePos",
          kind: "segment",
          label: "バッジの位置",
          options: BADGE_POS_OPTIONS,
          showIf: (s) => s.badge === true,
        },
        {
          id: "cta",
          kind: "toggle",
          label: "ボタン風CTAを入れる",
          help: "「続きを読む」などのボタン風パーツ",
        },
        {
          id: "ctaText",
          kind: "text",
          label: "CTAのテキスト",
          placeholder: "例: 続きを読む",
          showIf: (s) => s.cta === true,
        },
        {
          id: "ctaPos",
          kind: "segment",
          label: "CTAの位置",
          options: CTA_POS_OPTIONS,
          showIf: (s) => s.cta === true,
        },
      ],
    },

    /* ---------- 02 図解設定 ---------- */
    {
      id: "diagramSettings",
      num: "02",
      title: "図解設定",
      badge: "required",
      showIf: (s) => s.usage === "diagram",
      fields: [
        {
          id: "diagramTheme",
          kind: "text",
          label: "図解のテーマ",
          placeholder: "例: デザインレビューの回し方",
        },
        {
          id: "diagramItems",
          kind: "textarea",
          label: "含める要素",
          help: "1行に1要素。書いた要素だけで図解が組まれる",
          rows: 5,
          placeholder: "依頼者がコンテキストを書く\nレビュアーは観点を宣言する\n指摘は提案の形にする",
        },
        {
          id: "diagramType",
          kind: "pills",
          label: "図解タイプ",
          help: "未選択ならテーマに合う型をAIが選ぶ",
          options: DIAGRAM_TYPE_OPTIONS,
        },
      ],
    },

    /* ---------- 02 漫画設定 ---------- */
    {
      id: "mangaSettings",
      num: "02",
      title: "漫画設定",
      badge: "required",
      showIf: (s) => s.usage === "manga",
      fields: [
        {
          id: "panelCount",
          kind: "number",
          label: "コマ数",
          min: 1,
          max: 8,
        },
        {
          id: "mangaScript",
          kind: "textarea",
          label: "あらすじ・セリフ",
          help: "コマごとに1行。「状況。セリフ「〜」」の形で書くと伝わる",
          rows: 6,
          placeholder:
            "深夜、締切前のデザイナーが画面とにらめっこ。「あと1案だけ…」\n翌朝、寝落ちした机の上に完成案。「昨日の自分、天才」",
        },
      ],
    },

    /* ---------- 03 画風 ---------- */
    {
      id: "artStyle",
      num: "03",
      title: "画風",
      badge: "required",
      fields: [
        {
          id: "style",
          kind: "cards",
          label: "画風プリセット",
          columns: 3,
          options: STYLE_OPTIONS,
        },
        {
          id: "background",
          kind: "pills",
          label: "背景",
          help: "迷ったら白ベタ。グラデはノイズ処理込みで指示される",
          options: BACKGROUND_OPTIONS,
        },
      ],
    },

    /* ---------- 04 配色 ---------- */
    {
      id: "colors",
      num: "04",
      title: "配色",
      badge: "optional",
      fields: [
        {
          id: "colorRule",
          kind: "segment",
          label: "配色ルール",
          help: "白黒+1色が最も失敗しにくい",
          options: COLOR_RULE_OPTIONS,
        },
        {
          id: "accentColor",
          kind: "color",
          label: "アクセントカラー",
          swatches: ACCENT_SWATCHES,
          showIf: (s) => s.colorRule !== "mono",
        },
        {
          id: "accentRole",
          kind: "pills",
          label: "アクセントの役割",
          help: "1役割に絞ると画面が締まる。未選択なら要所のみに自制",
          options: ACCENT_ROLE_OPTIONS,
          showIf: (s) => s.colorRule !== "mono",
        },
      ],
    },

    /* ---------- 05 文字・人物 ---------- */
    {
      id: "typoPeople",
      num: "05",
      title: "文字・人物",
      badge: "optional",
      fields: [
        {
          id: "lang",
          kind: "segment",
          label: "文字の言語",
          options: LANG_OPTIONS,
        },
        {
          id: "fontMood",
          kind: "segment",
          label: "フォントの雰囲気",
          options: FONT_MOOD_OPTIONS,
        },
        {
          id: "personCount",
          kind: "number",
          label: "登場人物の人数",
          help: "0なら人物なしの画面になる",
          min: 0,
          max: 3,
        },
        {
          id: "persons",
          kind: "repeater",
          label: "人物の設定",
          countField: "personCount",
          itemLabel: (i) => `人物 ${String(i + 1).padStart(2, "0")}`,
          itemFields: [
            {
              id: "gender",
              kind: "segment",
              label: "性別",
              options: GENDER_OPTIONS,
            },
            {
              id: "outfit",
              kind: "segment",
              label: "服装",
              options: OUTFIT_OPTIONS,
            },
            {
              id: "outfitCustom",
              kind: "text",
              label: "服装の指定",
              placeholder: "例: ネイビーのセットアップに白スニーカー",
              showIf: (item) => item.outfit === "custom",
            },
            {
              id: "fromImage",
              kind: "toggle",
              label: "添付画像を忠実再現",
              help: "顔立ち・髪型・特徴を添付画像の人物に寄せる",
            },
            {
              id: "note",
              kind: "text",
              label: "補足",
              placeholder: "例: 30代前半・眼鏡・ノートPCを持つ",
            },
          ],
        },
      ],
    },

    /* ---------- 06 その他 ---------- */
    {
      id: "misc",
      num: "06",
      title: "その他",
      badge: "optional",
      fields: [
        {
          id: "banIcons",
          kind: "toggle",
          label: "画像内のアイコン・絵文字を禁止",
          help: "文字とモチーフだけで構成したいときON",
        },
        {
          id: "extra",
          kind: "textarea",
          label: "AIへの追加指示",
          rows: 4,
          placeholder: "仕様書に追記したい指示があれば自由に",
        },
      ],
    },
  ],

  defaults: {
    usage: "thumbnail",
    ratio: "16:9",
    catch1: "",
    catch2: "",
    catch3: "",
    subCopy: "",
    subCopyStyle: "plain",
    thumbLayout: "dynamic-center",
    badge: false,
    badgeText: "",
    badgePos: "top-left",
    cta: false,
    ctaText: "",
    ctaPos: "bottom-right",
    diagramTheme: "",
    diagramItems: "",
    diagramType: "",
    panelCount: 4,
    mangaScript: "",
    style: "corporate-flat",
    background: "white",
    colorRule: "mono-plus-one",
    accentColor: "#2563EB",
    accentRole: "",
    lang: "ja",
    fontMood: "sans",
    personCount: 0,
    persons: [],
    banIcons: false,
    extra: "",
  },

  build: (s) => {
    const warnings: string[] = [];
    const usage = str(s.usage) || "thumbnail";
    const ratio = str(s.ratio);
    const style = str(s.style) || "corporate-flat";
    const isMono = s.colorRule === "mono";
    const isManga = usage === "manga";

    /* ----- 基本 ----- */
    if (!ratio) warnings.push("比率が未選択。生成AI側の既定比率に任される");
    const basic = mdSection("基本", [
      `用途: ${USAGE_DESC[usage] ?? labelOf(USAGE_OPTIONS, usage)}`,
      ratio !== "" && `比率: ${ratio}`,
      "出力枚数: 1回の生成につき必ず1枚のみ。複数案の提示や、複数の画像を1枚にまとめることは禁止",
    ]);

    /* ----- レイアウト（用途別 + 共通） ----- */
    let layoutLines: string[] = [];
    if (usage === "thumbnail") {
      layoutLines = thumbLayoutLines(s);
      const hasCatch = [str(s.catch1), str(s.catch2), str(s.catch3)].some((c) => c !== "");
      if (!hasCatch) warnings.push("キャッチコピーが未入力。文字なしのビジュアルのみになる");
      if (s.badge === true && str(s.badgeText) === "")
        warnings.push("バッジがONだがテキストが未入力（プロンプトには反映されない）");
      if (s.cta === true && str(s.ctaText) === "")
        warnings.push("CTAがONだがテキストが未入力（プロンプトには反映されない）");
    } else if (usage === "diagram") {
      layoutLines = diagramLayoutLines(s);
      if (str(s.diagramTheme) === "") warnings.push("図解のテーマが未入力");
    } else {
      layoutLines = mangaLayoutLines(s);
      const script = splitLines(str(s.mangaScript));
      if (script.length === 0) {
        warnings.push("あらすじ・セリフが未入力");
      } else if (script.length !== (Number(s.panelCount) || 1)) {
        warnings.push(
          `コマ数（${Number(s.panelCount) || 1}）とあらすじの行数（${script.length}）が一致していない`
        );
      }
    }
    const layout = mdSection("レイアウト", [
      ...layoutLines,
      "安全余白: 画像の外周、短辺の7〜8%の内側には文字・ロゴ・重要要素を置かない",
      "余白: 画面全体の30%以上を余白として残す。1枚に載せるメッセージは1つに絞る",
    ]);

    /* ----- 画風・配色 ----- */
    const styleDef = STYLE_PROMPTS[style] ?? STYLE_PROMPTS["corporate-flat"];
    const swatch = ACCENT_SWATCHES.find(
      (sw) => sw.value.toLowerCase() === str(s.accentColor).toLowerCase()
    );
    const accentHex = str(s.accentColor);
    const accentDisp = swatch ? `${accentHex}（${swatch.label}）` : accentHex;
    /** 背景説明の基準色。モノクロ時はアクセントの代わりに無彩色を差し込む */
    const bgBase = isMono ? "無彩色のライトグレー" : `アクセント色（${accentHex}）`;
    const bg = str(s.background);
    const role = str(s.accentRole);

    const visual = mdSection("画風・配色", [
      `画風: ${labelOf(STYLE_OPTIONS, style)}。${styleDef.body}`,
      bg !== "" && `背景: ${backgroundPrompt(bg, bgBase)}`,
      `配色ルール: ${COLOR_RULE_PROMPTS[str(s.colorRule)] ?? COLOR_RULE_PROMPTS["mono-plus-one"]}`,
      !isMono && accentHex !== "" && `アクセントカラー: ${accentDisp}`,
      !isMono &&
        (role !== ""
          ? `アクセントの役割: ${ACCENT_ROLE_PROMPTS[role]}。それ以外の要素は無彩色を保つ`
          : "アクセントの使いどころ: 特定の役割には限定しないが、要所に絞って多用しない"),
      "世界観の統一: 同じ1人のデザイナーが仕上げたように、線の太さ・角丸・彩度・質感のルールを全要素で統一する",
    ]);

    /* ----- 文字 ----- */
    const typo = mdSection("文字", [
      `言語: ${LANG_PROMPTS[str(s.lang)] ?? LANG_PROMPTS.ja}`,
      `フォントの雰囲気: ${FONT_MOOD_PROMPTS[str(s.fontMood)] ?? FONT_MOOD_PROMPTS.sans}`,
      "焼き込みの精度: この仕様書で指定した文言は一字一句正確に描く。誤字・脱字・字形の崩れ・勝手な改行や追記を認めない",
      "指定していない文字・単語・透かし・署名を画像内に一切入れない",
    ]);

    /* ----- 登場人物 ----- */
    const personCount = Number(s.personCount) || 0;
    const persons = Array.isArray(s.persons) ? (s.persons as ItemState[]) : [];
    const personLines: string[] = [];
    if (personCount === 0) {
      personLines.push("人物: 登場させない");
    } else {
      personLines.push(`人数: ${personCount}人`);
      for (let i = 0; i < personCount; i++) {
        const p = persons[i] ?? {};
        const gender = GENDER_LABELS[str(p.gender)] ?? "指定なし（自然な方を選ぶ）";
        const outfitKind = str(p.outfit);
        const outfit =
          outfitKind === "custom"
            ? str(p.outfitCustom) || "自由（画風に合う服装を選ぶ）"
            : labelOf(OUTFIT_OPTIONS, outfitKind || "casual");
        const parts = [`性別=${gender}`, `服装=${outfit}`];
        if (p.fromImage === true) parts.push("添付画像の人物の顔立ち・髪型・特徴を忠実に再現する");
        const note = str(p.note);
        if (note) parts.push(`補足=${note}`);
        personLines.push(`人物${i + 1}: ${parts.join(" / ")}`);
      }
    }
    const people = mdSection("登場人物", personLines);

    /* ----- 禁止事項 ----- */
    const bans = mdSection("禁止事項", [
      isManga
        ? "漫画のコマ割りを除き、画像を分割したり複数の案を1枚に並べたりすること"
        : "複数の画像や案をグリッド・コラージュとして1枚に並べること",
      "白い角丸カードを等間隔に横並びさせただけの構図（AIにありがちな定型）",
      "①→②→③を矢印でつなぐだけのステップ図（同上）",
      "余白率30%を下回る文字・要素の詰め込み",
      "指定外の文字・ロゴ・透かし・署名の描き込み",
      styleDef.taboo !== "" && `質感の禁止: ${styleDef.taboo}`,
      s.banIcons === true && "画像内へのアイコン・絵文字の描画",
    ]);

    /* ----- 追加指示 ----- */
    const extra = str(s.extra);
    const extraSection = extra !== "" ? `## 追加指示\n${extra}` : null;

    /* ----- 組み立て ----- */
    const header =
      "# 画像生成仕様\n\nこの仕様書に従って画像を生成する。各項目は上から順にすべて適用すること。";
    const text = [header, basic, layout, visual, typo, people, bans, extraSection]
      .filter((b): b is string => typeof b === "string" && b !== "")
      .join("\n\n");

    return {
      text,
      meta: [
        { label: "用途", value: labelOf(USAGE_OPTIONS, usage) },
        { label: "比率", value: ratio || "未選択" },
        { label: "画風", value: labelOf(STYLE_OPTIONS, style) },
      ],
      warnings,
    };
  },
};
