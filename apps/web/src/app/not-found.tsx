import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Concept not in the graph</h1>
      <p className="text-(--color-ink-muted)">
        Production scope is limited to the Numbers slice under ADR-0006.
      </p>
      <Link href="/" className="text-(--color-accent) underline">
        Back to the learning path
      </Link>
    </div>
  );
}
