import React from "react";
import {
  Bell,
  Columns2,
  LayoutGrid,
  Minus,
  PanelLeft,
  PanelRight,
  Settings,
  Square,
  X,
} from "lucide-react";
import {
  closeWindow,
  isFullscreen,
  minimizeWindow,
  toggleMaximizeWindow,
} from "../lib/browserWindow";
import { Logo } from "./Logo";
import { useApp, activeWorkspace } from "../state/store";

export function TitleBar() {
  const ws = useApp(activeWorkspace);
  const toggleSettings = useApp((s) => s.toggleSettings);
  const toggleQuickNav = useApp((s) => s.toggleQuickNav);
  const quickNavOpen = useApp((s) => s.quickNavOpen);
  const toggleSidebar = useApp((s) => s.toggleSidebar);
  const sidebarCollapsed = useApp((s) => s.sidebarCollapsed);
  const toggleNavigator = useApp((s) => s.toggleNavigator);
  const navigatorCollapsed = useApp((s) => s.navigatorCollapsed);
  const setView = useApp((s) => s.setView);
  const panelLayout = useApp((s) => s.panelLayout);
  const setPanelLayout = useApp((s) => s.setPanelLayout);

  const [isMax, setIsMax] = React.useState(false);

  async function minimize() {
    try {
      await minimizeWindow();
    } catch {
      /* noop */
    }
  }
  async function toggleMax() {
    try {
      setIsMax(await toggleMaximizeWindow());
    } catch {
      /* noop */
    }
  }
  async function close() {
    try {
      await closeWindow();
    } catch {
      /* noop */
    }
  }

  React.useEffect(() => {
    (async () => {
      try {
        setIsMax(isFullscreen());
      } catch {
        /* noop */
      }
    })();
  }, []);

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <div className="titlebar-brand">
          <span
            className="titlebar-brand-icon"
            style={{ color: "var(--accent)" }}
          >
            <Logo size={16} />
          </span>
          Mesh
        </div>
      </div>
      <div className="titlebar-center">
        {ws && ws.cwd ? (
          <>
            <span>{ws.name}</span>
            <span className="titlebar-center-sep">›</span>
            <span style={{ color: "var(--text-dim)" }}>{shortPath(ws.cwd)}</span>
          </>
        ) : null}
      </div>
      <div className="titlebar-right">
        <button
          className={"titlebar-btn" + (sidebarCollapsed ? " active" : "")}
          title={sidebarCollapsed ? "Show workspaces sidebar" : "Hide workspaces sidebar"}
          onClick={() => toggleSidebar()}
        >
          <PanelLeft size={14} />
        </button>
        <button
          className={"titlebar-btn" + (quickNavOpen ? " active" : "")}
          title="Quick navigator"
          onClick={() => toggleQuickNav()}
        >
          <LayoutGrid size={14} />
        </button>
        <button
          className="titlebar-btn"
          title={panelLayout === "navigator-left" ? "Move tools right" : "Move tools left"}
          onClick={() =>
            setPanelLayout(panelLayout === "navigator-left" ? "navigator-right" : "navigator-left")
          }
        >
          <Columns2 size={14} />
        </button>
        <button className="titlebar-btn" title="Notifications">
          <Bell size={14} />
        </button>
        <button className="titlebar-btn" title="Settings" onClick={() => toggleSettings(true)}>
          <Settings size={14} />
        </button>
        <button
          className={"titlebar-btn" + (navigatorCollapsed ? " active" : "")}
          title={navigatorCollapsed ? "Show side panel" : "Hide side panel"}
          onClick={() => {
            if (navigatorCollapsed) {
              setView("skills");
              toggleNavigator(false);
            } else {
              toggleNavigator(true);
            }
          }}
        >
          <PanelRight size={14} />
        </button>
        <span style={{ width: 8 }} />
        <button className="titlebar-btn" title="Minimize" onClick={minimize}>
          <Minus size={14} />
        </button>
        <button
          className="titlebar-btn"
          title={isMax ? "Restore" : "Maximize"}
          onClick={toggleMax}
        >
          <Square size={12} />
        </button>
        <button className="titlebar-btn close" title="Close" onClick={close}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function shortPath(p: string, max = 48): string {
  if (p.length <= max) return p;
  return "…" + p.slice(-max);
}
