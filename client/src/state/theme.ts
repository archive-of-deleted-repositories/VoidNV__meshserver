import { create } from "zustand";

export type ThemeId =
  | "mesh-matte"
  | "bridge-dark"
  | "midnight"
  | "nord"
  | "dracula"
  | "tokyo-night"
  | "gruvbox"
  | "rose-pine"
  | "solarized-dark"
  | "catppuccin-mocha"
  | "light";

export type ThemeVars = {
  bg: string;
  bgElev: string;
  bgElev2: string;
  bgPanel: string;
  bgHover: string;
  border: string;
  borderSoft: string;
  text: string;
  textDim: string;
  textMuted: string;
  accent: string;
  accent2: string;
  purple: string;
  blue: string;
  yellow: string;
  red: string;
  green: string;
};

export type ThemeDef = {
  id: ThemeId;
  name: string;
  mode: "dark" | "light";
  vars: ThemeVars;
};

const rgba = (hex: string, a: number): string => {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export const themes: ThemeDef[] = [
  {
    id: "mesh-matte",
    name: "Mesh Matte",
    mode: "dark",
    vars: {
      bg: "#000000",
      bgElev: "#060607",
      bgElev2: "#0b0b0d",
      bgPanel: "#060607",
      bgHover: "#111114",
      border: "#1a1a1d",
      borderSoft: "#111114",
      text: "#e9eaec",
      textDim: "#8a8d94",
      textMuted: "#5b5e66",
      accent: "#9be7b7",
      accent2: "#e6b780",
      purple: "#c9b6ff",
      blue: "#86c0ff",
      yellow: "#f1d07b",
      red: "#f39b9b",
      green: "#9be7b7",
    },
  },
  {
    id: "bridge-dark",
    name: "Mesh Green",
    mode: "dark",
    vars: {
      bg: "#0a0c0f",
      bgElev: "#0f1318",
      bgElev2: "#141920",
      bgPanel: "#11161c",
      bgHover: "#1a2028",
      border: "#1f2731",
      borderSoft: "#161c24",
      text: "#e6edf3",
      textDim: "#9aa4b1",
      textMuted: "#6b7684",
      accent: "#4ade80",
      accent2: "#ff7a45",
      purple: "#a78bfa",
      blue: "#60a5fa",
      yellow: "#fbbf24",
      red: "#f87171",
      green: "#4ade80",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    mode: "dark",
    vars: {
      bg: "#050810",
      bgElev: "#0b0f18",
      bgElev2: "#10151f",
      bgPanel: "#0d111b",
      bgHover: "#161c28",
      border: "#1c2433",
      borderSoft: "#131925",
      text: "#e8ecf3",
      textDim: "#93a0b6",
      textMuted: "#637286",
      accent: "#7dd3fc",
      accent2: "#f472b6",
      purple: "#a78bfa",
      blue: "#60a5fa",
      yellow: "#fde68a",
      red: "#fda4af",
      green: "#86efac",
    },
  },
  {
    id: "nord",
    name: "Nord",
    mode: "dark",
    vars: {
      bg: "#2e3440",
      bgElev: "#3b4252",
      bgElev2: "#434c5e",
      bgPanel: "#3b4252",
      bgHover: "#4c566a",
      border: "#434c5e",
      borderSoft: "#3b4252",
      text: "#eceff4",
      textDim: "#d8dee9",
      textMuted: "#a7b1c2",
      accent: "#88c0d0",
      accent2: "#d08770",
      purple: "#b48ead",
      blue: "#81a1c1",
      yellow: "#ebcb8b",
      red: "#bf616a",
      green: "#a3be8c",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    mode: "dark",
    vars: {
      bg: "#282a36",
      bgElev: "#2c2e3e",
      bgElev2: "#343746",
      bgPanel: "#2c2e3e",
      bgHover: "#3a3d4e",
      border: "#44475a",
      borderSoft: "#343746",
      text: "#f8f8f2",
      textDim: "#c9c9c4",
      textMuted: "#8a8b93",
      accent: "#bd93f9",
      accent2: "#ff79c6",
      purple: "#bd93f9",
      blue: "#8be9fd",
      yellow: "#f1fa8c",
      red: "#ff5555",
      green: "#50fa7b",
    },
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    mode: "dark",
    vars: {
      bg: "#1a1b26",
      bgElev: "#1f2335",
      bgElev2: "#24283b",
      bgPanel: "#1f2335",
      bgHover: "#2a2f45",
      border: "#2a2f45",
      borderSoft: "#20243a",
      text: "#c0caf5",
      textDim: "#a9b1d6",
      textMuted: "#737aa2",
      accent: "#7aa2f7",
      accent2: "#bb9af7",
      purple: "#bb9af7",
      blue: "#7aa2f7",
      yellow: "#e0af68",
      red: "#f7768e",
      green: "#9ece6a",
    },
  },
  {
    id: "gruvbox",
    name: "Gruvbox",
    mode: "dark",
    vars: {
      bg: "#1d2021",
      bgElev: "#282828",
      bgElev2: "#32302f",
      bgPanel: "#282828",
      bgHover: "#3c3836",
      border: "#3c3836",
      borderSoft: "#32302f",
      text: "#ebdbb2",
      textDim: "#d5c4a1",
      textMuted: "#928374",
      accent: "#b8bb26",
      accent2: "#fe8019",
      purple: "#d3869b",
      blue: "#83a598",
      yellow: "#fabd2f",
      red: "#fb4934",
      green: "#b8bb26",
    },
  },
  {
    id: "rose-pine",
    name: "Rosé Pine",
    mode: "dark",
    vars: {
      bg: "#191724",
      bgElev: "#1f1d2e",
      bgElev2: "#26233a",
      bgPanel: "#1f1d2e",
      bgHover: "#2a2740",
      border: "#2a2740",
      borderSoft: "#211e32",
      text: "#e0def4",
      textDim: "#c4c0e0",
      textMuted: "#6e6a86",
      accent: "#9ccfd8",
      accent2: "#eb6f92",
      purple: "#c4a7e7",
      blue: "#9ccfd8",
      yellow: "#f6c177",
      red: "#eb6f92",
      green: "#a6da95",
    },
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    mode: "dark",
    vars: {
      bg: "#002b36",
      bgElev: "#073642",
      bgElev2: "#0a4250",
      bgPanel: "#073642",
      bgHover: "#0f4c5c",
      border: "#0f4c5c",
      borderSoft: "#0a4250",
      text: "#eee8d5",
      textDim: "#93a1a1",
      textMuted: "#657b83",
      accent: "#2aa198",
      accent2: "#cb4b16",
      purple: "#6c71c4",
      blue: "#268bd2",
      yellow: "#b58900",
      red: "#dc322f",
      green: "#859900",
    },
  },
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    mode: "dark",
    vars: {
      bg: "#1e1e2e",
      bgElev: "#181825",
      bgElev2: "#313244",
      bgPanel: "#181825",
      bgHover: "#313244",
      border: "#313244",
      borderSoft: "#1e1e2e",
      text: "#cdd6f4",
      textDim: "#bac2de",
      textMuted: "#7f849c",
      accent: "#a6e3a1",
      accent2: "#f5c2e7",
      purple: "#cba6f7",
      blue: "#89b4fa",
      yellow: "#f9e2af",
      red: "#f38ba8",
      green: "#a6e3a1",
    },
  },
  {
    id: "light",
    name: "Daylight",
    mode: "light",
    vars: {
      bg: "#fafafa",
      bgElev: "#ffffff",
      bgElev2: "#f4f4f5",
      bgPanel: "#ffffff",
      bgHover: "#ebedf0",
      border: "#d4d4d8",
      borderSoft: "#e4e4e7",
      text: "#18181b",
      textDim: "#3f3f46",
      textMuted: "#71717a",
      accent: "#16a34a",
      accent2: "#ea580c",
      purple: "#7c3aed",
      blue: "#2563eb",
      yellow: "#ca8a04",
      red: "#dc2626",
      green: "#16a34a",
    },
  },
];

export type Density = "cozy" | "comfortable" | "compact";
export type FontScale = "sm" | "md" | "lg";

type ThemeState = {
  themeId: ThemeId;
  density: Density;
  fontScale: FontScale;
  terminalFontSize: number;
  defaultShell: "auto" | "PS" | "CMD" | "BASH" | "ZSH";
  setTheme: (id: ThemeId) => void;
  setDensity: (d: Density) => void;
  setFontScale: (s: FontScale) => void;
  setTerminalFontSize: (n: number) => void;
  setDefaultShell: (s: ThemeState["defaultShell"]) => void;
};

const STORAGE = "mesh.theme.v1";

function load(): Partial<ThemeState> {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(STORAGE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function save(state: ThemeState) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      STORAGE,
      JSON.stringify({
        themeId: state.themeId,
        density: state.density,
        fontScale: state.fontScale,
        terminalFontSize: state.terminalFontSize,
        defaultShell: state.defaultShell,
      }),
    );
  } catch {
    /* noop */
  }
}

const persisted = load();

export const useTheme = create<ThemeState>((set, get) => ({
  themeId: (persisted.themeId as ThemeId) ?? "mesh-matte",
  density: (persisted.density as Density) ?? "comfortable",
  fontScale: (persisted.fontScale as FontScale) ?? "md",
  terminalFontSize: persisted.terminalFontSize ?? 13,
  defaultShell: (persisted.defaultShell as ThemeState["defaultShell"]) ?? "auto",
  setTheme: (id) => {
    set({ themeId: id });
    save(get());
    applyTheme();
  },
  setDensity: (d) => {
    set({ density: d });
    save(get());
    applyTheme();
  },
  setFontScale: (s) => {
    set({ fontScale: s });
    save(get());
    applyTheme();
  },
  setTerminalFontSize: (n) => {
    set({ terminalFontSize: Math.max(10, Math.min(22, n)) });
    save(get());
  },
  setDefaultShell: (s) => {
    set({ defaultShell: s });
    save(get());
  },
}));

export function applyTheme() {
  if (typeof document === "undefined") return;
  const { themeId, density, fontScale } = useTheme.getState();
  const t = themes.find((x) => x.id === themeId) ?? themes[0];
  const r = document.documentElement;
  r.dataset.themeMode = t.mode;
  r.dataset.density = density;
  r.dataset.fontScale = fontScale;
  const v = t.vars;
  r.style.setProperty("--bg", v.bg);
  r.style.setProperty("--bg-elev", v.bgElev);
  r.style.setProperty("--bg-elev-2", v.bgElev2);
  r.style.setProperty("--bg-panel", v.bgPanel);
  r.style.setProperty("--bg-hover", v.bgHover);
  r.style.setProperty("--border", v.border);
  r.style.setProperty("--border-soft", v.borderSoft);
  r.style.setProperty("--text", v.text);
  r.style.setProperty("--text-dim", v.textDim);
  r.style.setProperty("--text-muted", v.textMuted);
  r.style.setProperty("--accent", v.accent);
  r.style.setProperty("--accent-soft", rgba(v.accent, 0.12));
  r.style.setProperty("--accent-border", rgba(v.accent, 0.35));
  r.style.setProperty("--accent-2", v.accent2);
  r.style.setProperty("--accent-2-soft", rgba(v.accent2, 0.1));
  r.style.setProperty("--accent-2-border", rgba(v.accent2, 0.3));
  r.style.setProperty("--purple", v.purple);
  r.style.setProperty("--blue", v.blue);
  r.style.setProperty("--yellow", v.yellow);
  r.style.setProperty("--red", v.red);

  // density -> base font size
  const base = fontScale === "sm" ? 12 : fontScale === "lg" ? 14 : 13;
  r.style.fontSize = base + "px";

  // density spacing
  const spacing = density === "compact" ? 0.85 : density === "cozy" ? 1.1 : 1;
  r.style.setProperty("--density", String(spacing));
}

export function currentThemeVars(): ThemeVars {
  const id = useTheme.getState().themeId;
  return (themes.find((t) => t.id === id) ?? themes[0]).vars;
}
