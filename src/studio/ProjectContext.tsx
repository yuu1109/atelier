import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  connectHpRoot,
  disconnectHpRoot,
  isFsaSupported,
  requestPermission,
  restoreHpRoot,
  type FileStore,
} from "./lib/fsa";
import { scanProjects } from "./lib/project";
import type { Project } from "./lib/types";

/**
 * スタジオ全体の接続状態。
 * - store: HPルートに接続済みの FileStore（未接続なら null）
 * - connection: 接続状態（UIバッジ・再接続ボタンの表示制御）
 */

type ConnectionState =
  | { kind: "unsupported" } // Safari等（縮退モード）
  | { kind: "disconnected" }
  | { kind: "needs-permission"; handle: FileSystemDirectoryHandle }
  | { kind: "connected" };

interface ProjectContextValue {
  store: FileStore | null;
  connection: ConnectionState;
  projects: Project[];
  loadingProjects: boolean;
  connect: () => Promise<void>;
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const Ctx = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<FileStore | null>(null);
  const [connection, setConnection] = useState<ConnectionState>(
    isFsaSupported() ? { kind: "disconnected" } : { kind: "unsupported" },
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const refreshWith = useCallback(async (s: FileStore) => {
    setLoadingProjects(true);
    try {
      setProjects(await scanProjects(s));
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // 起動時の復元
  useEffect(() => {
    if (!isFsaSupported()) return;
    void restoreHpRoot().then(async (res) => {
      if (res.kind === "ok") {
        setStore(res.store);
        setConnection({ kind: "connected" });
        await refreshWith(res.store);
      } else if (res.kind === "needs-permission") {
        setConnection({ kind: "needs-permission", handle: res.handle });
      }
    });
  }, [refreshWith]);

  const connect = useCallback(async () => {
    const s = await connectHpRoot();
    if (!s) return; // ピッカーをキャンセルしただけ
    setStore(s);
    setConnection({ kind: "connected" });
    await refreshWith(s);
  }, [refreshWith]);

  const reconnect = useCallback(async () => {
    if (connection.kind === "needs-permission") {
      const s = await requestPermission(connection.handle);
      if (s) {
        setStore(s);
        setConnection({ kind: "connected" });
        await refreshWith(s);
        return;
      }
    }
    await connect();
  }, [connection, connect, refreshWith]);

  const disconnect = useCallback(async () => {
    await disconnectHpRoot();
    setStore(null);
    setProjects([]);
    setConnection({ kind: "disconnected" });
  }, []);

  const refreshProjects = useCallback(async () => {
    if (store) await refreshWith(store);
  }, [store, refreshWith]);

  return (
    <Ctx.Provider
      value={{ store, connection, projects, loadingProjects, connect, reconnect, disconnect, refreshProjects }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useProjectContext(): ProjectContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useProjectContext は ProjectProvider の内側で使う");
  return v;
}
