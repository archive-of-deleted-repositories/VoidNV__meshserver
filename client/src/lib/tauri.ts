import type {
  DetectedTool,
  DetectionReport,
  DiscoveredSkill,
  FsEntry,
  SaveSkillFileInput,
  SkillRoot,
} from "../../../shared/types";

type UnlistenFn = () => void;
type PtyOutputHandler = (data: Uint8Array) => void;
type PtyExitHandler = () => void;

const encoder = new TextEncoder();
const outputHandlers = new Map<string, Set<PtyOutputHandler>>();
const exitHandlers = new Map<string, Set<PtyExitHandler>>();
const sockets = new Map<string, WebSocket>();
const reconnectTimers = new Map<string, number>();
const reconnectAttempts = new Map<string, number>();
const intentionalClose = new Set<string>();

function apiBase() {
  return "";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiBase() + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function socketUrl(id: string) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/terminals/${encodeURIComponent(id)}/socket`;
}

function hasListeners(id: string) {
  return !!outputHandlers.get(id)?.size || !!exitHandlers.get(id)?.size;
}

function scheduleReconnect(id: string) {
  if (!hasListeners(id) || intentionalClose.has(id) || reconnectTimers.has(id)) return;
  const attempt = reconnectAttempts.get(id) ?? 0;
  const delay = Math.min(5000, 200 * 2 ** attempt);
  reconnectAttempts.set(id, Math.min(attempt + 1, 6));
  const timer = window.setTimeout(() => {
    reconnectTimers.delete(id);
    ensureSocket(id);
  }, delay);
  reconnectTimers.set(id, timer);
}

function ensureSocket(id: string) {
  const existing = sockets.get(id);
  if (
    existing &&
    (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)
  ) {
    return existing;
  }
  const ws = new WebSocket(socketUrl(id));
  sockets.set(id, ws);
  ws.addEventListener("open", () => {
    reconnectAttempts.set(id, 0);
  });
  ws.addEventListener("message", (event) => {
    let msg: { type?: string; data?: string };
    try {
      msg = JSON.parse(String(event.data));
    } catch {
      return;
    }
    if (msg.type === "output" && typeof msg.data === "string") {
      const data = encoder.encode(msg.data);
      outputHandlers.get(id)?.forEach((handler) => handler(data));
    }
    if (msg.type === "exit") {
      exitHandlers.get(id)?.forEach((handler) => handler());
    }
  });
  ws.addEventListener("close", () => {
    if (sockets.get(id) === ws) sockets.delete(id);
    scheduleReconnect(id);
  });
  return ws;
}

function sendWhenOpen(ws: WebSocket, payload: unknown) {
  const data = JSON.stringify(payload);
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(data);
    return;
  }
  ws.addEventListener("open", () => ws.send(data), { once: true });
}

export function isTauri(): boolean {
  return true;
}

export async function ptySpawn(args: {
  id: string;
  shell?: string;
  cwd?: string;
  cols: number;
  rows: number;
  initialCommand?: string;
}) {
  await request(`/api/terminals`, {
    method: "POST",
    body: JSON.stringify({
      id: args.id,
      shell: args.shell ?? null,
      cwd: args.cwd ?? null,
      cols: args.cols,
      rows: args.rows,
      initialCommand: args.initialCommand ?? null,
    }),
  });
  intentionalClose.delete(args.id);
  ensureSocket(args.id);
}

export async function ptyWrite(id: string, data: string) {
  sendWhenOpen(ensureSocket(id), { type: "input", data });
}

export async function ptyResize(id: string, cols: number, rows: number) {
  sendWhenOpen(ensureSocket(id), { type: "resize", cols, rows });
}

export async function ptyKill(id: string) {
  intentionalClose.add(id);
  const timer = reconnectTimers.get(id);
  if (timer) window.clearTimeout(timer);
  reconnectTimers.delete(id);
  sockets.get(id)?.close();
  sockets.delete(id);
  await request(`/api/terminals/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
}

export function onPtyOutput(id: string, handler: PtyOutputHandler): Promise<UnlistenFn> {
  const set = outputHandlers.get(id) ?? new Set<PtyOutputHandler>();
  set.add(handler);
  outputHandlers.set(id, set);
  intentionalClose.delete(id);
  ensureSocket(id);
  return Promise.resolve(() => {
    const current = outputHandlers.get(id);
    if (!current) return;
    current.delete(handler);
    if (current.size === 0) outputHandlers.delete(id);
    closeSocketIfIdle(id);
  });
}

export function onPtyExit(id: string, handler: PtyExitHandler): Promise<UnlistenFn> {
  const set = exitHandlers.get(id) ?? new Set<PtyExitHandler>();
  set.add(handler);
  exitHandlers.set(id, set);
  intentionalClose.delete(id);
  ensureSocket(id);
  return Promise.resolve(() => {
    const current = exitHandlers.get(id);
    if (!current) return;
    current.delete(handler);
    if (current.size === 0) exitHandlers.delete(id);
    closeSocketIfIdle(id);
  });
}

function closeSocketIfIdle(id: string) {
  if (hasListeners(id)) return;
  intentionalClose.add(id);
  const timer = reconnectTimers.get(id);
  if (timer) window.clearTimeout(timer);
  reconnectTimers.delete(id);
  sockets.get(id)?.close();
  sockets.delete(id);
}

export async function fsList(path: string): Promise<FsEntry[]> {
  return request(`/api/fs/list?path=${encodeURIComponent(path)}`);
}

export async function fsRead(path: string, maxBytes?: number): Promise<string> {
  const res = await request<{ contents: string }>(
    `/api/fs/read?path=${encodeURIComponent(path)}&maxBytes=${encodeURIComponent(
      String(maxBytes ?? 1_000_000),
    )}`,
  );
  return res.contents;
}

export async function fsWriteFile(path: string, contents: string): Promise<void> {
  await request(`/api/fs/write`, { method: "POST", body: JSON.stringify({ path, contents }) });
}

export async function fsHome(): Promise<string> {
  const res = await request<{ path: string }>(`/api/fs/home`);
  return res.path;
}

export async function skillsDiscover(): Promise<DiscoveredSkill[]> {
  return request(`/api/skills/discover`);
}

export async function skillsDiscoverIn(dir: string): Promise<DiscoveredSkill[]> {
  return request(`/api/skills/discover-in?dir=${encodeURIComponent(dir)}`);
}

export async function skillsListRoots(): Promise<SkillRoot[]> {
  return request(`/api/skills/roots`);
}

export async function skillsDefaultDir(): Promise<string> {
  const res = await request<{ path: string }>(`/api/skills/default-dir`);
  return res.path;
}

export async function skillsSaveFile(input: SaveSkillFileInput): Promise<string> {
  const res = await request<{ path: string }>(`/api/skills/save`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.path;
}

export async function skillsDeleteFile(path: string): Promise<void> {
  await request(`/api/skills/delete`, { method: "POST", body: JSON.stringify({ path }) });
}

export async function browserNormalize(url: string): Promise<string> {
  const t = url.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (/^(localhost|127\.0\.0\.1|\[::1\])/.test(t)) return "http://" + t;
  if (t.includes(".") && !t.includes(" ")) return "https://" + t;
  return "https://duckduckgo.com/?q=" + encodeURIComponent(t);
}

export async function detectTools(): Promise<DetectionReport> {
  const report = await request<DetectionReport & { tunnels?: DetectedTool[] }>(`/api/detect/tools`);
  return { ...report, tunnels: report.tunnels ?? [] };
}

export type { DetectedTool, DetectionReport, DiscoveredSkill, FsEntry, SaveSkillFileInput, SkillRoot };
