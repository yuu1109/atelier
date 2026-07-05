/**
 * プロンプト組み立ての共通ヘルパー。
 * 各ツールの build() から使う。
 */

/** 空文字・null を除いてブロックを空行で結合する */
export function joinBlocks(...blocks: Array<string | false | null | undefined>): string {
  return blocks.filter((b): b is string => typeof b === "string" && b.trim() !== "").join("\n\n");
}

/** 【見出し】+ 本文 のブロックを作る。本文が空なら null（joinBlocksで消える） */
export function block(title: string, body: string | false | null | undefined): string | null {
  if (typeof body !== "string" || body.trim() === "") return null;
  return `【${title}】${body.startsWith("\n") ? "" : "\n"}${body}`;
}

/** 行配列を "- " 箇条書きに。空行は除く */
export function bullets(lines: Array<string | false | null | undefined>): string {
  return lines
    .filter((l): l is string => typeof l === "string" && l.trim() !== "")
    .map((l) => `- ${l}`)
    .join("\n");
}

/** 改行区切りテキスト → 空行を除いた配列 */
export function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "");
}

/** 文字数（コピー対象の実サイズ感） */
export function charCount(text: string): number {
  return [...text].length;
}

/** ざっくりトークン見積もり（日本語主体: 約1.8字/tok） */
export function estimateTokens(text: string): number {
  return Math.round(charCount(text) / 1.8);
}
