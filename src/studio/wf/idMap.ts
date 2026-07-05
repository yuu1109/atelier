/**
 * セクションID変換（wireframe-spec.md §8 準拠）。
 * kind（sections.json の id）→ <section id> → Astroコンポーネント名 の対応を一元管理する。
 * WFのセクション構造がそのまま Phase E のコンポーネント分割単位になる。
 */

/** kind → セクションIDの対応表（spec§8 推奨ID）。未掲載kindはケバブケースそのまま */
const KIND_TO_ID: Record<string, string> = {
  hero: "fv",
  features: "reasons",
  "pricing-table": "pricing",
  pricing: "pricing",
  "service-list": "services",
  menu: "menu",
  flow: "flow",
  team: "staff",
  access: "access",
  faq: "faq",
  cta: "cta",
  testimonials: "voice",
  contact: "contact",
  gallery: "gallery",
  stats: "stats",
};

/** 文字列をケバブケースへ正規化（英数とハイフンのみ。id属性に安全な形） */
function toKebab(raw: string): string {
  const kebab = raw
    .trim()
    // camelCase → camel-case
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    // 空白・アンダースコアはハイフンへ
    .replace(/[\s_]+/g, "-")
    // 英数ハイフン以外を除去
    .replace(/[^a-z0-9-]/g, "")
    // 連続ハイフンを1つに・端のハイフンを除去
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return kebab;
}

/**
 * kind からセクションID（<section id>）を作る。
 * - 既知kindは spec§8 の推奨ID（hero→fv, features→reasons 等）
 * - 未知kindはケバブケースそのまま
 * - 空になったら section-{index+1} でフォールバック
 * - 重複時は -2, -3… を付与。used に採番済みIDを追記して返す
 */
export function toSectionId(kind: string, index: number, used: Set<string>): string {
  const base = KIND_TO_ID[kind] ?? toKebab(kind) ?? "";
  const fallback = base !== "" ? base : `section-${index + 1}`;
  let id = fallback;
  let n = 2;
  while (used.has(id)) {
    id = `${fallback}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

/** セクションID → Astroコンポーネント名の対応表（spec§8）。汎用はPascalCase */
const ID_TO_COMPONENT: Record<string, string> = {
  fv: "Hero.astro",
  reasons: "Reasons.astro",
  services: "Services.astro",
  menu: "Services.astro",
  pricing: "Pricing.astro",
  flow: "Flow.astro",
  staff: "Staff.astro",
  access: "Access.astro",
  faq: "Faq.astro",
  cta: "Cta.astro",
  voice: "Testimonials.astro",
  contact: "Contact.astro",
  gallery: "Gallery.astro",
  stats: "Stats.astro",
};

/**
 * セクションIDから想定Astroコンポーネント名を返す。
 * 対応表に無いIDは PascalCase + ".astro"（例: before-after → BeforeAfter.astro）
 */
export function toAstroComponentName(sectionId: string): string {
  const known = ID_TO_COMPONENT[sectionId];
  if (known) return known;
  // 採番サフィックス（-2 等）は落としてから変換する
  const base = sectionId.replace(/-\d+$/, "");
  const pascal = base
    .split("-")
    .filter((part) => part !== "")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `${pascal !== "" ? pascal : "Section"}.astro`;
}
