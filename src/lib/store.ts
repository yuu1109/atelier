import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolState } from "./types";

/** 全ツールの状態を localStorage に永続化するキー */
const STORAGE_KEY = "atelier-state-v1";

type AllStates = Record<string, ToolState>;

/**
 * localStorage の安全な読み取り。
 * Cookie全ブロック等で localStorage へのアクセス自体が例外を投げる環境でも
 * アプリを落とさない（値が壊れている場合の防御は呼び出し側で行う）。
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** localStorage の安全な書き込み。保存できない環境では黙って諦める */
export function safeSetItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 容量超過・アクセス不可などは無視（UI操作は継続できる） */
  }
}

function loadAll(): AllStates {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * ツールごとの状態フック。
 * defaults とマージして返すので、フィールド追加後も古い保存データで壊れない。
 */
export function useToolState(toolId: string, defaults: ToolState) {
  const [state, setState] = useState<ToolState>(() => ({
    ...defaults,
    ...(loadAll()[toolId] ?? {}),
  }));

  // 書き込みはデバウンス（連打入力で localStorage を叩きすぎない）
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const all = loadAll();
      all[toolId] = state;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      } catch {
        /* 容量超過などは黙って無視（UI操作は継続できる） */
      }
    }, 300);
    return () => window.clearTimeout(timer.current);
  }, [toolId, state]);

  const set = useCallback((fieldId: string, value: ToolState[string]) => {
    setState((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const reset = useCallback(() => {
    setState({ ...defaults });
  }, [defaults]);

  return { state, set, setState, reset };
}

/** 全ツール設定を JSON 文字列で書き出す（バックアップ・共有用） */
export function exportAll(): string {
  return JSON.stringify({ app: "atelier", version: 1, state: loadAll() }, null, 2);
}

/** JSON 文字列から取り込む。成功で true */
export function importAll(json: string): boolean {
  try {
    const parsed = JSON.parse(json);
    const state = parsed?.state ?? parsed;
    if (typeof state !== "object" || state === null) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
