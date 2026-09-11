import { readFile } from "node:fs/promises";
import { parse } from "acorn";

function propertyName(property) {
  if (property.type !== "Property" || property.kind !== "init" || property.computed) return null;
  if (property.key.type === "Identifier") return property.key.name;
  if (property.key.type === "Literal" && typeof property.key.value === "string") return property.key.value;
  return null;
}

function literalValue(node) {
  return node?.type === "Literal" ? node.value : undefined;
}

function readManifestCandidate(node) {
  if (node.type !== "ArrayExpression" || !node.elements.length) return null;
  const entries = [];
  for (const element of node.elements) {
    if (!element || element.type !== "ObjectExpression") return null;
    const properties = new Map(
      element.properties
        .map((property) => [propertyName(property), property.value])
        .filter(([name]) => name),
    );
    const url = literalValue(properties.get("url"));
    const revision = literalValue(properties.get("revision"));
    if (typeof url !== "string" || !(typeof revision === "string" || revision === null)) return null;
    entries.push({ url, revision });
  }
  return entries;
}

function collectArrayCandidates(node, candidates) {
  if (!node || typeof node !== "object") return;
  if (node.type === "CallExpression") {
    for (const argument of node.arguments) {
      const candidate = readManifestCandidate(argument);
      if (candidate) candidates.push(candidate);
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    if (Array.isArray(value)) {
      for (const child of value) collectArrayCandidates(child, candidates);
    } else {
      collectArrayCandidates(value, candidates);
    }
  }
}

export function parseWorkboxPrecacheManifest(source) {
  let ast;
  try {
    ast = parse(String(source), { ecmaVersion: "latest", sourceType: "module" });
  } catch (error) {
    throw new Error(`sw.js is not valid JavaScript: ${error.message}`);
  }
  const candidates = [];
  collectArrayCandidates(ast, candidates);
  if (candidates.length !== 1) {
    throw new Error(`expected one Workbox precache manifest, found ${candidates.length}`);
  }
  const entries = candidates[0];
  const urls = entries.map(({ url }) => url);
  if (new Set(urls).size !== urls.length) throw new Error("Workbox precache manifest contains duplicate URLs");
  return entries;
}

export async function readWorkboxManifest(path) {
  return parseWorkboxPrecacheManifest(await readFile(path, "utf8"));
}
