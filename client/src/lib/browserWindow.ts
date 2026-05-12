export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}

export async function setFullscreen(next: boolean): Promise<void> {
  if (next && !document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  }
  if (!next && document.fullscreenElement) {
    await document.exitFullscreen();
  }
}

export async function toggleFullscreen(): Promise<boolean> {
  const next = !isFullscreen();
  await setFullscreen(next);
  return next;
}

export async function minimizeWindow(): Promise<void> {
  window.blur();
}

export async function toggleMaximizeWindow(): Promise<boolean> {
  return toggleFullscreen();
}

export async function closeWindow(): Promise<void> {
  window.close();
}
