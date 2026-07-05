import { MdOutlineFolderOff, MdOutlineFolder, MdOutlineSettings, MdRefresh } from "react-icons/md";
import { navigate, type Route } from "../../lib/router";
import { useProjectContext } from "../ProjectContext";

/** モード切替（ツール/スタジオ共通で使う小さいセグメント） */
export function ModeSwitch({ current }: { current: "tools" | "studio" }) {
  return (
    <div className="inline-flex gap-0.5 rounded-full bg-surface-mute p-0.5">
      {(
        [
          { key: "studio", label: "スタジオ", route: { kind: "studio" } as Route },
          { key: "tools", label: "ツール", route: { kind: "tools", toolId: null } as Route },
        ] as const
      ).map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => navigate(m.route)}
          className={`rounded-full px-3 py-1 text-[12px] transition-colors active:opacity-70 ${
            current === m.key ? "bg-surface font-bold text-ink shadow-chip" : "text-ink2"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/** スタジオ共通ヘッダー: ブランド + モード切替 + 接続バッジ + 設定 */
export function StudioHeader({ crumbs }: { crumbs?: { label: string; route?: Route }[] }) {
  const { connection, reconnect, refreshProjects } = useProjectContext();

  return (
    <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-6xl px-5 pb-3 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-3">
            <button
              type="button"
              onClick={() => navigate({ kind: "studio" })}
              className="text-[22px] font-bold tracking-tight text-ink active:opacity-70"
            >
              atelier.
            </button>
            {crumbs?.map((c, i) => (
              <span key={i} className="flex min-w-0 items-baseline gap-3">
                <span className="text-ink4">/</span>
                {c.route ? (
                  <button
                    type="button"
                    onClick={() => c.route && navigate(c.route)}
                    className="truncate text-[13px] text-ink2 active:opacity-70"
                  >
                    {c.label}
                  </button>
                ) : (
                  <span className="truncate text-[13px] font-bold text-ink">{c.label}</span>
                )}
              </span>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ConnectionBadge />
            {connection.kind === "needs-permission" ? (
              <button
                type="button"
                onClick={() => void reconnect()}
                className="rounded-full bg-accent px-3 py-1.5 text-[12px] font-bold text-white transition-colors active:opacity-70"
              >
                再接続
              </button>
            ) : null}
            {connection.kind === "connected" ? (
              <button
                type="button"
                onClick={() => void refreshProjects()}
                title="案件を再スキャン"
                aria-label="案件を再スキャン"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink2 transition-colors active:opacity-70"
              >
                <MdRefresh size={15} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate({ kind: "settings" })}
              title="設定"
              aria-label="設定"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink2 transition-colors active:opacity-70"
            >
              <MdOutlineSettings size={15} />
            </button>
            <ModeSwitch current="studio" />
          </div>
        </div>
      </div>
    </header>
  );
}

function ConnectionBadge() {
  const { connection } = useProjectContext();
  const map = {
    unsupported: { label: "このブラウザ非対応", cls: "bg-warn-bg text-warn", Icon: MdOutlineFolderOff },
    disconnected: { label: "未接続", cls: "bg-surface-soft text-ink3", Icon: MdOutlineFolderOff },
    "needs-permission": { label: "権限が必要", cls: "bg-warn-bg text-warn", Icon: MdOutlineFolder },
    connected: { label: "HP工場 接続中", cls: "bg-good-bg text-good", Icon: MdOutlineFolder },
  } as const;
  const { label, cls, Icon } = map[connection.kind];
  return (
    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>
      <Icon size={13} />
      {label}
    </span>
  );
}
