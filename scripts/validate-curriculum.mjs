import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(process.cwd());
const schemaPath = resolve(root, "schemas/learning-object.schema.v2.json");
const objectDir = resolve(root, "content/learning-objects");
const graph = JSON.parse(await readFile(resolve(root, "content/knowledge-graph.v1.json"), "utf8"));
const files = (await readdir(objectDir)).filter((file) => file.endsWith(".json")).sort();
const errors = [];
const seen = new Set();

for (const node of graph.nodes) {
  if (seen.has(node.id)) errors.push(`duplicate graph id: ${node.id}`);
  for (const prerequisite of node.prerequisites) {
    if (!seen.has(prerequisite)) errors.push(`${node.id} prerequisite must reference an earlier node: ${prerequisite}`);
  }
  seen.add(node.id);

  if (!files.includes(node.learningObject)) {
    errors.push(`${node.id} missing Learning Object: ${node.learningObject}`);
    continue;
  }
  const objectPath = resolve(objectDir, node.learningObject);
  const lesson = JSON.parse(await readFile(objectPath, "utf8"));
  if (lesson.id !== node.id) errors.push(`${node.id} does not match Learning Object id: ${lesson.id}`);
  if (JSON.stringify(lesson.knowledge.prerequisites) !== JSON.stringify(node.prerequisites)) {
    errors.push(`${node.id} prerequisites differ between graph and Learning Object`);
  }
  const validation = spawnSync(process.execPath, [resolve(root, "scripts/validate-learning-object.mjs"), schemaPath, objectPath], { encoding: "utf8" });
  if (validation.status !== 0) errors.push(validation.stderr.trim() || `${node.id} failed LOS validation`);
}

for (const file of files) {
  if (!graph.nodes.some((node) => node.learningObject === file)) errors.push(`unmapped Learning Object: ${file}`);
}

if (errors.length) throw new Error(`Curriculum validation failed:\n- ${errors.join("\n- ")}`);
console.log(`Curriculum validation passed: ${graph.nodes.length} graph nodes and ${files.length} Learning Objects`);