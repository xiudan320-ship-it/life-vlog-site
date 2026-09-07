import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { preview } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const baseUrl = "http://127.0.0.1:4176";
const server = await preview({ root, preview: { host: "127.0.0.1", port: 4176, strictPort: true, open: false } });
try {
  for (const test of ["tests/axe-regression.mjs", "tests/release-smoke.mjs"]) {
    // Run asynchronously: the preview server needs this process's event loop.
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [test], {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env, A11Y_BASE_URL: baseUrl, RELEASE_BASE_URL: baseUrl },
      });
      child.on("error", reject);
      child.on("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${test} failed (${signal || code})`)));
    });
  }
} finally {
  await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
}
