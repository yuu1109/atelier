import { useEffect, useState } from "react";

/**
 * 依存ゼロのハッシュルータ。
 * GitHub Pages（base: "./"）でリロードしても404にならないよう、
 * すべてのルートを location.hash で表現する。
 *
 *   #/tools/{toolId}                … 既存ツールモード
 *   #/studio                        … スタジオ（案件一覧）
 *   #/studio/p/{案件名}/{phase}      … 案件ワークスペース
 *   #/settings                      … 設定
 */

export type Route =
  | { kind: "tools"; toolId: string | null }
  | { kind: "studio" }
  | { kind: "project"; project: string; phase: string }
  | { kind: "settings" };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] === "tools") return { kind: "tools", toolId: parts[1] ?? null };
  if (parts[0] === "settings") return { kind: "settings" };
  if (parts[0] === "studio") {
    if (parts[1] === "p" && parts[2]) {
      return { kind: "project", project: parts[2], phase: parts[3] ?? "hearing" };
    }
    return { kind: "studio" };
  }
  // 既定はスタジオ（v2の主役）。旧URL（ハッシュなし）はツールに流さずスタジオへ
  return { kind: "studio" };
}

export function routeToHash(route: Route): string {
  switch (route.kind) {
    case "tools":
      return route.toolId ? `#/tools/${encodeURIComponent(route.toolId)}` : "#/tools";
    case "studio":
      return "#/studio";
    case "project":
      return `#/studio/p/${encodeURIComponent(route.project)}/${encodeURIComponent(route.phase)}`;
    case "settings":
      return "#/settings";
  }
}

export function navigate(route: Route) {
  window.location.hash = routeToHash(route);
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
