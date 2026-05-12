import { getCurrentWindow } from "@tauri-apps/api/window";

function setFullscreenDataset(fullscreen: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.fullscreen = fullscreen ? "true" : "false";
}

export async function syncFullscreenState(): Promise<boolean> {
  try {
    const fullscreen = await getCurrentWindow().isFullscreen();
    setFullscreenDataset(fullscreen);
    return fullscreen;
  } catch {
    setFullscreenDataset(false);
    return false;
  }
}

export async function toggleAppFullscreen(): Promise<boolean> {
  try {
    const w = getCurrentWindow();
    const next = !(await w.isFullscreen());
    await w.setFullscreen(next);
    setFullscreenDataset(next);
    return next;
  } catch {
    return false;
  }
}
