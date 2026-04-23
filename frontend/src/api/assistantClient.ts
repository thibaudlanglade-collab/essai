const API = "http://localhost:8000/api/assistant";

export type AssistantSource = {
  type: string;
  tool?: string;
  input?: Record<string, unknown>;
};

export type ChatResponse = {
  conversation_id: number;
  answer: string;
  sources: AssistantSource[];
};

export type ConversationSummary = {
  id: number;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function sendChat(
  message: string,
  conversationId?: number,
): Promise<ChatResponse> {
  const res = await fetch(`${API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message, conversation_id: conversationId ?? null }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`assistant chat failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const res = await fetch(`${API}/conversations`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to list conversations: ${res.statusText}`);
  return res.json();
}

export async function deleteConversation(id: number): Promise<void> {
  const res = await fetch(`${API}/conversations/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to delete conversation: ${res.statusText}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Streaming (SSE)
// ─────────────────────────────────────────────────────────────────────────────

export type StreamEvent =
  | { type: "conversation"; conversation_id: number }
  | { type: "tool_call"; tool: string; input: Record<string, unknown> }
  | {
      type: "tool_result";
      tool: string;
      summary: {
        ok: boolean;
        error?: string;
        count?: number;
        total_ht?: number;
        total_ttc?: number;
        [k: string]: unknown;
      };
    }
  | { type: "answer"; text: string }
  | { type: "error"; detail: string }
  | { type: "done" };

/**
 * Stream a chat turn. Calls `onEvent` for each SSE event as it arrives.
 * Resolves when the stream ends (done / error / network close).
 */
export async function streamChat(
  message: string,
  conversationId: number | undefined,
  onEvent: (ev: StreamEvent) => void,
): Promise<void> {
  const res = await fetch(`${API}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message, conversation_id: conversationId ?? null }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`assistant stream failed (${res.status}): ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames end with a blank line (\n\n). Parse and dispatch each.
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        try {
          onEvent(JSON.parse(data) as StreamEvent);
        } catch {
          // skip unparsable frame — network can chunk mid-json very rarely
        }
      }
    }
  }
}
