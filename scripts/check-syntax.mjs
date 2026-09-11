import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const roots = ["app.js", "src", "modules", "cloudflare-worker/src"];

async function collectJavaScript(path) {
  const info = await stat(path);
  if (info.isFile()) return path.endsWith(".js") ? [path] : [];
  const children = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const child of children) {
    files.push(...await collectJavaScript(resolve(path, child.name)));
  }
  return files;
}

function check(file) {
  return new Promise((resolveCheck, rejectCheck) => {
    execFile(process.execPath, ["--check", relative(root, file)], { cwd: root, encoding: "utf8" }, (error, stdout, stderr) => {
      if (!error) {
        resolveCheck();
        return;
      }
      const details = (stderr || stdout || error.message).trim();
      rejectCheck(new Error(`${relative(root, file)}\n${details}`));
    });
  });
}

const files = (await Promise.all(roots.map((entry) => collectJavaScript(resolve(root, entry)))))
  .flat()
  .sort();
for (const file of files) await check(file);
console.log(`Syntax checks passed: ${files.length} JavaScript files.`);
