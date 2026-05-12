import React from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Folder,
  Hammer,
  MessageSquare,
  Search,
  Shield,
  ShieldOff,
  Upload,
  Users,
  X,
  Type,
} from "lucide-react";
import { promptServerPath } from "../lib/browserDialog";
import { fsHome } from "../lib/serverApi";
import { useApp, type CliAgent } from "../state/store";
import { useDetection } from "../state/detection";

const agentChips: CliAgent[] = [
  "Claude",
  "Codex",
  "Gemini",
  "OpenCode",
  "Cursor",
  "Kiro",
  "Droid",
];

const stepsLabels: { key: number; label: string; icon: React.ReactNode }[] = [
  { key: 1, label: "Roster", icon: <Users size={12} /> },
  { key: 2, label: "Directory", icon: <Folder size={12} /> },
  { key: 3, label: "Mission", icon: <MessageSquare size={12} /> },
  { key: 4, label: "Context", icon: <BookOpen size={12} /> },
  { key: 5, label: "Name", icon: <Type size={12} /> },
];

export function HiveWizard() {
  const wiz = useApp((s) => s.wizardState);
  const setWiz = useApp((s) => s.setWizard);
  const commit = useApp((s) => s.commitHiveWizard);
  const setScreen = useApp((s) => s.setScreen);
  const removeWorkspace = useApp((s) => s.removeWorkspace);

  React.useEffect(() => {
    if (!wiz.folder) {
      (async () => {
        const home = await fsHome();
        setWiz({ folder: home });
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pickFolder() {
    try {
      const picked = await promptServerPath({ directory: true, multiple: false }, wiz.folder);
      if (typeof picked === "string") setWiz({ folder: picked });
    } catch {
      /* noop */
    }
  }

  async function pickContextFiles() {
    try {
      const picked = await promptServerPath({ multiple: true });
      if (Array.isArray(picked)) setWiz({ contextFiles: [...wiz.contextFiles, ...picked] });
      else if (typeof picked === "string")
        setWiz({ contextFiles: [...wiz.contextFiles, picked] });
    } catch {
      /* noop */
    }
  }

  const next = () => setWiz({ step: Math.min(5, (wiz.step as number) + 1) as 1 | 2 | 3 | 4 | 5 });
  const back = () => {
    if (wiz.step === 1) {
      // Abandon the draft workspace we created when the wizard started.
      if (wiz.workspaceId) removeWorkspace(wiz.workspaceId);
      setScreen("welcome");
    } else {
      setWiz({ step: Math.max(1, (wiz.step as number) - 1) as 1 | 2 | 3 | 4 | 5 });
    }
  };

  return (
    <div className="wizard grid-bg">
      <div className="wizard-inner" style={{ maxWidth: 820 }}>
        <SwarmSteps step={wiz.step as 1 | 2 | 3 | 4 | 5} />

        {wiz.step === 1 && <RosterStep />}
        {wiz.step === 2 && <DirectoryStep folder={wiz.folder} pickFolder={pickFolder} />}
        {wiz.step === 3 && <MissionStep />}
        {wiz.step === 4 && <ContextStep onPick={pickContextFiles} />}
        {wiz.step === 5 && <NameStep />}

        <div className="cancel-bar">
          <button className="btn" onClick={back}>
            <ChevronLeft size={14} /> Back
          </button>
          <span className="cancel-bar-label">
            Step {wiz.step} of 5 · {wiz.name || "Hive 1"}
          </span>
          {wiz.step < 5 ? (
            <button className="btn primary" onClick={next}>
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button className="btn primary" onClick={commit} disabled={!wiz.name.trim()}>
              Launch <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SwarmSteps({ step }: { step: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div className="swarm-steps">
      {stepsLabels.map((s, i) => {
        const cls = step === s.key ? "current" : step > s.key ? "done" : "";
        return (
          <React.Fragment key={s.key}>
            <div className={"swarm-step " + cls}>
              {step > s.key ? <Check size={12} /> : s.icon}
              <span>{s.label}</span>
            </div>
            {i < stepsLabels.length - 1 && <span className="swarm-step-sep" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function RosterStep() {
  const wiz = useApp((s) => s.wizardState);
  const setWiz = useApp((s) => s.setWizard);
  const getAgent = useDetection((s) => s.getAgent);
  const detectionReport = useDetection((s) => s.report);
  const installedAgents = React.useMemo(
    () => agentChips.filter((a) => !!getAgent(a)?.installed),
    [getAgent, detectionReport],
  );
  const sortedAgents = React.useMemo(
    () =>
      [...agentChips].sort((a, b) => {
        const ai = getAgent(a)?.installed ? 0 : 1;
        const bi = getAgent(b)?.installed ? 0 : 1;
        if (ai !== bi) return ai - bi;
        return agentChips.indexOf(a) - agentChips.indexOf(b);
      }),
    [getAgent, detectionReport],
  );

  const presets: { n: 5 | 10 | 15 | 20; label: string; coord: number; build: number }[] = [
    { n: 5, label: "SQUAD", coord: 1, build: 4 },
    { n: 10, label: "TEAM", coord: 2, build: 8 },
    { n: 15, label: "PLATOON", coord: 3, build: 12 },
    { n: 20, label: "BATTALION", coord: 4, build: 16 },
  ];
  function pickPreset(n: 5 | 10 | 15 | 20) {
    const p = presets.find((x) => x.n === n)!;
    setWiz({ swarmPreset: n, coordinators: p.coord, builders: p.build });
  }

  React.useEffect(() => {
    if (!detectionReport) return;
    if (getAgent(wiz.agentForAll)?.installed) return;
    const firstInstalled = installedAgents[0];
    if (firstInstalled) setWiz({ agentForAll: firstInstalled });
  }, [detectionReport, getAgent, installedAgents, setWiz, wiz.agentForAll]);

  const total = wiz.coordinators + wiz.builders;

  return (
    <div className="swarm-body">
      <div className="swarm-hero">
        <div className="swarm-hero-icon">
          <Users size={22} />
        </div>
        <h1 className="swarm-title">Build your roster</h1>
        <p className="swarm-sub">
          Pick a preset or customize individual agents. This is the team that will ship your
          code.
        </p>
      </div>

      <div>
        <div className="wizard-section-label">
          <span>QUICK PRESETS</span>
        </div>
        <div className="presets-row">
          {presets.map((p) => (
            <button
              key={p.n}
              className={"preset-card" + (wiz.swarmPreset === p.n ? " active" : "")}
              onClick={() => pickPreset(p.n)}
            >
              <div className="preset-card-num">{p.n}</div>
              <div className="preset-card-label">{p.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="wizard-section-label">LAUNCH MODE</div>
        <div className="launch-modes">
          <div
            className={"launch-mode" + (wiz.launchMode === "SAFE" ? " active" : "")}
            onClick={() => setWiz({ launchMode: "SAFE" })}
          >
            <div className="launch-mode-icon">
              <Shield size={14} />
            </div>
            <div>
              <div className="launch-mode-title">SAFE</div>
              <div className="launch-mode-sub">
                Agents ask before privileged file or command actions.
              </div>
            </div>
          </div>
          <div
            className={"launch-mode" + (wiz.launchMode === "SKIP" ? " active" : "")}
            onClick={() => setWiz({ launchMode: "SKIP" })}
          >
            <div className="launch-mode-icon" style={{ color: "#fbbf24" }}>
              <ShieldOff size={14} />
            </div>
            <div>
              <div className="launch-mode-title">SKIP PERMISSIONS</div>
              <div className="launch-mode-sub">
                Trusted local workspaces only. Agents skip CLI approval prompts.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="wizard-section-label">CLI AGENT FOR ALL</div>
        <div className="agent-chip-row">
          {sortedAgents.map((a) => {
            const detected = getAgent(a);
            const installed = !!detected?.installed;
            return (
              <button
                key={a}
                className={"agent-chip" + (wiz.agentForAll === a ? " active" : "")}
                onClick={() => installed && setWiz({ agentForAll: a })}
                disabled={!installed}
                title={installed ? detected?.label : "Not found on PATH"}
                style={!installed ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              >
                {a}
                {!installed && (
                  <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>
                    missing
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className={"custom-command" + (wiz.customEnabled ? " selected" : "")} style={{ marginTop: 12 }}>
          <div className="custom-command-header">
            <input
              type="checkbox"
              checked={wiz.customEnabled}
              onChange={(e) => setWiz({ customEnabled: e.target.checked })}
            />
            <span className="custom-command-title">Custom args for {wiz.agentForAll}</span>
          </div>
          {wiz.customEnabled && (
            <input
              className="input"
              placeholder={`e.g. --yolo or ${defaultAgentCommand(wiz.agentForAll)} --flag`}
              value={wiz.customCommands[wiz.agentForAll] ?? ""}
              onChange={(e) =>
                setWiz({
                  customCommands: {
                    ...wiz.customCommands,
                    [wiz.agentForAll]: e.target.value,
                  },
                })
              }
            />
          )}
        </div>
      </div>

      <div className="roster-tabs">
        <span className="roster-tab active">
          <Users size={12} /> {wiz.coordinators} Coordinator{wiz.coordinators === 1 ? "" : "s"}
        </span>
        <span className="roster-tab">
          <Hammer size={12} /> {wiz.builders} Builder{wiz.builders === 1 ? "" : "s"}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
          {total} total
        </span>
      </div>

      <div className="roster-scroll">
        {Array.from({ length: wiz.coordinators }).map((_, i) => (
          <RosterRow key={"c" + i} role="COORDINATOR" index={i + 1} agent={wiz.agentForAll} />
        ))}
        {Array.from({ length: wiz.builders }).map((_, i) => (
          <RosterRow
            key={"b" + i}
            role="BUILDER"
            index={wiz.coordinators + i + 1}
            agent={wiz.agentForAll}
          />
        ))}
      </div>

      <div
        className="add-agent-row"
        style={{ display: "flex", gap: 8, justifyContent: "center" }}
      >
        <button className="btn" onClick={() => setWiz({ coordinators: wiz.coordinators + 1 })}>
          <Users size={12} /> Add coordinator
        </button>
        <button className="btn" onClick={() => setWiz({ builders: wiz.builders + 1 })}>
          <Hammer size={12} /> Add builder
        </button>
      </div>
    </div>
  );
}

function defaultAgentCommand(agent: CliAgent): string {
  switch (agent) {
    case "Claude":
      return "claude";
    case "Codex":
      return "codex";
    case "Gemini":
      return "gemini";
    case "OpenCode":
      return "opencode";
    case "Cursor":
      return "cursor";
    case "Kiro":
      return "kiro-cli";
    case "Droid":
      return "droid";
  }
}

function RosterRow({
  role,
  index,
  agent,
}: {
  role: "COORDINATOR" | "BUILDER";
  index: number;
  agent: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <div className="roster-row">
        <span className="roster-index">{index}</span>
        <span className="roster-role-icon">
          {role === "COORDINATOR" ? <Users size={14} /> : <Hammer size={14} />}
        </span>
        <span className="roster-role-name">
          <strong>{role}</strong>
          <span className="text-dim" style={{ fontSize: 12 }}>
            <span className="pill" style={{ marginRight: 6 }}>
              &gt;_
            </span>
            {agent}
          </span>
        </span>
        <button className="icon-btn" onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {open && (
        <div
          style={{
            padding: "12px 14px",
            marginTop: -6,
            marginBottom: 8,
            borderRadius: 12,
            border: "1px solid var(--border-soft)",
            background: "var(--bg-elev)",
            color: "var(--text-dim)",
            fontSize: 12,
          }}
        >
          Configure role, instructions, and tools in the workspace after launch.
        </div>
      )}
    </>
  );
}

function DirectoryStep({
  folder,
  pickFolder,
}: {
  folder: string;
  pickFolder: () => void;
}) {
  const setWiz = useApp((s) => s.setWizard);
  return (
    <div className="swarm-body">
      <div className="swarm-hero">
        <div className="swarm-hero-icon">
          <Folder size={22} />
        </div>
        <h1 className="swarm-title">Choose a directory</h1>
        <p className="swarm-sub">Select the project folder your swarm agents will work in.</p>
      </div>

      <div className="folder-row" style={{ marginBottom: 10 }}>
        <div
          className="input"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
          onClick={pickFolder}
        >
          <Folder size={14} style={{ color: "var(--text-muted)" }} />
          <input
            className="selectable"
            value={folder}
            onChange={(e) => setWiz({ folder: e.target.value })}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "inherit",
              padding: 0,
            }}
          />
          <Search size={14} style={{ color: "var(--text-muted)" }} />
        </div>
      </div>

      <div
        className="input"
        style={{ display: "flex", alignItems: "center", gap: 8 }}
      >
        <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>&gt;</span>
        <input
          className="selectable"
          placeholder="cd ../other-project"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "inherit",
            padding: 0,
          }}
          onKeyDown={(e) => {
            const el = e.currentTarget as HTMLInputElement;
            if (e.key === "Enter" && el.value) {
              setWiz({ folder: el.value });
              el.value = "";
            }
          }}
        />
        <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
      </div>
    </div>
  );
}

function MissionStep() {
  const wiz = useApp((s) => s.wizardState);
  const setWiz = useApp((s) => s.setWizard);
  const chars = wiz.mission.length;

  const skills = useApp((s) => s.skills);
  const workflowSkills = skills.filter((s) => /workflow/i.test(s.badge));
  const qualitySkills = skills.filter((s) => /quality/i.test(s.badge));

  function toggleSkill(id: string) {
    const enabled = wiz.enabledSwarmSkills.includes(id);
    setWiz({
      enabledSwarmSkills: enabled
        ? wiz.enabledSwarmSkills.filter((x) => x !== id)
        : [...wiz.enabledSwarmSkills, id],
    });
  }

  return (
    <div className="swarm-body">
      <div className="swarm-hero">
        <div className="swarm-hero-icon">
          <MessageSquare size={22} />
        </div>
        <h1 className="swarm-title">Swarm mission</h1>
        <p className="swarm-sub">
          Describe what you want this swarm to build or fix. This is shared with all agents as
          their mission brief.
        </p>
      </div>

      <textarea
        className="mission-textarea"
        placeholder="What should this swarm accomplish? Type @ to reference files. Agents will read this as their mission brief."
        value={wiz.mission}
        onChange={(e) => setWiz({ mission: e.target.value })}
      />
      <div style={{ textAlign: "right", color: "var(--text-muted)", fontSize: 11, marginTop: -18, paddingRight: 16, position: "relative", zIndex: 2 }}>
        {chars} chars
      </div>

      <div className="mission-note">
        <span style={{ color: "var(--accent)" }}>⚡</span>
        Shared with all agents so they can coordinate and stay aligned.
      </div>

      <div style={{ marginTop: 20 }}>
        <div
          className="wizard-section-label"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <span style={{ color: "var(--accent)" }}>✦</span>
          <span style={{ letterSpacing: "0.16em" }}>SWARM SKILLS</span>
        </div>

        {workflowSkills.length > 0 && (
          <>
            <div className="cat-label purple">WORKFLOW</div>
            <div className="swarm-skills-list">
              {workflowSkills.map((s) => (
                <div key={s.id} className="swarm-skill-card">
                  <div className="swarm-skill-icon">✦</div>
                  <div className="swarm-skill-body">
                    <div className="swarm-skill-name">{s.name}</div>
                    <div className="swarm-skill-desc">{s.description}</div>
                  </div>
                  <div
                    className={"toggle" + (wiz.enabledSwarmSkills.includes(s.id) ? " on" : "")}
                    onClick={() => toggleSkill(s.id)}
                  >
                    <div className="toggle-knob" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {qualitySkills.length > 0 && (
          <>
            <div className="cat-label green">QUALITY</div>
            <div className="swarm-skills-list">
              {qualitySkills.map((s) => (
                <div key={s.id} className="swarm-skill-card">
                  <div className="swarm-skill-icon">✦</div>
                  <div className="swarm-skill-body">
                    <div className="swarm-skill-name">{s.name}</div>
                    <div className="swarm-skill-desc">{s.description}</div>
                  </div>
                  <div
                    className={"toggle" + (wiz.enabledSwarmSkills.includes(s.id) ? " on" : "")}
                    onClick={() => toggleSkill(s.id)}
                  >
                    <div className="toggle-knob" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {workflowSkills.length === 0 && qualitySkills.length === 0 && (
          <div className="text-muted" style={{ fontSize: 12, padding: 12 }}>
            No skills yet. Add one from the Skills panel after launch, or import them on the
            side panel.
          </div>
        )}
      </div>
    </div>
  );
}

function ContextStep({ onPick }: { onPick: () => void }) {
  const wiz = useApp((s) => s.wizardState);
  const setWiz = useApp((s) => s.setWizard);

  function removeAt(i: number) {
    setWiz({ contextFiles: wiz.contextFiles.filter((_, idx) => idx !== i) });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const files: string[] = [];
    for (const f of Array.from(e.dataTransfer.files)) {
      const p = (f as any).path as string | undefined;
      if (p) files.push(p);
      else files.push(f.name);
    }
    if (files.length) setWiz({ contextFiles: [...wiz.contextFiles, ...files] });
  }

  return (
    <div className="swarm-body">
      <div className="swarm-hero">
        <div className="swarm-hero-icon">
          <BookOpen size={22} />
        </div>
        <h1 className="swarm-title">Supporting context</h1>
        <p className="swarm-sub">
          Optionally attach files to give your swarm extra context — specs, logs, PDFs, images,
          etc.
        </p>
      </div>

      <div
        className="dropzone"
        onClick={onPick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <div className="dropzone-icon">
          <Upload size={20} />
        </div>
        <div className="strong">Add context files</div>
        <div className="text-muted" style={{ fontSize: 12 }}>
          Drag &amp; drop or click to attach PDFs, logs, specs, or images.
        </div>
      </div>

      {wiz.contextFiles.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {wiz.contextFiles.map((p, i) => (
            <div
              key={i}
              className="import-item"
              style={{ background: "var(--bg-elev)", border: "1px solid var(--border)" }}
            >
              <BookOpen size={14} style={{ color: "var(--text-muted)" }} />
              <div className="import-item-body">
                <div className="import-item-name">{p.split(/[\\/]/).pop()}</div>
                <div className="import-item-origin">{p}</div>
              </div>
              <button className="icon-btn" onClick={() => removeAt(i)} title="Remove">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NameStep() {
  const wiz = useApp((s) => s.wizardState);
  const setWiz = useApp((s) => s.setWizard);
  return (
    <div className="swarm-body">
      <div className="swarm-hero">
        <div className="swarm-hero-icon">
          <Type size={22} />
        </div>
        <h1 className="swarm-title">Name your swarm</h1>
        <p className="swarm-sub">
          Almost there — give your swarm a short name to identify it in your workspace.
        </p>
      </div>
      <input
        autoFocus
        className="name-input selectable"
        placeholder="Swarm 1"
        value={wiz.name}
        onChange={(e) => setWiz({ name: e.target.value })}
      />
    </div>
  );
}
