/**
 * テキストをクリップボードへコピーする。成功で true。
 * Clipboard API が使えない環境（非セキュアコンテキスト等）では
 * textarea + execCommand のフォールバックを使い、実際の成否を返す。
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyTextFallback(text);
  }
}

/** execCommand("copy") によるフォールバック。戻り値まで見て成否を判定する */
function copyTextFallback(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.readOnly = true;
  // 画面外に固定配置して、フォーカス移動によるスクロールジャンプを防ぐ
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}
