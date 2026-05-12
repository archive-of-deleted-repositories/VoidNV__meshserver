import React from "react";
import { Logo } from "./Logo";
import { useApp } from "../state/store";

export function Welcome() {
  const newOrbit = useApp((s) => s.newOrbitWorkspace);
  const toggleSettings = useApp((s) => s.toggleSettings);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        newOrbit();
      }
      // Hive is disabled for now.
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newOrbit]);

  return (
    <div className="welcome grid-bg">
      <div className="welcome-logo anim-pop">
        <span className="welcome-logo-icon" style={{ color: "var(--accent)" }}>
          <Logo size={48} glow />
        </span>
        <span className="welcome-logo-text">Mesh</span>
      </div>
      <h1 className="welcome-headline anim-rise">Connect everything.</h1>
      <p className="welcome-sub anim-rise delay-1">Pick a way to work.</p>

      <div className="welcome-options">
        <button className="welcome-option anim-rise delay-2" onClick={() => newOrbit()}>
          <span className="welcome-option-icon" style={{ color: "var(--accent)" }}>
            <Logo size={20} />
          </span>
          <span className="welcome-option-text">
            <span className="welcome-option-title">Orbit</span>
            <span className="welcome-option-desc">Terminals side-by-side. Your tiles, your tools.</span>
          </span>
          <span className="pill">⌘T</span>
        </button>
        <button
          className="welcome-option anim-rise delay-3 disabled"
          onClick={(e) => e.preventDefault()}
          disabled
          aria-disabled="true"
          title="Hive is coming soon"
        >
          <span className="welcome-option-icon" style={{ color: "var(--purple)" }}>
            <Logo size={20} />
          </span>
          <span className="welcome-option-text">
            <span className="welcome-option-title">
              Hive
              <span className="soon-tag">soon</span>
            </span>
            <span className="welcome-option-desc">
              Coordinate a swarm of AI agents on one mission.
            </span>
          </span>
          <span className="pill">⌘S</span>
        </button>
      </div>

      <div className="welcome-hints anim-rise delay-4">
        <button
          className="welcome-hint"
          onClick={() => toggleSettings(true)}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <kbd>⌘,</kbd> Settings
        </button>
      </div>
    </div>
  );
}
