import { useCallback, useMemo, useRef, useState } from "react";
import { isApiConfigured, streamAIChat } from "../services/api";
import { getFreeQueryLimit, isMockAIChatEnabled } from "../services/env";
import { useProfileStore } from "../store/profileStore";
import type { AIChatRequest, AIChatResponse, ChartInstruction, ChatMessage } from "../types/ai";
import type { AppLanguage, UserProfileUpdate } from "../types/user";

interface UseAIChatResult {
  messages: ChatMessage[];
  isSending: boolean;
  isUpgradeModalVisible: boolean;
  sendMessage: (message: string) => Promise<void>;
  closeUpgradeModal: () => void;
}

function createMessage(role: "user" | "ai", content: string, source?: ChatMessage["source"]): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    source,
    createdAt: new Date().toISOString()
  };
}

function getDailyCount(profileFields: {
  dailyAIQueryCount?: number;
  lastQueryReset?: string;
}): number {
  const today = new Date().toISOString().slice(0, 10);
  if (profileFields.lastQueryReset?.slice(0, 10) !== today) {
    return 0;
  }
  return profileFields.dailyAIQueryCount ?? 0;
}

function buildMockResponse(input: string): AIChatResponse {
  const text = input.toLowerCase();
  if (text.includes("offside")) {
    return {
      message:
        "Offside happens when an attacker is closer to the goal line than both the ball and second-last defender when the pass is played, unless they are in their own half.",
      source: "ai_knowledge"
    };
  }

  if (text.includes("brazil")) {
    return {
      message:
        "Based on your prompt, Brazil are expected to line up aggressively in transition. For exact starters, connect live match data in the next backend step.",
      source: "football db"
    };
  }

  return {
    message:
      "Great question. In this mock mode, I can provide general football explanations. Connect the AI backend to return live, data-grounded match answers.",
    source: "ai_knowledge"
  };
}

export function useAIChat(): UseAIChatResult {
  const freeQueryLimit = getFreeQueryLimit();
  const { profile, mergeProfileFields } = useProfileStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUpgradeModalVisible, setIsUpgradeModalVisible] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const isPaidUser = Boolean(profile?.isPaidUser);
  const dailyCount = useMemo(() => getDailyCount(profile ?? {}), [profile]);
  const language: AppLanguage = profile?.language ?? "en";

  const incrementLocalDailyCount = useCallback(() => {
    const todayIso = new Date().toISOString();
    const nextCount = getDailyCount(profile ?? {}) + 1;
    const fields: UserProfileUpdate = {
      dailyAIQueryCount: nextCount,
      lastQueryReset: todayIso
    };
    mergeProfileFields(fields);
  }, [mergeProfileFields, profile]);

  const updatePlaceholder = useCallback(
    (id: string, updater: (msg: ChatMessage) => ChatMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
    },
    []
  );

  const sendMessage = useCallback(
    async (message: string) => {
      const trimmedMessage = message.trim();
      if (!trimmedMessage || isSending) {
        return;
      }

      if (!isPaidUser && dailyCount >= freeQueryLimit) {
        setIsUpgradeModalVisible(true);
        return;
      }

      const userMessage = createMessage("user", trimmedMessage);
      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);

      try {
        const history = [...messages, userMessage].slice(-10);
        const apiHistory: AIChatRequest["history"] = history.map((item) => ({
          role: item.role === "ai" ? "assistant" : item.role,
          content: item.content
        }));

        if (isMockAIChatEnabled()) {
          const response = buildMockResponse(trimmedMessage);
          const aiMessage = createMessage("ai", response.message, response.source);
          setMessages((prev) => [...prev, aiMessage]);
          incrementLocalDailyCount();
        } else if (isApiConfigured()) {
          const placeholder = createMessage("ai", "");
          setMessages((prev) => [...prev, placeholder]);

          await new Promise<void>((resolve, reject) => {
            streamAIChat(
              { message: trimmedMessage, language, history: apiHistory },
              {
                onDelta(text) {
                  updatePlaceholder(placeholder.id, (m) => ({
                    ...m,
                    content: m.content + text
                  }));
                },
                onDone(event) {
                  updatePlaceholder(placeholder.id, (m) => ({
                    ...m,
                    source: event.source
                  }));
                  incrementLocalDailyCount();
                  resolve();
                },
                onChart(chart: ChartInstruction) {
                  updatePlaceholder(placeholder.id, (m) => ({
                    ...m,
                    charts: [...(m.charts ?? []), chart]
                  }));
                },
                onError(errMsg) {
                  updatePlaceholder(placeholder.id, (m) => ({
                    ...m,
                    content: errMsg || "Unable to fetch an AI response. Please try again.",
                    source: "ai_knowledge"
                  }));
                  resolve();
                }
              }
            )
              .then((ctrl) => {
                abortRef.current = ctrl;
              })
              .catch(reject);
          });
        } else {
          throw new Error(
            "Real AI chat requires EXPO_PUBLIC_API_GATEWAY_URL. Keep EXPO_PUBLIC_USE_MOCK_AI_CHAT=true for local mock responses."
          );
        }
      } catch (error) {
        const errorText =
          error instanceof Error
            ? error.message
            : "Unable to fetch an AI response. Please try again.";
        const aiFallbackMessage = createMessage("ai", errorText, "ai_knowledge");
        setMessages((prev) => [...prev, aiFallbackMessage]);
      } finally {
        abortRef.current = null;
        setIsSending(false);
      }
    },
    [dailyCount, freeQueryLimit, incrementLocalDailyCount, isPaidUser, isSending, language, messages, updatePlaceholder]
  );

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalVisible(false);
  }, []);

  return {
    messages,
    isSending,
    isUpgradeModalVisible,
    sendMessage,
    closeUpgradeModal
  };
}
