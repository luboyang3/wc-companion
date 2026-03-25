import type { AppLanguage } from "./user";

export type ChatRole = "user" | "ai";
export type ChatSource = "sportradar" | "ai_knowledge";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  source?: ChatSource;
}

export interface AIChatRequest {
  message: string;
  history: Array<{
    role: ChatRole | "assistant";
    content: string;
  }>;
  language: AppLanguage;
}

export interface AIChatResponse {
  message: string;
  source: ChatSource;
}

export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; source: ChatSource }
  | { type: "error"; message: string };
