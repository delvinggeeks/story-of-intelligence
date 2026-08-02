"use client";

/** Global fallback so an API outage renders an explanation rather than a blank page. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section role="alert" className="space-y-4 rounded-lg border border-white/10 p-6">
      <h1 className="text-xl font-semibold">The Academy is not responding</h1>
      <p className="text-(--color-ink-muted)">
        We could not reach the API that serves the curriculum. Nothing you have saved is affected.
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
