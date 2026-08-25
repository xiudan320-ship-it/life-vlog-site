import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const styleFiles = [
  "redesign-foundation.css",
  "redesign-components.css",
  "content-forms.css",
  "mobile-diary.css",
  "account-dialogs.css",
  "secret-gallery.css",
  "diary-reader.css",
  "secret-filters.css",
  "diary-comments.css",
  "feature-inspector.css",
  "wishlist-compact.css",
  "media-upload.css",
];

const normalize = (value) => value.replace(/\s+/g, " ").trim();

function collectLeafRules(source, file) {
  const cleanSource = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => " ".repeat(comment.length));
  const stack = [];
  const rules = [];
  let blockStart = 0;

  for (let index = 0; index < cleanSource.length; index += 1) {
    const character = cleanSource[index];
    if (character === "{") {
      const header = normalize(cleanSource.slice(blockStart, index));
      assert.ok(header, `${file} contains a block without a selector or at-rule.`);
      if (stack.length) stack.at(-1).hasChild = true;
      stack.push({ header, bodyStart: index + 1, hasChild: false });
      blockStart = index + 1;
      continue;
    }

    if (character !== "}") continue;
    const block = stack.pop();
    assert.ok(block, `${file} contains an unmatched closing brace.`);
    if (!block.hasChild) {
      const context = stack.map(({ header }) => header).join(" > ");
      const body = normalize(cleanSource.slice(block.bodyStart, index));
      rules.push({
        key: `${context}||${block.header}{${body}}`,
        label: `${context ? `${context} > ` : ""}${block.header}`,
        file,
      });
    }
    blockStart = index + 1;
  }

  assert.equal(stack.length, 0, `${file} contains an unclosed CSS block.`);
  return rules;
}

const sources = await Promise.all(
  styleFiles.map(async (file) => ({
    file,
    source: await readFile(path.join(root, "styles", file), "utf8"),
  })),
);
for (const { file, source } of sources) {
  const localUrls = [...source.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)]
    .map((match) => match[1].trim())
    .filter((url) => !/^(?:data:|https?:|#)/i.test(url));
  for (const url of localUrls) {
    const resourcePath = path.resolve(root, "styles", path.dirname(file), url.split(/[?#]/)[0]);
    await access(resourcePath).catch(() => {
      assert.fail(`${file} references a missing local resource: ${url}`);
    });
  }
}
const groups = new Map();
for (const { file, source } of sources) {
  for (const rule of collectLeafRules(source, file)) {
    const matches = groups.get(rule.key) || [];
    matches.push(rule);
    groups.set(rule.key, matches);
  }
}

const duplicates = [...groups.values()].filter((matches) => matches.length > 1);
assert.deepEqual(
  duplicates,
  [],
  `Duplicate contextual CSS rules:\n${duplicates
    .map((matches) => `${matches[0].label} (${matches.map(({ file }) => file).join(", ")})`)
    .join("\n")}`,
);

console.log("CSS health checks passed.");
