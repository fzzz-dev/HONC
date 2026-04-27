import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_HOST = "127.0.0.1";
const BACKEND_PORT = Number(process.env.VITE_BACKEND_PORT || 5000);
const BACKEND_TARGET = `http://${BACKEND_HOST}:${BACKEND_PORT}`;
const BACKEND_DIR = path.resolve(__dirname, "../Backend");

let backendProcess = null;
let startedByVite = false;
let cleanupRegistered = false;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (isOpen) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(isOpen);
    };

    socket.setTimeout(1000);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function waitForPort(host, port, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen(host, port)) return;
    await delay(400);
  }

  throw new Error(`Backend did not start on ${host}:${port} in time.`);
}

function registerCleanup() {
  if (cleanupRegistered) return;
  cleanupRegistered = true;

  const stopBackend = () => {
    if (startedByVite && backendProcess && !backendProcess.killed) {
      backendProcess.kill();
    }
  };

  process.on("exit", stopBackend);
  process.on("SIGINT", () => {
    stopBackend();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stopBackend();
    process.exit(0);
  });
}

async function ensureBackendRunning() {
  if (await isPortOpen(BACKEND_HOST, BACKEND_PORT)) return;

  if (!backendProcess) {
    backendProcess = spawn(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", "dev"],
      {
        cwd: BACKEND_DIR,
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          PORT: String(BACKEND_PORT),
        },
      },
    );

    startedByVite = true;
    registerCleanup();

    backendProcess.once("exit", () => {
      backendProcess = null;
      startedByVite = false;
    });
  }

  await waitForPort(BACKEND_HOST, BACKEND_PORT);
}

export default defineConfig(async ({ command }) => {
  if (command === "serve") {
    await ensureBackendRunning();
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: BACKEND_TARGET,
          changeOrigin: true,
        },
        "/uploads": {
          target: BACKEND_TARGET,
          changeOrigin: true,
        },
      },
    },
  };
});
