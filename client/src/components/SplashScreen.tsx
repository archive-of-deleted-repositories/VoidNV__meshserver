import React from "react";
import { Logo } from "./Logo";

export function SplashScreen({ onDone: _ }: { onDone: () => void }) {
  // Purely visual — App unmounts the splash when the timer fires.
  const [leaving, setLeaving] = React.useState(false);
  React.useEffect(() => {
    const t = window.setTimeout(() => setLeaving(true), 1000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className={"splash" + (leaving ? " leaving" : "")} role="presentation">
      <div className="splash-center">
        <div className="splash-mark" style={{ color: "var(--accent)" }}>
          <div className="splash-pulse" />
          <div className="splash-icon">
            <Logo size={72} />
          </div>
        </div>
        <div className="splash-name">Mesh</div>
        <div className="splash-tag">Connect everything.</div>
      </div>
    </div>
  );
}
