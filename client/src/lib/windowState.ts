import { isFullscreen, setFullscreen } from "./browserWindow";

function setFullscreenDataset(fullscreen: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.fullscreen = fullscreen ? "true" : "false";
}

export async function syncFullscreenState(): Promise<boolean> {
  try {
    const fullscreen = isFullscreen();
    setFullscreenDataset(fullscreen);
    return fullscreen;
  } catch {
    setFullscreenDataset(false);
    return false;
  }
}

export async function toggleAppFullscreen(): Promise<boolean> {
  try {
    const next = !isFullscreen();
    await setFullscreen(next);
    setFullscreenDataset(next);
    return next;
  } catch {
    return false;
  }
}
