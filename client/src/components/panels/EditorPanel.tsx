import React from "react";
import {
  ChevronRight,
  EyeOff,
  File,
  FileText,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  RefreshCw,
} from "lucide-react";
import { fsHome, fsList, fsRead, type FsEntry } from "../../lib/tauri";
import { useApp, activeWorkspace } from "../../state/store";

type TreeState = Record<string, { open: boolean; entries?: FsEntry[] }>;
const ENTRY_DISPLAY_LIMIT = 800;

export function EditorPanel() {
  const ws = useApp(activeWorkspace);
  const [root, setRoot] = React.useState<string>("");
  const [tree, setTree] = React.useState<TreeState>({});
  const [filter, setFilter] = React.useState("");
  const [selected, setSelected] = React.useState<FsEntry | null>(null);
  const [content, setContent] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const base = ws?.cwd || (await fsHome());
      setRoot(base);
      try {
        const entries = await fsList(base);
        setTree({ [base]: { open: true, entries } });
      } catch {
        setTree({ [base]: { open: true, entries: [] } });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws?.cwd]);

  async function toggle(path: string) {
    const node = tree[path];
    if (!node) {
      try {
        const entries = await fsList(path);
        setTree((t) => ({ ...t, [path]: { open: true, entries } }));
      } catch {
        setTree((t) => ({ ...t, [path]: { open: true, entries: [] } }));
      }
    } else {
      setTree((t) => ({ ...t, [path]: { ...node, open: !node.open } }));
    }
  }

  async function refresh() {
    if (!root) return;
    try {
      const entries = await fsList(root);
      setTree({ [root]: { open: true, entries } });
    } catch {
      /* noop */
    }
  }

  async function openFile(e: FsEntry) {
    setSelected(e);
    setLoading(true);
    try {
      const c = await fsRead(e.path, 1_000_000);
      setContent(c);
    } catch (err) {
      setContent("Could not read file: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  const rootName = root ? root.split(/[\\/]/).filter(Boolean).pop() || root : "";
  const rootEntries = tree[root]?.entries ?? [];
  const filteredRootEntries = rootEntries.filter(
    (e) => !filter || e.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <>
      <div className="editor-header">
        <span className="editor-header-title">{rootName || "Editor"}</span>
        <div className="editor-header-actions">
          <button className="icon-btn" title="New file">
            <FilePlus size={14} />
          </button>
          <button className="icon-btn" title="New folder">
            <FolderPlus size={14} />
          </button>
          <button className="icon-btn" title="Refresh" onClick={refresh}>
            <RefreshCw size={14} />
          </button>
          <button className="icon-btn" title="Toggle hidden">
            <EyeOff size={14} />
          </button>
        </div>
      </div>
      <div className="editor-body">
        <div className="editor-tree">
          <div className="editor-search">
            <input
              className="input"
              placeholder="Search files…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="editor-tree-body">
            {filteredRootEntries.map((e) => (
              <TreeNode
                key={e.path}
                entry={e}
                depth={0}
                tree={tree}
                onToggle={toggle}
                onOpenFile={openFile}
                selectedPath={selected?.path}
              />
            ))}
            {rootEntries.length >= ENTRY_DISPLAY_LIMIT && (
              <div className="text-muted" style={{ padding: 8, fontSize: 12 }}>
                Large folder capped at {ENTRY_DISPLAY_LIMIT} entries.
              </div>
            )}
            {root && !tree[root] && (
              <div className="text-muted" style={{ padding: 8, fontSize: 12 }}>
                Loading…
              </div>
            )}
          </div>
        </div>
        <div className="editor-preview">
          {!selected ? (
            <div className="editor-preview-empty">
              Select a file from the
              <br />
              tree to preview it here.
            </div>
          ) : (
            <>
              <div className="editor-preview-bar">
                <FileText size={13} style={{ color: "var(--text-muted)" }} />
                <span className="editor-preview-path">{selected.path}</span>
                <span className="text-muted">{formatSize(selected.size)}</span>
              </div>
              <pre className="editor-preview-body selectable">
                {loading ? "Loading…" : content}
              </pre>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function TreeNode({
  entry,
  depth,
  tree,
  onToggle,
  onOpenFile,
  selectedPath,
}: {
  entry: FsEntry;
  depth: number;
  tree: TreeState;
  onToggle: (path: string) => void;
  onOpenFile: (e: FsEntry) => void;
  selectedPath?: string;
}) {
  const node = tree[entry.path];
  const open = !!node?.open;
  const entries = node?.entries;

  return (
    <>
      <div
        className={"tree-node" + (selectedPath === entry.path ? " selected" : "")}
        style={{ paddingLeft: 6 + depth * 10 }}
        onClick={() => {
          if (entry.is_dir) onToggle(entry.path);
          else onOpenFile(entry);
        }}
      >
        <span className={"tree-node-arrow " + (entry.is_dir ? (open ? "open" : "") : "empty")}>
          {entry.is_dir && <ChevronRight size={10} />}
        </span>
        <span className="tree-node-icon">
          {entry.is_dir ? (
            open ? (
              <FolderOpen size={13} />
            ) : (
              <Folder size={13} />
            )
          ) : (
            <File size={13} />
          )}
        </span>
        <span>{entry.name}</span>
      </div>
      {entry.is_dir && open && entries
        ? entries.map((c) => (
            <TreeNode
              key={c.path}
              entry={c}
              depth={depth + 1}
              tree={tree}
              onToggle={onToggle}
              onOpenFile={onOpenFile}
              selectedPath={selectedPath}
            />
          ))
        : null}
    </>
  );
}

function formatSize(n: number): string {
  if (!n) return "";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}
