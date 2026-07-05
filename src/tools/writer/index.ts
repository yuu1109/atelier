import type { BuiltPrompt, ToolDef, ToolState } from "../../lib/types";
import { bullets, joinBlocks, splitLines } from "../../lib/prompt";
import { lawRules, structureTemplates } from "./data";

/**
 * writer: 記事執筆用の「ライティング・トーン&ルール」Markdownを生成するツール。
 * 出力それ自体が ChatGPT / Claude に貼るプロンプトになる（画像生成系ではない）。
 */

/** Markdownセクション（## 見出し + 本文）。本文が空なら null で joinBlocks から消える */
function mdSection(title: string, body: string | false | null | undefined): string | null {
  if (typeof body !== "string" || body.trim() === "") return null;
  return `## ${title}\n${body}`;
}

/** 親項目つきのネスト箇条書き（"- 親" + "  - 子"）。子が無ければ null */
function nestedList(title: string, items: string[]): string | null {
  if (items.length === 0) return null;
  return `- ${title}\n${items.map((i) => `  - ${i}`).join("\n")}`;
}

/** 一人称の書き分けルール */
const firstPersonRules: Record<string, string> = {
  watashi: "一人称は「私」で統一する",
  boku: "一人称は「僕」で統一する",
  hissha: "一人称は「筆者」で統一する",
  none: "一人称は使わない。主語を省略するか、文を組み替えて自然に回避する",
};

/** 二人称の書き分けルール */
const secondPersonRules: Record<string, string> = {
  anata: "読者への呼びかけは「あなた」で統一する",
  minasan: "読者への呼びかけは「みなさん」で統一する",
  none: "読者への直接の呼びかけ語（あなた・みなさん等）は使わない",
};

/** 文体ルール */
const styleFormRules: Record<string, string> = {
  desumasu: "文末は「ですます調」で統一する。体言止めは多用しない",
  dearu: "文末は「である調」で統一する。断定が続いても高圧的にならない語彙を選ぶ",
};

/** 柔らかさルール */
const softnessRules: Record<string, string> = {
  soft: "語り口は柔らかく。話しかけるような距離感で、漢字は開きぎみに、専門用語はかみ砕いて説明する",
  normal: "語り口はふつう。親しみと信頼感のバランスを取り、崩しすぎない",
  hard: "語り口は硬め。落ち着いた説明調で、口語的な崩しや感嘆は避け、論理のつながりを明確にする",
};

/** 共感の強さルール */
const empathyRules: Record<string, string> = {
  strong: "読者の悩みにしっかり寄り添う。導入や各セクションの入り口で、悩みを代弁する一文を置いてから本題に入る",
  light: "共感表現は控えめにする。悩みへの言及は最小限で、すぐ本題と解決策に入る",
};

/** 煽り表現ルール */
const hypeRules: Record<string, string> = {
  kinshi: "煽り表現は禁止。「絶対」「必ず」「今すぐやらないと損」のような不安や焦りを煽る言い回しを使わない",
  hikaeme: "煽り表現は控えめに。強い断定や焦らせる言い回しは原則使わず、事実ベースで淡々と伝える",
  yosho: "煽り表現は要所でのみ許可。行動を促す結びや重要な注意喚起に限って強い言い回しを使い、乱用しない",
};

/** 絵文字ルール */
const emojiRules: Record<string, string> = {
  kinshi: "絵文字は一切使わない",
  ari: "絵文字を使ってよい。ただし1セクションに1つ程度にとどめ、連続では使わない",
};

/** 「！」の使用ルール */
const exclamationRules: Record<string, string> = {
  kinshi: "「！」は使わない。強調したいことは言葉の選び方で伝える",
  hikaeme: "「！」は記事全体で2〜3回まで。ここぞという一文にだけ使う",
  futsu: "「！」は各セクション1回程度まで、自然な範囲で使ってよい",
  ome: "「！」を積極的に使い、テンションの高い文面にする。ただし「！！」のような連続は禁止",
};

/** 見出しレベルルール */
const headingLevelRules: Record<string, string> = {
  h2: "見出しは ##（H2）から使い、階層を飛ばさない（## の中の小見出しは ###）",
  h3: "見出しは ###（H3）から使い、##（H2）以上のレベルは使わない",
};

/** 箇条書きルール */
const bulletUsageRules: Record<string, string> = {
  yosho: "箇条書きは要所で使う。3項目以上の列挙だけをリスト化し、本文の代わりにはしない",
  tayo: "箇条書きを積極的に使い、流し読みでも要点が拾える紙面にする",
  none: "箇条書きは使わず、すべて文章で書く",
};

/** 強調ルール */
const emphasisRules: Record<string, string> = {
  bold: "強調は太字（**）のみ。1段落に1箇所までを目安にする",
  boldMarker:
    "強調は太字とマーカーを使い分ける。太字=重要な語句、マーカー=読者に必ず読ませたい一文（媒体がマーカーに対応しない場合は太字に統一）",
  none: "太字・マーカーなどの装飾強調は使わない",
};

/** 改行の密度ルール */
const lineBreakRules: Record<string, string> = {
  normal: "段落は2〜4文でまとめ、段落の間に空行を1つ入れる",
  ome: "1〜2文ごとに改行し、余白を多めに取る。スマホでの読みやすさを最優先にする",
};

function build(s: ToolState): BuiltPrompt {
  const warnings: string[] = [];
  const isNew = s.mode === "new";
  const media = String(s.media);

  // 冒頭: 役割宣言と依頼文（モードで切替。調整モードは構成指定の有無で作業範囲が変わるため let）
  let intro = isNew
    ? "あなたはプロの編集者/ライターです。\nこれから示す条件にすべて従って、記事を1本執筆してください。"
    : "あなたはプロの編集者/ライターです。\nこのメッセージのあとに渡す文章を、以下のトーン&ルールに合うよう書き直してください。内容と事実関係は変えず、文体・語彙・表現を調整します。";

  // 大原則（冒頭固定）
  const mediaRule =
    media === "note"
      ? "執筆媒体は note。noteエディタで再現できる表現に収める（見出し・太字・箇条書き・引用まで。表とHTMLタグは使わない）"
      : media === "wordpress"
        ? "執筆媒体は WordPress。標準的なMarkdown（見出し・リスト・表・引用・コードブロック）をそのまま使ってよい"
        : "執筆媒体の指定なし。特定サービスに依存しない標準的なMarkdownで書く";
  const principles = bullets([
    "日本人にとって読みやすい、自然な日本語で書く",
    "機械的な文章を避ける: 同じ文末の3連続、「〜することができます」の多用、翻訳調の言い回し、「いかがでしたか」などの定型句は禁止",
    mediaRule,
  ]);

  // この記事について（新規モードのみ）
  let article: string | null = null;
  if (isNew) {
    const title = String(s.title ?? "").trim();
    const seo = s.seo === true;
    const keywords = [s.keyword1, s.keyword2, s.keyword3]
      .map((k) => String(k ?? "").trim())
      .filter((k) => k !== "");
    const lines: string[] = [
      title !== "" ? `- 記事タイトル: ${title}` : "- 記事タイトルは内容に合わせて提案する",
    ];
    if (seo && keywords.length > 0) {
      lines.push(
        "- SEOを意識する。次のキーワードをタイトル・見出し・本文に自然に織り込む（不自然な詰め込みは禁止）",
      );
      for (const k of keywords) lines.push(`  - ${k}`);
    } else if (seo) {
      lines.push("- SEOを意識し、検索意図に応える構成・見出しにする");
      warnings.push("SEOがONですがキーワードが未入力です");
    }
    article = lines.join("\n");
  }

  // 記事の構成
  const noIntro = s.noIntroHeading === true;
  // テンプレ雛形は先頭が「導入」で始まる規約。導入見出しなし設定ならそこだけ取り除く
  const resolveHeadings = (headings: string[]): string[] =>
    noIntro ? headings.filter((h) => !h.startsWith("導入")) : headings;
  let structureBody: string | null = null;
  if (s.structureMode === "template") {
    const template = structureTemplates.find((t) => t.id === s.structureTemplate);
    if (template) {
      const lead = isNew
        ? `「${template.label}」の流れをベースに執筆する。見出しの文言は記事の内容に合わせて具体化してよい:`
        : `調整と合わせて、「${template.label}」の流れに再構成する:`;
      structureBody = `${lead}\n${bullets(resolveHeadings(template.headings))}`;
    } else {
      warnings.push(
        isNew
          ? "構成テンプレが未選択のため、構成はお任せ扱いになります"
          : "構成テンプレが未選択のため、構成の指定は出力されません（元の構成のまま調整されます）",
      );
    }
  } else if (s.structureMode === "manual") {
    // 手動入力にもテンプレと同じく「導入見出しなし」を適用し、構成リストと矛盾しないようにする
    const manualHeadings = resolveHeadings(splitLines(String(s.structureManual ?? "")));
    if (manualHeadings.length > 0) {
      const lead = isNew
        ? "以下の見出し構成のとおりに執筆する:"
        : "調整と合わせて、以下の見出し構成に再構成する:";
      structureBody = `${lead}\n${bullets(manualHeadings)}`;
    } else {
      warnings.push(
        isNew
          ? "手動入力の見出しが空のため、構成はお任せ扱いになります"
          : "手動入力の見出しが空のため、構成の指定は出力されません（元の構成のまま調整されます）",
      );
    }
  }
  if (structureBody === null && isNew) {
    structureBody =
      "- 構成はお任せする。読者が迷子にならないよう、結論または要点を記事の前半で示す流れを組む";
  }
  // 調整モードで構成指定があるときは、冒頭の作業範囲宣言に構成の組み替えも含めて矛盾をなくす
  if (!isNew && structureBody !== null) {
    intro =
      "あなたはプロの編集者/ライターです。\nこのメッセージのあとに渡す文章を、以下のトーン&ルールに合うよう書き直してください。内容と事実関係は変えず、文体・語彙・表現の調整と、指定した見出し構成への組み替えを行います。";
  }
  const structureParts = [structureBody];
  if (noIntro) {
    structureParts.push("- 導入（リード文）には見出しを付けず、本文からそのまま書き始める");
  }

  // 想定読者
  const audience = String(s.audience ?? "").trim();
  const readerParts = [
    audience !== "" ? `- 想定読者: ${audience}` : null,
    nestedList("読者が抱えがちな悩み:", splitLines(String(s.pains ?? ""))),
    nestedList(
      "読み終えたときのゴール（読者がこうなっていれば成功）:",
      splitLines(String(s.goals ?? "")),
    ),
  ];

  // 声・文体
  const voice = bullets([
    firstPersonRules[String(s.firstPerson)],
    secondPersonRules[String(s.secondPerson)],
    styleFormRules[String(s.styleForm)],
    softnessRules[String(s.softness)],
  ]);

  // トーン
  const tone = bullets([
    empathyRules[String(s.empathy)],
    hypeRules[String(s.hype)],
    emojiRules[String(s.emoji)],
    exclamationRules[String(s.exclamation)],
  ]);

  // 表現ルール（カスタム禁止語）
  const ngList = splitLines(String(s.ngWords ?? ""));
  const expression =
    ngList.length > 0
      ? `次の語句は理由を問わず使わない:\n${bullets(ngList.map((w) => `「${w}」`))}`
      : null;

  // 業種別の法令・広告表現ルール
  const selectedLaws = Array.isArray(s.lawRules) ? (s.lawRules as string[]) : [];
  const lawSections = lawRules
    .filter((r) => selectedLaws.includes(r.id))
    .map((r) =>
      mdSection(
        `法令・広告表現ルール（${r.industry}）`,
        joinBlocks(
          `${r.laws}の観点。${r.note}`,
          `使わない表現の代表例:\n${bullets(r.ngWords.map((w) => `「${w}」`))}`,
          `言い換えの方針: ${r.rewrite}`,
        ),
      ),
    );

  // Markdownルール
  const markdown = bullets([
    headingLevelRules[String(s.headingLevel)],
    bulletUsageRules[String(s.bulletUsage)],
    emphasisRules[String(s.emphasis)],
    lineBreakRules[String(s.lineBreaks)],
  ]);

  const text = joinBlocks(
    intro,
    mdSection("大原則", principles),
    mdSection("この記事について", article ?? ""),
    mdSection("記事の構成", joinBlocks(...structureParts)),
    mdSection("想定読者", joinBlocks(...readerParts)),
    mdSection("声・文体", voice),
    mdSection("トーン", tone),
    mdSection("表現ルール", expression ?? ""),
    ...lawSections,
    mdSection("Markdownルール", markdown),
  );

  const mediaLabel = media === "note" ? "note" : media === "wordpress" ? "WordPress" : "その他";
  return {
    text,
    meta: [
      { label: "モード", value: isNew ? "新規記事" : "トーン調整" },
      { label: "媒体", value: mediaLabel },
      { label: "文体", value: s.styleForm === "dearu" ? "である" : "ですます" },
    ],
    warnings,
  };
}

export const def: ToolDef = {
  id: "writer",
  name: "ライティング",
  tagline: "記事の書き味を固定するトーン&ルールMDを組み立てる",
  sections: [
    {
      id: "usage",
      num: "01",
      title: "利用用途",
      badge: "required",
      fields: [
        {
          id: "mode",
          kind: "segment",
          label: "モード",
          help: "トーン調整は、手持ちの文章を書き直させるルールMDを作る",
          options: [
            { value: "new", label: "新規記事を書かせる" },
            { value: "adjust", label: "既存文のトーン調整" },
          ],
        },
        {
          id: "media",
          kind: "segment",
          label: "執筆媒体",
          help: "媒体で使えるMarkdown表現が変わる",
          options: [
            { value: "note", label: "note" },
            { value: "wordpress", label: "WordPress" },
            { value: "other", label: "その他" },
          ],
        },
      ],
    },
    {
      id: "article",
      num: "02",
      title: "この記事について",
      badge: "optional",
      showIf: (s) => s.mode === "new",
      fields: [
        {
          id: "seo",
          kind: "toggle",
          label: "SEOを狙う",
          help: "ONでキーワードをタイトル・見出し・本文に反映させる",
        },
        {
          id: "keyword1",
          kind: "text",
          label: "キーワード1",
          placeholder: "例: タスク管理",
          showIf: (s) => s.seo === true,
        },
        {
          id: "keyword2",
          kind: "text",
          label: "キーワード2",
          placeholder: "例: アプリ おすすめ",
          showIf: (s) => s.seo === true,
        },
        {
          id: "keyword3",
          kind: "text",
          label: "キーワード3",
          placeholder: "例: 続かない",
          showIf: (s) => s.seo === true,
        },
        {
          id: "title",
          kind: "text",
          label: "記事タイトル",
          placeholder: "空欄ならAIがタイトルを提案",
        },
      ],
    },
    {
      id: "structure",
      num: "03",
      title: "構成",
      badge: "optional",
      fields: [
        {
          id: "structureMode",
          kind: "segment",
          label: "構成の決め方",
          options: [
            { value: "auto", label: "AIにお任せ" },
            { value: "template", label: "テンプレから選ぶ" },
            { value: "manual", label: "手動入力" },
          ],
        },
        {
          id: "structureTemplate",
          kind: "pills",
          label: "構成テンプレ",
          help: "記事の型を選ぶと見出し構成が展開される",
          options: structureTemplates.map((t) => ({ value: t.id, label: t.label })),
          showIf: (s) => s.structureMode === "template",
        },
        {
          id: "structureManual",
          kind: "textarea",
          label: "見出し構成",
          help: "1行に1見出し。上から順に使われる",
          rows: 6,
          placeholder: "導入\nなぜ続かないのか\n解決策3つ\nまとめ",
          showIf: (s) => s.structureMode === "manual",
        },
        {
          id: "noIntroHeading",
          kind: "toggle",
          label: "導入に見出しを付けない",
          help: "リード文を見出しなしで書き始める",
        },
      ],
    },
    {
      id: "reader",
      num: "04",
      title: "読者",
      badge: "optional",
      fields: [
        {
          id: "audience",
          kind: "text",
          label: "想定読者",
          placeholder: "例: タスク管理が続かない20〜30代の会社員",
        },
        {
          id: "pains",
          kind: "textarea",
          label: "よくある悩み",
          help: "1行に1つ",
          rows: 3,
          placeholder: "アプリを入れても3日で開かなくなる\nやることが多すぎて優先順位がつけられない",
        },
        {
          id: "goals",
          kind: "textarea",
          label: "読後のゴール",
          help: "1行に1つ。読み終えた読者がどうなっていれば成功か",
          rows: 3,
          placeholder: "自分に合う管理方法を1つ選べる",
        },
      ],
    },
    {
      id: "voice",
      num: "05",
      title: "声・文体",
      badge: "required",
      fields: [
        {
          id: "firstPerson",
          kind: "segment",
          label: "一人称",
          options: [
            { value: "watashi", label: "私" },
            { value: "boku", label: "僕" },
            { value: "hissha", label: "筆者" },
            { value: "none", label: "使わない" },
          ],
        },
        {
          id: "secondPerson",
          kind: "segment",
          label: "二人称",
          options: [
            { value: "anata", label: "あなた" },
            { value: "minasan", label: "みなさん" },
            { value: "none", label: "使わない" },
          ],
        },
        {
          id: "styleForm",
          kind: "segment",
          label: "文体",
          options: [
            { value: "desumasu", label: "ですます" },
            { value: "dearu", label: "である" },
          ],
        },
        {
          id: "softness",
          kind: "segment",
          label: "柔らかさ",
          options: [
            { value: "soft", label: "柔らかい" },
            { value: "normal", label: "ふつう" },
            { value: "hard", label: "硬め" },
          ],
        },
      ],
    },
    {
      id: "tone",
      num: "06",
      title: "トーン",
      badge: "required",
      fields: [
        {
          id: "empathy",
          kind: "segment",
          label: "共感",
          options: [
            { value: "strong", label: "しっかり寄り添う" },
            { value: "light", label: "控えめ" },
          ],
        },
        {
          id: "hype",
          kind: "segment",
          label: "煽り表現",
          options: [
            { value: "kinshi", label: "禁止" },
            { value: "hikaeme", label: "控えめ" },
            { value: "yosho", label: "要所で" },
          ],
        },
        {
          id: "emoji",
          kind: "segment",
          label: "絵文字",
          options: [
            { value: "kinshi", label: "禁止" },
            { value: "ari", label: "あり" },
          ],
        },
        {
          id: "exclamation",
          kind: "segment",
          label: "「！」の使用",
          options: [
            { value: "kinshi", label: "禁止" },
            { value: "hikaeme", label: "控えめ" },
            { value: "futsu", label: "普通" },
            { value: "ome", label: "多め" },
          ],
        },
      ],
    },
    {
      id: "expression",
      num: "07",
      title: "表現ルール",
      badge: "optional",
      fields: [
        {
          id: "ngWords",
          kind: "textarea",
          label: "禁止語",
          help: "1行に1語。記事内で使わせない語句",
          rows: 3,
          placeholder: "爆速\n神アプリ",
        },
        {
          id: "lawRules",
          kind: "multi",
          label: "業種別法令ルール",
          help: "ONにした業種のNG表現と言い換え方針をルールに追加",
          options: lawRules.map((r) => ({ value: r.id, label: r.label })),
        },
      ],
    },
    {
      id: "markdown",
      num: "08",
      title: "Markdownルール",
      badge: "required",
      fields: [
        {
          id: "headingLevel",
          kind: "segment",
          label: "見出しレベル",
          options: [
            { value: "h2", label: "##（H2）から" },
            { value: "h3", label: "###（H3）から" },
          ],
        },
        {
          id: "bulletUsage",
          kind: "segment",
          label: "箇条書き",
          options: [
            { value: "yosho", label: "要所で" },
            { value: "tayo", label: "多用" },
            { value: "none", label: "使わない" },
          ],
        },
        {
          id: "emphasis",
          kind: "segment",
          label: "強調",
          options: [
            { value: "bold", label: "太字のみ" },
            { value: "boldMarker", label: "太字+マーカー" },
            { value: "none", label: "使わない" },
          ],
        },
        {
          id: "lineBreaks",
          kind: "segment",
          label: "改行の密度",
          options: [
            { value: "normal", label: "普通" },
            { value: "ome", label: "多め" },
          ],
        },
      ],
    },
  ],
  defaults: {
    mode: "new",
    media: "note",
    seo: false,
    keyword1: "",
    keyword2: "",
    keyword3: "",
    title: "",
    structureMode: "auto",
    structureTemplate: "",
    structureManual: "",
    noIntroHeading: false,
    audience: "",
    pains: "",
    goals: "",
    firstPerson: "watashi",
    secondPerson: "anata",
    styleForm: "desumasu",
    softness: "normal",
    empathy: "strong",
    hype: "hikaeme",
    emoji: "kinshi",
    exclamation: "hikaeme",
    ngWords: "",
    lawRules: [],
    headingLevel: "h2",
    bulletUsage: "yosho",
    emphasis: "bold",
    lineBreaks: "normal",
  },
  build,
};
