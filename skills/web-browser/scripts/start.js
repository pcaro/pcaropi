#!/usr/bin/env node

import { spawn, execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const useProfile = process.argv[2] === "--profile";

if (process.argv[2] && process.argv[2] !== "--profile") {
  console.log("Usage: start.ts [--profile]");
  console.log("\nOptions:");
  console.log(
    "  --profile  Copy your default Chrome profile (cookies, logins)",
  );
  console.log("\nExamples:");
  console.log("  start.ts            # Start with fresh profile");
  console.log("  start.ts --profile  # Start with your Chrome profile");
  process.exit(1);
}

const isMac = process.platform === "darwin";
const isLinux = process.platform === "linux";

// Find Chrome profile directory based on platform
function getChromeProfileDir() {
  if (isMac) {
    return `${process.env.HOME}/Library/Application Support/Google/Chrome`;
  }
  if (isLinux) {
    // Try common Linux paths in order
    const candidates = [
      `${process.env.HOME}/.config/google-chrome`,
      `${process.env.HOME}/.config/google-chrome-stable`,
      `${process.env.HOME}/.config/google-chrome-beta`,
      `${process.env.HOME}/.config/chromium`,
    ];
    for (const dir of candidates) {
      try {
        execSync(`test -d "${dir}"`, { stdio: "ignore" });
        return dir;
      } catch {}
    }
  }
  return null;
}

// Find Chrome executable
function getChromePath() {
  if (isMac) {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }
  if (isLinux) {
    // Try common Linux paths
    const candidates = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome-beta",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
    ];
    for (const path of candidates) {
      try {
        execSync(`test -x "${path}"`, { stdio: "ignore" });
        return path;
      } catch {}
    }
  }
  return "/usr/bin/google-chrome";
}

// Kill existing Chrome
try {
  const killCmd = isMac ? "killall 'Google Chrome'" : "pkill -f chrome";
  execSync(killCmd, { stdio: "ignore" });
} catch {}

// Wait a bit for processes to fully die
await new Promise((r) => setTimeout(r, 1000));

// Setup profile directory
execSync("mkdir -p ~/.cache/scraping", { stdio: "ignore" });

if (useProfile) {
  const profileDir = getChromeProfileDir();
  if (profileDir) {
    // Sync profile with rsync (much faster on subsequent runs)
    execSync(
      `rsync -a --delete "${profileDir}/" ~/.cache/scraping/`,
      { stdio: "pipe" },
    );
  } else {
    console.error("Warning: Could not find Chrome profile directory, starting fresh");
  }
}

const chromePath = getChromePath();

// Start Chrome in background (detached so Node can exit)
spawn(
  chromePath,
  [
    "--remote-debugging-port=9222",
    `--user-data-dir=${process.env["HOME"]}/.cache/scraping`,
    "--profile-directory=Default",
    "--disable-search-engine-choice-screen",
    "--no-first-run",
    "--disable-features=ProfilePicker",
    "--headless=new",
  ],
  { detached: true, stdio: "ignore" },
).unref();

// Wait for Chrome to be ready by checking the debugging endpoint
let connected = false;
let webSocketUrl = null;

for (let i = 0; i < 60; i++) {
  try {
    const response = await fetch("http://localhost:9222/json/version");
    if (response.ok) {
      const data = await response.json();
      webSocketUrl = data.webSocketDebuggerUrl;
      connected = true;
      break;
    }
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  }
}

if (!connected) {
  console.error("✗ Failed to connect to Chrome HTTP endpoint");
  process.exit(1);
}

// Extra wait to ensure WebSocket is fully ready
await new Promise((r) => setTimeout(r, 1000));

// Verify WebSocket is responding
let wsReady = false;
for (let i = 0; i < 5; i++) {
  try {
    const WebSocket = (await import("ws")).default;
    const ws = new WebSocket(webSocketUrl);
    wsReady = await new Promise((resolve) => {
      ws.on("open", () => {
        ws.close();
        resolve(true);
      });
      ws.on("error", () => resolve(false));
      setTimeout(() => resolve(false), 3000);
    });
    if (wsReady) break;
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  }
}

if (!wsReady) {
  console.error("✗ Chrome HTTP ready but WebSocket not responding");
  console.error("  Try: pkill -9 chrome && ./scripts/start.js");
  process.exit(1);
}

// Start background watcher for logs/network (detached)
const scriptDir = dirname(fileURLToPath(import.meta.url));
const watcherPath = join(scriptDir, "watch.js");
spawn(process.execPath, [watcherPath], { detached: true, stdio: "ignore" }).unref();

console.log(
  `✓ Chrome started on :9222${useProfile ? " with your profile" : ""}`,
);
