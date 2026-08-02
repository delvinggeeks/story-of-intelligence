#!/usr/bin/env node
// Cross-platform telemetry opt-out: env must be set before the Next CLI initialises.
process.env.NEXT_TELEMETRY_DISABLED ??= "1";

await import("next/dist/bin/next");
