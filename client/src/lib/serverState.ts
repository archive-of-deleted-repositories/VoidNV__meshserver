import type { Workspace } from "../state/store";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

type WorkspaceRow = {
  id: string;
  state_json?: string;
  stateJson?: string;
};

export async function loadServerWorkspaces(): Promise<Workspace[]> {
  const rows = await request<WorkspaceRow[]>("/api/workspaces");
  return rows
    .map((row) => {
      try {
        return JSON.parse(row.state_json ?? row.stateJson ?? "") as Workspace;
      } catch {
        return null;
      }
    })
    .filter((w): w is Workspace => !!w);
}

export async function saveServerWorkspace(workspace: Workspace): Promise<void> {
  await request(`/api/workspaces/${encodeURIComponent(workspace.id)}`, {
    method: "PUT",
    body: JSON.stringify({
      id: workspace.id,
      name: workspace.name,
      color: workspace.color,
      cwd: workspace.cwd,
      mode: workspace.mode,
      stateJson: JSON.stringify(workspace),
    }),
  });
}

export async function deleteServerWorkspace(id: string): Promise<void> {
  await request(`/api/workspaces/${encodeURIComponent(id)}`, { method: "DELETE" });
}
