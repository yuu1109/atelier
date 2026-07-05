import type { Route } from "../lib/router";
import { navigate } from "../lib/router";
import { ProjectProvider, useProjectContext } from "./ProjectContext";
import { StudioHeader } from "./components/StudioHeader";
import { PhaseStepper } from "./components/PhaseStepper";
import { ProjectList } from "./phases/ProjectList";
import { SettingsPage } from "./phases/SettingsPage";
import { PHASE_LABEL, PHASE_ORDER, type PhaseId } from "./lib/types";
import { HearingPhase } from "./phases/HearingPhase";
import { RequirementsPhase } from "./phases/RequirementsPhase";
import { WireframePhase } from "./phases/WireframePhase";
import { ConceptPhase } from "./phases/ConceptPhase";
import { DesignCompPhase } from "./phases/DesignCompPhase";
import { HandoffPhase } from "./phases/HandoffPhase";
import { TuningPhase } from "./phases/TuningPhase";

/** スタジオモードのルート。ProjectProvider配下で各画面を振り分ける */
export function StudioApp({ route, onToast }: { route: Route; onToast: (msg: string) => void }) {
  return (
    <ProjectProvider>
      <StudioRoutes route={route} onToast={onToast} />
    </ProjectProvider>
  );
}

function StudioRoutes({ route, onToast }: { route: Route; onToast: (msg: string) => void }) {
  if (route.kind === "settings") {
    return (
      <>
        <StudioHeader crumbs={[{ label: "設定" }]} />
        <SettingsPage onToast={onToast} />
      </>
    );
  }

  if (route.kind === "project") {
    const phase = (PHASE_ORDER as string[]).includes(route.phase) ? (route.phase as PhaseId) : "hearing";
    return (
      <>
        <StudioHeader
          crumbs={[
            { label: "案件", route: { kind: "studio" } },
            { label: route.project },
            { label: PHASE_LABEL[phase] },
          ]}
        />
        <ProjectWorkspace project={route.project} phase={phase} onToast={onToast} />
      </>
    );
  }

  return (
    <>
      <StudioHeader />
      <ProjectList onToast={onToast} />
    </>
  );
}

function ProjectWorkspace({
  project,
  phase,
  onToast,
}: {
  project: string;
  phase: PhaseId;
  onToast: (msg: string) => void;
}) {
  const { store, connection } = useProjectContext();

  if (!store || connection.kind !== "connected") {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 pb-10">
        <div className="rounded-cardlg bg-surface p-8 text-center">
          <p className="mb-4 text-[13px] text-ink2">案件を開くにはHP工場フォルダへの接続が必要だよ。</p>
          <button
            type="button"
            onClick={() => navigate({ kind: "studio" })}
            className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-bold text-white active:opacity-70"
          >
            案件一覧へ
          </button>
        </div>
      </main>
    );
  }

  const phaseProps = { store, project, onToast };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-10">
      <PhaseStepper project={project} current={phase} />
      {phase === "hearing" ? <HearingPhase {...phaseProps} /> : null}
      {phase === "requirements" ? <RequirementsPhase {...phaseProps} /> : null}
      {phase === "wireframe" ? <WireframePhase {...phaseProps} /> : null}
      {phase === "concept" ? <ConceptPhase {...phaseProps} /> : null}
      {phase === "design" ? <DesignCompPhase {...phaseProps} /> : null}
      {phase === "handoff" ? <HandoffPhase {...phaseProps} /> : null}
      {phase === "tuning" ? <TuningPhase {...phaseProps} /> : null}
    </main>
  );
}
