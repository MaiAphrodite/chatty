import type { User, Character, CharacterPayload, Conversation, Message } from "./types";

const BASE = "/api";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      body.message || `Request failed (${response.status})`,
    );
  }

  return response.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  register(username: string, password: string) {
    return request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  login(username: string, password: string) {
    return request<User>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  logout() {
    return request<{ message: string }>("/auth/logout", { method: "POST" });
  },

  getMe() {
    return request<User>("/auth/me");
  },

  updateUserSettings(data: Partial<Pick<User, "llmEndpoint" | "llmApiKey" | "llmModel">>) {
    return request<User>("/auth/me/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  getCharacters() {
    return request<Character[]>("/characters");
  },

  getMyCharacters() {
    return request<Character[]>("/characters/mine");
  },

  getCharacter(id: string) {
    return request<Character>(`/characters/${id}`);
  },

  createCharacter(data: CharacterPayload) {
    return request<Character>("/characters", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateCharacter(id: string, data: Partial<CharacterPayload>) {
    return request<Character>(`/characters/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteCharacter(id: string) {
    return fetch(`${BASE}/characters/${id}`, {
      method: "DELETE",
      credentials: "include",
    }).then((res) => {
      if (!res.ok && res.status !== 204) {
        throw new ApiError(res.status, `Delete failed (${res.status})`);
      }
    });
  },

  getConversations() {
    return request<Conversation[]>("/chat/conversations");
  },

  createConversation(characterId: string) {
    return request<Conversation>("/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ characterId }),
    });
  },

  renameConversation(id: string, title: string) {
    return request<Conversation>(`/chat/conversations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  },

  deleteConversation(id: string) {
    return fetch(`${BASE}/chat/conversations/${id}`, {
      method: "DELETE",
      credentials: "include",
    }).then((res) => {
      if (!res.ok && res.status !== 204) {
        throw new ApiError(res.status, `Delete failed (${res.status})`);
      }
    });
  },

  getMessages(conversationId: string) {
    return request<Message[]>(`/chat/conversations/${conversationId}/messages`);
  },

  deleteMessage(messageId: string) {
    return fetch(`${BASE}/chat/messages/${messageId}`, {
      method: "DELETE",
      credentials: "include",
    }).then((res) => {
      if (!res.ok && res.status !== 204) {
        throw new ApiError(res.status, `Delete failed (${res.status})`);
      }
    });
  },

  editMessage(messageId: string, content: string) {
    return request<Message>(`/chat/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    });
  },

  rememberMessage(messageId: string) {
    return request<{ remembered: boolean }>(`/chat/messages/${messageId}/remember`, {
      method: "POST",
    });
  },

  async streamMessage(
    conversationId: string,
    content: string,
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    try {
      const response = await fetch(
        `${BASE}/chat/conversations/${conversationId}/messages`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          body.message || "Stream request failed",
        );
      }

      if (!response.body) {
        throw new Error("No response body for streaming");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) onChunk(delta);
          } catch {
            // malformed SSE line, skip
          }
        }
      }

      onDone();
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  },
};
