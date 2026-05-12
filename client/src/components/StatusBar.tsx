import React from "react";
import {
  Activity,
  Clock3,
  Cpu,
  Download,
  HardDrive,
  MemoryStick,
  Server,
  Upload,
  UserRound,
} from "lucide-react";
import { useApp, activeWorkspace } from "../state/store";
import type { ServerStats } from "../../../shared/types";

export function StatusBar() {
  const ws = useApp(activeWorkspace);
  const stats = useServerStats();

  if (!ws) {
    return (
      <div className="statusbar">
        <span>Mesh</span>
        <span className="statusbar-spacer" />
        <ServerStatsStrip stats={stats} />
      </div>
    );
  }

  const terms = ws.terminals.length;
  const active = ws.terminals.find((t) => t.id === ws.activeTerminalId);

  return (
    <div className="statusbar">
      <span className="statusbar-item" style={{ color: "var(--accent)" }}>
        ●
      </span>
      <span>{ws.name}</span>
      <span>·</span>
      <span>{shortPath(ws.cwd)}</span>
      <span className="statusbar-spacer" />
      {active && (
        <>
          <span>{active.title}</span>
          <span>·</span>
          <span>{active.shell}</span>
          <span>·</span>
        </>
      )}
      <span>
        {terms} terminal{terms === 1 ? "" : "s"}
      </span>
      <ServerStatsStrip stats={stats} />
    </div>
  );
}

function useServerStats() {
  const [stats, setStats] = React.useState<ServerStats | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/server/stats", { credentials: "include" });
        if (!res.ok) return;
        const next = (await res.json()) as ServerStats;
        if (!cancelled) setStats(next);
      } catch {
        /* noop */
      }
    }
    load();
    const timer = window.setInterval(load, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return stats;
}

function ServerStatsStrip({ stats }: { stats: ServerStats | null }) {
  if (!stats) {
    return (
      <span className="server-stats">
        <span className="server-stat">
          <Server size={12} /> stats
        </span>
      </span>
    );
  }

  const disk = stats.disks[0];
  return (
    <span className="server-stats" title={stats.hostname}>
      <Stat icon={<Cpu size={12} />} text={`${stats.cpuPercent.toFixed(0)}%`} meter={stats.cpuPercent} />
      <Stat icon={<Activity size={12} />} text={`${stats.loadPercent.toFixed(0)}%`} meter={stats.loadPercent} />
      <Stat
        icon={<MemoryStick size={12} />}
        text={`${formatBytes(stats.memory.usedBytes)} / ${formatBytes(stats.memory.totalBytes)}`}
        meter={stats.memory.percent}
      />
      <Stat icon={<Upload size={12} />} text={formatRate(stats.network.txBytesPerSec)} />
      <Stat icon={<Download size={12} />} text={formatRate(stats.network.rxBytesPerSec)} />
      <Stat icon={<Clock3 size={12} />} text={formatUptime(stats.uptimeSec)} />
      <Stat icon={<UserRound size={12} />} text={`${stats.user} (x${Math.max(1, stats.sessions.terminals)})`} />
      {disk && (
        <Stat
          icon={<HardDrive size={12} />}
          text={`${shortDiskPath(disk.path)}: ${disk.percent.toFixed(0)}%`}
          meter={disk.percent}
        />
      )}
    </span>
  );
}

function Stat({
  icon,
  text,
  meter,
}: {
  icon: React.ReactNode;
  text: string;
  meter?: number;
}) {
  return (
    <span className="server-stat">
      <span className="server-stat-icon">{icon}</span>
      {meter !== undefined && (
        <span className="server-stat-meter" aria-hidden="true">
          <span style={{ width: `${Math.max(0, Math.min(100, meter))}%` }} />
        </span>
      )}
      <span className="server-stat-text">{text}</span>
    </span>
  );
}

function shortPath(p: string, max = 60): string {
  if (!p) return "-";
  if (p.length <= max) return p;
  return "..." + p.slice(-max);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let i = 1; i < units.length && value >= 1024; i++) {
    value /= 1024;
    unit = units[i];
  }
  const decimals = value >= 10 ? 1 : 2;
  return `${value.toFixed(decimals)} ${unit}`;
}

function formatRate(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

function formatUptime(seconds: number): string {
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  return `${Math.floor(seconds / 86400)} d`;
}

function shortDiskPath(diskPath: string): string {
  if (diskPath === "/") return "/";
  return diskPath.replace(/\\$/, "") || diskPath;
}
