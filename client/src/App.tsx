import React from "react";
import { TitleBar } from "./components/TitleBar";
import { WorkspaceSidebar } from "./components/WorkspaceSidebar";
import { Welcome } from "./components/Welcome";
import { OrbitWizard } from "./components/OrbitWizard";
import { HiveWizard } from "./components/HiveWizard";
import { TerminalArea } from "./components/TerminalArea";
import { Navigator } from "./components/Navigator";
import { QuickNavigator } from "./components/QuickNavigator";
import { SettingsModal } from "./components/SettingsModal";
import { SkillEditorModal } from "./components/SkillEditorModal";
import { StatusBar } from "./components/StatusBar";
import { Toasts } from "./components/Toasts";
import { SplashScreen } from "./components/SplashScreen";
import { useApp, activeWorkspace } from "./state/store";
import { useDrag } from "./state/drag";
import { useDetection } from "./state/detection";
import { syncFullscreenState, toggleAppFullscreen } from "./lib/windowState";

export default function App() {
  const screen = useApp((s) => s.screen);
  const ws = useApp(activeWorkspace);
  const workspaces = useApp((s) => s.workspaces);
  const panelLayout = useApp((s) => s.panelLayout);
  const toggleSettings = useApp((s) => s.toggleSettings);
  const addTerm = useApp((s) => s.addTerminal);
  const setView = useApp((s) => s.setView);
  const toggleNavigator = useApp((s) => s.toggleNavigator);
  const newOrbit = useApp((s) => s.newOrbitWorkspace);
  const clearDrag = useDrag((s) => s.clear);
  const scanTools = useDetection((s) => s.scan);
  const hydrateServerWorkspaces = useApp((s) => s.hydrateServerWorkspaces);

  const [splash, setSplash] = React.useState(true);
  React.useEffect(() => {
    // Fire after the first paint so the splash is the very first thing
    // the user sees. `requestAnimationFrame` waits for layout to settle; we
    // then give the splash ~1.3s of display time before we tear it down.
    let timer: number | null = null;
    const raf = window.requestAnimationFrame(() => {
      timer = window.setTimeout(() => setSplash(false), 1300);
    });
    return () => {
      window.cancelAnimationFrame(raf);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  React.useEffect(() => {
    scanTools();
    hydrateServerWorkspaces();
    syncFullscreenState();
  }, [scanTools, hydrateServerWorkspaces]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      if (e.key === "Escape") {
        clearDrag();
      }
      if (meta && e.key === ",") {
        e.preventDefault();
        toggleSettings(true);
      }
      if (meta && e.key.toLowerCase() === "n") {
        e.preventDefault();
        addTerm();
      }
      if (meta && e.key === "1") {
        e.preventDefault();
        setView("terminal");
      }
      if (e.key === "F11") {
        e.preventDefault();
        toggleAppFullscreen();
      }
      if (screen === "welcome" && meta && e.key.toLowerCase() === "t") {
        e.preventDefault();
        newOrbit();
      }
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setView("skills");
        toggleNavigator(false);
      }
      // Hive is disabled for now.
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, toggleSettings, addTerm, setView, toggleNavigator, newOrbit, clearDrag]);

  const mountedWorkspaces = workspaces.filter((w) => !!w.cwd);
  const showWorkspacePool = mountedWorkspaces.length > 0;
  const navigatorLeft = panelLayout === "navigator-left";

  return (
    <div className="app-root">
      {splash && <SplashScreen onDone={() => setSplash(false)} />}
      {!splash && (
        <>
          <TitleBar />
          <div className={"main layout-" + panelLayout}>
            {!navigatorLeft && <WorkspaceSidebar />}
            <div className="flex-1" style={{ display: "flex", flexDirection: "column" }}>
              {screen === "welcome" && <Welcome />}
              {screen === "orbit" && <OrbitWizard />}
              {screen === "hive" && <HiveWizard />}
              {showWorkspacePool && (
                <div
                  className={"workspace-pool" + (screen === "workspace" && ws ? "" : " suspended")}
                >
                  {mountedWorkspaces.map((w) => {
                    const active = screen === "workspace" && w.id === ws?.id;
                    return (
                      <div
                        key={w.id}
                        className={"workspace" + (active ? " active" : " hidden")}
                        aria-hidden={!active}
                      >
                        {navigatorLeft && (
                          <Navigator workspaceId={w.id} visible={active} side="left" />
                        )}
                        <TerminalArea workspaceId={w.id} visible={active} />
                        {!navigatorLeft && (
                          <Navigator workspaceId={w.id} visible={active} side="right" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {navigatorLeft && <WorkspaceSidebar />}
          </div>
          <StatusBar />
          <QuickNavigator />
          <SettingsModal />
          <SkillEditorModal />
          <Toasts />
        </>
      )}
    </div>
  );
}
