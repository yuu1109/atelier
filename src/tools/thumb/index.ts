import type { ToolDef, ToolState } from "../../lib/types";
import { block, bullets, joinBlocks } from "../../lib/prompt";
import { FEELINGS, MEDIA, STYLES } from "./data";

/**
 * thumb: サムネ・1枚画像プロンプトビルダー。
 * YouTubeサムネ・noteアイキャッチ等「クリックを獲得する1枚画像」のプロンプトを組む。
 */

/** state から文字列値を安全に取り出す */
function str(s: ToolState, id: string): string {
  const v = s[id];
  return typeof v === "string" ? v.trim() : "";
}

/** 派手さ → プロンプト指針 */
const INTENSITY_LINES: Record<string, string> = {
  minimal: "派手さはミニマル。要素と色数を極限まで絞り、余白と精度で見せる",
  calm: "派手さは落ち着き。コントラストは中程度に抑え、上品にまとめる",
  standard: "派手さは標準。目を引く強さと読みやすさのバランスを取る",
  loud: "派手さは派手寄り。高コントラストと大きな要素で瞬間的な引きを最優先する",
};

/** 属性の値 → 表示ラベル */
const ATTR_LABELS: Record<string, string> = {
  worker: "会社員",
  owner: "経営者・フリーランス",
  homemaker: "主婦・主夫",
  student: "学生",
  engineer: "エンジニア",
  creator: "クリエイター",
  beginner: "初心者",
  advanced: "上級者",
};

/** 被写体ブロックの本文を組む */
function buildSubject(s: ToolState): string {
  const type = str(s, "subjectType");
  const note = str(s, "subjectNote");
  const lines: string[] = [];
  if (type === "person") {
    lines.push("人物を主役に据える。表情と視線の方向で感情が伝わる瞬間を切り取る");
  } else if (type === "animal") {
    lines.push("動物を主役に据える。仕草や表情から親しみが伝わる瞬間を選ぶ");
  } else if (type === "object") {
    lines.push("モノまたは風景を主役に据える。質感と光の当て方で物語性を持たせる");
  } else if (type === "none") {
    lines.push("特定の被写体は置かず、タイポグラフィと抽象的な面・図形で画面を構成する");
  } else if (str(s, "title") !== "") {
    lines.push("タイトルにふさわしい象徴的な被写体をひとつ選び、画面の主役に据える");
  } else {
    lines.push("内容にふさわしい象徴的な被写体をひとつ選び、画面の主役に据える");
  }
  if (note) lines.push(`被写体の補足: ${note}`);
  return bullets(lines);
}

/** 文字の扱いブロックの本文を組む。焼き込み文字は一字一句の正確さを明記する */
function buildTextBlock(s: ToolState): { body: string; hasBaked: boolean } {
  const weight = str(s, "textWeight");
  const bakes: Array<[string, string]> = [
    ["タイトル", str(s, "bakeTitle")],
    ["サブタイトル", str(s, "bakeSub")],
    ["キャッチコピー", str(s, "bakeCatch")],
  ].filter((pair): pair is [string, string] => pair[1] !== "");
  const hasBaked = bakes.length > 0;

  const lines: string[] = [];
  if (weight === "hero") {
    lines.push("文字は主役級。タイポグラフィを画面の主要要素として大きく組む");
  } else if (weight === "subtle") {
    lines.push("文字は控えめ。画が主役で、文字は小さく添える程度にする");
  } else if (weight === "none" && !hasBaked) {
    lines.push("画面内に文字は一切入れない");
  }

  // タイトル未入力時は「タイトル」への宙吊り参照を避け、「主題」で言い換える
  const summarySource = str(s, "title") !== "" ? "タイトル" : "主題";

  if (hasBaked) {
    for (const [label, value] of bakes) {
      lines.push(`${label}: 「${value}」`);
    }
    lines.push("上記の文字列は一字一句正確に描く。字形を崩したり、似た別の文字に置き換えたりしない");
    lines.push("指定した文字列以外の文字（意味のない英字列・飾り文字・透かし）は画面に入れない");
  } else if (weight === "hero") {
    lines.push(
      `焼き込む文字の指定はないため、${summarySource}を8〜14字に要約した日本語キャッチ1つを主役として組む。誤字や存在しない字形は絶対に出さない`
    );
  } else if (weight === "subtle") {
    lines.push(
      `焼き込む文字の指定はないため、入れる場合は${summarySource}を8〜14字に要約した日本語キャッチ1つだけにする。誤字や存在しない字形は絶対に出さない`
    );
  } else if (weight === "") {
    lines.push(
      "文字の有無はスタイルと媒体に合わせて判断してよい。入れる場合は短い日本語キャッチ1つまでとし、誤字を出さない"
    );
  }

  return { body: bullets(lines), hasBaked };
}

/** 届けたい相手ブロックの本文を組む。指定がなければ空文字 */
function buildAudience(s: ToolState): string {
  const age = str(s, "audienceAge");
  const gender = str(s, "audienceGender");
  const attr = ATTR_LABELS[str(s, "audienceAttr")] ?? "";
  const note = str(s, "audienceNote");

  const genderLabel = gender === "female" ? "女性" : gender === "male" ? "男性" : "";
  const parts = [age, genderLabel, attr].filter((p) => p !== "");
  if (parts.length === 0 && note === "") return "";

  const lines: string[] = [];
  if (parts.length > 0) lines.push(`届ける相手: ${parts.join("・")}`);
  if (note) lines.push(`相手の補足: ${note}`);
  lines.push("この相手が普段目にしているデザインの水準を想像し、手が止まる語彙・距離感・色を選ぶ");
  return bullets(lines);
}

export const def: ToolDef = {
  id: "thumb",
  name: "サムネ",
  tagline: "YouTubeサムネからnoteアイキャッチまで、クリックを取りにいく1枚画像のプロンプトを組む",
  sections: [
    {
      id: "medium",
      num: "01",
      title: "どこに使う",
      badge: "required",
      fields: [
        {
          id: "medium",
          kind: "cards",
          columns: 2,
          options: MEDIA.map((m) => ({
            value: m.value,
            label: m.label,
            desc: m.desc,
            tags: [m.ratio],
          })),
        },
      ],
    },
    {
      id: "message",
      num: "02",
      title: "伝えたいこと",
      badge: "optional",
      fields: [
        {
          id: "title",
          kind: "text",
          label: "タイトル",
          help: "空欄なら内容から自動で考えさせる",
          placeholder: "例: 朝の10分で1日が変わる",
        },
        {
          id: "message",
          kind: "textarea",
          label: "何を伝えるか",
          rows: 2,
          placeholder: "例: 朝のルーティンを3つに絞ると続く、という主張",
        },
        {
          id: "feeling",
          kind: "pills",
          label: "どう感じてほしい",
          options: FEELINGS.map((f) => ({ value: f.value, label: f.label })),
        },
      ],
    },
    {
      id: "design",
      num: "03",
      title: "デザイン",
      badge: "required",
      fields: [
        {
          id: "workflow",
          kind: "segment",
          label: "ワークフロー",
          help: "4案はテイスト違いを2x2グリッド1枚で見比べ、選んだ案で本生成する2段構え",
          options: [
            { value: "explore", label: "方向性を4案見る" },
            { value: "final", label: "完成1枚を生成" },
          ],
        },
        {
          id: "style",
          kind: "cards",
          label: "スタイルプリセット",
          columns: 3,
          help: "迷ったら媒体のトーンに近い系統（実写 / フラット / イラスト）から選ぶ",
          options: STYLES.map((p) => ({
            value: p.value,
            label: p.label,
            desc: p.desc,
            tags: p.tags,
            preview: p.preview,
          })),
        },
        {
          id: "intensity",
          kind: "segment",
          label: "派手さ",
          options: [
            { value: "minimal", label: "ミニマル" },
            { value: "calm", label: "落ち着き" },
            { value: "standard", label: "標準" },
            { value: "loud", label: "派手" },
          ],
        },
        {
          id: "textWeight",
          kind: "segment",
          label: "文字の主張",
          help: "未選択ならスタイルと媒体に合わせて自動",
          options: [
            { value: "none", label: "文字なし" },
            { value: "subtle", label: "控えめ" },
            { value: "hero", label: "主役級" },
          ],
        },
      ],
    },
    {
      id: "detail",
      num: "04",
      title: "詳細",
      badge: "optional",
      fields: [
        {
          id: "audienceAge",
          kind: "pills",
          label: "誰に届ける: 年代",
          options: [
            { value: "10代", label: "10代" },
            { value: "20代", label: "20代" },
            { value: "30代", label: "30代" },
            { value: "40代", label: "40代" },
            { value: "50代", label: "50代" },
            { value: "60代以上", label: "60代以上" },
          ],
        },
        {
          id: "audienceGender",
          kind: "segment",
          label: "性別",
          options: [
            { value: "none", label: "指定なし" },
            { value: "female", label: "女性" },
            { value: "male", label: "男性" },
          ],
        },
        {
          id: "audienceAttr",
          kind: "pills",
          label: "属性",
          options: Object.entries(ATTR_LABELS).map(([value, label]) => ({ value, label })),
        },
        {
          id: "audienceNote",
          kind: "text",
          label: "相手の補足",
          placeholder: "例: 子育て中で自分の時間が取れない",
        },
        {
          id: "bakeTitle",
          kind: "text",
          label: "焼き込む文字: タイトル",
          help: "1行8〜14字目安。画像内に文字として描かせる",
          placeholder: "例: 朝10分で人生が変わる",
        },
        {
          id: "bakeSub",
          kind: "text",
          label: "焼き込む文字: サブタイトル",
          placeholder: "例: 続けられる仕組みの作り方",
        },
        {
          id: "bakeCatch",
          kind: "text",
          label: "焼き込む文字: キャッチコピー",
          placeholder: "例: 保存版",
        },
        {
          id: "subjectType",
          kind: "segment",
          label: "被写体",
          help: "未選択ならタイトルに合わせて自動で決める",
          options: [
            { value: "person", label: "人物" },
            { value: "animal", label: "動物" },
            { value: "object", label: "モノ・風景" },
            { value: "none", label: "なし" },
          ],
        },
        {
          id: "subjectNote",
          kind: "text",
          label: "被写体の補足",
          placeholder: "例: 30代女性がノートPCに向かう横顔",
        },
        {
          id: "brandColor",
          kind: "color",
          label: "ブランドカラー",
          swatches: [
            { value: "#007AFF", label: "ブルー" },
            { value: "#E4572E", label: "オレンジレッド" },
            { value: "#16A34A", label: "グリーン" },
            { value: "#7C3AED", label: "パープル" },
            { value: "#0F766E", label: "ティール" },
            { value: "#111827", label: "ダークグレー" },
          ],
        },
        {
          id: "extra",
          kind: "textarea",
          label: "追加の指示",
          placeholder: "例: ロゴを右上に置く余白を確保しておきたい",
        },
      ],
    },
  ],
  defaults: {
    medium: "",
    title: "",
    message: "",
    feeling: "",
    workflow: "final",
    style: "",
    intensity: "standard",
    textWeight: "",
    audienceAge: "",
    audienceGender: "none",
    audienceAttr: "",
    audienceNote: "",
    bakeTitle: "",
    bakeSub: "",
    bakeCatch: "",
    subjectType: "",
    subjectNote: "",
    brandColor: "",
    extra: "",
  },
  build: (s) => {
    const medium = MEDIA.find((m) => m.value === str(s, "medium"));
    const style = STYLES.find((p) => p.value === str(s, "style"));
    const feeling = FEELINGS.find((f) => f.value === str(s, "feeling"));
    const workflow = str(s, "workflow");
    const title = str(s, "title");
    const message = str(s, "message");
    const brandColor = str(s, "brandColor");

    // 冒頭の役割宣言
    const opening = `あなたは、SNSとメディアの現場でクリック率を成果として出してきたアートディレクター兼グラフィックデザイナー。以下の指定に従い、${
      medium ? `${medium.label}として機能する` : "指定用途で機能する"
    }1枚画像を設計して生成する。`;

    // 出力形式
    const formatLines = [
      medium ? `用途: ${medium.label}。${medium.desc}` : "用途: 未指定（汎用の1枚画像として扱う）",
      medium ? `比率: ${medium.ratio}` : null,
      medium ? `レイアウト指針: ${medium.note}` : null,
      workflow === "explore"
        ? "最終成果物は必ず単独の1枚。工程は【進め方】に従う"
        : "出力は必ず単独の1枚。複数案をグリッドや分割レイアウトで1枚にまとめることは絶対禁止",
    ];

    // 方向性提案ワークフロー（2段フロー）
    const workflowBody =
      workflow === "explore"
        ? bullets([
            "工程1: まず同じテーマで方向性の異なる4案を作り、1枚の画像に2x2のグリッドで並べて提案する。各案は本番と同じ比率で描き、左上から1〜4の番号を小さく振る",
            "4案は配色・画風・構図の軸をはっきり変え、見比べる価値のある違いを作る",
            "工程2: 私が番号で選んだら、その方向性のまま完成品を生成する。完成品は必ず単独の1枚とし、この工程でのグリッドや複数案の同時出力は絶対禁止",
            "後述の共通ルール（デザインルール・禁止事項）は、工程1では4案それぞれに、工程2では完成1枚に適用する",
          ])
        : null;

    // 伝えたいこと
    const messageLines =
      title || message || feeling
        ? bullets([
            title
              ? `タイトル: ${title}`
              : "タイトル: 指定なし。伝える内容から最も引きの強いタイトル案をあなたが立てる",
            message ? `伝える内容: ${message}` : null,
            feeling ? `見た人の感情ゴール: ${feeling.label}。${feeling.line}` : null,
          ])
        : "";

    // ビジュアルスタイル
    const styleBody = style
      ? style.prompt
      : "スタイルの指定なし。媒体と内容に合う一貫したスタイルをあなたが決め、途中で混ぜない。";
    const styleLines = bullets([
      INTENSITY_LINES[str(s, "intensity")] ?? null,
      brandColor
        ? `ブランドカラー ${brandColor} を必ず画面に使う。スタイルの配色と衝突する場合は差し色1役割に絞る`
        : null,
    ]);
    const styleBlock = styleLines ? `${styleBody}\n${styleLines}` : styleBody;

    // 文字の扱い
    const textResult = buildTextBlock(s);

    // 共通ルール
    const commonRules = [
      "[デザインルール]",
      bullets([
        "1枚に載せるメッセージはひとつ。要素が増えたら削る側に倒す",
        "同じ1人のデザイナーが仕上げたような統一された世界観にする。配色・線・質感のルールを途中で変えない",
        "画面端から短辺の7〜8%を安全余白とし、文字と主要要素を置かない",
        "余白率は画面全体の30%以上を保ち、埋め尽くさず視線の逃げ場を残す",
        "視線の起点と終点を決め、一筆書きで流れる構図にする",
        "日本語コピーに短い欧文を添える場合は、装飾ではなく意味のある単語を小さく使う",
      ]),
      "",
      "[禁止事項]",
      bullets([
        "白い角丸カードを横に並べる定型構図の禁止",
        "丸数字を矢印でつなぐステップフロー表現の禁止",
        "テキストの詰め込み禁止。一瞬で読み切れる量に絞る",
        "指定外の透かし・署名・ロゴ・フレーム装飾の禁止",
      ]),
    ].join("\n");

    const text = joinBlocks(
      opening,
      block("出力形式", bullets(formatLines)),
      block("進め方", workflowBody),
      block("伝えたいこと", messageLines),
      block("被写体", buildSubject(s)),
      block("ビジュアルスタイル", styleBlock),
      block("文字の扱い", textResult.body),
      block("届けたい相手", buildAudience(s)),
      block("共通ルール", commonRules),
      block("追加の指示", str(s, "extra"))
    );

    // 警告
    const warnings: string[] = [];
    if (!medium) warnings.push("媒体が未選択。比率とレイアウト指針が決まらない");
    if (!style) warnings.push("スタイルが未選択。仕上がりの方向性がブレるためプリセットの選択を推奨");
    if (!title && !message) warnings.push("タイトルも伝える内容も空。テーマが決まらないためどちらかの入力を推奨");
    if (str(s, "textWeight") === "none" && textResult.hasBaked) {
      warnings.push("文字の主張が「文字なし」なのに焼き込む文字が入力されている。どちらかに揃える");
    }

    return {
      text,
      meta: [
        { label: "媒体", value: medium?.label ?? "未選択" },
        { label: "比率", value: medium?.ratio ?? "—" },
        { label: "スタイル", value: style?.label ?? "未選択" },
        { label: "ワークフロー", value: workflow === "explore" ? "4案提案 → 本生成" : "完成1枚" },
      ],
      warnings,
    };
  },
};
