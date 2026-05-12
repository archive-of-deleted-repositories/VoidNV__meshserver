import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";
import type { DetectedTool, DetectionReport } from "../../../shared/types.js";

const execFileAsync = promisify(execFile);

const agents = [
  ["claude", "Claude"],
  ["codex", "Codex"],
  ["gemini", "Gemini"],
  ["opencode", "OpenCode"],
  ["cursor", "Cursor"],
  ["kiro-cli", "Kiro"],
  ["droid", "Droid"]
] as const;

const shells =
  process.platform === "win32"
    ? ([
        ["pwsh", "PowerShell"],
        ["powershell", "Windows PowerShell"],
        ["cmd", "Command Prompt"],
        ["bash", "Bash"]
      ] as const)
    : ([
        ["zsh", "Zsh"],
        ["bash", "Bash"],
        ["sh", "POSIX sh"]
      ] as const);

const tunnels = [
  ["cloudflared", "Cloudflare Tunnel"],
  ["ngrok", "ngrok"]
] as const;

async function commandPath(command: string): Promise<string | null> {
  const lookup = process.platform === "win32" ? "where.exe" : "which";
  try {
    const { stdout } = await execFileAsync(lookup, [command], { timeout: 2500 });
    return stdout.split(/\r?\n/).find(Boolean)?.trim() || null;
  } catch {
    return null;
  }
}

async function version(command: string): Promise<string | null> {
  try {
    const { stdout, stderr } = await execFileAsync(command, ["--version"], { timeout: 2500 });
    return (stdout || stderr).split(/\r?\n/).find(Boolean)?.trim() || null;
  } catch {
    return null;
  }
}

async function detectOne(
  key: string,
  label: string,
  kind: DetectedTool["kind"]
): Promise<DetectedTool> {
  const found = await commandPath(key);
  return {
    key: key === "kiro-cli" ? "kiro" : key,
    label,
    kind,
    installed: !!found,
    path: found,
    version: found ? await version(key) : null
  };
}

export async function detectTools(): Promise<DetectionReport> {
  const [agentRows, shellRows, tunnelRows] = await Promise.all([
    Promise.all(agents.map(([key, label]) => detectOne(key, label, "agent"))),
    Promise.all(shells.map(([key, label]) => detectOne(key, label, "shell"))),
    Promise.all(tunnels.map(([key, label]) => detectOne(key, label, "tunnel")))
  ]);
  return {
    agents: agentRows.sort((a, b) => Number(b.installed) - Number(a.installed)),
    shells: shellRows.sort((a, b) => Number(b.installed) - Number(a.installed)),
    tunnels: tunnelRows.sort((a, b) => Number(b.installed) - Number(a.installed)),
    platform: `${os.platform()}-${os.arch()}`
  };
}
