import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Email,
  type EmailStats,
  type GmailStatus,
  type MorningBriefing,
  disconnectGmail,
  generateDraft,
  getConnectUrl,
  getEmail,
  getEmailStats,
  getGmailStatus,
  getTodayBriefing,
  listEmails,
  markBriefingRead,
  regenerateBriefing,
  sendReply,
  syncNow,
  updateEmail,
} from "../api/emailsClient";

type Filters = {
  unreadOnly: boolean;
  starredOnly: boolean;
  search: string;
  priority: string | null;
  topic: string | null;
};

export type UseEmailsReturn = {
  status: GmailStatus | null;
  emails: Email[];
  selectedEmail: Email | null;
  stats: EmailStats | null;
  loading: boolean;
  error: string | null;
  selectedEmailId: number | null;
  filters: Filters;
  briefing: MorningBriefing | null;
  briefingLoading: boolean;
  draftLoading: boolean;
  currentDraft: string | null;
  refreshStatus: () => Promise<void>;
  refreshList: () => Promise<void>;
  refreshStats: () => Promise<void>;
  setFilter: (key: keyof Filters, value: boolean | string | null) => void;
  selectEmail: (id: number | null) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  toggleStarred: (id: number) => Promise<void>;
  archive: (id: number) => Promise<void>;
  triggerSync: () => Promise<void>;
  connectGmail: () => Promise<void>;
  disconnectGmail: () => Promise<void>;
  refreshBriefing: () => Promise<void>;
  doRegenerateBriefing: () => Promise<void>;
  doMarkBriefingRead: () => Promise<void>;
  generateEmailDraft: (emailId: number, instructions?: string) => Promise<void>;
  clearDraft: () => void;
  sendEmailReply: (emailId: number, body: string, subject?: string) => Promise<void>;
};

export function useEmails(): UseEmailsReturn {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    unreadOnly: false,
    starredOnly: false,
    search: "",
    priority: null,
    topic: null,
  });
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<string | null>(null);

  // Keep a ref to latest emails for use inside callbacks
  const emailsRef = useRef(emails);
  useEffect(() => {
    emailsRef.current = emails;
  }, [emails]);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await getGmailStatus();
      setStatus(s);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const refreshList = useCallback(
    async (currentFilters?: Filters) => {
      const f = currentFilters ?? filters;
      setLoading(true);
      setError(null);
      try {
        const resp = await listEmails({
          limit: 100,
          unread_only: f.unreadOnly,
          starred_only: f.starredOnly,
          search: f.search || undefined,
          priority: f.priority || undefined,
          topic: f.topic || undefined,
        });
        setEmails(resp.emails);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  const refreshStats = useCallback(async () => {
    try {
      const s = await getEmailStats();
      setStats(s);
    } catch {
      // non-fatal
    }
  }, []);

  const refreshBriefing = useCallback(async () => {
    setBriefingLoading(true);
    try {
      const b = await getTodayBriefing();
      setBriefing(b);
    } catch {
      // non-fatal — briefing not critical
    } finally {
      setBriefingLoading(false);
    }
  }, []);

  const doRegenerateBriefing = useCallback(async () => {
    setBriefingLoading(true);
    try {
      const b = await regenerateBriefing();
      setBriefing(b);
    } catch (err) {
      setError(String(err));
    } finally {
      setBriefingLoading(false);
    }
  }, []);

  const doMarkBriefingRead = useCallback(async () => {
    if (!briefing || briefing.is_read) return;
    try {
      const updated = await markBriefingRead(briefing.id);
      setBriefing(updated);
    } catch {
      // non-fatal
    }
  }, [briefing]);

  const generateEmailDraft = useCallback(
    async (emailId: number, instructions?: string) => {
      setDraftLoading(true);
      setCurrentDraft(null);
      try {
        const result = await generateDraft(emailId, instructions);
        setCurrentDraft(result.draft_body);
      } catch (err) {
        setError(String(err));
      } finally {
        setDraftLoading(false);
      }
    },
    [],
  );

  const clearDraft = useCallback(() => {
    setCurrentDraft(null);
  }, []);

  const sendEmailReply = useCallback(
    async (emailId: number, body: string, subject?: string) => {
      try {
        await sendReply(emailId, body, subject);
        setCurrentDraft(null);
      } catch (err) {
        setError(String(err));
        throw err;
      }
    },
    [],
  );

  // Initial load
  useEffect(() => {
    void refreshStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When status becomes connected, load list + stats + briefing
  const connectedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (status?.connected && connectedRef.current !== true) {
      connectedRef.current = true;
      void refreshList(filters);
      void refreshStats();
      void refreshBriefing();
    } else if (!status?.connected) {
      connectedRef.current = false;
    }
  }, [status?.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch list when filters change (only if connected)
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    if (status?.connected) {
      void refreshList(filters);
    }
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = useCallback((key: keyof Filters, value: boolean | string | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const selectEmail = useCallback(async (id: number | null) => {
    setSelectedEmailId(id);
    setCurrentDraft(null);
    if (id === null) {
      setSelectedEmail(null);
      return;
    }
    try {
      const email = await getEmail(id);
      setSelectedEmail(email);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await updateEmail(id, { is_read: true });
      setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, is_read: true } : e)));
      setSelectedEmail((e) => (e?.id === id ? { ...e, is_read: true } : e));
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const toggleStarred = useCallback(async (id: number) => {
    const email = emailsRef.current.find((e) => e.id === id);
    if (!email) return;
    const newVal = !email.is_starred;
    try {
      await updateEmail(id, { is_starred: newVal });
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, is_starred: newVal } : e)),
      );
      setSelectedEmail((e) => (e?.id === id ? { ...e, is_starred: newVal } : e));
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const archive = useCallback(async (id: number) => {
    try {
      await updateEmail(id, { is_archived: true });
      setEmails((prev) => prev.filter((e) => e.id !== id));
      setSelectedEmailId((prev) => {
        if (prev === id) {
          setSelectedEmail(null);
          return null;
        }
        return prev;
      });
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const triggerSync = useCallback(async () => {
    setLoading(true);
    try {
      await syncNow();
      await Promise.all([refreshList(filters), refreshStats(), refreshStatus()]);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [filters, refreshList, refreshStats, refreshStatus]);

  // Track the active connect-poll interval so it can be cleared if the
  // component unmounts or connectGmail is called again before the first finishes.
  const connectPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connectGmail = useCallback(async () => {
    // Cancel any previous poll that might still be running
    if (connectPollRef.current !== null) {
      clearInterval(connectPollRef.current);
      connectPollRef.current = null;
    }
    try {
      const { auth_url } = await getConnectUrl();
      const win = window.open(auth_url, "_blank", "width=600,height=700");
      // Poll for connection every 2s for up to 2 minutes
      let attempts = 0;
      connectPollRef.current = setInterval(async () => {
        attempts++;
        const s = await getGmailStatus().catch(() => null);
        if (s) setStatus(s);
        if (s?.connected || attempts >= 60) {
          if (connectPollRef.current !== null) {
            clearInterval(connectPollRef.current);
            connectPollRef.current = null;
          }
          if (win && !win.closed) win.close();
          if (s?.connected) {
            void refreshList(filters);
            void refreshStats();
            void refreshBriefing();
          }
        }
      }, 2000);
    } catch (err) {
      setError(String(err));
    }
  }, [filters, refreshList, refreshStats, refreshBriefing]);

  const doDisconnect = useCallback(async () => {
    try {
      await disconnectGmail();
      setStatus(null);
      setEmails([]);
      setStats(null);
      setBriefing(null);
      setSelectedEmailId(null);
      setSelectedEmail(null);
      connectedRef.current = false;
    } catch (err) {
      setError(String(err));
    }
  }, []);

  return {
    status,
    emails,
    selectedEmail,
    stats,
    loading,
    error,
    selectedEmailId,
    filters,
    briefing,
    briefingLoading,
    draftLoading,
    currentDraft,
    refreshStatus,
    refreshList,
    refreshStats,
    setFilter,
    selectEmail,
    markAsRead,
    toggleStarred,
    archive,
    triggerSync,
    connectGmail,
    disconnectGmail: doDisconnect,
    refreshBriefing,
    doRegenerateBriefing,
    doMarkBriefingRead,
    generateEmailDraft,
    clearDraft,
    sendEmailReply,
  };
}
