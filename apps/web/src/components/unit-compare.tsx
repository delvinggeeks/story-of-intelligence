"use client";

import { useId, useState } from "react";

import type { Experiment } from "@/types/academy";

interface Side {
  label: string;
  value: number;
  unit: string;
  factor: number;
}

/**
 * The config is content-owned, so it is parsed defensively rather than cast. A malformed
 * experiment must degrade to a readable message, not crash the lesson.
 */
function readSide(config: Record<string, unknown>, key: string): Side | null {
  const raw = config[key];
  if (typeof raw !== "object" || raw === null) return null;
  const side = raw as Record<string, unknown>;
  if (
    typeof side.label !== "string" ||
    typeof side.value !== "number" ||
    typeof side.unit !== "string" ||
    typeof side.factor !== "number"
  ) {
    return null;
  }
  return { label: side.label, value: side.value, unit: side.unit, factor: side.factor };
}

const COMPACT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function UnitCompare({
  experiment,
  onPerformed,
}: {
  experiment: Experiment;
  onPerformed: (normalized: boolean) => void;
}) {
  const [normalized, setNormalized] = useState(false);
  const headingId = useId();

  const a = readSide(experiment.config, "a");
  const b = readSide(experiment.config, "b");

  if (!a || !b) {
    return (
      <p className="mt-3 text-sm text-(--color-ink-muted)">
        This experiment could not be displayed because its configuration is incomplete.
      </p>
    );
  }

  const magnitude = (side: Side) => (normalized ? side.value * side.factor : side.value);
  const largest = Math.max(magnitude(a), magnitude(b)) || 1;

  const toggle = () => {
    const next = !normalized;
    setNormalized(next);
    onPerformed(next);
  };

  const renderBar = (side: Side) => (
    <div key={side.label} className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{side.label}</span>
        <span className="text-(--color-ink-muted)">
          {COMPACT.format(magnitude(side))} {normalized ? "(same unit)" : side.unit}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-(--color-accent) transition-all duration-500"
          style={{ width: `${Math.max((magnitude(side) / largest) * 100, 2)}%` }}
        />
      </div>
    </div>
  );

  return (
    <section
      aria-labelledby={headingId}
      className="mt-4 space-y-4 rounded-lg border border-white/10 bg-black/20 p-4"
    >
      <div>
        <h3 id={headingId} className="text-sm font-semibold">
          {experiment.title}
        </h3>
        <p className="mt-1 text-sm text-(--color-ink-muted)">{experiment.instructions}</p>
      </div>

      <div className="space-y-3">
        {renderBar(a)}
        {renderBar(b)}
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-pressed={normalized}
        className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium hover:border-(--color-accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
      >
        {normalized ? "Show the raw numbers again" : "Normalize the units"}
      </button>

      <p aria-live="polite" className="text-sm text-(--color-ink-muted)">
        {normalized
          ? "Now both bars are measured the same way, so the comparison is meaningful."
          : "The bars use different units, so their sizes cannot be compared yet."}
      </p>
    </section>
  );
}
