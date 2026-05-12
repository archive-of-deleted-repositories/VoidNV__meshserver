import React from "react";
import {
  Plus,
  Search,
  Sparkles,
  Download,
  Pencil,
  Trash2,
  FolderSearch,
  CheckSquare,
  Square,
  X,
  MousePointerClick,
} from "lucide-react";
import { useApp, type Skill, type SkillBadge } from "../../state/store";
import {
  skillsDiscover,
  skillsDiscoverIn,
  skillsListRoots,
  type DiscoveredSkill,
  type SkillRoot,
} from "../../lib/tauri";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { toast } from "../../state/toasts";
import { useDrag } from "../../state/drag";

function badgeClass(b: SkillBadge): string {
  switch (b) {
    case "SECURITY":
      return "red";
    case "GROWTH":
      return "green";
    case "MEMORY":
      return "yellow";
    case "QUALITY":
      return "green";
    case "WORKFLOW":
      return "purple";
    default:
      return "blue";
  }
}

function guessBadge(category: string): SkillBadge {
  const c = category.toUpperCase();
  if (/SECURITY/.test(c)) return "SECURITY";
  if (/GROWTH|SEO|MARKETING/.test(c)) return "GROWTH";
  if (/MEMORY/.test(c)) return "MEMORY";
  if (/QUALITY|TEST|REVIEW/.test(c)) return "QUALITY";
  if (/WORKFLOW|GIT|COMMIT/.test(c)) return "WORKFLOW";
  return "GENERAL";
}

export function SkillsPanel() {
  const skills = useApp((s) => s.skills);
  const openEditor = useApp((s) => s.openSkillEditor);
  const removeSkill = useApp((s) => s.removeSkill);
  const [q, setQ] = React.useState("");
  const [importOpen, setImportOpen] = React.useState(false);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const armedSkillId = useDrag((s) => s.skillId);
  const armedSkillName = useDrag((s) => s.skillName);
  const armSkill = useDrag((s) => s.arm);
  const clearSkill = useDrag((s) => s.clear);

  const query = q.trim().toLowerCase();
  const filtered = React.useMemo(
    () =>
      skills.filter(
        (s) =>
          !query ||
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query),
      ),
    [skills, query],
  );

  const grouped = React.useMemo(() => groupByCategory(filtered), [filtered]);

  function toggleSkill(skill: Skill) {
    armSkill({ id: skill.id, name: skill.name, body: skill.body });
  }

  return (
    <>
      <div className="skills-head">
        <div className="skills-head-left">
          <Sparkles size={13} color="var(--text-dim)" />
          <span className="skills-head-title">Skills</span>
          <span className="skills-head-count">{filtered.length}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="btn sm"
            onClick={() => setImportOpen(true)}
            title="Import from .claude / .codex / .cursor"
          >
            <Download size={12} /> Import
          </button>
          <button className="btn sm" onClick={() => openEditor()}>
            <Plus size={12} /> New
          </button>
        </div>
      </div>

      <div className="skills-search">
        <div
          className="input"
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px" }}
        >
          <Search size={13} style={{ color: "var(--text-muted)" }} />
          <input
            className="selectable"
            placeholder="Search skills"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "inherit",
            }}
          />
        </div>
      </div>
      <div className="skills-hint">
        <MousePointerClick size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
        {armedSkillName ? (
          <>
            <strong>{armedSkillName}</strong> armed. Click a terminal to paste, click again
            or press Esc to cancel.
          </>
        ) : (
          <>Click a skill, then click the terminal you want.</>
        )}
      </div>

      <div className="skills-list">
        {filtered.length === 0 ? (
          <div className="skills-empty">
            <div className="skills-empty-icon">
              <Sparkles size={18} />
            </div>
            <div className="skills-empty-title">No skills yet</div>
            <div className="skills-empty-sub">
              Create one in Mesh or import from <code>.claude</code>, <code>.codex</code>,
              <code> .cursor</code>, or any folder.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button className="btn sm" onClick={() => openEditor()}>
                <Plus size={12} /> New skill
              </button>
              <button className="btn sm" onClick={() => setImportOpen(true)}>
                <Download size={12} /> Import
              </button>
            </div>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, list]) => (
            <React.Fragment key={cat}>
              <div className="skills-category">
                <span>
                  <Sparkles size={10} /> {cat} {list.length}
                </span>
              </div>
              {list.map((s) => (
                <div
                  key={s.id}
                  className={"skill-card" + (armedSkillId === s.id ? " armed" : "")}
                  onClick={() => toggleSkill(s)}
                  title={
                    armedSkillId === s.id
                      ? "Click again to cancel"
                      : "Click, then click a terminal to paste"
                  }
                >
                  <span className="skill-drag-handle" title="Click to arm">
                    <MousePointerClick size={14} />
                  </span>
                  <span className="skill-icon">
                    <Sparkles size={12} />
                  </span>
                  <div className="skill-body">
                    <div className="skill-name">{s.name}</div>
                    <div className="skill-desc">{s.description}</div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      <span className={"pill " + badgeClass(s.badge)}>{s.badge}</span>
                      {s.source === "imported" && (
                        <span className="pill" title={s.origin}>
                          imported
                        </span>
                      )}
                      {s.source === "user" && <span className="pill green">user</span>}
                      <span className="drag-hint">
                        <MousePointerClick size={9} />
                        {armedSkillId === s.id ? "armed" : "click to arm"}
                      </span>
                      {armedSkillId === s.id && (
                        <button
                          className="skill-cancel"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearSkill();
                          }}
                        >
                          Esc
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      className="icon-btn"
                      title="Edit"
                      draggable={false}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditor(s.id);
                      }}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      className="icon-btn"
                      title="Delete"
                      draggable={false}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmId(s.id);
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))
        )}
      </div>

      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}

      {confirmId && (
        <ConfirmDialog
          title="Delete skill?"
          message={`"${skills.find((x) => x.id === confirmId)?.name}" will be removed from Mesh. This can't be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            const name = skills.find((x) => x.id === confirmId)?.name;
            removeSkill(confirmId);
            setConfirmId(null);
            if (name) toast.success(`Deleted "${name}".`);
          }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </>
  );
}

function groupByCategory(list: Skill[]): Record<string, Skill[]> {
  const out: Record<string, Skill[]> = {};
  for (const s of list) {
    const key = (s.category || "MESH").toUpperCase();
    (out[key] = out[key] || []).push(s);
  }
  return out;
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const importSkills = useApp((s) => s.importSkills);
  const skillsAll = useApp((s) => s.skills);
  const existingKeys = React.useMemo(
    () => new Set(skillsAll.map((x) => x.name + "::" + (x.origin ?? ""))),
    [skillsAll],
  );

  const [roots, setRoots] = React.useState<SkillRoot[]>([]);
  const [enabledRoots, setEnabledRoots] = React.useState<Record<string, boolean>>({});
  const [extraDirs, setExtraDirs] = React.useState<string[]>([]);
  const [discovered, setDiscovered] = React.useState<DiscoveredSkill[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [replaceArmed, setReplaceArmed] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await skillsListRoots();
        setRoots(r);
        // Enable only roots that actually exist, by default.
        const en: Record<string, boolean> = {};
        r.forEach((x) => (en[x.path] = x.exists));
        setEnabledRoots(en);
        await rescan(r, en, []);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function rescan(
    rootsIn: SkillRoot[],
    enabled: Record<string, boolean>,
    extra: string[],
  ) {
    const enabledRootPaths = new Set(
      rootsIn.filter((r) => enabled[r.path] && r.exists).map((r) => r.path),
    );
    const all = await skillsDiscover();
    const fromRoots = all.filter((d) => {
      // origin path starts with any enabled root path
      return [...enabledRootPaths].some((p) => d.origin.startsWith(p));
    });
    const fromExtras: DiscoveredSkill[] = [];
    for (const dir of extra) {
      try {
        const more = await skillsDiscoverIn(dir);
        fromExtras.push(...more);
      } catch {
        /* noop */
      }
    }
    // de-dup by origin+name
    const map = new Map<string, DiscoveredSkill>();
    [...fromRoots, ...fromExtras].forEach((d) => {
      map.set(d.origin + "::" + d.name, d);
    });
    // default selection: do NOT auto-select anything
    setDiscovered(Array.from(map.values()));
    setSelected({});
    setReplaceArmed({});
  }

  async function toggleRoot(path: string) {
    const next = { ...enabledRoots, [path]: !enabledRoots[path] };
    setEnabledRoots(next);
    setLoading(true);
    try {
      await rescan(roots, next, extraDirs);
    } finally {
      setLoading(false);
    }
  }

  async function addFolder() {
    try {
      const picked = await openDialog({ directory: true, multiple: false });
      if (typeof picked === "string") {
        const extras = [...extraDirs, picked];
        setExtraDirs(extras);
        setLoading(true);
        try {
          await rescan(roots, enabledRoots, extras);
        } finally {
          setLoading(false);
        }
      }
    } catch {
      /* noop */
    }
  }

  function removeExtra(dir: string) {
    const extras = extraDirs.filter((d) => d !== dir);
    setExtraDirs(extras);
    rescan(roots, enabledRoots, extras);
  }

  const query = q.trim().toLowerCase();
  const filtered = React.useMemo(
    () =>
      discovered.filter(
        (d) =>
          !query ||
          d.name.toLowerCase().includes(query) ||
          d.origin.toLowerCase().includes(query) ||
          (d.category || "").toLowerCase().includes(query),
      ),
    [discovered, query],
  );

  function keyOf(d: DiscoveredSkill) {
    return d.origin + "::" + d.name;
  }

  function isDuplicate(d: DiscoveredSkill) {
    return existingKeys.has(d.name + "::" + d.origin);
  }

  function handleRowClick(d: DiscoveredSkill) {
    const k = keyOf(d);
    const dup = isDuplicate(d);

    if (dup) {
      // Replacement requires two clicks.
      if (replaceArmed[k]) {
        setSelected((s) => ({ ...s, [k]: !s[k] }));
        // leave armed; further clicks toggle selection
      } else {
        setReplaceArmed((s) => ({ ...s, [k]: true }));
      }
      return;
    }

    setSelected((s) => ({ ...s, [k]: !s[k] }));
  }

  function selectAllVisible() {
    const next = { ...selected };
    let changed = false;
    for (const d of filtered) {
      if (isDuplicate(d)) continue;
      if (!next[keyOf(d)]) {
        next[keyOf(d)] = true;
        changed = true;
      }
    }
    if (changed) setSelected(next);
  }

  function clearSelection() {
    setSelected({});
  }

  async function doImport() {
    const picked = discovered.filter((d) => selected[keyOf(d)]);
    if (picked.length === 0) {
      toast.warn("Select at least one skill to import.");
      return;
    }
    const n = importSkills(
      picked.map((d) => ({
        name: d.name,
        description: d.description || "",
        category: (d.category || d.source).toUpperCase(),
        badge: guessBadge(d.category || d.source),
        body: d.body,
        source: "imported",
        origin: d.origin,
      })),
    );
    toast.success(`Imported ${n} skill${n === 1 ? "" : "s"}.`);
    onClose();
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const dupCount = filtered.filter(isDuplicate).length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <Download size={16} color="var(--text-dim)" />
          <span className="modal-title">Import skills</span>
          <button className="icon-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="modal-body">
          <div className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Toggle which locations Mesh should scan. Only detected folders are enabled by
            default.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {roots.map((r, i) => (
              <button
                key={i}
                className={"import-item"}
                onClick={() => r.exists && toggleRoot(r.path)}
                disabled={!r.exists}
                style={{
                  width: "100%",
                  textAlign: "left",
                  cursor: r.exists ? "pointer" : "not-allowed",
                  background: enabledRoots[r.path]
                    ? "var(--accent-soft)"
                    : "var(--bg-elev)",
                  border:
                    "1px solid " +
                    (enabledRoots[r.path] ? "var(--accent-border)" : "var(--border)"),
                  opacity: r.exists ? 1 : 0.5,
                }}
              >
                {enabledRoots[r.path] ? (
                  <CheckSquare size={14} color="var(--accent)" />
                ) : (
                  <Square size={14} color="var(--text-muted)" />
                )}
                <div className="import-item-body">
                  <div className="import-item-name">{r.source}</div>
                  <div className="import-item-origin">{r.path}</div>
                </div>
                <span className="pill">{r.exists ? "found" : "—"}</span>
              </button>
            ))}
          </div>

          {extraDirs.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {extraDirs.map((d) => (
                <div
                  key={d}
                  className="import-item"
                  style={{
                    background: "var(--bg-elev)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <FolderSearch size={14} color="var(--text-dim)" />
                  <div className="import-item-body">
                    <div className="import-item-name">Custom folder</div>
                    <div className="import-item-origin">{d}</div>
                  </div>
                  <button className="icon-btn" title="Remove" onClick={() => removeExtra(d)}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 14,
              gap: 10,
            }}
          >
            <div className="strong">
              {filtered.length} skill{filtered.length === 1 ? "" : "s"} found
              {dupCount > 0 && (
                <span className="text-muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                  ({dupCount} already imported)
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn sm" onClick={selectAllVisible}>
                Select all
              </button>
              <button className="btn sm" onClick={clearSelection}>
                Clear
              </button>
              <button className="btn sm" onClick={addFolder}>
                <FolderSearch size={12} /> Add folder
              </button>
            </div>
          </div>

          <div
            className="input"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              marginTop: 10,
            }}
          >
            <Search size={13} style={{ color: "var(--text-muted)" }} />
            <input
              className="selectable"
              placeholder="Filter by name, category, or path"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "inherit",
              }}
            />
          </div>

          <div className="import-list">
            {loading ? (
              <div className="text-muted" style={{ padding: 14 }}>Scanning…</div>
            ) : filtered.length === 0 ? (
              <div className="text-muted" style={{ padding: 14 }}>
                No matches. Try enabling a source or using "Add folder".
              </div>
            ) : (
              filtered.map((d) => {
                const k = keyOf(d);
                const dup = isDuplicate(d);
                const sel = !!selected[k];
                return (
                  <div
                    key={k}
                    className="import-item"
                    onClick={() => handleRowClick(d)}
                    style={{ cursor: "pointer" }}
                    title={dup ? "Already imported - click twice to replace" : ""}
                  >
                    {sel ? (
                      <CheckSquare size={14} color="var(--accent)" />
                    ) : (
                      <Square
                        size={14}
                        color={
                          dup && replaceArmed[k] ? "var(--yellow)" : "var(--text-muted)"
                        }
                      />
                    )}
                    <div className="import-item-body">
                      <div className="import-item-name">{d.name}</div>
                      <div className="import-item-origin">{d.origin}</div>
                    </div>
                    <span className="pill">{(d.category || d.source).toUpperCase()}</span>
                    {dup && (
                      <span
                        className={"pill " + (replaceArmed[k] ? "yellow" : "")}
                        style={{ marginLeft: 6 }}
                      >
                        {replaceArmed[k] ? "click to replace" : "already imported"}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border-soft)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span className="text-muted" style={{ fontSize: 12 }}>
            {selectedCount} selected
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn primary"
              onClick={doImport}
              disabled={selectedCount === 0}
            >
              Import {selectedCount || ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 440 }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="icon-btn" onClick={onCancel}>
            <X size={14} />
          </button>
        </div>
        <div className="modal-body" style={{ paddingTop: 4 }}>
          <p style={{ margin: "6px 0 0", color: "var(--text-dim)", fontSize: 13 }}>{message}</p>
        </div>
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border-soft)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn primary"
            style={
              destructive
                ? {
                    borderColor: "rgba(248, 113, 113, 0.4)",
                    background: "rgba(248, 113, 113, 0.1)",
                    color: "var(--red)",
                  }
                : undefined
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
