import type { WfPlan, WfSection } from "./schema";

/**
 * WfPlan のバリデータ（wireframe-spec.md の規律をコードで守る）。
 * error = 構造として壊れている（描画・実装に支障）
 * warn  = 規律から外れている（直すべきだが描画はできる）
 */

export interface Violation {
  level: "error" | "warn";
  /** 違反箇所（例: "sections[2] 料金", "nav[0]"） */
  where: string;
  message: string;
}

/** 文字数をコードポイント基準で数える（サロゲートペアを1文字と数える） */
export function countChars(text: string): number {
  return [...text].length;
}

/** 文字数バンド（spec§5.1）。FVのheadingはキャッチコピー扱いで13〜25字 */
const BANDS = {
  catch: { min: 13, max: 25, label: "キャッチコピー" },
  heading: { min: 8, max: 15, label: "セクション見出し" },
  lead: { min: 40, max: 70, label: "リード文" },
  body: { min: 100, max: 200, label: "本文" },
  buttonLabel: { min: 2, max: 8, label: "ボタンラベル" },
  navLabel: { min: 2, max: 6, label: "ナビラベル" },
} as const;

/** ナビ個数の許容範囲（spec§3: 5±2個） */
const NAV_MIN = 3;
const NAV_MAX = 7;

/** CTA間隔: この数を超えてCTA無しセクションが続いたら警告（spec§6: 2〜3セクションごと） */
const CTA_GAP_MAX = 3;

/** 先頭セクションが hero 系（FV）かどうか */
function isHeroLike(section: WfSection): boolean {
  return section.kind === "hero" || section.kind.startsWith("hero-") || section.key === "fv";
}

/** そのセクションに行動導線（CTA）があるか */
function hasCta(section: WfSection): boolean {
  return section.isCta === true || section.kind === "cta" || !!section.copy.buttonLabel;
}

/** 「見出し＋説明文」の同型カードグリッドか（3枚以上のカード並び） */
function isCardGrid(section: WfSection): boolean {
  const items = section.copy.items;
  return (
    section.layout.type === "standard" &&
    !section.layout.asymmetric &&
    !!items &&
    items.length >= 3
  );
}

/** customHtml の危険・禁止パターン検査（scriptタグ・外部URL参照） */
function findCustomHtmlIssue(html: string): string | null {
  if (/<\s*script/i.test(html)) return "<script>タグは使用禁止";
  if (/\bjavascript\s*:/i.test(html)) return "javascript: URLは使用禁止";
  if (/https?:\/\//i.test(html)) return "外部URL参照は禁止（WFは1ファイル完結）";
  if (/(?:src|href)\s*=\s*["']\s*\/\//i.test(html)) return "プロトコル相対URL（//）は禁止";
  return null;
}

/** 文字数バンド検査。範囲外なら warn を1件返す */
function checkBand(
  where: string,
  text: string | undefined,
  band: { min: number; max: number; label: string },
): Violation | null {
  if (text === undefined || text === "") return null;
  const len = countChars(text);
  if (len < band.min || len > band.max) {
    return {
      level: "warn",
      where,
      message: `${band.label}が${len}字（目安${band.min}〜${band.max}字）: 「${text.length > 30 ? `${text.slice(0, 30)}…` : text}」`,
    };
  }
  return null;
}

/** WfPlan 全体を検査して違反リストを返す（error → warn の順） */
export function validateWfPlan(plan: WfPlan): Violation[] {
  const errors: Violation[] = [];
  const warns: Violation[] = [];

  const sections = plan.sections ?? [];
  const nav = plan.nav ?? [];

  // --- error: 先頭セクションが FV（hero系）でない ---
  if (sections.length === 0) {
    errors.push({ level: "error", where: "sections", message: "セクションが1つもない" });
  } else {
    const first = sections[0];
    if (!isHeroLike(first)) {
      errors.push({
        level: "error",
        where: `sections[0] ${first.label}`,
        message: `先頭セクションはFV（kind: "hero"）にする（現在: ${first.kind}）`,
      });
    }
  }

  // --- error: セクションkey重複 ---
  const seenKeys = new Set<string>();
  sections.forEach((s, i) => {
    if (seenKeys.has(s.key)) {
      errors.push({
        level: "error",
        where: `sections[${i}] ${s.label}`,
        message: `セクションkey「${s.key}」が重複している`,
      });
    }
    seenKeys.add(s.key);
  });

  // --- error: navのsectionKey参照切れ / nav個数 ---
  const keySet = new Set(sections.map((s) => s.key));
  nav.forEach((item, i) => {
    if (!keySet.has(item.sectionKey)) {
      errors.push({
        level: "error",
        where: `nav[${i}] ${item.label}`,
        message: `sectionKey「${item.sectionKey}」に対応するセクションが無い`,
      });
    }
  });
  if (nav.length < NAV_MIN || nav.length > NAV_MAX) {
    errors.push({
      level: "error",
      where: "nav",
      message: `ナビは${NAV_MIN}〜${NAV_MAX}個にする（現在: ${nav.length}個）`,
    });
  }

  // --- error: customHtml の禁止パターン ---
  sections.forEach((s, i) => {
    const html = s.layout.customHtml;
    if (html) {
      const issue = findCustomHtmlIssue(html);
      if (issue) {
        errors.push({
          level: "error",
          where: `sections[${i}] ${s.label}`,
          message: `customHtml: ${issue}`,
        });
      }
    }
  });

  // --- warn: ナビラベル文字数（2〜6字） ---
  nav.forEach((item, i) => {
    const v = checkBand(`nav[${i}]`, item.label, BANDS.navLabel);
    if (v) warns.push(v);
  });

  // --- warn: セクションごとの文字数バンド ---
  sections.forEach((s, i) => {
    const where = `sections[${i}] ${s.label}`;
    // FV（先頭 or hero系）の見出しはキャッチコピー扱い（13〜25字）
    const headingBand = i === 0 || isHeroLike(s) ? BANDS.catch : BANDS.heading;
    const checks = [
      checkBand(where, s.copy.heading, headingBand),
      checkBand(where, s.copy.lead, BANDS.lead),
      checkBand(where, s.copy.body, BANDS.body),
      checkBand(where, s.copy.buttonLabel, BANDS.buttonLabel),
    ];
    for (const v of checks) if (v) warns.push(v);
  });

  // --- warn: CTA配置（FV内CTA必須・CTA間隔） ---
  if (sections.length > 0) {
    const first = sections[0];
    if (isHeroLike(first) && !first.copy.buttonLabel) {
      warns.push({
        level: "warn",
        where: `sections[0] ${first.label}`,
        message: "FV内にCTAボタンが無い（spec§6: FVに必ず1つ置く）",
      });
    }
    // 直近のCTAから何セクション空いたかを数える
    let gap = 0;
    sections.forEach((s, i) => {
      if (hasCta(s)) {
        gap = 0;
        return;
      }
      gap += 1;
      if (gap === CTA_GAP_MAX + 1) {
        warns.push({
          level: "warn",
          where: `sections[${i}] ${s.label}`,
          message: `CTA無しのセクションが${CTA_GAP_MAX}つを超えて続いている（spec§6: 2〜3セクションごとに1つ）`,
        });
      }
    });
  }

  // --- warn: 非対称セクションゼロ（spec§9: 1ページ最低1箇所） ---
  if (sections.length > 0 && !sections.some((s) => s.layout.asymmetric === true)) {
    warns.push({
      level: "warn",
      where: "sections",
      message: "非対称レイアウトのセクションが1つも無い（spec§9: 非対称・断ち落とし・重なりを最低1箇所）",
    });
  }

  // --- warn: 同型3カラムカードの連続（spec§9: 2セクション以上連続禁止） ---
  for (let i = 1; i < sections.length; i += 1) {
    if (isCardGrid(sections[i - 1]) && isCardGrid(sections[i])) {
      warns.push({
        level: "warn",
        where: `sections[${i}] ${sections[i].label}`,
        message: `「見出し＋カード並び」の同型セクションが連続している（前: ${sections[i - 1].label}）。レイアウトを変える`,
      });
    }
  }

  return [...errors, ...warns];
}

/**
 * errorレベルのみを連結した要約を返す（cocreate の validate 用）。
 * error が無ければ null（warn だけなら通してよい）。
 */
export function errorSummary(plan: WfPlan): string | null {
  const errors = validateWfPlan(plan).filter((v) => v.level === "error");
  if (errors.length === 0) return null;
  return errors.map((v) => `${v.where}: ${v.message}`).join("\n");
}
