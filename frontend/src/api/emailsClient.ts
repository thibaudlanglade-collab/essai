const API = "http://localhost:8000/api";

export type EmailAttachment = {
  id: number;
  email_id: number;
  gmail_attachment_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  is_downloaded: boolean;
  local_path: string | null;
  downloaded_at: string | null;
  created_at: string;
};

export type Email = {
  id: number;
  gmail_id: string;
  thread_id: string;
  connection_id: number;
  from_email: string;
  from_name: string | null;
  to_emails: string[];
  cc_emails: string[] | null;
  subject: string | null;
  snippet: string | null;
  body_plain: string | null;
  body_html: string | null;
  received_at: string;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  labels: string[];
  priority: string | null;
  topic: string | null;
  ai_summary: string | null;
  classified_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  attachments?: EmailAttachment[];
  attachments_count?: number;
};

export type GmailStatus = {
  connected: boolean;
  email_address: string | null;
  last_sync_at: string | null;
  emails_count: number;
};

export type EmailsListResponse = {
  emails: Email[];
  total: number;
  has_more: boolean;
};

export type EmailStats = {
  total: number;
  unread: number;
  starred: number;
  today: number;
};

export type ListEmailsParams = {
  limit?: number;
  offset?: number;
  unread_only?: boolean;
  starred_only?: boolean;
  search?: string;
  sort?: "received_desc" | "received_asc";
  priority?: string;
  topic?: string;
};

export type MorningBriefing = {
  id: number;
  briefing_date: string;
  content_markdown: string;
  emails_analyzed_count: number;
  urgent_count: number;
  created_at: string | null;
  is_read: boolean;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export function getGmailStatus(): Promise<GmailStatus> {
  return request<GmailStatus>("/gmail/status");
}

export function getConnectUrl(): Promise<{ auth_url: string }> {
  return request<{ auth_url: string }>("/gmail/connect");
}

export function disconnectGmail(): Promise<void> {
  return request<void>("/gmail/disconnect", { method: "POST" });
}

export function syncNow(): Promise<{
  new_emails_count: number;
  total_fetched: number;
  errors: string[];
}> {
  return request("/gmail/sync-now", { method: "POST" });
}

export function listEmails(params: ListEmailsParams = {}): Promise<EmailsListResponse> {
  const qs = new URLSearchParams();
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.offset !== undefined) qs.set("offset", String(params.offset));
  if (params.unread_only) qs.set("unread_only", "true");
  if (params.starred_only) qs.set("starred_only", "true");
  if (params.search) qs.set("search", params.search);
  if (params.sort) qs.set("sort", params.sort);
  if (params.priority) qs.set("priority", params.priority);
  if (params.topic) qs.set("topic", params.topic);
  const query = qs.toString();
  return request<EmailsListResponse>(`/emails${query ? `?${query}` : ""}`);
}

export function getEmail(id: number): Promise<Email> {
  return request<Email>(`/emails/${id}`);
}

export function updateEmail(
  id: number,
  updates: { is_read?: boolean; is_starred?: boolean; is_archived?: boolean },
): Promise<Email> {
  return request<Email>(`/emails/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

export function getEmailStats(): Promise<EmailStats> {
  return request<EmailStats>("/emails/stats/summary");
}

export function classifyNow(emailId: number): Promise<Email> {
  return request<Email>(`/emails/${emailId}/classify-now`, { method: "POST" });
}

export function generateDraft(
  emailId: number,
  instructions?: string,
): Promise<{ draft_body: string }> {
  return request<{ draft_body: string }>(`/emails/${emailId}/generate-draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_instructions: instructions ?? "" }),
  });
}

export function sendReply(
  emailId: number,
  body: string,
  subject?: string,
): Promise<{ success: boolean; sent_message_id: string }> {
  return request<{ success: boolean; sent_message_id: string }>(
    `/emails/${emailId}/send-reply`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, subject }),
    },
  );
}

export function getTodayBriefing(): Promise<MorningBriefing> {
  return request<MorningBriefing>("/emails/briefing/today");
}

export function regenerateBriefing(): Promise<MorningBriefing> {
  return request<MorningBriefing>("/emails/briefing/generate", { method: "POST" });
}

export function markBriefingRead(briefingId: number): Promise<MorningBriefing> {
  return request<MorningBriefing>(`/emails/briefing/${briefingId}/mark-read`, {
    method: "PATCH",
  });
}

export function listAttachments(emailId: number): Promise<EmailAttachment[]> {
  return request<EmailAttachment[]>(`/emails/${emailId}/attachments`);
}

export function getAttachmentDownloadUrl(emailId: number, attachmentId: number): string {
  return `${API}/emails/${emailId}/attachments/${attachmentId}/download`;
}

export function extractAttachment(
  emailId: number,
  attachmentId: number,
): Promise<{ success: boolean; data: Record<string, unknown> | null; error: string | null }> {
  return request(`/emails/${emailId}/attachments/${attachmentId}/extract`, {
    method: "POST",
  });
}
