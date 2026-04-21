const API = "http://localhost:8000/api";

export type EmailTopic = {
  id: number;
  name: string;
  description: string | null;
  color: string;
  display_order: number;
  is_default: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type EmailTopicInput = {
  name: string;
  description?: string;
  color: string;
  display_order?: number;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export function listTopics(): Promise<EmailTopic[]> {
  return request<EmailTopic[]>("/email-topics");
}

export function createTopic(data: EmailTopicInput): Promise<EmailTopic> {
  return request<EmailTopic>("/email-topics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateTopic(
  id: number,
  data: Partial<EmailTopicInput>,
): Promise<EmailTopic> {
  return request<EmailTopic>(`/email-topics/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteTopic(id: number): Promise<void> {
  return request<void>(`/email-topics/${id}`, { method: "DELETE" });
}

export function resetDefaults(): Promise<{ reset: boolean; topics: EmailTopic[] }> {
  return request<{ reset: boolean; topics: EmailTopic[] }>(
    "/email-topics/reset-defaults?confirm=true",
    { method: "POST" },
  );
}
