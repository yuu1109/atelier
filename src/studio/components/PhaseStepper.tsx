import { useEffect, useState } from "react";
import { navigate } from "../../lib/router";
import { useProjectContext } from "../ProjectContext";
import { derivePhases } from "../lib/project";
import { PHASE_LABEL, PHASE_ORDER, type PhaseId, type PhaseState } from "../lib/types";

/**
 * フェーズステッパー。順不同で行き来できる（ゲート判定は各フェーズ側の責務）。
 * 進捗はファイル存在から都度導出する。
 */
export function PhaseStepper({ project, current }: { project: string; current: PhaseId }) {
  const { store } = useProjectContext();
  const [phases, setPhases] = useState<Record<PhaseId, PhaseState> | null>(null);

  useEffect(() => {
    if (!store) return;
    let alive = true;
    void derivePhases(store, project).then((p) => {
      if (alive) setPhases(p);
    });
    return () => {
      alive = false;
    };
  }, [store, project, current]);

  return (
    <nav className="scrollbar-none -mx-5 mb-5 overflow-x-auto px-5">
      <div className="inline-flex gap-1 rounded-full bg-surface p-1">
        {PHASE_ORDER.map((id) => {
          const active = id === current;
          const st = phases?.[id];
          const dot =
            st?.status === "frozen" || st?.status === "done"
              ? "bg-good"
              : st?.status === "draft"
                ? "bg-warn"
                : "bg-surface-mute";
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigate({ kind: "project", project, phase: id })}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] transition-colors active:opacity-70 ${
                active ? "bg-accent font-bold text-white" : "text-ink2"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : dot}`} />
              {PHASE_LABEL[id]}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
