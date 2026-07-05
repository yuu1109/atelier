import type { FileStore } from "../lib/fsa";

/** 全フェーズ画面の共通props契約 */
export interface PhaseProps {
  store: FileStore;
  /** 案件のディレクトリ名（clients/{project}/） */
  project: string;
  onToast: (msg: string) => void;
}
