import React from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import {
  onPtyExit,
  onPtyOutput,
  ptyResize,
  ptySpawn,
  ptyWrite,
} from "../lib/serverApi";
import type { Terminal as TerminalDef } from "../state/store";
import { currentThemeVars, useTheme } from "../state/theme";

const MAX_HIDDEN_OUTPUT = 2_000_000;

type Props = {
  term: TerminalDef;
  active: boolean;
  visible: boolean;
  selectedSkill: { id: string; body: string; name: string } | null;
  onDropComplete: () => void;
  onActivate: (id: string) => void;
};

function shellProgram(s: TerminalDef["shell"]): string | undefined {
  switch (s) {
    case "PS":
      return "powershell.exe";
    case "CMD":
      return "cmd.exe";
    case "BASH":
      return "bash";
    case "ZSH":
      return "zsh";
    default:
      return undefined;
  }
}

function clearCommand(shell: TerminalDef["shell"]): string {
  // On Windows PowerShell / cmd, use `cls`; on POSIX shells, `clear`.
  return shell === "PS" || shell === "CMD" ? "cls" : "clear";
}

function defaultAgentProgram(agent: TerminalDef["agent"]): string | undefined {
  switch (agent) {
    case "Claude":
      return "claude";
    case "Codex":
      return "codex";
    case "Gemini":
      return "gemini";
    case "OpenCode":
      return "opencode";
    case "Cursor":
      return "cursor";
    case "Kiro":
      return "kiro-cli";
    case "Droid":
      return "droid";
    default:
      return undefined;
  }
}

function agentProgram(term: TerminalDef): string | undefined {
  const custom = term.customCommand?.trim();
  if (term.agent === "custom") return custom;
  const base = defaultAgentProgram(term.agent);
  if (!custom) return base;
  if (!base) return custom;
  return commandWithArgs(base, custom);
}

function commandWithArgs(base: string, custom: string): string {
  const firstToken = base.split(/\s+/)[0].toLowerCase();
  const customLower = custom.toLowerCase();
  if (customLower === firstToken || customLower.startsWith(firstToken + " ")) {
    return custom;
  }
  if (customLower === base.toLowerCase() || customLower.startsWith(base.toLowerCase() + " ")) {
    return custom;
  }
  return `${base} ${custom}`;
}

function buildInitialCommand(term: TerminalDef): string | undefined {
  const agent = agentProgram(term);
  if (!agent) return undefined;
  const cls = clearCommand(term.shell);
  if (term.shell === "CMD") {
    // `@echo off` suppresses echoing of subsequent commands for this line only;
    // chain with `&&` so the shell's banner is wiped right before the agent launches.
    return `@echo off & ${cls} && ${agent}`;
  }
  if (term.shell === "PS") {
    return `${cls}; ${agent}`;
  }
  return `${cls} && ${agent}`;
}

function TerminalViewComponent({
  term,
  active,
  visible,
  selectedSkill,
  onDropComplete,
  onActivate,
}: Props) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const xtermRef = React.useRef<XTerm | null>(null);
  const fitRef = React.useRef<FitAddon | null>(null);
  const idRef = React.useRef(term.id);
  const visibleRef = React.useRef(visible);
  const spawnedRef = React.useRef(false);
  const hiddenOutputRef = React.useRef("");
  const writeQueueRef = React.useRef("");
  const writeRafRef = React.useRef<number | null>(null);
  const resizeRafRef = React.useRef<number | null>(null);
  const pendingPtyResizeTimerRef = React.useRef<number | null>(null);
  const pendingPtySizeRef = React.useRef<{ cols: number; rows: number } | null>(null);
  const fitTimersRef = React.useRef<number[]>([]);
  const lastSizeRef = React.useRef<{ cols: number; rows: number } | null>(null);
  const decoderRef = React.useRef(new TextDecoder());

  const [dropHover, setDropHover] = React.useState(false);
  const fontSize = useTheme((s) => s.terminalFontSize);

  const flushWriteQueue = React.useCallback(() => {
    writeRafRef.current = null;
    const xterm = xtermRef.current;
    const data = writeQueueRef.current;
    if (!xterm || !data) return;
    writeQueueRef.current = "";
    xterm.write(data);
  }, []);

  const queueWrite = React.useCallback(
    (data: string) => {
      if (!data) return;
      writeQueueRef.current += data;
      if (writeRafRef.current !== null) return;
      writeRafRef.current = window.requestAnimationFrame(flushWriteQueue);
    },
    [flushWriteQueue],
  );

  const bufferHiddenOutput = React.useCallback((data: string) => {
    if (!data) return;
    hiddenOutputRef.current += data;
    if (hiddenOutputRef.current.length > MAX_HIDDEN_OUTPUT) {
      hiddenOutputRef.current =
        "\r\n[hidden output truncated]\r\n" +
        hiddenOutputRef.current.slice(-MAX_HIDDEN_OUTPUT);
    }
  }, []);

  const flushHiddenOutput = React.useCallback(() => {
    if (!hiddenOutputRef.current) return;
    const data = hiddenOutputRef.current;
    hiddenOutputRef.current = "";
    queueWrite(data);
  }, [queueWrite]);

  const schedulePtyResize = React.useCallback((size: { cols: number; rows: number }) => {
    pendingPtySizeRef.current = size;
    if (pendingPtyResizeTimerRef.current !== null) return;
    pendingPtyResizeTimerRef.current = window.setTimeout(() => {
      pendingPtyResizeTimerRef.current = null;
      const latest = pendingPtySizeRef.current;
      if (!latest) return;
      ptyResize(idRef.current, latest.cols, latest.rows).catch(() => {});
    }, 80);
  }, []);

  const fitAndResize = React.useCallback((): { cols: number; rows: number } | null => {
    if (!visibleRef.current) return null;
    const xterm = xtermRef.current;
    const fit = fitRef.current;
    const host = hostRef.current;
    if (!xterm || !fit || !host || host.clientWidth <= 0 || host.clientHeight <= 0) {
      return null;
    }
    const buffer = xterm.buffer.active;
    const wasAtBottom = buffer.viewportY >= buffer.baseY;
    const viewportY = buffer.viewportY;
    try {
      fit.fit();
      if (wasAtBottom) {
        xterm.scrollToBottom();
      } else {
        xterm.scrollToLine(viewportY);
      }
      const nextSize = { cols: xterm.cols, rows: xterm.rows };
      const lastSize = lastSizeRef.current;
      if (
        !lastSize ||
        lastSize.cols !== nextSize.cols ||
        lastSize.rows !== nextSize.rows
      ) {
        lastSizeRef.current = nextSize;
        schedulePtyResize(nextSize);
      }
      return nextSize;
    } catch {
      return null;
    }
  }, [schedulePtyResize]);

  const scheduleFitAndResize = React.useCallback(() => {
    if (!visibleRef.current || resizeRafRef.current !== null) return;
    resizeRafRef.current = window.requestAnimationFrame(() => {
      resizeRafRef.current = null;
      fitAndResize();
    });
  }, [fitAndResize]);

  const fitAfterLayoutSettles = React.useCallback(() => {
    fitTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    fitTimersRef.current = [];
    [0, 40, 120, 260].forEach((delay) => {
      const timer = window.setTimeout(scheduleFitAndResize, delay);
      fitTimersRef.current.push(timer);
    });
  }, [scheduleFitAndResize]);

  const nextFrame = React.useCallback(
    () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve())),
    [],
  );

  const fitBeforeSpawn = React.useCallback(async () => {
    await nextFrame();
    await nextFrame();
    return fitAndResize();
  }, [fitAndResize, nextFrame]);

  React.useEffect(() => {
    idRef.current = term.id;
  }, [term.id]);

  React.useEffect(() => {
    visibleRef.current = visible;
    if (!visible) return;
    flushHiddenOutput();
    fitAfterLayoutSettles();
  }, [visible, flushHiddenOutput, fitAfterLayoutSettles]);

  React.useEffect(() => {
    if (!selectedSkill) setDropHover(false);
  }, [selectedSkill]);

  React.useEffect(() => {
    if (!hostRef.current) return;
    const v = currentThemeVars();
    const xterm = new XTerm({
      cursorBlink: false,
      fontFamily: 'JetBrains Mono, "Cascadia Code", Consolas, Menlo, monospace',
      fontSize,
      lineHeight: 1.2,
      theme: {
        background: v.bgElev,
        foreground: v.text,
        cursor: v.accent,
        cursorAccent: v.bgElev,
        selectionBackground: "rgba(74, 222, 128, 0.25)",
        black: v.bgElev,
        red: v.red,
        green: v.green,
        yellow: v.yellow,
        blue: v.blue,
        magenta: v.purple,
        cyan: "#22d3ee",
        white: v.text,
        brightBlack: v.textMuted,
        brightRed: v.red,
        brightGreen: v.green,
        brightYellow: v.yellow,
        brightBlue: v.blue,
        brightMagenta: v.purple,
        brightCyan: "#67e8f9",
        brightWhite: v.text,
      },
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    xterm.loadAddon(fit);
    xterm.loadAddon(new WebLinksAddon());
    xterm.open(hostRef.current);

    xtermRef.current = xterm;
    fitRef.current = fit;
    fitAfterLayoutSettles();

    const onData = xterm.onData((data) => {
      ptyWrite(idRef.current, data).catch(() => {});
    });

    const ro = new ResizeObserver(() => {
      scheduleFitAndResize();
    });
    ro.observe(hostRef.current);

    let unlistenOut: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;

    (async () => {
      unlistenOut = await onPtyOutput(term.id, (data) => {
        const text = decoderRef.current.decode(data, { stream: true });
        if (visibleRef.current) queueWrite(text);
        else bufferHiddenOutput(text);
      });
      unlistenExit = await onPtyExit(term.id, () => {
        const msg = "\r\n\x1b[90m[process exited]\x1b[0m\r\n";
        if (visibleRef.current) queueWrite(msg);
        else bufferHiddenOutput(msg);
      });

      if (!spawnedRef.current) {
        spawnedRef.current = true;
        const size = (await fitBeforeSpawn()) ?? { cols: xterm.cols, rows: xterm.rows };
        await ptySpawn({
          id: term.id,
          shell: shellProgram(term.shell),
          cwd: term.cwd,
          cols: size.cols,
          rows: size.rows,
          initialCommand: buildInitialCommand(term),
        }).catch((err) => {
          xterm.writeln("\x1b[31mFailed to spawn shell: " + String(err) + "\x1b[0m");
        });
      }
    })();

    return () => {
      onData.dispose();
      ro.disconnect();
      unlistenOut?.();
      unlistenExit?.();
      if (writeRafRef.current !== null) window.cancelAnimationFrame(writeRafRef.current);
      if (resizeRafRef.current !== null) window.cancelAnimationFrame(resizeRafRef.current);
      if (pendingPtyResizeTimerRef.current !== null) {
        window.clearTimeout(pendingPtyResizeTimerRef.current);
        pendingPtyResizeTimerRef.current = null;
      }
      fitTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      fitTimersRef.current = [];
      // Browser unmounts should not kill server-side PTYs. The explicit
      // terminal close action calls ptyKill from the store.
      xterm.dispose();
      xtermRef.current = null;
      fitRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pasteIntoTerminal(data: string) {
    if (!data) return;
    onActivate(idRef.current);
    const xterm = xtermRef.current;
    xterm?.focus();
    ptyWrite(idRef.current, data).catch(() => {
      xterm?.write(data);
    });
  }

  return (
    <div
      className={
        "term-panel-wrap" +
        (active ? " active" : "") +
        (selectedSkill ? " skill-target" : "") +
        (dropHover ? " drop-target" : "")
      }
      onMouseDown={(e) => {
        if (!selectedSkill) {
          onActivate(term.id);
          return;
        }
        e.preventDefault();
        pasteIntoTerminal(selectedSkill.body);
        onDropComplete();
      }}
      onFocus={() => onActivate(term.id)}
      onMouseEnter={() => {
        if (selectedSkill) {
          setDropHover(true);
        }
      }}
      onMouseLeave={() => setDropHover(false)}
      tabIndex={-1}
    >
      <div
        className="term-panel"
        onClick={() => {
          xtermRef.current?.focus();
        }}
      >
        <div ref={hostRef} className="term-host" />
      </div>
      {selectedSkill && (
        <div className="term-skill-target">
          <div className="term-drop-label">
            <span className="term-drop-label-inner">
              {dropHover ? "Click to paste" : "Target terminal"}
            </span>
            <span className="term-drop-label-name">{selectedSkill.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function sameTerm(a: TerminalDef, b: TerminalDef) {
  return (
    a === b ||
    (a.id === b.id &&
      a.title === b.title &&
      a.agent === b.agent &&
      a.customCommand === b.customCommand &&
      a.shell === b.shell &&
      a.cwd === b.cwd)
  );
}

function sameSelectedSkill(
  a: Props["selectedSkill"],
  b: Props["selectedSkill"],
) {
  return (
    a === b ||
    (!!a && !!b && a.id === b.id && a.name === b.name && a.body === b.body)
  );
}

export const TerminalView = React.memo(TerminalViewComponent, (prev, next) => {
  return (
    sameTerm(prev.term, next.term) &&
    prev.active === next.active &&
    prev.visible === next.visible &&
    sameSelectedSkill(prev.selectedSkill, next.selectedSkill)
  );
});
