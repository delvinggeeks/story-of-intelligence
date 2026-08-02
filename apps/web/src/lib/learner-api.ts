/**
 * Browser-side client for the learner loop.
 *
 * Separate from `lib/api.ts`, which is `server-only`. Nothing here touches the filesystem
 * or content JSON: the API is the only source of learner state.
 */

import type {
  ConceptProgress,
  EvidenceEnvelope,
  EvidenceEventRecord,
  Learner,
  LearningSession,
  TutorRequest,
  TutorResponse,
} from "@/types/academy";

const BASE_URL = process.env.NEXT_PUBLIC_ACADEMY_API_URL ?? "http://127.0.0.1:8000";

export class LearnerApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "LearnerApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    // A refused connection is not an HTTP status, so give it one the UI can branch on.
    throw new LearnerApiError(0, "The Academy API is unreachable.");
  }

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: unknown) =>
        typeof body === "object" && body !== null && "detail" in body
          ? String((body as { detail: unknown }).detail)
          : response.statusText,
      )
      .catch(() => response.statusText);
    throw new LearnerApiError(response.status, detail);
  }

  return (await response.json()) as T;
}

export function createLearner(): Promise<Learner> {
  return request<Learner>("/api/v1/learners", { method: "POST" });
}

export function getLearner(learnerId: string): Promise<Learner> {
  return request<Learner>(`/api/v1/learners/${learnerId}`);
}

export function resumeSession(learnerId: string, conceptId: string): Promise<LearningSession> {
  return request<LearningSession>(`/api/v1/learners/${learnerId}/sessions`, {
    method: "POST",
    body: JSON.stringify({ conceptId }),
  });
}

export function appendEvidence(
  sessionId: string,
  event: EvidenceEnvelope,
): Promise<EvidenceEventRecord> {
  return request<EvidenceEventRecord>(`/api/v1/sessions/${sessionId}/events`, {
    method: "POST",
    body: JSON.stringify({ event, occurredAt: new Date().toISOString() }),
  });
}

export function getProgress(learnerId: string, conceptId: string): Promise<ConceptProgress> {
  return request<ConceptProgress>(`/api/v1/learners/${learnerId}/progress/${conceptId}`);
}

/**
 * Ask the tutoring layer for help.
 *
 * Nothing is persisted by this call, here or on the server: the question and any draft
 * live only for the duration of the request. Do not add caching or storage to it.
 */
export function askTutor(body: TutorRequest): Promise<TutorResponse> {
  return request<TutorResponse>("/api/v1/tutor", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
