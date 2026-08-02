import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd());

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

test("curriculum graph links every ordered concept to its Learning Object", async () => {
  const graph = await readJson("content/knowledge-graph.v1.json");
  assert.equal(graph.nodes.length, 11);
  assert.equal(graph.nodes[0].id, "numbers");
  assert.equal(graph.nodes.at(-1).id, "linear-regression");

  const seen = new Set();
  for (const node of graph.nodes) {
    const lesson = await readJson(`content/learning-objects/${node.learningObject}`);
    assert.equal(lesson.id, node.id);
    assert.equal(lesson.knowledge.conceptId, node.id);
    assert.deepEqual(lesson.knowledge.prerequisites, node.prerequisites);
    assert.ok(node.prerequisites.every((id) => seen.has(id)));
    seen.add(node.id);
  }
});

test("every curriculum lesson carries the complete LOS v2 learning cycle", async () => {
  const graph = await readJson("content/knowledge-graph.v1.json");
  for (const node of graph.nodes) {
    const lesson = await readJson(`content/learning-objects/${node.learningObject}`);
    assert.equal(lesson.version, "2.0.0");
    assert.equal(lesson.provenance.status, "validated");
    assert.ok(lesson.learning.objectives.length >= 4);
    assert.ok(lesson.measurement.successCriteria.length >= 5);
    assert.ok(lesson.reasoning.misconceptions.length >= 4);
    const kinds = new Set(lesson.learning.steps.map((step) => step.kind));
    for (const kind of ["observe", "wonder", "predict", "experiment", "fail", "discover", "explain", "apply"]) assert.ok(kinds.has(kind), `${node.id}: missing ${kind}`);
  }
});

test("every curriculum lesson carries knowledge assets, a playable experiment, and a mastery rubric", async () => {
  const graph = await readJson("content/knowledge-graph.v1.json");
  for (const node of graph.nodes) {
    const lesson = await readJson(`content/learning-objects/${node.learningObject}`);
    assert.ok(lesson.knowledge.mentalModels.length >= 2, `${node.id}: mental models`);
    assert.ok(lesson.knowledge.analogies.length >= 2, `${node.id}: analogies`);
    for (const analogy of lesson.knowledge.analogies) assert.ok(analogy.strength >= 1 && analogy.strength <= 5);
    assert.ok(lesson.knowledge.history.length >= 40, `${node.id}: history`);
    assert.ok(["timeless", "mostly-timeless", "stable", "rapidly-evolving"].includes(lesson.stability));
    assert.equal(typeof lesson.nextConcept, "string");
    assert.ok(lesson.learning.experiments.length >= 1, `${node.id}: experiment spec`);
    const experimentIds = new Set(lesson.learning.experiments.map((experiment) => experiment.id));
    const experimentSteps = lesson.learning.steps.filter((step) => step.kind === "experiment");
    assert.ok(experimentSteps.length >= 1, `${node.id}: experiment step`);
    for (const step of experimentSteps) assert.ok(experimentIds.has(step.experimentId), `${node.id}: experiment step reference`);
    assert.ok(lesson.measurement.masteryRubric.checks.length >= 5, `${node.id}: rubric checks`);
    assert.ok(lesson.measurement.masteryRubric.threshold >= 3, `${node.id}: rubric threshold`);
    for (const check of lesson.measurement.masteryRubric.checks) assert.doesNotThrow(() => new RegExp(check.pattern, "i"));
  }
});

test("every curriculum lesson runs at least two depth loops and bridges forward", async () => {
  const graph = await readJson("content/knowledge-graph.v1.json");
  for (const node of graph.nodes) {
    const lesson = await readJson(`content/learning-objects/${node.learningObject}`);

    assert.ok(lesson.learning.steps.length >= 10, `${node.id}: at least ten steps for two depth loops`);
    const stageCounts = lesson.learning.steps.reduce((counts, step) => {
      counts[step.kind] = (counts[step.kind] || 0) + 1;
      return counts;
    }, {});
    for (const stage of ["observe", "wonder", "predict", "explain", "apply"]) {
      assert.ok(stageCounts[stage] >= 2, `${node.id}: ${stage} requires at least two depth-loop steps`);
    }

    const finalStep = lesson.learning.steps.at(-1);
    assert.equal(finalStep.kind, "apply", `${node.id}: lesson must end in an apply step`);
    assert.ok(finalStep.prompt.length > 120, `${node.id}: final apply step must be a substantive engineering bridge`);

    for (const step of lesson.learning.steps) {
      assert.ok(step.prompt.length > 60, `${node.id}: every step prompt must be a substantive scenario`);
    }
  }
});

test("Numbers lesson is validated and beginner-complete under LOS v2.0", async () => {
  const lesson = await readJson("content/learning-objects/numbers.v2.json");

  assert.equal(lesson.provenance.status, "validated");
  assert.match(lesson.beginnerEntry, /No formal mathematics is assumed/i);
  assert.ok(lesson.learning.objectives.length >= 4);
  assert.ok(lesson.learning.estimatedMinutes >= 30);

  const stageCounts = lesson.learning.steps.reduce((counts, step) => {
    counts[step.kind] = (counts[step.kind] || 0) + 1;
    return counts;
  }, {});

  for (const stage of ["observe", "wonder", "predict", "explain", "apply"]) {
    assert.ok(stageCounts[stage] >= 2, `${stage} requires at least two depth-loop steps`);
  }

  assert.ok(lesson.measurement.prePrompt.length > 40);
  assert.ok(lesson.measurement.postPrompt.length > 40);
  assert.ok(lesson.measurement.successCriteria.length >= 5);
  assert.ok(lesson.reasoning.misconceptions.length >= 4);
  assert.ok(lesson.reasoning.tutorGuidance.length > 80);
});
