import { notFound } from "next/navigation";

import { LessonRuntime } from "@/components/lesson-runtime";
import { ApiError, getLearningObject } from "@/lib/api";

export const dynamic = "force-dynamic";

interface ConceptPageProps {
  params: Promise<{ conceptId: string }>;
}

export default async function ConceptPage({ params }: ConceptPageProps) {
  const { conceptId } = await params;

  let lesson;
  try {
    lesson = await getLearningObject(conceptId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <article className="space-y-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-(--color-ink-muted)">
          {lesson.stability} · {lesson.learning.estimatedMinutes} minutes
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{lesson.title}</h1>
        <p className="text-(--color-ink-muted)">{lesson.scope}</p>
      </header>

      <section className="rounded-lg border border-white/10 bg-(--color-surface-raised) p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest">Where you already start</h2>
        <p className="mt-2 text-(--color-ink-muted)">{lesson.beginnerEntry}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest">Objectives</h2>
        <ul className="list-disc space-y-1 pl-5 text-(--color-ink-muted)">
          {lesson.learning.objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest">Work through it</h2>
        <LessonRuntime lesson={lesson} />
      </section>
    </article>
  );
}
