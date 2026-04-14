type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ProxyConfig = {
  baseUrl: string;
  model: string;
  apiKey?: string;
};

const DEFAULT_CONFIG: ProxyConfig = {
  baseUrl:
    process.env.LLM_BASE_URL || "https://mino.redemption.pw/x/zai/glm-5",
  model: process.env.LLM_MODEL || "glm-5.1",
  apiKey: process.env.LLM_API_KEY || undefined,
};

export async function streamChatCompletion(
  messages: ChatMessage[],
  config: ProxyConfig = DEFAULT_CONFIG,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `LLM proxy error (${response.status}): ${errorBody}`,
    );
  }

  return response;
}

export function parseSSEContent(chunk: string): string {
  let content = "";
  const lines = chunk.split("\n");

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;

    const data = line.slice(6).trim();
    if (data === "[DONE]") continue;

    try {
      const parsed = JSON.parse(data);
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) content += delta;
    } catch {
      // malformed chunk, skip
    }
  }

  return content;
}
