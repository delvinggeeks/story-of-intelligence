import { readFile } from "node:fs/promises";

const [schemaPath, objectPath] = process.argv.slice(2);
if (!schemaPath || !objectPath) {
  throw new Error("Usage: node scripts/validate-learning-object.mjs <schema> <learning-object>");
}

const schema = JSON.parse(await readFile(schemaPath, "utf8"));
const object = JSON.parse(await readFile(objectPath, "utf8"));
const errors = [];

function validate(value, rule, location = "$") {
  if (rule.type === "object") {
    if (!value || Array.isArray(value) || typeof value !== "object") return errors.push(`${location} must be an object`);
    for (const key of rule.required ?? []) if (!(key in value)) errors.push(`${location} missing required field: ${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (!(key in (rule.properties ?? {}))) {
        if (rule.additionalProperties === false) errors.push(`${location} has unexpected field: ${key}`);
      } else validate(item, rule.properties[key], `${location}.${key}`);
    }
  } else if (rule.type === "array") {
    if (!Array.isArray(value)) return errors.push(`${location} must be an array`);
    if (rule.minItems && value.length < rule.minItems) errors.push(`${location} needs at least ${rule.minItems} items`);
    if (rule.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${location} items must be unique`);
    value.forEach((item, index) => validate(item, rule.items, `${location}[${index}]`));
  } else if (rule.type === "string") {
    if (typeof value !== "string") return errors.push(`${location} must be a string`);
    if (rule.minLength && value.length < rule.minLength) errors.push(`${location} is too short`);
    if (rule.pattern && !(new RegExp(rule.pattern).test(value))) errors.push(`${location} does not match its required pattern`);
  } else if (rule.type === "integer" && (!Number.isInteger(value) || (rule.minimum !== undefined && value < rule.minimum))) {
    errors.push(`${location} must be an integer meeting its minimum`);
  }
  if (rule.enum && !rule.enum.includes(value)) errors.push(`${location} is not an allowed value`);
}

validate(object, schema);
if (object.knowledge?.conceptId !== object.id) errors.push("knowledge.conceptId must equal id");
const expectedSteps = ["observe", "wonder", "predict", "explain", "apply"];
for (const step of expectedSteps) if (!object.learning?.steps?.some((item) => item.kind === step)) errors.push(`missing learning step: ${step}`);
if (errors.length) throw new Error(`LOS validation failed:\n- ${errors.join("\n- ")}`);
console.log(`LOS validation passed: ${object.id} v${object.version}`);
