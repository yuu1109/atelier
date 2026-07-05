import { useState } from "react";
import { MdAdd, MdOutlineFolder } from "react-icons/md";
import { navigate } from "../../lib/router";
import { useProjectContext } from "../ProjectContext";
import { createProject, validateProjectName } from "../lib/project";
import { PHASE_LABEL, PHASE_ORDER, type Project } from "../lib/types";

/** 案件一覧（スタジオのホーム） */
export function ProjectList({ onToast }: { onToast: (msg: string) => void }) {
  const { store, connection, projects, loadingProjects, connect, refreshProjects } = useProjectContext();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (connection.kind === "unsupported") {
    return (
      <Empty title="このブラウザはフォルダ接続に非対応">
        スタジオのフル機能はChrome系ブラウザ専用。閲覧・プロンプトコピーのみ利用できる（縮退モードは今後対応）。
      </Empty>
    );
  }

  if (connection.kind !== "connected" || !store) {
    return (
      <Empty title="HP制作ファクトリーのフォルダに接続する">
        <p className="mb-4 text-[13px] leading-relaxed text-ink2">
          ~/Desktop/01_project/HP（clients/ があるフォルダ）を選ぶと、案件の読み書きができるようになる。
          接続は端末内で完結し、どこにも送信されない。
        </p>
        <button
          type="button"
          onClick={() => void connect().catch((e) => onToast(String(e.message ?? e)))}
          className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-bold text-white transition-colors active:opacity-70"
        >
          フォルダを選んで接続
        </button>
      </Empty>
    );
  }

  const real = projects.filter((p) => !p.isSample);
  const samples = projects.filter((p) => p.isSample);

  const submitCreate = async () => {
    const err = validateProjectName(name);
    if (err) {
      onToast(err);
      return;
    }
    setBusy(true);
    try {
      await createProject(store, name.trim());
      await refreshProjects();
      onToast(`案件「${name.trim()}」を作ったよ`);
      setCreating(false);
      setName("");
      navigate({ kind: "project", project: name.trim(), phase: "hearing" });
    } catch (e) {
      onToast(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-10">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-ink2">
          案件 {real.length} 件{loadingProjects ? "（読込中…）" : ""}
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-white transition-colors active:opacity-70"
        >
          <MdAdd size={16} />
          新規案件
        </button>
      </div>

      {creating ? (
        <div className="mb-4 rounded-cardlg bg-surface p-5">
          <div className="mb-2 text-[13px] font-bold text-ink">案件名（フォルダ名になる）</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitCreate();
              }}
              placeholder="例: tanaka-seikotsuin"
              className="w-full rounded-xl bg-surface-soft px-3 py-2.5 text-[15px] text-ink placeholder:text-ink3 outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void submitCreate()}
              className="shrink-0 rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-white transition-colors active:opacity-70 disabled:opacity-40"
            >
              作成
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="shrink-0 rounded-full bg-surface-soft px-4 py-2 text-[13px] text-ink2 transition-colors active:opacity-70"
            >
              やめる
            </button>
          </div>
          <p className="mt-2 text-[11px] text-ink3">半角英数とハイフン推奨。clients/ 直下に作成される</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {real.map((p) => (
          <ProjectCard key={p.dirName} project={p} />
        ))}
        {real.length === 0 && !loadingProjects ? (
          <div className="rounded-cardlg bg-surface p-6 text-[13px] text-ink3 sm:col-span-2">
            まだ実案件がない。「新規案件」から始めるか、Claude Code側で作った案件があれば右上の再スキャンで出てくるよ。
          </div>
        ) : null}
      </div>

      {samples.length > 0 ? (
        <>
          <div className="section-label mb-2 mt-8">Templates / Samples</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {samples.map((p) => (
              <ProjectCard key={p.dirName} project={p} />
            ))}
          </div>
        </>
      ) : null}
    </main>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <button
      type="button"
      onClick={() => navigate({ kind: "project", project: project.dirName, phase: nextPhase(project) })}
      className="rounded-cardlg bg-surface p-5 text-left transition-colors active:opacity-70"
    >
      <div className="mb-3 flex items-center gap-2">
        <MdOutlineFolder size={16} className="text-ink3" />
        <span className="truncate text-[15px] font-bold text-ink">{project.dirName}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PHASE_ORDER.map((id) => {
          const st = project.phases[id];
          const color =
            st.status === "frozen" || st.status === "done"
              ? "bg-good"
              : st.status === "draft"
                ? "bg-warn"
                : "bg-surface-mute";
          return (
            <span key={id} className="flex items-center gap-1 rounded-full bg-surface-soft px-2 py-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
              <span className="text-[10px] text-ink2">{PHASE_LABEL[id]}</span>
            </span>
          );
        })}
      </div>
    </button>
  );
}

/** 「次にやるべきフェーズ」= 最初の未完了フェーズ */
function nextPhase(project: Project): string {
  for (const id of PHASE_ORDER) {
    const st = project.phases[id].status;
    if (st === "empty" || st === "draft") return id;
  }
  return "tuning";
}

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-10">
      <div className="rounded-cardlg bg-surface p-8 text-center">
        <h2 className="mb-3 text-[17px] font-bold text-ink">{title}</h2>
        <div className="text-[13px] leading-relaxed text-ink2">{children}</div>
      </div>
    </main>
  );
}
