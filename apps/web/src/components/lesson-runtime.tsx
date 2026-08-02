"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { UnitCompare } from "@/components/unit-compare";
import {
  LearnerApiError,
  appendEvidence,
  createLearner,
  getLearner,
  getProgress,
  resumeSession,
} from "@/lib/learner-api";
import { readStoredLearnerId, storeLearnerId } from "@/lib/learner-identity";
import { EVIDENCE_KIND, type ConceptProgress, type LearningObject } from "@/types/academy";

type Status = "loading" | "ready" | "unavailable";

/**
 * The learner journey for one Learning Object.
 *
 * Positions run: 0 = the opening prompt, 1..N = the authored steps, N+1 = the closing
 * prompt. Every position change records a fact ("this step was viewed"); nothing here
 * judges the learner. The verdict comes back from the server projection.
 */
export function LessonRuntime({ lesson }: { lesson: LearningObject }) {
  const steps = lesson.learning.steps;
  const lastPosition = steps.length + 1;

  const [status, setStatus] = useState<Status>("loading");
  const [failure, setFailure] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [learnerId, setLearnerId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ConceptProgress | null>(null);
  const [position, setPosition] = useState(0);
  const [preText, setPreText] = useState("");
  const [postText, setPostText] = useState("");
  const [saving, setSaving] = useState(false);

  // Re-viewing a step is not new information, so it is not re-recorded in this sitting.
  const recordedSteps = useRef(new Set<number>());

  const describe = (error: unknown) =>
    error instanceof LearnerApiError && error.status === 0
      ? "We cannot reach the Academy right now, so your progress is not being saved. The lesson text below still works."
      : error instanceof Error
        ? error.message
        : "Something went wrong.";

  const refreshProgress = useCallback(
    async (id: string) => {
      setProgress(await getProgress(id, lesson.id));
    },
    [lesson.id],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const stored = readStoredLearnerId(window.localStorage);
        // A stored id can outlive the database it came from, so it is confirmed, not trusted.
        let id = stored;
        if (id) {
          try {
            await getLearner(id);
          } catch (error) {
            if (error instanceof LearnerApiError && error.status === 404) {
              id = null;
            } else {
              throw error;
            }
          }
        }
        if (!id) {
          id = (await createLearner()).id;
        }
        storeLearnerId(window.localStorage, id);

        const session = await resumeSession(id, lesson.id);
        const current = await getProgress(id, lesson.id);
        if (cancelled) return;

        setLearnerId(id);
        setSessionId(session.id);
        setProgress(current);
        setPreText(current.preReflection ?? "");
        setPostText(current.postReflection ?? "");
        for (const index of current.stepsViewed) {
          recordedSteps.current.add(index);
        }
        // Returning learners resume just past the furthest step they had reached.
        if (current.furthestStepIndex !== null) {
          setPosition(Math.min(current.furthestStepIndex + 1, lastPosition));
        }
        setStatus("ready");

        if (current.eventsConsidered === 0) {
          await appendEvidence(session.id, {
            kind: EVIDENCE_KIND.lessonStarted,
            conceptVersion: lesson.version,
          });
          await refreshProgress(id);
        }
      } catch (error) {
        if (cancelled) return;
        setFailure(describe(error));
        setStatus("unavailable");
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [lesson.id, lesson.version, lastPosition, refreshProgress]);

  const record = useCallback(
    async (event: Parameters<typeof appendEvidence>[1]) => {
      if (!sessionId || !learnerId) return;
      try {
        await appendEvidence(sessionId, event);
        await refreshProgress(learnerId);
        setFailure(null);
      } catch (error) {
        setFailure(describe(error));
      }
    },
    [sessionId, learnerId, refreshProgress],
  );

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(next, lastPosition));
    setPosition(clamped);
    const stepIndex = clamped - 1;
    if (stepIndex >= 0 && stepIndex < steps.length && !recordedSteps.current.has(stepIndex)) {
      recordedSteps.current.add(stepIndex);
      void record({ kind: EVIDENCE_KIND.stepViewed, stepIndex });
    }
  };

  const submitReflection = async (phase: "pre" | "post", response: string) => {
    if (!response.trim()) return;
    setSaving(true);
    await record({ kind: EVIDENCE_KIND.reflectionSubmitted, phase, response: response.trim() });
    setSaving(false);
  };

  if (status === "loading") {
    return (
      <p role="status" className="text-(--color-ink-muted)">
        Preparing your lesson…
      </p>
    );
  }

  const step = position >= 1 && position <= steps.length ? steps[position - 1] : undefined;
  const experiment = step?.experimentId
    ? lesson.learning.experiments.find((item) => item.id === step.experimentId)
    : undefined;

  return (
    <div className="space-y-6">
      {failure ? (
        <p
          role="alert"
          className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm"
        >
          {failure}
        </p>
      ) : null}

      <nav aria-label="Lesson progress" className="space-y-2">
        <div className="flex items-center justify-between text-xs text-(--color-ink-muted)">
          <span>
            Position {position + 1} of {lastPosition + 1}
          </span>
          <span>
            {progress ? progress.stepsViewed.length : 0} of {steps.length} steps recorded
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-(--color-accent) transition-all"
            style={{ width: `${(position / lastPosition) * 100}%` }}
          />
        </div>
      </nav>

      <section
        aria-live="polite"
        className="min-h-48 rounded-lg border border-white/10 bg-(--color-surface-raised) p-5"
      >
        {position === 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest">Before you begin</h2>
            <p>{lesson.measurement.prePrompt}</p>
            <label htmlFor="pre-reflection" className="block text-sm text-(--color-ink-muted)">
              Your first answer. There is no wrong one; it is recorded so you can compare later.
            </label>
            <textarea
              id="pre-reflection"
              value={preText}
              onChange={(event) => setPreText(event.target.value)}
              rows={4}
              maxLength={4000}
              className="w-full rounded-md border border-white/15 bg-black/30 p-3 text-sm focus-visible:outline-2 focus-visible:outline-(--color-accent)"
            />
            <button
              type="button"
              disabled={saving || !preText.trim()}
              onClick={() => void submitReflection("pre", preText)}
              className="rounded-md border border-white/20 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Save my first answer
            </button>
          </div>
        ) : null}

        {step ? (
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-(--color-accent)">
              {step.label}
            </span>
            <p>{step.prompt}</p>
            {experiment ? (
              <UnitCompare
                experiment={experiment}
                onPerformed={(normalized) =>
                  void record({
                    kind: EVIDENCE_KIND.experimentPerformed,
                    experimentId: experiment.id,
                    normalized,
                  })
                }
              />
            ) : null}
            {step.experimentId && !experiment ? (
              <p className="text-sm text-(--color-ink-muted)">
                This step refers to an experiment that is not part of the published lesson.
              </p>
            ) : null}
          </div>
        ) : null}

        {position === lastPosition ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest">Now explain it back</h2>
            <p>{lesson.measurement.postPrompt}</p>
            <label htmlFor="post-reflection" className="block text-sm text-(--color-ink-muted)">
              Your explanation.
            </label>
            <textarea
              id="post-reflection"
              value={postText}
              onChange={(event) => setPostText(event.target.value)}
              rows={6}
              maxLength={4000}
              className="w-full rounded-md border border-white/15 bg-black/30 p-3 text-sm focus-visible:outline-2 focus-visible:outline-(--color-accent)"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving || !postText.trim()}
                onClick={() => void submitReflection("post", postText)}
                className="rounded-md border border-white/20 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Submit my explanation
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void record({
                    kind: EVIDENCE_KIND.lessonCompleted,
                    conceptVersion: lesson.version,
                  })
                }
                className="rounded-md border border-white/20 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Mark this lesson finished
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(position - 1)}
          disabled={position === 0}
          className="rounded-md border border-white/20 px-4 py-2 text-sm disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => goTo(position + 1)}
          disabled={position === lastPosition}
          className="rounded-md border border-white/20 px-4 py-2 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <ProgressPanel lesson={lesson} progress={progress} />
    </div>
  );
}

function ProgressPanel({
  lesson,
  progress,
}: {
  lesson: LearningObject;
  progress: ConceptProgress | null;
}) {
  if (!progress) {
    return null;
  }

  const rubric = lesson.measurement.masteryRubric;

  return (
    <section
      data-testid="progress-panel"
      className="space-y-4 rounded-lg border border-white/10 p-5"
    >
      <h2 className="text-sm font-semibold uppercase tracking-widest">Your saved progress</h2>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Fact label="Steps recorded" value={`${progress.stepsViewed.length} / ${progress.stepsTotal}`} />
        <Fact
          label="Experiments run"
          value={`${progress.experimentsPerformed.length} / ${progress.experimentsTotal}`}
        />
        <Fact label="First answer" value={progress.preReflection ? "Saved" : "Not yet"} />
        <Fact label="Explanation" value={progress.postReflection ? "Saved" : "Not yet"} />
      </dl>

      <p className="text-sm">
        {progress.completionRecorded
          ? "You marked this lesson finished."
          : "You have not marked this lesson finished yet."}
      </p>

      {progress.mastery ? (
        <div className="space-y-2">
          <p className="text-sm">
            Your explanation matched {progress.mastery.score} of {rubric.checks.length} rubric
            points; {progress.mastery.threshold} are required.
          </p>
          <ul className="space-y-1 text-sm text-(--color-ink-muted)">
            {progress.mastery.checks.map((check) => (
              <li key={check.id}>
                <span aria-hidden="true">{check.passed ? "✓" : "○"}</span>{" "}
                <span className="sr-only">{check.passed ? "Matched:" : "Not matched:"}</span>
                {check.label}
              </li>
            ))}
          </ul>
          <p className="text-xs text-(--color-ink-muted)">
            This rubric looks for whether you named each idea. It is a keyword check written into
            the lesson, not a judgement of whether you understand the concept.
          </p>
        </div>
      ) : (
        <p className="text-xs text-(--color-ink-muted)">
          The rubric runs once you submit an explanation.
        </p>
      )}

      <p className="text-xs text-(--color-ink-muted)">
        Your progress is stored against an anonymous identifier held in this browser. It will not
        follow you to another browser or device, there is no account to recover it with, and
        clearing your site data ends it permanently.
      </p>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-(--color-ink-muted)">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
