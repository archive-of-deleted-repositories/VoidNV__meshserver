import { create } from "zustand";
import { detectTools, type DetectionReport, type DetectedTool } from "../lib/tauri";

type DetectionState = {
  report: DetectionReport | null;
  loading: boolean;
  lastScan: number;
  scan: () => Promise<void>;

  getAgent: (key: string) => DetectedTool | undefined;
  getShell: (key: string) => DetectedTool | undefined;
};

// Map of frontend agent identifiers -> backend detection keys.
export const agentKeyMap: Record<string, string> = {
  Claude: "claude",
  Codex: "codex",
  Gemini: "gemini",
  OpenCode: "opencode",
  Cursor: "cursor",
  Kiro: "kiro",
  Droid: "droid",
};

export const shellKeyMap: Record<string, string[]> = {
  // A Mesh `ShellKind` may map to more than one concrete executable. The first
  // one that is installed wins.
  PS: ["pwsh", "powershell"],
  CMD: ["cmd"],
  BASH: ["bash"],
  ZSH: ["zsh"],
};

export const useDetection = create<DetectionState>((set, get) => ({
  report: null,
  loading: false,
  lastScan: 0,
  scan: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const report = await detectTools();
      set({ report: { ...report, tunnels: report.tunnels ?? [] }, lastScan: Date.now() });
    } catch {
      /* noop */
    } finally {
      set({ loading: false });
    }
  },
  getAgent: (uiKey) => {
    const r = get().report;
    if (!r) return undefined;
    const backendKey = agentKeyMap[uiKey] ?? uiKey.toLowerCase();
    return r.agents.find((a) => a.key === backendKey);
  },
  getShell: (shellKind) => {
    const r = get().report;
    if (!r) return undefined;
    const candidates = shellKeyMap[shellKind] ?? [shellKind.toLowerCase()];
    for (const c of candidates) {
      const found = r.shells.find((s) => s.key === c && s.installed);
      if (found) return found;
    }
    // fall back to the first entry even if not installed so callers can show it
    for (const c of candidates) {
      const found = r.shells.find((s) => s.key === c);
      if (found) return found;
    }
    return undefined;
  },
}));
