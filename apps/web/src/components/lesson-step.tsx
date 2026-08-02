import type { Step } from "@/types/academy";

export function LessonStep({ step, index }: { step: Step; index: number }) {
  return (
    <li className="rounded-lg border border-white/10 bg-(--color-surface-raised) p-5">
      <div className="flex items-baseline gap-3">
        <span className="text-xs text-(--color-ink-muted)">{String(index + 1).padStart(2, "0")}</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-(--color-accent)">
          {step.label}
        </span>
      </div>
      <p className="mt-2">{step.prompt}</p>
      {step.experimentId ? (
        <p className="mt-3 text-xs text-(--color-ink-muted)">
          Interactive experiment <code>{step.experimentId}</code> is delivered by the backend
          contract in Phase D.
        </p>
      ) : null}
    </li>
  );
}
