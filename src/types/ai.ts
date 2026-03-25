import type { AppLanguage } from "./user";

export type ChatRole = "user" | "ai";
export type ChatSource = "sportradar" | "ai_knowledge";
export type ChartType = "formation" | "player_radar" | "bar";

export interface FormationData {
  formation: string;
  players: Array<{ name: string; position: string; x: number; y: number }>;
}

export interface RadarData {
  playerName: string;
  attributes: Record<"pace" | "shooting" | "passing" | "dribbling" | "defending" | "physical", number>;
}

export interface BarData {
  items: Array<{ label: string; value: number }>;
  unit?: string;
}

export interface ChartInstruction {
  chartType: ChartType;
  title: string;
  data: FormationData | RadarData | BarData;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  source?: ChatSource;
  charts?: ChartInstruction[];
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
  charts?: ChartInstruction[];
}

export type StreamEvent =
  | { type: "delta"; text: string }
  | ({ type: "chart" } & ChartInstruction)
  | { type: "done"; source: ChatSource }
  | { type: "error"; message: string };
