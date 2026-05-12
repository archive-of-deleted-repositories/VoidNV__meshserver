import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { allowedRoots } from "./files.js";
import { terminalRecords } from "../ptyManager.js";
import type { ServerStats } from "../../../shared/types.js";

type CpuSample = { idle: number; total: number };
type NetSample = { rx: number; tx: number; at: number };

let lastCpu: CpuSample | null = null;
let lastNet: NetSample | null = null;

function cpuSample(): CpuSample {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    idle += cpu.times.idle;
    total += Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
  }
  return { idle, total };
}

function cpuPercent(): number {
  const current = cpuSample();
  if (!lastCpu) {
    lastCpu = current;
    return 0;
  }
  const idle = current.idle - lastCpu.idle;
  const total = current.total - lastCpu.total;
  lastCpu = current;
  if (total <= 0) return 0;
  return clampPercent(((total - idle) / total) * 100);
}

function readLinuxNetwork(): { rx: number; tx: number } | null {
  if (process.platform !== "linux") return null;
  try {
    const text = fs.readFileSync("/proc/net/dev", "utf8");
    let rx = 0;
    let tx = 0;
    for (const line of text.split("\n").slice(2)) {
      const [ifaceRaw, valuesRaw] = line.trim().split(":");
      if (!ifaceRaw || !valuesRaw) continue;
      const iface = ifaceRaw.trim();
      if (iface === "lo") continue;
      const values = valuesRaw.trim().split(/\s+/).map(Number);
      rx += values[0] || 0;
      tx += values[8] || 0;
    }
    return { rx, tx };
  } catch {
    return null;
  }
}

function networkRates() {
  const currentRaw = readLinuxNetwork() ?? { rx: 0, tx: 0 };
  const current: NetSample = { ...currentRaw, at: Date.now() };
  if (!lastNet) {
    lastNet = current;
    return { rxBytesPerSec: 0, txBytesPerSec: 0 };
  }
  const seconds = Math.max(0.001, (current.at - lastNet.at) / 1000);
  const rxBytesPerSec = Math.max(0, (current.rx - lastNet.rx) / seconds);
  const txBytesPerSec = Math.max(0, (current.tx - lastNet.tx) / seconds);
  lastNet = current;
  return { rxBytesPerSec, txBytesPerSec };
}

function diskStats() {
  const seen = new Set<string>();
  const roots = allowedRoots()
    .map((root) => path.parse(root).root || root)
    .filter((root) => {
      if (seen.has(root)) return false;
      seen.add(root);
      return true;
    })
    .slice(0, 3);

  return roots.flatMap((root) => {
    try {
      const stat = fs.statfsSync(root);
      const totalBytes = Number(stat.blocks) * Number(stat.bsize);
      const freeBytes = Number(stat.bavail) * Number(stat.bsize);
      const usedBytes = Math.max(0, totalBytes - freeBytes);
      return [
        {
          path: root,
          usedBytes,
          totalBytes,
          percent: totalBytes > 0 ? clampPercent((usedBytes / totalBytes) * 100) : 0
        }
      ];
    } catch {
      return [];
    }
  });
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
}

export function getServerStats(): ServerStats {
  const totalMem = os.totalmem();
  const usedMem = totalMem - os.freemem();
  const cpus = Math.max(1, os.cpus().length);
  const activeTerminals = terminalRecords().filter((t) => t.alive).length;
  let user = "unknown";
  try {
    user = os.userInfo().username;
  } catch {
    /* noop */
  }

  return {
    hostname: os.hostname(),
    user,
    uptimeSec: os.uptime(),
    cpuPercent: cpuPercent(),
    loadPercent: clampPercent((os.loadavg()[0] / cpus) * 100),
    memory: {
      usedBytes: usedMem,
      totalBytes: totalMem,
      percent: totalMem > 0 ? clampPercent((usedMem / totalMem) * 100) : 0
    },
    network: networkRates(),
    disks: diskStats(),
    sessions: {
      users: 1,
      terminals: activeTerminals
    }
  };
}
