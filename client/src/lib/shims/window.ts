export function getCurrentWindow() {
  return {
    async minimize() {},
    async toggleMaximize() {},
    async isMaximized() {
      return false;
    },
    async close() {},
    async isFullscreen() {
      return !!document.fullscreenElement;
    },
    async setFullscreen(next: boolean) {
      if (next && !document.fullscreenElement) await document.documentElement.requestFullscreen();
      if (!next && document.fullscreenElement) await document.exitFullscreen();
    },
  };
}
