import React from "react";
import {
  TerminalSquare,
  Wrench,
  SlidersHorizontal,
  Maximize2,
} from "lucide-react";
import { useApp } from "../state/store";
import { toggleAppFullscreen } from "../lib/windowState";

export function QuickNavigator() {
  const open = useApp((s) => s.quickNavOpen);
  const toggle = useApp((s) => s.toggleQuickNav);
  const toggleSettings = useApp((s) => s.toggleSettings);
  const setView = useApp((s) => s.setView);
  const toggleNavigator = useApp((s) => s.toggleNavigator);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") toggle(false);
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      if (e.key === "1") setView("terminal");
      if (e.key.toLowerCase() === "k") {
        setView("skills");
        toggleNavigator(false);
        toggle(false);
      }
      if (e.key === ",") {
        e.preventDefault();
        toggleSettings(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, toggle, setView, toggleNavigator, toggleSettings]);

  if (!open) return null;

  return (
    <>
      <div className="overlay-backdrop" onClick={() => toggle(false)} />
      <div
        className="menu"
        style={{ top: 38, right: 10, minWidth: 260 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="menu-label">Navigate</div>
        <button
          className="menu-item selected"
          onClick={() => {
            setView("terminal");
            toggle(false);
          }}
        >
          <span className="icon-wrap">
            <TerminalSquare size={14} />
          </span>
          Terminal
          <span className="spacer" />
          <kbd>Ctrl+1</kbd>
        </button>
        <button
          className="menu-item"
          onClick={() => {
            setView("skills");
            toggleNavigator(false);
            toggle(false);
          }}
        >
          <span className="icon-wrap">
            <Wrench size={14} />
          </span>
          Skills
          <span className="spacer" />
          <kbd>Ctrl+K</kbd>
        </button>
        <div className="menu-separator" />
        <button
          className="menu-item"
          onClick={() => {
            toggleSettings(true);
            toggle(false);
          }}
        >
          <span className="icon-wrap">
            <SlidersHorizontal size={14} />
          </span>
          Settings
          <span className="spacer" />
          <kbd>Ctrl+,</kbd>
        </button>
        <button
          className="menu-item"
          onClick={async () => {
            await toggleAppFullscreen();
            toggle(false);
          }}
        >
          <span className="icon-wrap">
            <Maximize2 size={14} />
          </span>
          Toggle fullscreen
          <span className="spacer" />
          <kbd>F11</kbd>
        </button>
      </div>
    </>
  );
}
