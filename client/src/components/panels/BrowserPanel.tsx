import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe,
  Plus,
  RotateCw,
  ShieldAlert,
  X,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useApp, activeWorkspace, type BrowserTab } from "../../state/store";
import { browserNormalize, isTauri } from "../../lib/tauri";

// History state per-tab, kept outside React so it survives tab switches.
const tabHistory = new Map<
  string,
  { stack: string[]; index: number }
>();

function pushHistory(tabId: string, url: string) {
  const h = tabHistory.get(tabId) ?? { stack: [], index: -1 };
  // If we're not at the head, truncate forward.
  if (h.index < h.stack.length - 1) h.stack = h.stack.slice(0, h.index + 1);
  // Avoid duplicates.
  if (h.stack[h.index] !== url) {
    h.stack.push(url);
    h.index = h.stack.length - 1;
  }
  tabHistory.set(tabId, h);
}

function goBack(tabId: string): string | null {
  const h = tabHistory.get(tabId);
  if (!h) return null;
  if (h.index <= 0) return null;
  h.index -= 1;
  return h.stack[h.index] ?? null;
}
function goForward(tabId: string): string | null {
  const h = tabHistory.get(tabId);
  if (!h) return null;
  if (h.index >= h.stack.length - 1) return null;
  h.index += 1;
  return h.stack[h.index] ?? null;
}
function canGoBack(tabId: string) {
  const h = tabHistory.get(tabId);
  return !!h && h.index > 0;
}
function canGoForward(tabId: string) {
  const h = tabHistory.get(tabId);
  return !!h && h.index < h.stack.length - 1;
}

export function BrowserPanel() {
  const ws = useApp(activeWorkspace);
  const newTab = useApp((s) => s.newBrowserTab);
  const setUrl = useApp((s) => s.setBrowserUrl);
  const setActiveTab = useApp((s) => s.setActiveBrowserTab);
  const closeTab = useApp((s) => s.closeBrowserTab);

  const tabs = ws?.browserTabs ?? [];
  const active = tabs.find((t) => t.id === ws?.activeBrowserTabId);
  const [draft, setDraft] = React.useState(active?.url ?? "");
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    setDraft(active?.url ?? "");
  }, [active?.id, active?.url]);

  async function submit() {
    const typed = draft.trim();
    if (!typed) return;
    const url = await browserNormalize(typed);
    if (!url) return;
    if (active) {
      setUrl(active.id, url);
      pushHistory(active.id, url);
    } else {
      newTab(url);
    }
  }

  function reload() {
    setReloadKey((k) => k + 1);
  }

  function back() {
    if (!active) return;
    const prev = goBack(active.id);
    if (prev) setUrl(active.id, prev);
  }

  function forward() {
    if (!active) return;
    const next = goForward(active.id);
    if (next) setUrl(active.id, next);
  }

  async function openExternal(url: string) {
    if (!url) return;
    if (isTauri()) await openUrl(url).catch(() => {});
    else window.open(url, "_blank", "noopener");
  }

  const recent = [
    { letter: "G", title: "github.com", url: "https://github.com" },
    {
      letter: "D",
      title: "developers.cloudflare.com",
      url: "https://developers.cloudflare.com",
    },
    { letter: "T", title: "tauri.app", url: "https://tauri.app" },
    { letter: "1", title: "127.0.0.1", url: "http://127.0.0.1" },
    { letter: "L", title: "localhost", url: "http://localhost:3000" },
  ];

  return (
    <>
      <div className="browser-bar">
        <button
          className="browser-nav-btn"
          title="Back"
          onClick={back}
          disabled={!active || !canGoBack(active.id)}
        >
          <ArrowLeft size={14} />
        </button>
        <button
          className="browser-nav-btn"
          title="Forward"
          onClick={forward}
          disabled={!active || !canGoForward(active.id)}
        >
          <ArrowRight size={14} />
        </button>
        <form
          className="browser-url"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            className="selectable"
            placeholder="enter a url (type a domain, or press ⏎ to search)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            type="button"
            className="browser-nav-btn"
            title="Reload"
            onClick={reload}
          >
            <RotateCw size={13} />
          </button>
          <button
            type="button"
            className="browser-nav-btn"
            title="Open in system browser"
            onClick={() => active && openExternal(active.url)}
            disabled={!active?.url}
          >
            <ExternalLink size={13} />
          </button>
        </form>
        <button
          type="button"
          className="browser-new-tab"
          title="New tab"
          onClick={() => newTab()}
        >
          <Plus size={13} />
        </button>
      </div>

      {tabs.length > 0 && (
        <div className="browser-tabs-row">
          {tabs.map((t) => (
            <div
              key={t.id}
              className={"browser-tab" + (t.id === active?.id ? " active" : "")}
              onClick={() => setActiveTab(t.id)}
              title={t.url || "New tab"}
            >
              <Globe size={11} style={{ flexShrink: 0 }} />
              <span className="browser-tab-title">{tabTitle(t)}</span>
              <button
                className="browser-tab-close"
                aria-label="Close tab"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.id);
                }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="browser-content">
        {active?.url ? (
          <WebView
            key={active.id + ":" + reloadKey}
            url={active.url}
            onLoaded={() => pushHistory(active.id, active.url)}
            onOpenExternal={() => openExternal(active.url)}
          />
        ) : (
          <EmptyState onNewTab={(url) => newTab(url)} recent={recent} />
        )}
      </div>
    </>
  );
}

function tabTitle(t: BrowserTab): string {
  if (!t.url) return "New tab";
  try {
    const u = new URL(t.url);
    return u.host + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return t.url;
  }
}

function EmptyState({
  onNewTab,
  recent,
}: {
  onNewTab: (url?: string) => void;
  recent: { letter: string; title: string; url: string }[];
}) {
  return (
    <div style={{ padding: 16 }}>
      <div className="browser-empty-state">
        <div className="browser-empty-icon">
          <Globe size={18} />
        </div>
        <div className="browser-empty-title">Browser</div>
        <div className="browser-empty-sub">
          Preview <code>localhost</code>, pin docs, or open any URL — all without leaving
          Mesh.
        </div>
        <button className="browser-new-btn" onClick={() => onNewTab()}>
          <Plus size={12} /> New tab
        </button>
      </div>

      <div className="browser-section-label">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 7v5l3 2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Suggestions
      </div>

      {recent.map((r, i) => (
        <div key={i} className="browser-recent-item" onClick={() => onNewTab(r.url)}>
          <div className="browser-fav">{r.letter}</div>
          <div className="browser-recent-text">
            <div className="browser-recent-title">{r.title}</div>
            <div className="browser-recent-url">{r.url}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WebView({
  url,
  onLoaded,
  onOpenExternal,
}: {
  url: string;
  onLoaded: () => void;
  onOpenExternal: () => void;
}) {
  const [state, setState] = React.useState<"loading" | "loaded" | "blocked">("loading");

  React.useEffect(() => {
    setState("loading");
    // If the iframe never fires `load`, assume X-Frame-Options / CSP blocked us.
    const t = window.setTimeout(() => {
      setState((s) => (s === "loading" ? "blocked" : s));
    }, 4500);
    return () => window.clearTimeout(t);
  }, [url]);

  return (
    <div className="webview-wrap">
      <iframe
        className="browser-webview"
        src={url}
        title={url}
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => {
          setState("loaded");
          onLoaded();
        }}
      />
      {state === "loading" && (
        <div className="webview-status">
          <div className="webview-spinner" />
          <div>Loading…</div>
        </div>
      )}
      {state === "blocked" && (
        <div className="webview-status blocked">
          <ShieldAlert size={22} />
          <div className="webview-status-title">This site can't be embedded</div>
          <div className="webview-status-sub">
            The server sent <code>X-Frame-Options</code> or a strict <code>CSP</code>, which
            stops the page from rendering inside Mesh. Open it in your system browser
            instead.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn primary" onClick={onOpenExternal}>
              <ExternalLink size={12} /> Open in system browser
            </button>
            <button className="btn" onClick={() => setState("loading")}>
              <RotateCw size={12} /> Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
