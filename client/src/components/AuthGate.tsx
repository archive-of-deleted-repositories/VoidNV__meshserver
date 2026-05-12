import React from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";

type AuthState =
  | { loading: true; setupRequired: false }
  | { loading: false; setupRequired: boolean; user: { username: string } | null };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    loading: true,
    setupRequired: false,
  });
  const [username, setUsername] = React.useState("admin");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  async function refresh() {
    const next = await api<{ setupRequired: boolean; user: { username: string } | null }>(
      "/api/auth/status",
    );
    setState({ loading: false, ...next });
  }

  React.useEffect(() => {
    refresh().catch(() => {
      setState({ loading: false, setupRequired: false, user: null });
      setError("Mesh Server is not reachable.");
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api(state.setupRequired ? "/api/auth/setup" : "/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      await refresh();
    } catch {
      setError(state.setupRequired ? "Could not create admin user." : "Invalid login.");
    }
  }

  if (state.loading) return <div className="app-root" />;
  if (state.user) return <>{children}</>;

  return (
    <div className="app-root">
      <div className="welcome">
        <div className="welcome-logo">
          <div className="welcome-logo-icon">
            <Logo size={48} />
          </div>
          <div className="welcome-logo-text">Mesh</div>
        </div>
        <h1 className="welcome-headline">
          {state.setupRequired ? "Create server admin" : "Sign in to server"}
        </h1>
        <p className="welcome-sub">Terminal, file, and skill access require a session.</p>
        <form className="welcome-options" onSubmit={submit} style={{ maxWidth: 360 }}>
          <label className="input selectable">
            <input
              className="selectable"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
            />
          </label>
          <label className="input selectable">
            <input
              className="selectable"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              autoComplete={state.setupRequired ? "new-password" : "current-password"}
            />
          </label>
          {error && <div className="text-muted">{error}</div>}
          <button className="welcome-option" type="submit">
            <div className="welcome-option-icon">
              {state.setupRequired ? <ShieldCheck size={18} /> : <LogIn size={18} />}
            </div>
            <span className="welcome-option-text">
              <span className="welcome-option-title">
                {state.setupRequired ? "Create admin" : "Log in"}
              </span>
              <span className="welcome-option-desc">HTTP-only cookie session</span>
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
