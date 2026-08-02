import "server-only";

import type { KnowledgeGraph, LearningObject } from "@/types/academy";

const API_BASE_URL = process.env.ACADEMY_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(`Request to ${path} failed`, response.status);
  }

  return (await response.json()) as T;
}

export function getKnowledgeGraph(): Promise<KnowledgeGraph> {
  return request<KnowledgeGraph>("/api/v1/graph");
}

export function getLearningObject(conceptId: string): Promise<LearningObject> {
  return request<LearningObject>(`/api/v1/learning-objects/${encodeURIComponent(conceptId)}`);
}
