import React from "react";
import { Compass, Code2, Wrench, Sparkles } from "lucide-react";
import { useApp } from "../state/store";
import { EditorPanel } from "./panels/EditorPanel";
import { BrowserPanel } from "./panels/BrowserPanel";
import { SkillsPanel } from "./panels/SkillsPanel";

type Props = {
  workspaceId: string;
  visible: boolean;
  side: "left" | "right";
};

const MIN_TERMINAL_WIDTH = 360;
const LEFT_SIDEBAR_WIDTH = 220;

export function Navigator({ workspaceId, visible, side }: Props) {
  const ws = useApp((s) => s.workspaces.find((w) => w.id === workspaceId));
  const setView = useApp((s) => s.setView);
  const setActiveWorkspace = useApp((s) => s.setActiveWorkspace);
  const activeWorkspaceId = useApp((s) => s.activeWorkspaceId);
  const collapsed = useApp((s) => s.navigatorCollapsed);
  const sidebarCollapsed = useApp((s) => s.sidebarCollapsed);
  const isActiveWorkspace = visible && workspaceId === activeWorkspaceId;
  const maxWidth = React.useCallback(() => {
    const sidebar = sidebarCollapsed ? 0 : LEFT_SIDEBAR_WIDTH;
    return Math.max(280, Math.min(900, window.innerWidth - sidebar - MIN_TERMINAL_WIDTH));
  }, [sidebarCollapsed]);

  // Resizable width, persisted in localStorage so it survives reloads.
  const [width, setWidth] = React.useState<number>(() => {
    try {
      const v = parseInt(localStorage.getItem("bm.navigator.width") || "", 10);
      return Number.isFinite(v) && v > 240 ? v : 460;
    } catch {
      return 460;
    }
  });
  const dragging = React.useRef(false);
  const widthRef = React.useRef(width);
  const resizeRafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    widthRef.current = width;
  }, [width]);

  React.useEffect(() => {
    if (!visible || collapsed) return;
    const safe = Math.min(widthRef.current, maxWidth());
    if (safe !== widthRef.current) {
      widthRef.current = safe;
      setWidth(safe);
    }
  }, [visible, collapsed, maxWidth]);

  React.useEffect(() => {
    if (!visible || collapsed) return;
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      const raw = side === "left" ? e.clientX : window.innerWidth - e.clientX;
      const w = Math.max(280, Math.min(maxWidth(), raw));
      widthRef.current = w;
      if (resizeRafRef.current !== null) return;
      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null;
        setWidth(widthRef.current);
      });
    }
    function onUp() {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = "";
        try {
          localStorage.setItem("bm.navigator.width", String(widthRef.current));
        } catch {
          /* noop */
        }
      }
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
    };
  }, [visible, collapsed, maxWidth, side]);

  if (!ws || !visible) return null;
  if (collapsed) return null;

  function select(view: Parameters<typeof setView>[0]) {
    if (workspaceId !== activeWorkspaceId) setActiveWorkspace(workspaceId);
    setView(view);
  }

  const view = ws.view;
  const mainLabel =
    view === "browser" ? "Browser" : view === "editor" ? "Editor" : "Skills";
  const MainIcon = view === "browser" ? Compass : view === "editor" ? Code2 : Wrench;

  return (
    <aside
      className={"navigator " + (side === "left" ? "side-left" : "side-right")}
      style={{ width: Math.min(width, maxWidth()) }}
    >
      <div
        className="navigator-resizer"
        onMouseDown={(e) => {
          e.preventDefault();
          dragging.current = true;
          document.body.style.cursor = "col-resize";
        }}
      />
      <div className="navigator-tabs">
        <TabButton
          title="Browser"
          active={view === "browser"}
          onClick={() => select("browser")}
          icon={<Compass size={15} />}
        />
        <TabButton
          title="Editor"
          active={view === "editor"}
          onClick={() => select("editor")}
          icon={<Code2 size={15} />}
        />
        <TabButton
          title="Skills"
          active={view === "skills"}
          onClick={() => select("skills")}
          icon={<Sparkles size={14} />}
        />

        <button
          className="nav-tab-main"
          onClick={() => select("skills")}
          title={mainLabel}
        >
          <MainIcon size={14} />
          <span>{mainLabel}</span>
        </button>
      </div>
      {isActiveWorkspace && (
        <div className="navigator-body">
          {view === "browser" && <BrowserPanel />}
          {view === "editor" && <EditorPanel />}
          {view === "skills" ||
          view === "terminal" ||
          view === "board" ||
          view === "memory" ? (
            <SkillsPanel />
          ) : null}
        </div>
      )}
    </aside>
  );
}

function TabButton({
  title,
  active,
  onClick,
  icon,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      className={"nav-tab" + (active ? " active" : "")}
      onClick={onClick}
      title={title}
    >
      {icon}
    </button>
  );
}
