import { fetchAuthSession } from "@aws-amplify/auth";
import type { AIChatRequest, AIChatResponse } from "../types/ai";
import type { UserProfile, UserProfileUpdate } from "../types/user";
import { getApiBaseUrl, isMockAuthEnabled } from "./env";

const apiBaseUrl = getApiBaseUrl() ?? "";

async function getAccessToken(): Promise<string | null> {
  if (isMockAuthEnabled()) {
    return null;
  }
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

async function request<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = apiBaseUrl ? `${apiBaseUrl}${path}` : path;
  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `API request failed: ${response.status}`);
  }

  return (await response.json()) as TResponse;
}

export function getUserProfile(): Promise<UserProfile> {
  return request<UserProfile>("/profile", { method: "GET" });
}

export function updateUserProfile(fields: UserProfileUpdate): Promise<UserProfile> {
  return request<UserProfile>("/profile", {
    method: "PUT",
    body: JSON.stringify(fields)
  });
}

export function isApiConfigured(): boolean {
  return Boolean(apiBaseUrl);
}

export function postAIChat(body: AIChatRequest): Promise<AIChatResponse> {
  return request<AIChatResponse>("/ai/chat", {
    method: "POST",
    body: JSON.stringify(body)
  });
}
