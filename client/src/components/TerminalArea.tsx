import React from "react";
import { Pencil, Plus, X, Sparkles, TerminalSquare, Copy, Trash2 } from "lucide-react";
import { TerminalView } from "./TerminalView";
import { useApp, type Terminal, type Workspace } from "../state/store";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { useDrag } from "../state/drag";

type Props = {
  workspaceId: string;
  visible: boolean;
};

export function TerminalArea({ workspaceId, visible }: Props) {
  const ws = useApp((s) => s.workspaces.find((w) => w.id === workspaceId));
  const addTerm = useApp((s) => s.addTerminal);
  const closeTerm = useApp((s) => s.closeTerminal);
  const renameTerm = useApp((s) => s.renameTerminal);
  const setActive = useApp((s) => s.setActiveTerminal);
  const setActiveWorkspace = useApp((s) => s.setActiveWorkspace);
  const activeWorkspaceId = useApp((s) => s.activeWorkspaceId);

  const [menu, setMenu] = React.useState<{
    x: number;
    y: number;
    termId: string;
  } | null>(null);

  const focusTerminal = React.useCallback((termId: string) => {
    if (workspaceId !== activeWorkspaceId) {
      setActiveWorkspace(workspaceId);
    }
    setActive(termId);
  }, [activeWorkspaceId, setActive, setActiveWorkspace, workspaceId]);

  if (!ws) return <div className="term-empty">No workspace</div>;

  const terms = ws.terminals;
  const activeTermId = ws.activeTerminalId ?? terms[0]?.id;

  function addNew() {
    if (workspaceId !== activeWorkspaceId) setActiveWorkspace(workspaceId);
    addTerm();
  }

  function closeOthers(termId: string) {
    ws!.terminals.filter((t) => t.id !== termId).forEach((t) => closeTerm(t.id));
  }
  function closeRight(termId: string) {
    const idx = ws!.terminals.findIndex((t) => t.id === termId);
    if (idx < 0) return;
    ws!.terminals.slice(idx + 1).forEach((t) => closeTerm(t.id));
  }

  function duplicate(termId: string) {
    const t = ws!.terminals.find((x) => x.id === termId);
    if (!t) return;
    if (workspaceId !== activeWorkspaceId) setActiveWorkspace(workspaceId);
    addTerm({
      title: t.title,
      agent: t.agent,
      shell: t.shell,
      cwd: t.cwd,
      customCommand: t.customCommand,
    });
  }

  function tabMenuItems(termId: string): MenuItem[] {
    const t = ws!.terminals.find((x) => x.id === termId);
    return [
      {
        label: "Rename",
        icon: <Pencil size={13} />,
        onClick: () => {
          const newName = window.prompt("Rename terminal", t?.title ?? "");
          if (newName && newName.trim()) renameTerm(termId, newName.trim());
        },
      },
      {
        label: "Duplicate",
        icon: <Copy size={13} />,
        onClick: () => duplicate(termId),
      },
      { separator: true },
      {
        label: "Close",
        icon: <X size={13} />,
        onClick: () => closeTerm(termId),
        destructive: true,
      },
      {
        label: "Close others",
        onClick: () => closeOthers(termId),
        disabled: ws!.terminals.length <= 1,
      },
      {
        label: "Close all to the right",
        onClick: () => closeRight(termId),
        disabled:
          ws!.terminals.findIndex((x) => x.id === termId) === ws!.terminals.length - 1,
      },
      { separator: true },
      {
        label: "Close all",
        icon: <Trash2 size={13} />,
        onClick: () => ws!.terminals.forEach((x) => closeTerm(x.id)),
        destructive: true,
      },
    ];
  }

  return (
    <div className="workspace-main">
      <div className="workspace-tabs">
        {terms.map((t) => (
          <Tab
            key={t.id}
            term={t}
            active={t.id === activeTermId}
            onActivate={focusTerminal}
            onClose={closeTerm}
            onRename={renameTerm}
            onContext={(termId, x, y) => setMenu({ x, y, termId })}
          />
        ))}
        <button className="tab-add" title="New terminal" onClick={addNew}>
          <Plus size={14} />
        </button>
      </div>
      <TerminalGrid
        ws={ws}
        activeId={activeTermId}
        visible={visible}
        onActivate={focusTerminal}
      />
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={tabMenuItems(menu.termId)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

const Tab = React.memo(function Tab({
  term,
  active,
  onActivate,
  onClose,
  onRename,
  onContext,
}: {
  term: Terminal;
  active: boolean;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onRename: (id: string, v: string) => void;
  onContext: (id: string, x: number, y: number) => void;
}) {
  const tabRef = React.useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(term.title);
  React.useEffect(() => setValue(term.title), [term.title]);
  React.useEffect(() => {
    if (!active) return;
    tabRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  function commit() {
    setEditing(false);
    if (value.trim() && value !== term.title) onRename(term.id, value.trim());
    else setValue(term.title);
  }

  return (
    <div
      ref={tabRef}
      className={"tab" + (active ? " active" : "")}
      title={`${term.title}${term.cwd ? ` - ${term.cwd}` : ""}`}
      onClick={() => onActivate(term.id)}
      onDoubleClick={() => setEditing(true)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContext(term.id, e.clientX, e.clientY);
      }}
    >
      <span className="tab-icon">
        {term.agent !== "none" ? <Sparkles size={12} /> : <TerminalSquare size={12} />}
      </span>
      {editing ? (
        <input
          autoFocus
          className="tab-edit"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setEditing(false);
              setValue(term.title);
            }
          }}
          onBlur={commit}
        />
      ) : (
        <span className="tab-title">{term.title}</span>
      )}

      <button
        className="tab-edit-btn"
        title="Rename"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        <Pencil size={10} />
      </button>

      <span className="tab-sub">- {shortCwd(term.cwd)}</span>
      <span className="tab-shell">{term.shell}</span>

      <button
        className="tab-close"
        title="Close"
        onClick={(e) => {
          e.stopPropagation();
          onClose(term.id);
        }}
      >
        <X size={12} />
      </button>

      {false && (
        <div className="tab-tooltip">
          <Sparkles size={10} /> {term.title} — click pencil or double-click to rename
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.active === next.active &&
    prev.term.id === next.term.id &&
    prev.term.title === next.term.title &&
    prev.term.agent === next.term.agent &&
    prev.term.shell === next.term.shell &&
    prev.term.cwd === next.term.cwd
  );
});

function shortCwd(cwd: string): string {
  if (!cwd) return "";
  const parts = cwd.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || cwd;
}

function gridClass(n: number): string {
  return "n" + Math.max(1, Math.min(12, n));
}

type GridSize = {
  width: number;
  height: number;
};

const GRID_GAP = 1;
const IDEAL_TERMINAL_ASPECT = 1.35;
const MIN_USEFUL_CELL_WIDTH = 260;
const MIN_USEFUL_CELL_HEIGHT = 155;

function fallbackColumns(count: number): number {
  return count <= 2
    ? count
    : count <= 4
      ? 2
      : count <= 9
        ? 3
        : 4;
}

function bestGridColumns(count: number, size?: GridSize): number {
  if (!size || size.width <= 0 || size.height <= 0) return fallbackColumns(count);

  let bestColumns = 1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const emptyCells = columns * rows - count;
    const cellWidth = (size.width - (columns - 1) * GRID_GAP) / columns;
    const cellHeight = (size.height - (rows - 1) * GRID_GAP) / rows;
    const cellAspect = cellWidth / Math.max(1, cellHeight);
    const aspectCost = Math.abs(Math.log(cellAspect / IDEAL_TERMINAL_ASPECT));
    const emptyCost = emptyCells * 0.16;
    const narrowCost =
      cellWidth < MIN_USEFUL_CELL_WIDTH ? (MIN_USEFUL_CELL_WIDTH - cellWidth) / 180 : 0;
    const shortCost =
      cellHeight < MIN_USEFUL_CELL_HEIGHT ? (MIN_USEFUL_CELL_HEIGHT - cellHeight) / 120 : 0;
    const singleRowCost = count > 4 && rows === 1 ? 1.5 : 0;
    const score = aspectCost + emptyCost + narrowCost + shortCost + singleRowCost;

    if (score < bestScore) {
      bestScore = score;
      bestColumns = columns;
    }
  }

  return bestColumns;
}

function gridStyle(n: number, size?: GridSize): React.CSSProperties {
  const count = Math.max(1, Math.min(12, n));
  const columns = bestGridColumns(count, size);
  const rows = Math.ceil(count / columns);
  return {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
  };
}

function useElementGridSize() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const frameRef = React.useRef<number | null>(null);
  const [size, setSize] = React.useState<GridSize | undefined>();

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const update = () => {
      const rect = node.getBoundingClientRect();
      const next = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
      setSize((current) =>
        current?.width === next.width && current?.height === next.height ? current : next,
      );
    };

    update();
    const observer = new ResizeObserver(() => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        update();
      });
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  return [ref, size] as const;
}

function TerminalGrid({
  ws,
  activeId,
  visible,
  onActivate,
}: {
  ws: Workspace;
  activeId?: string;
  visible: boolean;
  onActivate: (id: string) => void;
}) {
  const terms = ws.terminals;
  const [gridRef, gridSize] = useElementGridSize();
  const skillPayload = useDrag((s) => (visible ? s.payload : null));
  const skillId = useDrag((s) => (visible ? s.skillId : null));
  const skillName = useDrag((s) => (visible ? s.skillName : null));
  const clearDrag = useDrag((s) => s.clear);
  const selectedSkill = React.useMemo(
    () =>
      skillPayload && skillId && skillName
        ? { id: skillId, body: skillPayload, name: skillName }
        : null,
    [skillId, skillName, skillPayload],
  );
  const computedGridStyle = React.useMemo(
    () => gridStyle(terms.length, gridSize),
    [gridSize, terms.length],
  );
  if (terms.length === 0) {
    return (
      <div className="term-empty">
        No terminals yet. <span style={{ marginLeft: 8 }}>Use + to add one.</span>
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      className={"term-grid " + gridClass(terms.length)}
      style={computedGridStyle}
    >
      {terms.map((t) => (
        <TerminalView
          key={t.id}
          term={t}
          active={t.id === activeId}
          visible={visible}
          selectedSkill={selectedSkill}
          onDropComplete={clearDrag}
          onActivate={onActivate}
        />
      ))}
    </div>
  );
}
