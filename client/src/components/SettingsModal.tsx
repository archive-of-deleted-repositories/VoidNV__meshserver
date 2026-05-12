import React from "react";
import {
  Info,
  FolderSearch,
  Keyboard,
  Monitor,
  Palette,
  SlidersHorizontal,
  TerminalSquare,
  X,
} from "lucide-react";
import { useApp, type PanelLayout } from "../state/store";
import {
  type Density,
  type FontScale,
  type ThemeId,
  themes,
  useTheme,
} from "../state/theme";
import { useDetection } from "../state/detection";
import { RefreshCw } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { isTauri, skillsDefaultDir } from "../lib/tauri";

type Tab = "appearance" | "terminal" | "behavior" | "shortcuts" | "about";

export function SettingsModal() {
  const open = useApp((s) => s.settingsOpen);
  const toggle = useApp((s) => s.toggleSettings);
  const [tab, setTab] = React.useState<Tab>("appearance");

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={() => toggle(false)}>
      <div className="modal xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <SlidersHorizontal size={16} color="var(--text-dim)" />
          <span className="modal-title">Settings</span>
          <button className="icon-btn" onClick={() => toggle(false)}>
            <X size={14} />
          </button>
        </div>
        <div className="modal-body">
          <div className="settings-nav">
            <NavItem
              active={tab === "appearance"}
              label="Appearance"
              icon={<Palette size={14} />}
              onClick={() => setTab("appearance")}
            />
            <NavItem
              active={tab === "terminal"}
              label="Terminal"
              icon={<TerminalSquare size={14} />}
              onClick={() => setTab("terminal")}
            />
            <NavItem
              active={tab === "behavior"}
              label="Behavior"
              icon={<Monitor size={14} />}
              onClick={() => setTab("behavior")}
            />
            <NavItem
              active={tab === "shortcuts"}
              label="Shortcuts"
              icon={<Keyboard size={14} />}
              onClick={() => setTab("shortcuts")}
            />
            <NavItem
              active={tab === "about"}
              label="About"
              icon={<Info size={14} />}
              onClick={() => setTab("about")}
            />
          </div>
          <div className="settings-content">
            {tab === "appearance" && <AppearanceTab />}
            {tab === "terminal" && <TerminalTab />}
            {tab === "behavior" && <BehaviorTab />}
            {tab === "shortcuts" && <ShortcutsTab />}
            {tab === "about" && <AboutTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function AppearanceTab() {
  const panelLayout = useApp((s) => s.panelLayout);
  const setPanelLayout = useApp((s) => s.setPanelLayout);
  const themeId = useTheme((s) => s.themeId);
  const setTheme = useTheme((s) => s.setTheme);
  const density = useTheme((s) => s.density);
  const setDensity = useTheme((s) => s.setDensity);
  const fontScale = useTheme((s) => s.fontScale);
  const setFontScale = useTheme((s) => s.setFontScale);

  return (
    <>
      <div className="settings-section">
        <div className="settings-title">Layout</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Side panel position</div>
            <div className="settings-row-sub">
              Choose whether tools sit left or right of the terminals.
            </div>
          </div>
          <Segmented
            value={panelLayout}
            options={[
              { v: "navigator-left", label: "Tools left" },
              { v: "navigator-right", label: "Tools right" },
            ]}
            onChange={(v) => setPanelLayout(v as PanelLayout)}
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Theme</div>
        <div className="theme-grid">
          {themes.map((t) => (
            <button
              key={t.id}
              className={"theme-card" + (themeId === t.id ? " active" : "")}
              onClick={() => setTheme(t.id as ThemeId)}
            >
              <div className="theme-swatch">
                <span style={{ background: t.vars.bg }} />
                <span style={{ background: t.vars.bgElev }} />
                <span style={{ background: t.vars.bgElev2 }} />
                <span style={{ background: t.vars.accent }} />
                <span style={{ background: t.vars.accent2 }} />
                <span style={{ background: t.vars.purple }} />
              </div>
              <div className="theme-card-name">
                <span>{t.name}</span>
                <span className="theme-card-mode">{t.mode}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Density</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">UI density</div>
            <div className="settings-row-sub">
              How much air to leave around menus, tabs, and lists.
            </div>
          </div>
          <Segmented
            value={density}
            options={[
              { v: "compact", label: "Compact" },
              { v: "comfortable", label: "Comfortable" },
              { v: "cozy", label: "Cozy" },
            ]}
            onChange={(v) => setDensity(v as Density)}
          />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Typography</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Interface font size</div>
            <div className="settings-row-sub">Applies everywhere except the terminal.</div>
          </div>
          <Segmented
            value={fontScale}
            options={[
              { v: "sm", label: "Small" },
              { v: "md", label: "Medium" },
              { v: "lg", label: "Large" },
            ]}
            onChange={(v) => setFontScale(v as FontScale)}
          />
        </div>
      </div>
    </>
  );
}

function TerminalTab() {
  const terminalFontSize = useTheme((s) => s.terminalFontSize);
  const setTerminalFontSize = useTheme((s) => s.setTerminalFontSize);
  const defaultShell = useTheme((s) => s.defaultShell);
  const setDefaultShell = useTheme((s) => s.setDefaultShell);
  const report = useDetection((s) => s.report);
  const scan = useDetection((s) => s.scan);
  const loading = useDetection((s) => s.loading);

  const isWin = typeof navigator !== "undefined" && /win/i.test(navigator.platform);
  const shellOptions: { v: typeof defaultShell; label: string; detect?: string[] }[] = isWin
    ? [
        { v: "auto", label: "Auto" },
        { v: "PS", label: "PowerShell", detect: ["pwsh", "powershell"] },
        { v: "CMD", label: "cmd.exe", detect: ["cmd"] },
        { v: "BASH", label: "bash", detect: ["bash"] },
      ]
    : [
        { v: "auto", label: "Auto" },
        { v: "BASH", label: "bash", detect: ["bash"] },
        { v: "ZSH", label: "zsh", detect: ["zsh"] },
      ];

  function shellInstalled(detect: string[] | undefined) {
    if (!detect) return true;
    if (!report) return true;
    return detect.some((k) => report.shells.some((s) => s.key === k && s.installed));
  }

  return (
    <>
      <div className="settings-section">
        <div className="settings-title">Terminal</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Font size</div>
            <div className="settings-row-sub">
              Affects new terminals. Existing ones apply on restart.
            </div>
          </div>
          <div className="stepper">
            <button onClick={() => setTerminalFontSize(terminalFontSize - 1)}>−</button>
            <input
              value={terminalFontSize}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n)) setTerminalFontSize(n);
              }}
            />
            <button onClick={() => setTerminalFontSize(terminalFontSize + 1)}>+</button>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-row-label">Default shell</div>
            <div className="settings-row-sub">
              Auto prefers whichever is installed. Unavailable shells are greyed out.
            </div>
          </div>
          <div className="segmented">
            {shellOptions.map((o) => {
              const installed = shellInstalled(o.detect);
              return (
                <button
                  key={o.v}
                  className={defaultShell === o.v ? "active" : ""}
                  onClick={() => installed && setDefaultShell(o.v)}
                  disabled={!installed}
                  title={installed ? undefined : "Not found on PATH"}
                  style={!installed ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Detected tools</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Scan PATH for agents and shells</div>
            <div className="settings-row-sub">
              {report
                ? `${report.agents.filter((a) => a.installed).length} agent${report.agents.filter((a) => a.installed).length === 1 ? "" : "s"}, ${report.shells.filter((s) => s.installed).length} shell${report.shells.filter((s) => s.installed).length === 1 ? "" : "s"}, ${(report.tunnels ?? []).filter((t) => t.installed).length} tunnel${(report.tunnels ?? []).filter((t) => t.installed).length === 1 ? "" : "s"} found.`
                : "Running the first scan…"}
            </div>
          </div>
          <button className="btn sm" onClick={() => scan()} disabled={loading}>
            <RefreshCw size={12} /> Rescan
          </button>
        </div>

        {report && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            {[...report.agents, ...report.shells, ...(report.tunnels ?? [])].map((t) => (
              <div key={t.kind + ":" + t.key} className="detect-row">
                <span
                  className="detect-dot"
                  style={{ background: t.installed ? "var(--accent)" : "var(--border)" }}
                />
                <span className="detect-label">{t.label}</span>
                <span className="detect-kind">{t.kind}</span>
                <span className="detect-path">
                  {t.installed ? t.version ?? t.path ?? "" : "not found"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-title">Agent launch</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Clear terminal before CLI agent</div>
            <div className="settings-row-sub">
              Runs <code>cls</code>/<code>clear</code> so you don't see the shell banner.
            </div>
          </div>
          <span className="pill green">On</span>
        </div>
      </div>
    </>
  );
}

function BehaviorTab() {
  const skillLibraryDir = useApp((s) => s.skillLibraryDir);
  const setSkillLibraryDir = useApp((s) => s.setSkillLibraryDir);
  const panelLayout = useApp((s) => s.panelLayout);
  const setPanelLayout = useApp((s) => s.setPanelLayout);
  const [defaultDir, setDefaultDir] = React.useState("");

  React.useEffect(() => {
    skillsDefaultDir().then(setDefaultDir).catch(() => {});
  }, []);

  async function pickSkillFolder() {
    if (!isTauri()) return;
    try {
      const picked = await openDialog({ directory: true, multiple: false });
      if (typeof picked === "string") setSkillLibraryDir(picked);
    } catch {
      /* noop */
    }
  }

  return (
    <>
      <div className="settings-section">
        <div className="settings-title">Workspaces</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Side panel layout</div>
            <div className="settings-row-sub">
              Switches the workspace list and tool panel instantly.
            </div>
          </div>
          <Segmented
            value={panelLayout}
            options={[
              { v: "navigator-left", label: "Tools left" },
              { v: "navigator-right", label: "Tools right" },
            ]}
            onChange={(v) => setPanelLayout(v as PanelLayout)}
          />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Remember recent folders</div>
            <div className="settings-row-sub">
              Recent workspaces show up in the Space wizard.
            </div>
          </div>
          <span className="pill green">On</span>
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-title">Skills</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">User skill folder</div>
            <div className="settings-row-sub">
              New and edited skills are saved as Markdown files here.
            </div>
            <div className="settings-path">{skillLibraryDir || defaultDir || "Default Mesh skills folder"}</div>
          </div>
          <button className="btn sm" onClick={pickSkillFolder} disabled={!isTauri()}>
            <FolderSearch size={12} /> Choose folder
          </button>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Import behavior</div>
            <div className="settings-row-sub">
              Already-imported skills need two clicks to replace.
            </div>
          </div>
          <span className="pill">Safe</span>
        </div>
      </div>
    </>
  );
}

function ShortcutsTab() {
  const rows: [string, string][] = [
    ["New Orbit", "Ctrl+T"],
    ["New Hive (soon)", "—"],
    ["New terminal", "Ctrl+N"],
    ["Navigate: Terminal", "Ctrl+1"],
    ["Navigate: Skills", "Ctrl+K"],
    ["Open settings", "Ctrl+,"],
    ["Toggle fullscreen", "F11"],
  ];
  return (
    <>
      <div className="settings-section">
        <div className="settings-title">Keyboard</div>
        {rows.map(([label, keys]) => (
          <div key={label} className="settings-row">
            <div className="settings-row-label">{label}</div>
            <kbd>{keys}</kbd>
          </div>
        ))}
      </div>
    </>
  );
}

function AboutTab() {
  return (
    <>
      <div className="settings-section">
        <div className="settings-title">Mesh</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Version</div>
            <div className="settings-row-sub">Mesh 0.1.0 · Tauri + React</div>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Runtime</div>
            <div className="settings-row-sub">
              Native PTY backend via portable-pty. Terminals are real processes.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.v}
          className={value === o.v ? "active" : ""}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
