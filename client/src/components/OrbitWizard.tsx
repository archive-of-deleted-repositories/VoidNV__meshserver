import React from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Folder,
  Search,
  Save,
} from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { fsHome, isTauri } from "../lib/tauri";
import { useApp, type CliAgent } from "../state/store";
import { useDetection } from "../state/detection";

const layoutOptions: { n: number; label: string; grid: number[] }[] = [
  { n: 1, label: "1", grid: [1, 1] },
  { n: 2, label: "2", grid: [1, 2] },
  { n: 4, label: "4", grid: [2, 2] },
  { n: 6, label: "6", grid: [2, 3] },
  { n: 8, label: "8", grid: [2, 4] },
  { n: 10, label: "10", grid: [2, 5] },
  { n: 12, label: "12", grid: [3, 4] },
];

const agentList: { key: CliAgent; label: string }[] = [
  { key: "Claude", label: "Claude" },
  { key: "Codex", label: "Codex" },
  { key: "Gemini", label: "Gemini" },
  { key: "OpenCode", label: "OpenCode" },
  { key: "Cursor", label: "Cursor" },
  { key: "Kiro", label: "Kiro" },
  { key: "Droid", label: "Droid" },
];

type UiStep = 1 | 2; // Step 1 = Layout, Step 2 = Agents

export function OrbitWizard() {
  const wiz = useApp((s) => s.wizardState);
  const setWiz = useApp((s) => s.setWizard);
  const commit = useApp((s) => s.commitOrbitWizard);
  const setScreen = useApp((s) => s.setScreen);
  const recents = useApp((s) => s.recentWorkspaces);
  const removeWorkspace = useApp((s) => s.removeWorkspace);

  // The wizard state's `step` remains as 1..5 for Swarm; for Space we remap to 1..2.
  const step = (wiz.step > 2 ? 2 : wiz.step) as UiStep;

  React.useEffect(() => {
    if (!wiz.folder) {
      (async () => {
        const home = await fsHome();
        setWiz({ folder: home });
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const agentTotal = Object.values(wiz.agents).reduce((a, b) => a + b, 0) as number;

  async function pickFolder() {
    if (!isTauri()) {
      const v = window.prompt("Working folder", wiz.folder);
      if (v) setWiz({ folder: v });
      return;
    }
    try {
      const picked = await openDialog({ directory: true, multiple: false });
      if (typeof picked === "string") setWiz({ folder: picked });
    } catch {
      /* noop */
    }
  }

  return (
    <div className="wizard grid-bg">
      <div className="wizard-inner">
        <WizardSteps step={step} />

        {step === 1 && (
          <LayoutStep
            folder={wiz.folder}
            setFolder={(v: string) => setWiz({ folder: v })}
            pickFolder={pickFolder}
            count={wiz.terminalCount}
            setCount={(n: number) => setWiz({ terminalCount: n })}
            recents={recents}
            commit={commit}
          />
        )}
        {step === 2 && (
          <AgentsStep
            count={wiz.terminalCount}
            agents={wiz.agents}
            setAgents={(next: any) => setWiz({ agents: next })}
            customEnabled={wiz.customEnabled}
            customCommands={wiz.customCommands}
            setCustom={(patch: any) => setWiz(patch)}
            total={agentTotal}
          />
        )}

        <div className="wizard-footer">
          <button
            className="btn ghost"
            onClick={() => {
              if (step === 1) {
                // Drop the draft workspace so the sidebar doesn't pile up.
                if (wiz.workspaceId) removeWorkspace(wiz.workspaceId);
                setScreen("welcome");
              } else setWiz({ step: 1 });
            }}
          >
            <ChevronLeft size={14} /> Back
          </button>
          {step === 1 ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="btn ghost" onClick={commit} title="Start with no agents">
                Open without AI
              </button>
              <button
                className="btn primary"
                onClick={() => setWiz({ step: 2 })}
                disabled={!wiz.folder.trim()}
              >
                Next: Add AI agents <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {agentTotal > 0 && (
                <button className="btn ghost" onClick={commit}>
                  Skip — no agents
                </button>
              )}
              <button className="btn primary" onClick={commit}>
                {agentTotal > 0 ? "Launch workspace" : "Launch"}
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WizardSteps({ step }: { step: UiStep }) {
  return (
    <div className="wizard-steps">
      {["Layout", "Agents"].map((label, i) => {
        const n = (i + 1) as UiStep;
        const cls = step === n ? "current" : step > n ? "done" : "";
        return (
          <React.Fragment key={label}>
            <div className={"wizard-step " + cls}>
              <span className="wizard-step-num">{step > n ? <Check size={12} /> : n}</span>
              {label}
            </div>
            {n < 2 && <div className="wizard-step-line" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function LayoutStep({
  folder,
  setFolder,
  pickFolder,
  count,
  setCount,
  recents,
  commit,
}: {
  folder: string;
  setFolder: (v: string) => void;
  pickFolder: () => void;
  count: number;
  setCount: (n: number) => void;
  recents: { name: string; path: string }[];
  commit: () => void;
}) {
  return (
    <>
      <h2 className="wizard-title">Set up your workspace</h2>
      <p className="wizard-sub">
        Pick a folder to work in and choose how many terminals you want.
      </p>

      <div className="wizard-block">
        <div className="wizard-section-label">
          <span>Working folder</span>
          <span className="hint">Where your terminals will start</span>
        </div>
        <div className="folder-row">
          <div className="input" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Folder size={14} style={{ color: "var(--text-muted)" }} />
            <input
              className="selectable"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "inherit",
                padding: 0,
              }}
              placeholder="C:\\Users\\you\\Projects"
            />
            <Search size={14} style={{ color: "var(--text-muted)" }} />
          </div>
          <button className="btn" onClick={pickFolder}>
            Browse
          </button>
        </div>
      </div>

      <div className="wizard-block">
        <div className="wizard-section-label">
          <span>How many terminals?</span>
          <span className="hint">
            <span className="pill green" style={{ marginRight: 6 }}>
              {count} terminal{count === 1 ? "" : "s"}
            </span>
            <span>{gridLabel(count)} grid</span>
          </span>
        </div>
        <div className="layout-grid">
          {layoutOptions.map((o) => (
            <button
              key={o.n}
              className={"layout-tile " + (count === o.n ? "active" : "")}
              onClick={() => setCount(o.n)}
            >
              <LayoutPreview rows={o.grid[0]} cols={o.grid[1]} />
              <span className="layout-tile-label">{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="wizard-block">
        <div className="wizard-section-label">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Clock size={11} /> Recent {recents.length}
          </span>
          <span className="hint">Last opened workspaces</span>
        </div>
        <div className="recent-grid">
          {recents.slice(0, 6).map((r) => (
            <button
              key={r.path}
              className="recent-item"
              onClick={() => setFolder(r.path)}
              onDoubleClick={() => {
                setFolder(r.path);
                // Commit immediately without agents when the user picks a recent folder.
                setTimeout(commit, 0);
              }}
              title="Click to select, double-click to open without agents"
            >
              <Folder size={14} style={{ color: "var(--text-muted)" }} />
              <span className="recent-item-text">
                <div className="recent-item-name">{r.name}</div>
                <div className="recent-item-path">{r.path}</div>
              </span>
            </button>
          ))}
          {recents.length === 0 && (
            <div className="text-muted" style={{ padding: "8px 10px", fontSize: 12 }}>
              No recent workspaces yet.
            </div>
          )}
        </div>
      </div>

      <div className="wizard-block">
        <div className="wizard-section-label">
          <Save size={12} style={{ marginRight: 4 }} /> Presets
        </div>
        <div className="preset-save">+ Save current setup as a preset</div>
      </div>
    </>
  );
}

function gridLabel(count: number): string {
  switch (count) {
    case 1:
      return "1×1";
    case 2:
      return "1×2";
    case 4:
      return "2×2";
    case 6:
      return "2×3";
    case 8:
      return "2×4";
    case 10:
      return "2×5";
    case 12:
      return "3×4";
    default:
      return count + "";
  }
}

function LayoutPreview({ rows, cols }: { rows: number; cols: number }) {
  const cells = Array.from({ length: rows * cols });
  return (
    <div
      className="layout-preview"
      style={{
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
      }}
    >
      {cells.map((_, i) => (
        <div key={i} />
      ))}
    </div>
  );
}

function selectedAgents(agents: Record<CliAgent, number>): CliAgent[] {
  return agentList.filter((a) => (agents[a.key] ?? 0) > 0).map((a) => a.key);
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

function AgentsStep({
  count,
  agents,
  setAgents,
  customEnabled,
  customCommands,
  setCustom,
  total,
}: {
  count: number;
  agents: Record<CliAgent, number>;
  setAgents: (next: Record<CliAgent, number>) => void;
  customEnabled: boolean;
  customCommands: Record<CliAgent, string>;
  setCustom: (p: any) => void;
  total: number;
}) {
  const [showMore, setShowMore] = React.useState(false);
  const getAgent = useDetection((s) => s.getAgent);
  const detectionReport = useDetection((s) => s.report);
  const installedAgents = React.useMemo(
    () => agentList.filter((a) => !!getAgent(a.key)?.installed),
    [getAgent, detectionReport],
  );
  const sortedAgents = React.useMemo(
    () =>
      [...agentList].sort((a, b) => {
        const ai = getAgent(a.key)?.installed ? 0 : 1;
        const bi = getAgent(b.key)?.installed ? 0 : 1;
        if (ai !== bi) return ai - bi;
        return agentList.findIndex((x) => x.key === a.key) - agentList.findIndex((x) => x.key === b.key);
      }),
    [getAgent, detectionReport],
  );
  const visible = showMore ? sortedAgents : sortedAgents.slice(0, 5);
  const installedKeys = React.useMemo(
    () => new Set(installedAgents.map((a) => a.key)),
    [installedAgents],
  );

  React.useEffect(() => {
    if (!detectionReport) return;
    let changed = false;
    const next = { ...agents };
    agentList.forEach((a) => {
      if (!installedKeys.has(a.key) && (next[a.key] ?? 0) > 0) {
        next[a.key] = 0;
        changed = true;
      }
    });
    if (changed) setAgents(next);
  }, [agents, detectionReport, installedKeys, setAgents]);

  // Total assigned to other agents, used to cap per-field +/-.
  function otherTotal(excludeKey?: string): number {
    let sum = 0;
    for (const k of Object.keys(agents)) {
      if (k === excludeKey) continue;
      sum += agents[k as CliAgent] ?? 0;
    }
    return sum;
  }

  function setAgent(key: CliAgent, v: number) {
    const cap = Math.max(0, count - otherTotal(key));
    setAgents({ ...agents, [key]: Math.max(0, Math.min(cap, v)) });
  }

  function setCustomCommand(agent: CliAgent, value: string) {
    setCustom({ customCommands: { ...customCommands, [agent]: value } });
  }

  function capCurrent(): Record<CliAgent, number> {
    // If count ever decreases below total, trim from the bottom-most agents
    // so the user isn't blocked.
    let over = Math.max(0, total - count);
    if (over === 0) return agents;
    const next = { ...agents };
    const keys = [...agentList.map((a) => a.key)].reverse();
    for (const k of keys) {
      if (over === 0) break;
      const v = next[k] ?? 0;
      if (v === 0) continue;
      const take = Math.min(v, over);
      next[k] = v - take;
      over -= take;
    }
    return next;
  }

  // Re-clamp whenever the terminal count drops.
  React.useEffect(() => {
    if (total > count) {
      setAgents(capCurrent());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const enableAll = () => {
    const fillable = installedAgents;
    const perAgent = fillable.length ? Math.floor(count / fillable.length) : 0;
    const rem = fillable.length ? count % fillable.length : 0;
    const next: Record<CliAgent, number> = {} as Record<CliAgent, number>;
    agentList.forEach((a) => {
      next[a.key] = 0;
    });
    fillable.forEach((a, i) => {
      next[a.key] = perAgent + (i < rem ? 1 : 0);
    });
    setAgents(next);
  };
  const oneOfEach = () => {
    const next: Record<CliAgent, number> = {} as Record<CliAgent, number>;
    agentList.forEach((a) => {
      next[a.key] = 0;
    });
    let remaining = count;
    installedAgents.forEach((a) => {
      next[a.key] = remaining > 0 ? 1 : 0;
      remaining -= next[a.key];
    });
    setAgents(next);
  };
  const splitEvenly = enableAll;

  return (
    <>
      <h2 className="wizard-title">Add AI coding agents</h2>
      <p className="wizard-sub">
        Pick which agents should launch in your {count} terminal{count === 1 ? "" : "s"}. You can
        run them alongside your regular terminal — or skip this step entirely.
      </p>

      <div className="agents-count">
        <span className="strong">
          {total} / {count}
        </span>
        <span className={total === 0 ? "text-muted" : "text-dim"}>
          {total === 0 ? "No agents yet" : total === count ? "Full roster" : "Ready"}
        </span>
      </div>

      <div className="quick-actions">
        <span className="quick-actions-label">Quick fill:</span>
        <button className="btn sm" onClick={enableAll}>
          Enable all
        </button>
        <button className="btn sm" onClick={oneOfEach}>
          One of each
        </button>
        <button className="btn sm" onClick={splitEvenly}>
          Split evenly
        </button>
      </div>

      <div className="agents-grid">
        {visible.map((a) => {
          const v = agents[a.key] ?? 0;
          const capReached = otherTotal(a.key) + v >= count;
          const detected = getAgent(a.key);
          const installed = !!detected?.installed;
          return (
            <div
              key={a.key}
              className={
                "agent-card" +
                (v > 0 ? " selected" : "") +
                (!installed ? " missing" : "")
              }
              title={
                installed
                  ? detected?.version
                    ? `${detected.label} · ${detected.version}`
                    : detected?.label
                  : "Not found on PATH"
              }
            >
              <input
                type="checkbox"
                checked={v > 0}
                onChange={(e) => setAgent(a.key, e.target.checked ? 1 : 0)}
                disabled={(!v && capReached) || !installed}
              />
              <span className="agent-card-name">
                {a.label}
                {installed ? (
                  <span className="pill green" style={{ marginLeft: 8 }}>
                    installed
                  </span>
                ) : (
                  <span className="pill" style={{ marginLeft: 8 }}>
                    not found
                  </span>
                )}
              </span>
              <Counter
                value={v}
                max={v + Math.max(0, count - otherTotal(a.key) - v)}
                disabled={!installed}
                onChange={(n: number) => setAgent(a.key, n)}
              />
            </div>
          );
        })}
      </div>

      {agentList.length > 5 && (
        <div
          className="wizard-show-more"
          onClick={() => setShowMore((s) => !s)}
          style={{ marginTop: 12 }}
        >
          {showMore ? "Show fewer" : "Show " + (agentList.length - 5) + " more agents"}
        </div>
      )}

      <div className={"custom-command" + (customEnabled ? " selected" : "")}>
        <div className="custom-command-header">
          <input
            type="checkbox"
            checked={customEnabled}
            onChange={(e) => setCustom({ customEnabled: e.target.checked })}
          />
          <span className="custom-command-title">Custom args per selected CLI</span>
          <span className="pill" style={{ marginRight: 6 }}>
            {selectedAgents(agents).length} selected
          </span>
        </div>
        <div className="text-muted" style={{ fontSize: 11, marginBottom: 8 }}>
          Add args for the selected CLI. Empty fields use the default command.
        </div>
        {customEnabled && selectedAgents(agents).length > 0 ? (
          <div className="custom-command-list">
            {selectedAgents(agents).map((agent) => (
              <label key={agent} className="custom-command-row">
                <span>
                  {agent}
                  <small>{defaultAgentCommand(agent)}</small>
                </span>
                <input
                  className="input"
                  placeholder={`e.g. --yolo or ${defaultAgentCommand(agent)} --flag`}
                  value={customCommands[agent] ?? ""}
                  onChange={(e) => setCustomCommand(agent, e.target.value)}
                />
              </label>
            ))}
          </div>
        ) : customEnabled ? (
          <div className="text-muted" style={{ fontSize: 12 }}>
            Select a CLI agent above, then set its command here.
          </div>
        ) : null}
      </div>
    </>
  );
}

function Counter({
  value,
  onChange,
  max,
  disabled = false,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  disabled?: boolean;
}) {
  const atMax = typeof max === "number" && value >= max;
  return (
    <div className="agent-card-count">
      <button
        className="icon-btn"
        style={{ width: 18, height: 18 }}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 0}
      >
        −
      </button>
      <span style={{ minWidth: 14, textAlign: "center" }}>{value}</span>
      <button
        className="icon-btn"
        style={{ width: 18, height: 18 }}
        onClick={() => onChange(value + 1)}
        disabled={disabled || atMax}
      >
        +
      </button>
    </div>
  );
}
