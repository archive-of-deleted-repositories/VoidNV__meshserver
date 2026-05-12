import React from "react";
import { FolderSearch, Pencil, Save, Trash2, X } from "lucide-react";
import { useApp, type SkillBadge } from "../state/store";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  isTauri,
  skillsDefaultDir,
  skillsDeleteFile,
  skillsSaveFile,
} from "../lib/tauri";

const badges: SkillBadge[] = [
  "GENERAL",
  "WORKFLOW",
  "QUALITY",
  "SECURITY",
  "GROWTH",
  "MEMORY",
];

export function SkillEditorModal() {
  const { open, skillId } = useApp((s) => s.skillEditor);
  const close = useApp((s) => s.closeSkillEditor);
  const skills = useApp((s) => s.skills);
  const addSkill = useApp((s) => s.addSkill);
  const updateSkill = useApp((s) => s.updateSkill);
  const removeSkill = useApp((s) => s.removeSkill);
  const skillLibraryDir = useApp((s) => s.skillLibraryDir);
  const setSkillLibraryDir = useApp((s) => s.setSkillLibraryDir);

  const existing = skills.find((s) => s.id === skillId);

  const [name, setName] = React.useState(existing?.name ?? "");
  const [description, setDescription] = React.useState(existing?.description ?? "");
  const [category, setCategory] = React.useState(existing?.category ?? "MESH");
  const [badge, setBadge] = React.useState<SkillBadge>(existing?.badge ?? "GENERAL");
  const [body, setBody] = React.useState(existing?.body ?? "");
  const [defaultDir, setDefaultDir] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setName(existing?.name ?? "");
    setDescription(existing?.description ?? "");
    setCategory(existing?.category ?? "MESH");
    setBadge(existing?.badge ?? "GENERAL");
    setBody(existing?.body ?? "");
    setError("");
  }, [existing?.id, open]);

  React.useEffect(() => {
    if (!open) return;
    skillsDefaultDir().then(setDefaultDir).catch(() => {});
  }, [open]);

  if (!open) return null;

  const activeDir = skillLibraryDir || defaultDir;

  async function pickStorageFolder() {
    if (!isTauri()) return;
    try {
      const picked = await openDialog({ directory: true, multiple: false });
      if (typeof picked === "string") setSkillLibraryDir(picked);
    } catch {
      /* noop */
    }
  }

  async function save() {
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    setError("");
    let origin = existing?.origin;
    try {
      origin = await skillsSaveFile({
        name: name.trim(),
        description: description.trim(),
        category: category.trim().toUpperCase() || "MESH",
        body,
        existingOrigin: existing?.source === "user" ? existing.origin ?? null : null,
        targetDir: activeDir || null,
      });
    } catch (err) {
      setSaving(false);
      setError("Could not write the skill file: " + String(err));
      return;
    }

    if (existing) {
      updateSkill(existing.id, {
        name: name.trim(),
        description: description.trim(),
        category: category.trim().toUpperCase() || "MESH",
        badge,
        body,
        source: "user",
        origin,
      });
    } else {
      addSkill({
        name: name.trim(),
        description: description.trim(),
        category: category.trim().toUpperCase() || "MESH",
        badge,
        body,
        source: "user",
        origin,
      });
    }
    setSaving(false);
    close();
  }

  async function del() {
    if (!existing) return;
    if (!confirm(`Delete "${existing.name}"?`)) return;
    if (existing.source === "user" && existing.origin) {
      await skillsDeleteFile(existing.origin).catch(() => {});
    }
    removeSkill(existing.id);
    close();
  }

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <Pencil size={16} color="var(--text-dim)" />
          <span className="modal-title">{existing ? "Edit skill" : "New skill"}</span>
          {existing && (
            <button className="icon-btn" onClick={del} title="Delete">
              <Trash2 size={14} color="var(--red)" />
            </button>
          )}
          <button className="icon-btn" onClick={close}>
            <X size={14} />
          </button>
        </div>
        <div className="modal-body">
          <div className="editor-form">
            <div className="two-col">
              <div className="field">
                <label>Name</label>
                <input
                  className="input selectable"
                  placeholder="BridgeSecurity"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Category</label>
                <input
                  className="input selectable"
                  placeholder="MESH"
                  value={category}
                  onChange={(e) => setCategory(e.target.value.toUpperCase())}
                />
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <input
                className="input selectable"
                placeholder="Short description shown in the skill card."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Badge</label>
              <div className="badge-row">
                {badges.map((b) => (
                  <button
                    key={b}
                    className={"agent-chip" + (badge === b ? " active" : "")}
                    onClick={() => setBadge(b)}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Skill body (prompt / markdown)</label>
              <textarea
                className="selectable"
                placeholder="Write the prompt this skill should inject into a terminal…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Saved file</label>
              <div className="skill-storage-row">
                <div className="input skill-storage-path">
                  {existing?.origin || activeDir || "Default Mesh skills folder"}
                </div>
                <button className="btn" onClick={pickStorageFolder} disabled={!isTauri()}>
                  <FolderSearch size={12} /> Save elsewhere
                </button>
              </div>
              <div className="text-muted" style={{ fontSize: 11, marginTop: 6 }}>
                User-created skills are saved as Markdown files and still stay in Mesh until
                you delete them.
              </div>
              {error && (
                <div style={{ color: "var(--red)", fontSize: 12, marginTop: 6 }}>{error}</div>
              )}
            </div>
          </div>
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
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={save}
            disabled={!name.trim() || !body.trim() || saving}
          >
            <Save size={12} /> {saving ? "Saving..." : "Save skill"}
          </button>
        </div>
      </div>
    </div>
  );
}
