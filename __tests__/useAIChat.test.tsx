import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useAIChat } from "../src/hooks/useAIChat";
import { useProfileStore } from "../src/store/profileStore";
import type { AIChatRequest } from "../src/types/ai";
import type { StreamAIChatCallbacks } from "../src/services/api";

const mockStreamAIChat = jest.fn();
const mockIsApiConfigured = jest.fn();
const mockIsMockAIChatEnabled = jest.fn();
const mockGetFreeQueryLimit = jest.fn();

jest.mock("../src/services/api", () => ({
  streamAIChat: (...args: unknown[]) => mockStreamAIChat(...args),
  isApiConfigured: () => mockIsApiConfigured()
}));

jest.mock("../src/services/env", () => ({
  isMockAIChatEnabled: () => mockIsMockAIChatEnabled(),
  getFreeQueryLimit: () => mockGetFreeQueryLimit()
}));

describe("useAIChat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsApiConfigured.mockReturnValue(true);
    mockIsMockAIChatEnabled.mockReturnValue(false);
    mockGetFreeQueryLimit.mockReturnValue(20);
    useProfileStore.setState({
      profile: { userId: "u1", dailyAIQueryCount: 0, lastQueryReset: new Date().toISOString() },
      isLoading: false,
      isInitialized: true,
      personalizationScore: 0,
      nextIncompleteField: "nationality"
    });
  });

  it("opens upgrade modal when free tier limit is reached", async () => {
    useProfileStore.setState({
      profile: { userId: "u1", isPaidUser: false, dailyAIQueryCount: 20, lastQueryReset: new Date().toISOString() }
    });

    const { result } = renderHook(() => useAIChat());

    await act(async () => {
      await result.current.sendMessage("Who starts for Brazil today?");
    });

    expect(result.current.isUpgradeModalVisible).toBe(true);
    expect(mockStreamAIChat).not.toHaveBeenCalled();
  });

  it("sends message and appends AI response", async () => {
    mockStreamAIChat.mockImplementation(async (_body: AIChatRequest, callbacks: StreamAIChatCallbacks) => {
      callbacks.onDelta("Brazil are expected to press high.");
      callbacks.onChart({
        chartType: "formation",
        title: "Brazil Formation (4-3-3)",
        data: {
          formation: "4-3-3",
          players: [{ name: "Alisson", position: "GK", x: 50, y: 92 }]
        }
      });
      callbacks.onDone({ type: "done", source: "football db" });
      return new AbortController();
    });

    const { result } = renderHook(() => useAIChat());

    await act(async () => {
      await result.current.sendMessage("Who starts for Brazil today?");
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.messages[0].role).toBe("user");
    expect(result.current.messages[1].role).toBe("ai");
    expect(result.current.messages[1].source).toBe("football db");
    expect(result.current.messages[1].content).toContain("Brazil are expected to press high.");
    expect(result.current.messages[1].charts).toHaveLength(1);
    expect(result.current.messages[1].charts?.[0].chartType).toBe("formation");
  });

  it("shows clear error when mock is off and API gateway is missing", async () => {
    mockIsApiConfigured.mockReturnValue(false);

    const { result } = renderHook(() => useAIChat());

    await act(async () => {
      await result.current.sendMessage("Explain pressing triggers");
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(mockStreamAIChat).not.toHaveBeenCalled();
    expect(result.current.messages[1].content).toContain("Real AI chat requires EXPO_PUBLIC_API_GATEWAY_URL");
  });
});
