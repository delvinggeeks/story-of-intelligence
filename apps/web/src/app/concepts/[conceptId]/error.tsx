"use client";

/**
 * Shown when the lesson itself cannot be fetched, which in practice means the API is down.
 * The message says what is wrong and what the learner can do, and never leaks a stack trace.
 */
export default function ConceptError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section role="alert" className="space-y-4 rounded-lg border border-white/10 p-6">
      <h1 className="text-xl font-semibold">This lesson could not be loaded</h1>
      <p className="text-(--color-ink-muted)">
        The Academy API did not respond. Your saved progress is not lost; it is stored on the
        server and will reappear once the connection is restored.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-white/20 px-4 py-2 text-sm hover:border-(--color-accent)"
      >
        Try again
      </button>
    </section>
  );
}
