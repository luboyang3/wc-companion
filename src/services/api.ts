import { fetchAuthSession } from "@aws-amplify/auth";
import type { AIChatRequest, AIChatResponse, ChartInstruction, StreamEvent } from "../types/ai";
import type { UserProfile, UserProfileUpdate } from "../types/user";
import { getApiBaseUrl, isMockAuthEnabled } from "./env";

const apiBaseUrl = getApiBaseUrl();

function buildMockJwt(): string {
  const header = btoa(JSON.stringify({ typ: "JWT", alg: "none" }));
  const payload = btoa(JSON.stringify({ sub: "mock-local-user", email: "dev@local.test" }));
  return `${header}.${payload}.mock`;
}

async function getAccessToken(): Promise<string | null> {
  if (isMockAuthEnabled()) {
    return buildMockJwt();
  }
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}

async function request<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  if (!apiBaseUrl) {
    throw new Error("EXPO_PUBLIC_API_GATEWAY_URL is missing.");
  }

  const token = await getAccessToken();
  const headers = new Headers(init.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
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

export interface StreamAIChatCallbacks {
  onDelta: (text: string) => void;
  onChart: (chart: ChartInstruction) => void;
  onDone: (source: StreamEvent & { type: "done" }) => void;
  onError: (message: string) => void;
}

/**
 * Stream an AI chat response via SSE.  Returns an AbortController the
 * caller can use to cancel mid-stream.
 */
export async function streamAIChat(
  body: AIChatRequest,
  callbacks: StreamAIChatCallbacks
): Promise<AbortController> {
  if (!apiBaseUrl) {
    throw new Error("EXPO_PUBLIC_API_GATEWAY_URL is missing.");
  }

  const controller = new AbortController();
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBaseUrl}/ai/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: controller.signal
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("ReadableStream not supported");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const jsonStr = trimmed.slice(6);
          try {
            const event = JSON.parse(jsonStr) as StreamEvent;
            switch (event.type) {
              case "delta":
                callbacks.onDelta(event.text);
                break;
              case "done":
                callbacks.onDone(event);
                break;
              case "chart":
                callbacks.onChart(event);
                break;
              case "error":
                callbacks.onError(event.message);
                break;
            }
          } catch {
            /* skip malformed lines */
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        callbacks.onError((err as Error).message ?? "Stream failed");
      }
    }
  })();

  return controller;
}
