import type { FileStore } from "./fsa";
import {
  EMPTY_STUDIO_STATE,
  type PhaseId,
  type PhaseState,
  type Project,
  type StudioState,
} from "./types";

/**
 * 案件（clients/{dirName}/）のスキャンとフェーズ進捗の導出。
 * 進捗は「ファイル存在」から都度導出する（キャッシュしない）。
 * Claude Code側スキルが書いたファイルもここで正しく拾う。
 */

export function projectPath(dirName: string, rel = ""): string {
  return rel ? `clients/${dirName}/${rel}` : `clients/${dirName}`;
}

export async function derivePhases(store: FileStore, dirName: string): Promise<Record<PhaseId, PhaseState>> {
  const p = (rel: string) => projectPath(dirName, rel);
  const [
    hearing,
    analysis,
    wfIndex,
    wfFixed,
    tone,
    moodboardFiles,
    designFiles,
    spec,
    site,
    tokens,
  ] = await Promise.all([
    store.readText(p("hearing.md")),
    Promise.resolve(null as string | null), // analysisはhearing本文から判定（下で処理）
    store.exists(p("wireframe/index.html")),
    store.exists(p("wireframe/wireframe-fixed.html")),
    store.exists(p("tone.md")),
    store.listFiles(p("moodboard")),
    store.listFiles(p("design")),
    store.exists(p("spec.md")),
    store.exists(p("site")),
    store.exists(p("site/src/styles/tokens.css")),
  ]);
  void analysis;

  const hasHearing = hearing !== null && hearing.trim() !== "";
  const hasAnalysis = hasHearing && /^##\s*分析/m.test(hearing ?? "");
  const hasMood = moodboardFiles.some((f) => /\.(png|jpe?g|webp)$/i.test(f));
  const hasDesign = designFiles.some((f) => /\.(png|jpe?g|webp)$/i.test(f));

  const phase = (status: PhaseState["status"], note?: string): PhaseState => ({ status, note });

  return {
    hearing: hasHearing ? phase("done") : phase("empty"),
    requirements: hasAnalysis ? phase("done") : phase("empty"),
    wireframe: wfFixed ? phase("frozen", "フィックス済み") : wfIndex ? phase("draft") : phase("empty"),
    concept: tone ? phase("done") : hasMood ? phase("draft") : phase("empty"),
    design: hasDesign ? phase("done") : phase("empty"),
    handoff: site ? phase("done", "実装済み") : spec ? phase("draft", "spec.md済み") : phase("empty"),
    tuning: tokens ? phase("draft", "調整可能") : phase("empty"),
  };
}

export async function scanProjects(store: FileStore): Promise<Project[]> {
  const dirs = await store.listDirs("clients");
  const projects = await Promise.all(
    dirs.map(async (dirName) => ({
      dirName,
      phases: await derivePhases(store, dirName),
      isSample: dirName.startsWith("_"),
    })),
  );
  // 実案件を先に、サンプルを後に
  return [...projects.filter((p) => !p.isSample), ...projects.filter((p) => p.isSample)];
}

const DIRNAME_NG = /[/\\:*?"<>|]|^\.|\s/;

export function validateProjectName(name: string): string | null {
  if (!name.trim()) return "案件名を入れてね";
  if (DIRNAME_NG.test(name)) return "スペース・記号（/ \\ : * ? \" < > |）・先頭ドットは使えない";
  return null;
}

export async function createProject(store: FileStore, dirName: string): Promise<void> {
  const err = validateProjectName(dirName);
  if (err) throw new Error(err);
  if (await store.exists(projectPath(dirName))) throw new Error("同名の案件がすでにある");
  await store.writeText(
    projectPath(dirName, "_atelier/state.json"),
    JSON.stringify(EMPTY_STUDIO_STATE, null, 2),
    { backup: false },
  );
}

export async function readState(store: FileStore, dirName: string): Promise<StudioState> {
  const raw = await store.readText(projectPath(dirName, "_atelier/state.json"));
  if (!raw) return { ...EMPTY_STUDIO_STATE };
  try {
    const parsed = JSON.parse(raw) as StudioState;
    return { ...EMPTY_STUDIO_STATE, ...parsed };
  } catch {
    return { ...EMPTY_STUDIO_STATE };
  }
}

export async function writeState(store: FileStore, dirName: string, state: StudioState): Promise<void> {
  await store.writeText(projectPath(dirName, "_atelier/state.json"), JSON.stringify(state, null, 2), {
    backup: false,
  });
}

/** state.json の部分更新ヘルパー */
export async function patchState(
  store: FileStore,
  dirName: string,
  patch: Partial<StudioState>,
): Promise<StudioState> {
  const current = await readState(store, dirName);
  const next = { ...current, ...patch };
  await writeState(store, dirName, next);
  return next;
}
