import { create } from "zustand";
import { uid } from "../lib/ids";
import { deleteServerWorkspace, loadServerWorkspaces, saveServerWorkspace } from "../lib/serverState";
import { ptyKill } from "../lib/tauri";
import { useTheme } from "./theme";
import { useDetection } from "./detection";

export type NavView = "terminal" | "editor" | "browser" | "board" | "memory" | "skills";

export type Screen = "welcome" | "orbit" | "hive" | "workspace";
export type PanelLayout = "navigator-left" | "navigator-right";

export type ShellKind = "PS" | "CMD" | "BASH" | "ZSH";

export type TermAgent =
  | "none"
  | "Claude"
  | "Codex"
  | "Gemini"
  | "OpenCode"
  | "Cursor"
  | "Kiro"
  | "Droid"
  | "custom";

export type CliAgent = Exclude<TermAgent, "none" | "custom">;

export type Terminal = {
  id: string;
  title: string;
  agent: TermAgent;
  customCommand?: string;
  shell: ShellKind;
  cwd: string;
  createdAt: number;
};

export type BrowserTab = {
  id: string;
  url: string;
  title: string;
};

export type WorkspaceMode = "orbit" | "hive";

export type SwarmConfig = {
  preset: 5 | 10 | 15 | 20 | null;
  launchMode: "SAFE" | "SKIP";
  agentForAll: CliAgent;
  coordinators: number;
  builders: number;
  mission: string;
  contextFiles: string[];
  name: string;
  enabledSwarmSkills: string[];
};

export type HiveConfig = SwarmConfig;

export type Workspace = {
  id: string;
  name: string;
  color: string;
  cwd: string;
  mode: WorkspaceMode;
  terminals: Terminal[];
  activeTerminalId?: string;
  view: NavView;
  browserTabs: BrowserTab[];
  activeBrowserTabId?: string;
  swarm?: SwarmConfig;
  createdAt: number;
};

export type RecentWorkspace = {
  name: string;
  path: string;
  lastOpenedAt: number;
};

export type SkillBadge =
  | "SECURITY"
  | "GROWTH"
  | "WORKFLOW"
  | "MEMORY"
  | "QUALITY"
  | "GENERAL";

export type Skill = {
  id: string;
  name: string;
  description: string;
  category: string; // e.g. "MESH", "WORKFLOW", "QUALITY"
  badge: SkillBadge;
  body: string; // the prompt/markdown text
  source: "builtin" | "user" | "imported";
  origin?: string; // e.g. ".claude/skills/foo", "mesh"
  iconKey?: string;
  createdAt: number;
};

export type WizardState = {
  workspaceId?: string;
  mode: WorkspaceMode;
  // Space wizard
  step: 1 | 2 | 3 | 4 | 5;
  folder: string;
  terminalCount: number;
  agents: Record<CliAgent, number>;
  customCommands: Record<CliAgent, string>;
  customEnabled: boolean;
  // Swarm wizard
  swarmPreset: 5 | 10 | 15 | 20 | null;
  launchMode: "SAFE" | "SKIP";
  agentForAll: CliAgent;
  coordinators: number;
  builders: number;
  mission: string;
  contextFiles: string[];
  name: string;
  enabledSwarmSkills: string[];
};

type AppState = {
  screen: Screen;
  workspaces: Workspace[];
  activeWorkspaceId?: string;
  recentWorkspaces: RecentWorkspace[];
  wizardState: WizardState;
  settingsOpen: boolean;
  quickNavOpen: boolean;
  sidebarCollapsed: boolean;
  navigatorCollapsed: boolean;
  panelLayout: PanelLayout;
  skills: Skill[];
  skillLibraryDir?: string;
  skillEditor: { open: boolean; skillId?: string };

  setScreen: (s: Screen) => void;
  hydrateServerWorkspaces: () => Promise<void>;
  newOrbitWorkspace: () => void;
  newHiveWorkspace: () => void;
  removeWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string) => void;
  setView: (view: NavView) => void;

  setWizard: (patch: Partial<WizardState>) => void;
  commitOrbitWizard: () => void;
  commitHiveWizard: () => void;

  addTerminal: (opts?: Partial<Terminal>) => void;
  closeTerminal: (termId: string) => void;
  renameTerminal: (termId: string, title: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  setActiveTerminal: (termId: string) => void;

  newBrowserTab: (url?: string) => void;
  closeBrowserTab: (tabId: string) => void;
  setActiveBrowserTab: (tabId: string) => void;
  setBrowserUrl: (tabId: string, url: string) => void;

  toggleSettings: (open?: boolean) => void;
  toggleQuickNav: (open?: boolean) => void;
  toggleSidebar: (collapsed?: boolean) => void;
  toggleNavigator: (collapsed?: boolean) => void;
  setPanelLayout: (layout: PanelLayout) => void;

  // Skills
  addSkill: (s: Omit<Skill, "id" | "createdAt">) => Skill;
  updateSkill: (id: string, patch: Partial<Skill>) => void;
  removeSkill: (id: string) => void;
  importSkills: (imports: Omit<Skill, "id" | "createdAt">[]) => number;
  setSkillLibraryDir: (dir: string) => void;
  openSkillEditor: (skillId?: string) => void;
  closeSkillEditor: () => void;
};

const wsColors = ["#4ade80", "#a78bfa", "#60a5fa", "#f472b6", "#fbbf24", "#fb7185"];
const pickColor = (i: number) => wsColors[i % wsColors.length];

const defaultAgents = {
  Claude: 0,
  Codex: 0,
  Gemini: 0,
  OpenCode: 0,
  Cursor: 0,
  Kiro: 0,
  Droid: 0,
} as Record<CliAgent, number>;

const defaultCustomCommands = {
  Claude: "",
  Codex: "",
  Gemini: "",
  OpenCode: "",
  Cursor: "",
  Kiro: "",
  Droid: "",
} as Record<CliAgent, string>;

function defaultShell(): ShellKind {
  try {
    const pref = useTheme.getState().defaultShell;
    if (pref && pref !== "auto") return pref;
  } catch {
    /* noop */
  }
  // Prefer what's actually installed on this machine.
  try {
    const det = useDetection.getState().report;
    if (det) {
      const installed = new Set(det.shells.filter((s) => s.installed).map((s) => s.key));
      if (typeof navigator !== "undefined" && /win/i.test(navigator.platform)) {
        if (installed.has("pwsh") || installed.has("powershell")) return "PS";
        if (installed.has("bash")) return "BASH";
        if (installed.has("cmd")) return "CMD";
      } else {
        if (installed.has("zsh")) return "ZSH";
        if (installed.has("bash")) return "BASH";
      }
    }
  } catch {
    /* noop */
  }
  if (typeof navigator !== "undefined" && /win/i.test(navigator.platform)) return "PS";
  return "BASH";
}

function defaultTerminal(cwd: string): Terminal {
  return {
    id: uid(),
    title: "Terminal",
    agent: "none",
    shell: defaultShell(),
    cwd,
    createdAt: Date.now(),
  };
}

function resetWizard(partial: Partial<WizardState> = {}): WizardState {
  return {
    mode: "orbit",
    step: 1,
    folder: "",
    terminalCount: 1,
    agents: { ...defaultAgents },
    customCommands: { ...defaultCustomCommands },
    customEnabled: false,
    swarmPreset: 5,
    launchMode: "SAFE",
    agentForAll: "Claude",
    coordinators: 1,
    builders: 2,
    mission: "",
    contextFiles: [],
    name: "Hive 1",
    enabledSwarmSkills: [],
    ...partial,
  };
}

// ---- persistence helpers ----
const STORAGE_KEY = "mesh.state.v1";
function loadPersisted(): {
  skills?: Skill[];
  recents?: RecentWorkspace[];
  skillLibraryDir?: string;
  panelLayout?: PanelLayout;
  sidebarCollapsed?: boolean;
  navigatorCollapsed?: boolean;
} {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
function persist(state: AppState) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        skills: state.skills,
        recents: state.recentWorkspaces,
        skillLibraryDir: state.skillLibraryDir,
        panelLayout: state.panelLayout,
        sidebarCollapsed: state.sidebarCollapsed,
        navigatorCollapsed: state.navigatorCollapsed,
      }),
    );
  } catch {
    /* noop */
  }
}

const persisted = loadPersisted();

export const useApp = create<AppState>((set, get) => ({
  screen: "welcome",
  workspaces: [],
  activeWorkspaceId: undefined,
  recentWorkspaces: persisted.recents ?? [],
  wizardState: resetWizard(),
  settingsOpen: false,
  quickNavOpen: false,
  sidebarCollapsed: persisted.sidebarCollapsed ?? false,
  navigatorCollapsed: persisted.navigatorCollapsed ?? false,
  panelLayout: persisted.panelLayout ?? "navigator-right",
  skills: persisted.skills ?? [],
  skillLibraryDir: persisted.skillLibraryDir,
  skillEditor: { open: false },

  setScreen: (s) => set({ screen: s }),

  hydrateServerWorkspaces: async () => {
    const remote = await loadServerWorkspaces().catch(() => []);
    if (!remote.length || get().workspaces.length) return;
    set({
      workspaces: remote,
      activeWorkspaceId: remote[0]?.id,
      screen: remote[0]?.cwd ? "workspace" : "welcome",
    });
  },

  newOrbitWorkspace: () => {
    const ws: Workspace = {
      id: uid(),
      name: `Orbit ${get().workspaces.length + 1}`,
      color: pickColor(get().workspaces.length),
      cwd: "",
      mode: "orbit",
      terminals: [],
      view: "terminal",
      browserTabs: [],
      createdAt: Date.now(),
    };
    set({
      workspaces: [...get().workspaces, ws],
      activeWorkspaceId: ws.id,
      wizardState: resetWizard({ workspaceId: ws.id, mode: "orbit", step: 1 }),
      screen: "orbit",
    });
  },

  newHiveWorkspace: () => {
    const ws: Workspace = {
      id: uid(),
      name: `Hive ${get().workspaces.length + 1}`,
      color: pickColor(get().workspaces.length),
      cwd: "",
      mode: "hive",
      terminals: [],
      view: "terminal",
      browserTabs: [],
      createdAt: Date.now(),
    };
    set({
      workspaces: [...get().workspaces, ws],
      activeWorkspaceId: ws.id,
      wizardState: resetWizard({
        workspaceId: ws.id,
        mode: "hive",
        step: 1,
        swarmPreset: 5,
        coordinators: 1,
        builders: 2,
        agentForAll: "Claude",
      }),
      screen: "hive",
    });
  },

  removeWorkspace: (id) => {
    const ws = get().workspaces.filter((w) => w.id !== id);
    const nextActive = ws.length ? ws[ws.length - 1].id : undefined;
    set({
      workspaces: ws,
      activeWorkspaceId: nextActive,
      screen: ws.length ? get().screen : "welcome",
    });
    deleteServerWorkspace(id).catch(() => {});
  },

  setActiveWorkspace: (id) => {
    const w = get().workspaces.find((x) => x.id === id);
    if (!w) return;
    if (!w.cwd) {
      set({
        activeWorkspaceId: id,
        screen: w.mode === "hive" ? "hive" : "orbit",
        wizardState: { ...get().wizardState, workspaceId: id, mode: w.mode },
      });
    } else {
      set({ activeWorkspaceId: id, screen: "workspace" });
    }
  },

  setView: (view) => {
    const id = get().activeWorkspaceId;
    if (!id) return;
    set({
      workspaces: get().workspaces.map((w) => (w.id === id ? { ...w, view } : w)),
    });
  },

  setWizard: (patch) => set({ wizardState: { ...get().wizardState, ...patch } }),

  commitOrbitWizard: () => {
    const { wizardState, workspaces } = get();
    const id = wizardState.workspaceId;
    if (!id) return;
    const ws = workspaces.find((w) => w.id === id);
    if (!ws) return;
    const terms: Terminal[] = [];

    const agentAssignments: CliAgent[] = [];
    (Object.keys(wizardState.agents) as CliAgent[]).forEach((a) => {
      const count = wizardState.agents[a] || 0;
      for (let i = 0; i < count; i++) agentAssignments.push(a);
    });

    for (let i = 0; i < Math.max(1, wizardState.terminalCount); i++) {
      const t = defaultTerminal(wizardState.folder);
      if (i < agentAssignments.length) {
        const agent = agentAssignments[i];
        t.title = agent;
        t.agent = agent;
        const customCommand = wizardState.customCommands[agent]?.trim();
        if (wizardState.customEnabled && customCommand) {
          t.customCommand = customCommand;
          t.title = `${agent} custom`;
        }
      }
      terms.push(t);
    }

    const updated: Workspace = {
      ...ws,
      cwd: wizardState.folder,
      terminals: terms,
      activeTerminalId: terms[0]?.id,
      name: ws.name,
      mode: "orbit",
    };

    const folderName =
      wizardState.folder.split(/[\\/]/).filter(Boolean).pop() || wizardState.folder;

    const recents = get()
      .recentWorkspaces.filter((r) => r.path !== wizardState.folder)
      .slice(0, 9);
    if (wizardState.folder) {
      recents.unshift({
        name: folderName,
        path: wizardState.folder,
        lastOpenedAt: Date.now(),
      });
    }

    const next: AppState = {
      ...get(),
      workspaces: workspaces.map((w) => (w.id === id ? updated : w)),
      activeWorkspaceId: id,
      screen: "workspace",
      recentWorkspaces: recents,
    };
    persist(next);
    set(next);
    saveServerWorkspace(updated).catch(() => {});
  },

  commitHiveWizard: () => {
    const { wizardState, workspaces } = get();
    const id = wizardState.workspaceId;
    if (!id) return;
    const ws = workspaces.find((w) => w.id === id);
    if (!ws) return;

    const total = (wizardState.coordinators || 0) + (wizardState.builders || 0);
    const terms: Terminal[] = [];
    for (let i = 0; i < Math.max(1, total); i++) {
      const isCoord = i < wizardState.coordinators;
      const t = defaultTerminal(wizardState.folder);
      t.agent = wizardState.agentForAll as TermAgent;
      t.title = isCoord ? "Coordinator" : "Builder";
      const customCommand = wizardState.customCommands[wizardState.agentForAll]?.trim();
      if (wizardState.customEnabled && customCommand) t.customCommand = customCommand;
      terms.push(t);
    }

    const name = wizardState.name || ws.name;

    const updated: Workspace = {
      ...ws,
      cwd: wizardState.folder,
      name,
      mode: "hive",
      terminals: terms,
      activeTerminalId: terms[0]?.id,
      swarm: {
        preset: wizardState.swarmPreset,
        launchMode: wizardState.launchMode,
        agentForAll: wizardState.agentForAll,
        coordinators: wizardState.coordinators,
        builders: wizardState.builders,
        mission: wizardState.mission,
        contextFiles: wizardState.contextFiles,
        name,
        enabledSwarmSkills: wizardState.enabledSwarmSkills,
      },
    };

    const folderName =
      wizardState.folder.split(/[\\/]/).filter(Boolean).pop() || wizardState.folder;
    const recents = get()
      .recentWorkspaces.filter((r) => r.path !== wizardState.folder)
      .slice(0, 9);
    if (wizardState.folder) {
      recents.unshift({
        name: folderName,
        path: wizardState.folder,
        lastOpenedAt: Date.now(),
      });
    }

    const next: AppState = {
      ...get(),
      workspaces: workspaces.map((w) => (w.id === id ? updated : w)),
      activeWorkspaceId: id,
      screen: "workspace",
      recentWorkspaces: recents,
    };
    persist(next);
    set(next);
    saveServerWorkspace(updated).catch(() => {});
  },

  addTerminal: (opts) => {
    const id = get().activeWorkspaceId;
    if (!id) return;
    const nextWorkspaces = get().workspaces.map((w) => {
        if (w.id !== id) return w;
        const t = { ...defaultTerminal(w.cwd), ...opts, id: uid() };
        return { ...w, terminals: [...w.terminals, t], activeTerminalId: t.id };
      });
    set({ workspaces: nextWorkspaces });
    const ws = nextWorkspaces.find((w) => w.id === id);
    if (ws) saveServerWorkspace(ws).catch(() => {});
  },

  closeTerminal: (termId) => {
    const id = get().activeWorkspaceId;
    if (!id) return;
    ptyKill(termId).catch(() => {});
    const nextWorkspaces = get().workspaces.map((w) => {
        if (w.id !== id) return w;
        const next = w.terminals.filter((t) => t.id !== termId);
        const active =
          w.activeTerminalId === termId ? next[next.length - 1]?.id : w.activeTerminalId;
        return { ...w, terminals: next, activeTerminalId: active };
      });
    set({ workspaces: nextWorkspaces });
    const ws = nextWorkspaces.find((w) => w.id === id);
    if (ws) saveServerWorkspace(ws).catch(() => {});
  },

  renameTerminal: (termId, title) => {
    const id = get().activeWorkspaceId;
    if (!id) return;
    const nextWorkspaces = get().workspaces.map((w) => {
        if (w.id !== id) return w;
        return {
          ...w,
          terminals: w.terminals.map((t) => (t.id === termId ? { ...t, title } : t)),
        };
      });
    set({ workspaces: nextWorkspaces });
    const ws = nextWorkspaces.find((w) => w.id === id);
    if (ws) saveServerWorkspace(ws).catch(() => {});
  },

  renameWorkspace: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const nextWorkspaces = get().workspaces.map((w) =>
      w.id === id ? { ...w, name: trimmed } : w,
    );
    set({ workspaces: nextWorkspaces });
    const ws = nextWorkspaces.find((w) => w.id === id);
    if (ws) saveServerWorkspace(ws).catch(() => {});
  },

  setActiveTerminal: (termId) => {
    const id = get().activeWorkspaceId;
    if (!id) return;
    set({
      workspaces: get().workspaces.map((w) =>
        w.id === id ? { ...w, activeTerminalId: termId } : w,
      ),
    });
  },

  newBrowserTab: (url) => {
    const id = get().activeWorkspaceId;
    if (!id) return;
    set({
      workspaces: get().workspaces.map((w) => {
        if (w.id !== id) return w;
        const tab: BrowserTab = {
          id: uid(),
          url: url ?? "",
          title: url || "New tab",
        };
        return {
          ...w,
          browserTabs: [...w.browserTabs, tab],
          activeBrowserTabId: tab.id,
        };
      }),
    });
  },

  closeBrowserTab: (tabId) => {
    const id = get().activeWorkspaceId;
    if (!id) return;
    set({
      workspaces: get().workspaces.map((w) => {
        if (w.id !== id) return w;
        const tabs = w.browserTabs.filter((t) => t.id !== tabId);
        return {
          ...w,
          browserTabs: tabs,
          activeBrowserTabId:
            w.activeBrowserTabId === tabId
              ? tabs[tabs.length - 1]?.id
              : w.activeBrowserTabId,
        };
      }),
    });
  },

  setActiveBrowserTab: (tabId) => {
    const id = get().activeWorkspaceId;
    if (!id) return;
    set({
      workspaces: get().workspaces.map((w) =>
        w.id === id ? { ...w, activeBrowserTabId: tabId } : w,
      ),
    });
  },

  setBrowserUrl: (tabId, url) => {
    const id = get().activeWorkspaceId;
    if (!id) return;
    set({
      workspaces: get().workspaces.map((w) => {
        if (w.id !== id) return w;
        return {
          ...w,
          browserTabs: w.browserTabs.map((t) =>
            t.id === tabId ? { ...t, url, title: url } : t,
          ),
        };
      }),
    });
  },

  toggleSettings: (open) =>
    set({ settingsOpen: open !== undefined ? open : !get().settingsOpen }),

  toggleQuickNav: (open) =>
    set({ quickNavOpen: open !== undefined ? open : !get().quickNavOpen }),

  toggleSidebar: (collapsed) => {
    const next = {
      ...get(),
      sidebarCollapsed: collapsed !== undefined ? collapsed : !get().sidebarCollapsed,
    };
    persist(next);
    set({ sidebarCollapsed: next.sidebarCollapsed });
  },

  toggleNavigator: (collapsed) => {
    const next = {
      ...get(),
      navigatorCollapsed: collapsed !== undefined ? collapsed : !get().navigatorCollapsed,
    };
    persist(next);
    set({ navigatorCollapsed: next.navigatorCollapsed });
  },

  setPanelLayout: (layout) => {
    const next = { ...get(), panelLayout: layout };
    persist(next);
    set({ panelLayout: layout });
  },

  addSkill: (s) => {
    const skill: Skill = { ...s, id: uid(), createdAt: Date.now() };
    const next = { ...get(), skills: [skill, ...get().skills] };
    persist(next);
    set(next);
    return skill;
  },

  updateSkill: (id, patch) => {
    const next = {
      ...get(),
      skills: get().skills.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    };
    persist(next);
    set(next);
  },

  removeSkill: (id) => {
    const next = { ...get(), skills: get().skills.filter((s) => s.id !== id) };
    persist(next);
    set(next);
  },

  importSkills: (imports) => {
    const existing = new Set(get().skills.map((s) => s.name + "::" + (s.origin ?? "")));
    const fresh = imports
      .filter((i) => !existing.has(i.name + "::" + (i.origin ?? "")))
      .map((s) => ({ ...s, id: uid(), createdAt: Date.now() }));
    const next = { ...get(), skills: [...fresh, ...get().skills] };
    persist(next);
    set(next);
    return fresh.length;
  },

  setSkillLibraryDir: (dir) => {
    const next = { ...get(), skillLibraryDir: dir };
    persist(next);
    set({ skillLibraryDir: dir });
  },

  openSkillEditor: (skillId) => set({ skillEditor: { open: true, skillId } }),
  closeSkillEditor: () => set({ skillEditor: { open: false } }),
}));

export function activeWorkspace(state: AppState): Workspace | undefined {
  return state.workspaces.find((w) => w.id === state.activeWorkspaceId);
}
