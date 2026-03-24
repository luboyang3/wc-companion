import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT =
  "You are an expert football analyst assistant for the 2026 FIFA World Cup app. " +
  "Answer questions about football rules, match analysis, team histories, and player stats. " +
  "Only cite statistics you are confident about. If uncertain, say so.";

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  if (!message) {
    return Response.json({ message: "message is required" }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json({
      message:
        "ANTHROPIC_API_KEY is not set. Add it to your .env file to get real AI responses.",
      source: "ai_knowledge" as const,
    });
  }

  try {
    const client = new Anthropic({ apiKey });

    const messages = [
      ...history.slice(-10).map((h: { role: string; content: string }) => ({
        role: h.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    const completion = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages,
    });

    return Response.json({
      message: completion.content[0].type === "text" ? completion.content[0].text : "",
      source: "ai_knowledge",
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Claude API call failed";
    console.error("AI chat error:", errorMessage);
    return Response.json(
      { message: `AI request failed: ${errorMessage}`, source: "ai_knowledge" },
      { status: 502 }
    );
  }
}
