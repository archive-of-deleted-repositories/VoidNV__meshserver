export type FsEntry = {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
};

export type DetectedTool = {
  key: string;
  label: string;
  kind: "agent" | "shell" | "tunnel";
  installed: boolean;
  path: string | null;
  version: string | null;
};

export type DetectionReport = {
  agents: DetectedTool[];
  shells: DetectedTool[];
  tunnels: DetectedTool[];
  platform: string;
};

export type DiscoveredSkill = {
  id?: string;
  source: string;
  origin: string;
  name: string;
  description: string;
  body: string;
  category: string;
};

export type SkillRoot = {
  source: string;
  path: string;
  exists: boolean;
};

export type SaveSkillFileInput = {
  name: string;
  description: string;
  category: string;
  body: string;
  existingOrigin?: string | null;
  targetDir?: string | null;
};

export type TerminalRecord = {
  id: string;
  shell?: string | null;
  cwd?: string | null;
  cols: number;
  rows: number;
  createdAt: number;
  lastActiveUser?: string | null;
  alive: boolean;
};

export type WorkspaceRecord = {
  id: string;
  name: string;
  color: string;
  cwd: string;
  mode: "orbit" | "hive";
  stateJson: string;
  createdAt: number;
  updatedAt: number;
};

export type ServerStats = {
  hostname: string;
  user: string;
  uptimeSec: number;
  cpuPercent: number;
  loadPercent: number;
  memory: {
    usedBytes: number;
    totalBytes: number;
    percent: number;
  };
  network: {
    rxBytesPerSec: number;
    txBytesPerSec: number;
  };
  disks: Array<{
    path: string;
    usedBytes: number;
    totalBytes: number;
    percent: number;
  }>;
  sessions: {
    users: number;
    terminals: number;
  };
};
