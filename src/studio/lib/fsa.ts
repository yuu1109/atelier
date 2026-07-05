import { idb } from "./idb";

/**
 * File System Access API のラッパ。
 * すべてのパスは「HPファクトリーのルート（~/Desktop/01_project/HP 相当）からの相対パス」
 * （例: "clients/tanaka/hearing.md"）。
 *
 * テスト容易性のため FileStore インターフェースに切り、FSA実装とメモリ実装を提供する。
 */

export interface FileStore {
  readText(path: string): Promise<string | null>;
  /** backup: true（既定）なら書き込み前に _atelier/backups/ へ旧内容を退避 */
  writeText(path: string, content: string, opts?: { backup?: boolean }): Promise<void>;
  readBlob(path: string): Promise<Blob | null>;
  writeBlob(path: string, blob: Blob): Promise<void>;
  exists(path: string): Promise<boolean>;
  listDirs(path: string): Promise<string[]>;
  listFiles(path: string): Promise<string[]>;
  mtime(path: string): Promise<number | null>;
  deleteFile(path: string): Promise<void>;
}

export function isFsaSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

const HANDLE_KEY = "hp-root";

/** HPルートを選ばせて接続する（ユーザージェスチャ内で呼ぶこと） */
export async function connectHpRoot(): Promise<FsaFileStore> {
  const picker = (
    window as unknown as {
      showDirectoryPicker: (o: object) => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;
  const handle = await picker({ id: "hp-root", mode: "readwrite" });
  // clients/ の存在で「正しいフォルダか」を検証
  try {
    await handle.getDirectoryHandle("clients");
  } catch {
    throw new Error("選んだフォルダに clients/ が見つからない。HPファクトリーのルート（HP/）を選んでね");
  }
  await idb.putHandle(HANDLE_KEY, handle);
  // 退避されにくいストレージにする（ベストエフォート）
  void navigator.storage?.persist?.();
  return new FsaFileStore(handle);
}

export type RestoreResult =
  | { kind: "ok"; store: FsaFileStore }
  | { kind: "needs-permission"; handle: FileSystemDirectoryHandle }
  | { kind: "none" };

/** 起動時の復元。権限が残っていればそのまま使える */
export async function restoreHpRoot(): Promise<RestoreResult> {
  const handle = await idb.getHandle(HANDLE_KEY);
  if (!handle) return { kind: "none" };
  const perm = await (
    handle as unknown as { queryPermission: (o: object) => Promise<PermissionState> }
  ).queryPermission({ mode: "readwrite" });
  if (perm === "granted") return { kind: "ok", store: new FsaFileStore(handle) };
  return { kind: "needs-permission", handle };
}

/** 権限の再取得（ユーザージェスチャ内で呼ぶこと） */
export async function requestPermission(handle: FileSystemDirectoryHandle): Promise<FsaFileStore | null> {
  const perm = await (
    handle as unknown as { requestPermission: (o: object) => Promise<PermissionState> }
  ).requestPermission({ mode: "readwrite" });
  return perm === "granted" ? new FsaFileStore(handle) : null;
}

export async function disconnectHpRoot(): Promise<void> {
  await idb.deleteHandle(HANDLE_KEY);
}

function splitPath(path: string): { dirs: string[]; name: string } {
  const parts = path.split("/").filter(Boolean);
  const name = parts.pop();
  if (!name) throw new Error(`不正なパス: ${path}`);
  return { dirs: parts, name };
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export class FsaFileStore implements FileStore {
  constructor(readonly root: FileSystemDirectoryHandle) {}

  private async dirHandle(dirs: string[], create = false): Promise<FileSystemDirectoryHandle | null> {
    let dir = this.root;
    for (const d of dirs) {
      try {
        dir = await dir.getDirectoryHandle(d, { create });
      } catch {
        return null;
      }
    }
    return dir;
  }

  private async fileHandle(path: string, create = false): Promise<FileSystemFileHandle | null> {
    const { dirs, name } = splitPath(path);
    const dir = await this.dirHandle(dirs, create);
    if (!dir) return null;
    try {
      return await dir.getFileHandle(name, { create });
    } catch {
      return null;
    }
  }

  async readText(path: string): Promise<string | null> {
    const fh = await this.fileHandle(path);
    if (!fh) return null;
    const file = await fh.getFile();
    return file.text();
  }

  async readBlob(path: string): Promise<Blob | null> {
    const fh = await this.fileHandle(path);
    if (!fh) return null;
    return fh.getFile();
  }

  async writeText(path: string, content: string, opts?: { backup?: boolean }): Promise<void> {
    if (opts?.backup !== false) await this.backup(path);
    const fh = await this.fileHandle(path, true);
    if (!fh) throw new Error(`書き込み先を作れない: ${path}`);
    const w = await fh.createWritable();
    await w.write(content);
    await w.close();
  }

  async writeBlob(path: string, blob: Blob): Promise<void> {
    const fh = await this.fileHandle(path, true);
    if (!fh) throw new Error(`書き込み先を作れない: ${path}`);
    const w = await fh.createWritable();
    await w.write(blob);
    await w.close();
  }

  /** 既存テキストファイルを clients/{案件}/_atelier/backups/ へ退避（案件外のパスはスキップ） */
  private async backup(path: string): Promise<void> {
    const m = path.match(/^clients\/([^/]+)\/(.+)$/);
    if (!m) return;
    const existing = await this.readText(path);
    if (existing === null) return;
    const flatName = m[2].replace(/\//g, "__");
    const backupPath = `clients/${m[1]}/_atelier/backups/${flatName}.${timestamp()}`;
    const fh = await this.fileHandle(backupPath, true);
    if (!fh) return;
    const w = await fh.createWritable();
    await w.write(existing);
    await w.close();
  }

  async exists(path: string): Promise<boolean> {
    const { dirs, name } = splitPath(path);
    const dir = await this.dirHandle(dirs);
    if (!dir) return false;
    try {
      await dir.getFileHandle(name);
      return true;
    } catch {
      try {
        await dir.getDirectoryHandle(name);
        return true;
      } catch {
        return false;
      }
    }
  }

  async listDirs(path: string): Promise<string[]> {
    const dir = await this.dirHandle(path.split("/").filter(Boolean));
    if (!dir) return [];
    const names: string[] = [];
    for await (const [name, entry] of dir as unknown as AsyncIterable<[string, FileSystemHandle]>) {
      if (entry.kind === "directory") names.push(name);
    }
    return names.sort();
  }

  async listFiles(path: string): Promise<string[]> {
    const dir = await this.dirHandle(path.split("/").filter(Boolean));
    if (!dir) return [];
    const names: string[] = [];
    for await (const [name, entry] of dir as unknown as AsyncIterable<[string, FileSystemHandle]>) {
      if (entry.kind === "file") names.push(name);
    }
    return names.sort();
  }

  async mtime(path: string): Promise<number | null> {
    const fh = await this.fileHandle(path);
    if (!fh) return null;
    const file = await fh.getFile();
    return file.lastModified;
  }

  async deleteFile(path: string): Promise<void> {
    const { dirs, name } = splitPath(path);
    const dir = await this.dirHandle(dirs);
    if (!dir) return;
    await dir.removeEntry(name).catch(() => undefined);
  }
}

/** テスト・縮退モード用のメモリ実装 */
export class MemoryFileStore implements FileStore {
  files = new Map<string, { content: string | Blob; mtime: number }>();

  async readText(path: string): Promise<string | null> {
    const f = this.files.get(path);
    if (!f) return null;
    return typeof f.content === "string" ? f.content : f.content.text();
  }
  async writeText(path: string, content: string): Promise<void> {
    this.files.set(path, { content, mtime: Date.now() });
  }
  async readBlob(path: string): Promise<Blob | null> {
    const f = this.files.get(path);
    if (!f) return null;
    return typeof f.content === "string" ? new Blob([f.content]) : f.content;
  }
  async writeBlob(path: string, blob: Blob): Promise<void> {
    this.files.set(path, { content: blob, mtime: Date.now() });
  }
  async exists(path: string): Promise<boolean> {
    if (this.files.has(path)) return true;
    const prefix = path.endsWith("/") ? path : path + "/";
    for (const key of this.files.keys()) if (key.startsWith(prefix)) return true;
    return false;
  }
  async listDirs(path: string): Promise<string[]> {
    const prefix = path.replace(/\/$/, "") + "/";
    const dirs = new Set<string>();
    for (const key of this.files.keys()) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const slash = rest.indexOf("/");
      if (slash > 0) dirs.add(rest.slice(0, slash));
    }
    return [...dirs].sort();
  }
  async listFiles(path: string): Promise<string[]> {
    const prefix = path.replace(/\/$/, "") + "/";
    const names: string[] = [];
    for (const key of this.files.keys()) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      if (!rest.includes("/")) names.push(rest);
    }
    return names.sort();
  }
  async mtime(path: string): Promise<number | null> {
    return this.files.get(path)?.mtime ?? null;
  }
  async deleteFile(path: string): Promise<void> {
    this.files.delete(path);
  }
}
