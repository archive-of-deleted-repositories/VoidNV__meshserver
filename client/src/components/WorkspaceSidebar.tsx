import React from "react";
import { Plus, ChevronDown, X, Pencil } from "lucide-react";
import { useApp } from "../state/store";
import { Logo } from "./Logo";

export function WorkspaceSidebar() {
  const workspaces = useApp((s) => s.workspaces);
  const activeId = useApp((s) => s.activeWorkspaceId);
  const setActive = useApp((s) => s.setActiveWorkspace);
  const remove = useApp((s) => s.removeWorkspace);
  const rename = useApp((s) => s.renameWorkspace);
  const newOrbit = useApp((s) => s.newOrbitWorkspace);
  const collapsed = useApp((s) => s.sidebarCollapsed);

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const anchorRef = React.useRef<HTMLDivElement>(null);

  if (collapsed) return null;

  function startRename(id: string, currentName: string) {
    setEditingId(id);
    setEditValue(currentName);
  }
  function commitRename() {
    if (editingId) rename(editingId, editValue);
    setEditingId(null);
  }

  return (
    <aside className="ws-sidebar">
      <div className="ws-header" ref={anchorRef} style={{ position: "relative" }}>
        <span>Workspaces</span>
        <div className="ws-header-actions">
          <button className="icon-btn" title="New workspace" onClick={() => newOrbit()}>
            <Plus size={14} />
          </button>
          <button
            className="icon-btn"
            title="New…"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <ChevronDown size={14} />
          </button>
        </div>
        {menuOpen && (
          <>
            <div
              className="overlay-backdrop"
              onClick={() => setMenuOpen(false)}
              style={{ background: "transparent" }}
            />
            <div className="menu" style={{ top: 28, right: 6, minWidth: 200 }}>
              <button
                className="menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  newOrbit();
                }}
              >
                <span className="icon-wrap" style={{ color: "var(--accent)" }}>
                  <Logo size={14} />
                </span>
                New Orbit
                <span className="spacer" />
                <kbd>⌘T</kbd>
              </button>
              <button
                className="menu-item disabled"
                disabled
                aria-disabled="true"
                title="Hive is coming soon"
              >
                <span className="icon-wrap" style={{ color: "var(--purple)" }}>
                  <Logo size={14} />
                </span>
                New Hive
                <span className="spacer" />
                <span className="soon-tag">soon</span>
              </button>
            </div>
          </>
        )}
      </div>
      <div className="ws-list">
        {workspaces.length === 0 ? (
          <div className="ws-empty">No workspaces open</div>
        ) : (
          workspaces.map((w) => {
            const isEditing = editingId === w.id;
            return (
              <div
                key={w.id}
                className={
                  "ws-item" +
                  (w.id === activeId ? " active" : "") +
                  (w.mode === "hive" ? " hive" : " orbit")
                }
                onClick={() => !isEditing && setActive(w.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startRename(w.id, w.name);
                }}
                title={w.name}
              >
                <span className="ws-item-dot" style={{ background: w.color }} />
                {isEditing ? (
                  <input
                    autoFocus
                    className="ws-item-edit"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onBlur={commitRename}
                  />
                ) : (
                  <span className="ws-item-name">{w.name}</span>
                )}
                <div className="ws-item-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="ws-item-btn"
                    title="Rename"
                    onClick={() => startRename(w.id, w.name)}
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    className="ws-item-btn danger"
                    title="Close workspace"
                    onClick={() => remove(w.id)}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
