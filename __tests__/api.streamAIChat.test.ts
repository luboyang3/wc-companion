import type { AIChatRequest, ChartInstruction } from "../src/types/ai";

const mockFetchAuthSession = jest.fn();
const mockGetApiBaseUrl = jest.fn();
const mockIsMockAuthEnabled = jest.fn();

jest.mock("@aws-amplify/auth", () => ({
  fetchAuthSession: () => mockFetchAuthSession()
}));

jest.mock("../src/services/env", () => ({
  getApiBaseUrl: () => mockGetApiBaseUrl(),
  isMockAuthEnabled: () => mockIsMockAuthEnabled()
}));

function buildReader(lines: string[]) {
  const payload = lines.join("\n");
  const chunk = new Uint8Array(Buffer.from(payload, "utf-8"));
  let readCount = 0;
  return {
    read: jest.fn(async () => {
      if (readCount === 0) {
        readCount += 1;
        return { done: false, value: chunk };
      }
      return { done: true, value: undefined };
    })
  };
}

describe("streamAIChat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetApiBaseUrl.mockReturnValue("http://localhost:3000");
    mockIsMockAuthEnabled.mockReturnValue(false);
    mockFetchAuthSession.mockResolvedValue({
      tokens: {
        idToken: { toString: () => "mock-id-token" }
      }
    });
  });

  it("parses delta, chart, and done SSE events", async () => {
    const onDelta = jest.fn();
    const onChart = jest.fn();
    const onDone = jest.fn();
    const onError = jest.fn();

    const chart: ChartInstruction = {
      chartType: "bar",
      title: "Top scorers",
      data: {
        items: [
          { label: "Mbappe", value: 8 },
          { label: "Messi", value: 7 }
        ],
        unit: "goals"
      }
    };

    const reader = buildReader([
      `data: ${JSON.stringify({ type: "delta", text: "Here is a chart." })}`,
      `data: ${JSON.stringify({ type: "chart", ...chart })}`,
      `data: ${JSON.stringify({ type: "done", source: "sportradar" })}`,
      ""
    ]);

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => reader
      }
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    let streamAIChat: typeof import("../src/services/api").streamAIChat;
    jest.isolateModules(() => {
      streamAIChat = require("../src/services/api").streamAIChat;
    });

    const body: AIChatRequest = {
      message: "Show top scorers",
      language: "en",
      history: []
    };

    await streamAIChat!(body, { onDelta, onChart, onDone, onError });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onDelta).toHaveBeenCalledWith("Here is a chart.");
    expect(onChart).toHaveBeenCalledWith(expect.objectContaining(chart));
    expect(onDone).toHaveBeenCalledWith({ type: "done", source: "sportradar" });
    expect(onError).not.toHaveBeenCalled();
  });
});
