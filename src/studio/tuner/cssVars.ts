/**
 * tokens.css の :root ブロックを素朴にトークナイズ／忠実シリアライズするユーティリティ。
 * - parseRootVars: 「--name: value; と行内コメント」を1行ずつ拾う
 * - serializeWithValues: 元テキストを保持したまま「値の文字列だけ」を置換する
 *   （コメント・改行・宣言順・インデントを壊さない）
 */

export interface CssVar {
  name: string;
  value: string;
  comment?: string;
}

/** 1行分の宣言（--name: value; の後ろに任意で行内コメント） */
const DECL_RE = /^\s*(--[\w-]+)\s*:\s*([^;]+);(?:\s*\/\*\s*(.*?)\s*\*\/)?/;

/** :root { ... } ブロックの範囲を返す（開き波括弧の直後〜閉じ波括弧の直前）。無ければ null */
function findRootBlock(css: string): { start: number; end: number } | null {
  const rootIdx = css.search(/:root\s*\{/);
  if (rootIdx < 0) return null;
  const open = css.indexOf("{", rootIdx);
  if (open < 0) return null;
  // CSS変数の値に波括弧は現れない前提で、対応する閉じ括弧まで深さを数える
  let depth = 1;
  for (let i = open + 1; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return { start: open + 1, end: i };
    }
  }
  return null;
}

/** :root ブロック内のCSS変数宣言を宣言順に列挙する */
export function parseRootVars(css: string): { vars: CssVar[] } {
  const block = findRootBlock(css);
  if (!block) return { vars: [] };
  const vars: CssVar[] = [];
  for (const line of css.slice(block.start, block.end).split("\n")) {
    const m = line.match(DECL_RE);
    if (!m) continue;
    vars.push({
      name: m[1],
      value: m[2].trim(),
      comment: m[3] ? m[3].trim() : undefined,
    });
  }
  return { vars };
}

/** 正規表現メタ文字のエスケープ */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 元のCSSテキストのうち、updated に含まれる変数の「値部分だけ」を差し替えて返す。
 * :root ブロック内のみを対象にし、それ以外のテキストは1文字も変えない。
 */
export function serializeWithValues(originalCss: string, updated: Record<string, string>): string {
  const block = findRootBlock(originalCss);
  if (!block) return originalCss;
  let body = originalCss.slice(block.start, block.end);
  for (const [name, value] of Object.entries(updated)) {
    // `--name` の直後に `\s*:` を要求するので --space-1 が --space-12 に誤マッチしない
    const re = new RegExp(`(${escapeRe(name)}\\s*:\\s*)[^;]*?(\\s*;)`);
    body = body.replace(re, (_all, pre: string, post: string) => `${pre}${value}${post}`);
  }
  return originalCss.slice(0, block.start) + body + originalCss.slice(block.end);
}
