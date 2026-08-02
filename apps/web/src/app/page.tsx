import Link from "next/link";

import { getKnowledgeGraph } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const graph = await getKnowledgeGraph();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Learning path</h1>
        <p className="text-(--color-ink-muted)">
          Every concept below is resolved from the API at request time. The learner surface holds no
          curriculum of its own.
        </p>
      </section>

      <ul className="space-y-3">
        {graph.nodes.map((node) => (
          <li key={node.id}>
            <Link
              href={`/concepts/${node.id}`}
              className="block rounded-lg border border-white/10 bg-(--color-surface-raised) px-5 py-4 transition hover:border-(--color-accent)"
            >
              <span className="text-lg font-medium capitalize">{node.id.replaceAll("-", " ")}</span>
              <p className="mt-1 text-sm text-(--color-ink-muted)">
                {node.prerequisites.length === 0
                  ? "No prerequisites"
                  : `Requires: ${node.prerequisites.join(", ")}`}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {graph.nodes.length === 0 ? (
        <p className="rounded-lg border border-white/10 p-5 text-(--color-ink-muted)">
          The Knowledge Graph is published but currently lists no concepts.
        </p>
      ) : null}

      <p className="text-xs text-(--color-ink-muted)">Knowledge Graph version {graph.version}</p>
    </div>
  );
}
