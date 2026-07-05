/**
 * DesignSystem の機械検証。
 * cocreate（useCoCreation）の validate に渡す想定:
 * 違反があれば日本語で連結した文字列、なければ null を返す。
 */

import { contrastRatio } from "../../lib/color";
import type { DesignSystem, DesignSystemColors } from "./schema";

/** #RRGGBB 形式 */
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** 10色変数の一覧（スキーマと同期） */
const COLOR_KEYS: (keyof DesignSystemColors)[] = [
  "bg",
  "bgAlt",
  "surface",
  "ink",
  "inkMuted",
  "heading",
  "primary",
  "onPrimary",
  "accent",
  "border",
];

/** コントラスト検証ルール（WCAG AA。DESIGN.md §8） */
const CONTRAST_RULES: {
  fg: keyof DesignSystemColors;
  bg: keyof DesignSystemColors;
  min: number;
  label: string;
}[] = [
  { fg: "ink", bg: "bg", min: 4.5, label: "本文 ink × 背景 bg" },
  { fg: "onPrimary", bg: "primary", min: 4.5, label: "CTA文字 on-primary × primary" },
  { fg: "inkMuted", bg: "bg", min: 3, label: "補足 ink-muted × 背景 bg" },
  { fg: "heading", bg: "bg", min: 3, label: "見出し heading × 背景 bg" },
];

/** forbidden（やってはいけないこと）の最低件数 */
const FORBIDDEN_MIN = 5;
/** extras（トーン固有の演出）の最低件数 */
const EXTRAS_MIN = 2;
/** Google Fonts CSS API v2 のURL接頭辞 */
const GOOGLE_FONTS_CSS2_PREFIX = "https://fonts.googleapis.com/css2";

/**
 * デザインシステムがDESIGN.mdのトークン契約を満たすか検証する。
 * @returns 違反があれば日本語の指摘（改行連結）、なければ null
 */
export function validateDesignSystem(ds: DesignSystem): string | null {
  const errors: string[] = [];

  // 1) 10色すべて #RRGGBB 形式
  for (const key of COLOR_KEYS) {
    const value = ds.colors[key];
    if (!HEX_RE.test(value)) {
      errors.push(`colors.${key} が #RRGGBB 形式でない（現在値: ${value}）`);
    }
  }

  // 2) コントラスト比（HEX不正の色は 1) で報告済みなのでスキップ）
  for (const rule of CONTRAST_RULES) {
    const ratio = contrastRatio(ds.colors[rule.fg], ds.colors[rule.bg]);
    if (ratio !== null && ratio < rule.min) {
      errors.push(
        `${rule.label} のコントラスト比が ${ratio.toFixed(2)}:1 で基準 ${rule.min}:1 未満。色を調整する`,
      );
    }
  }

  // 3) forbidden は5つ以上
  if (ds.forbidden.length < FORBIDDEN_MIN) {
    errors.push(
      `forbidden（やってはいけないこと）が${ds.forbidden.length}件しかない。法規制・配色事故・トーン崩壊の観点で${FORBIDDEN_MIN}件以上挙げる`,
    );
  }

  // 4) extras は2つ以上
  if (ds.decorations.extras.length < EXTRAS_MIN) {
    errors.push(
      `decorations.extras（トーン固有の演出）が${ds.decorations.extras.length}件しかない。透かし英字・grain・斜め境界などを${EXTRAS_MIN}件以上挙げる`,
    );
  }

  // 5) googleFontsUrl は Google Fonts CSS API v2 形式
  if (!ds.fonts.googleFontsUrl.startsWith(GOOGLE_FONTS_CSS2_PREFIX)) {
    errors.push(
      `fonts.googleFontsUrl は ${GOOGLE_FONTS_CSS2_PREFIX} で始まるURLにする（現在値: ${ds.fonts.googleFontsUrl}）`,
    );
  }

  return errors.length > 0 ? errors.join("\n") : null;
}
