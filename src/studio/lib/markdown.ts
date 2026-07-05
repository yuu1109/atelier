/**
 * hearing.md 等の「## 見出し単位」の素朴なパース/再構成。
 * 見出しの中身は原文のまま保持し、置換した見出しだけ差し替える
 * （AIやツールが触っていないセクションを壊さないための規約）。
 */

export interface MdSection {
  /** "## " を除いた見出しテキスト（先頭の絵文字や番号もそのまま） */
  heading: string;
  /** 見出し行を含まない本文（前後の空行はtrim） */
  body: string;
}

export interface MdDoc {
  /** 最初の ## より前の部分（タイトル行など）。無ければ "" */
  preamble: string;
  sections: MdSection[];
}

export function parseMd(md: string): MdDoc {
  const lines = md.split("\n");
  const doc: MdDoc = { preamble: "", sections: [] };
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join("\n").replace(/^\n+|\n+$/g, "");
    if (currentHeading === null) doc.preamble = body;
    else doc.sections.push({ heading: currentHeading, body });
    buffer = [];
  };

  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m && !line.startsWith("###")) {
      flush();
      currentHeading = m[1];
    } else {
      buffer.push(line);
    }
  }
  flush();
  return doc;
}

export function renderMd(doc: MdDoc): string {
  const parts: string[] = [];
  if (doc.preamble.trim()) parts.push(doc.preamble.trim());
  for (const s of doc.sections) {
    parts.push(`## ${s.heading}\n\n${s.body.trim()}`);
  }
  return parts.join("\n\n") + "\n";
}

/** 見出しの部分一致でセクションを探す（「分析」→「分析（3C・ペルソナ）」等も拾う） */
export function findSection(doc: MdDoc, headingIncludes: string): MdSection | undefined {
  return doc.sections.find((s) => s.heading.includes(headingIncludes));
}

/**
 * セクションを置換（無ければ末尾に追加）して新しいMdDocを返す。
 * 見出しは既存のものを保持する（部分一致で見つかった場合）。
 */
export function upsertSection(doc: MdDoc, headingIncludes: string, body: string, newHeading?: string): MdDoc {
  const idx = doc.sections.findIndex((s) => s.heading.includes(headingIncludes));
  if (idx >= 0) {
    const sections = doc.sections.slice();
    sections[idx] = { heading: sections[idx].heading, body };
    return { ...doc, sections };
  }
  return { ...doc, sections: [...doc.sections, { heading: newHeading ?? headingIncludes, body }] };
}
