import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

try {
  const pty = require("node-pty");
  const shell = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : process.env.SHELL || "bash";
  const term = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: { ...process.env, TERM: "xterm-256color" },
  });
  term.kill();
  console.log(`node-pty OK: spawned ${shell}`);
} catch (err) {
  console.error("node-pty check failed.");
  console.error(err instanceof Error ? err.message : String(err));
  console.error("");
  console.error("Ubuntu fix:");
  console.error("  sudo apt-get update && sudo apt-get install -y build-essential python3 make g++");
  console.error("  npm run rebuild:pty");
  process.exit(1);
}
