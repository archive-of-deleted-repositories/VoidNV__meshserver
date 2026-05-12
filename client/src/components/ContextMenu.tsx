import React from "react";

export type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
} | { separator: true };

type Props = {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
};

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ x, y });

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Reposition so the menu fits on screen.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let nx = x;
    let ny = y;
    if (nx + rect.width + 4 > vw) nx = vw - rect.width - 4;
    if (ny + rect.height + 4 > vh) ny = vh - rect.height - 4;
    setPos({ x: Math.max(4, nx), y: Math.max(4, ny) });
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="menu"
      style={{ top: pos.y, left: pos.x, minWidth: 200 }}
    >
      {items.map((it, i) => {
        if ("separator" in it) return <div key={i} className="menu-separator" />;
        return (
          <button
            key={i}
            className="menu-item"
            disabled={it.disabled}
            onClick={() => {
              onClose();
              if (!it.disabled) it.onClick();
            }}
            style={
              it.destructive ? { color: "var(--red)" } : undefined
            }
          >
            {it.icon && <span className="icon-wrap">{it.icon}</span>}
            <span>{it.label}</span>
            <span className="spacer" />
            {it.shortcut && <kbd>{it.shortcut}</kbd>}
          </button>
        );
      })}
    </div>
  );
}
