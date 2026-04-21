import { useCallback, useEffect, useState } from "react";
import {
  type Automation,
  type AutomationRun,
  type Template,
  createAutomation,
  createFromNaturalLanguage,
  createFromTemplate,
  deleteAutomation,
  listAutomations,
  listRuns,
  listTemplates,
  runNow,
  toggleAutomation,
} from "../api/automationsClient";

export type UseAutomationsReturn = {
  automations: Automation[];
  templates: Template[];
  runs: AutomationRun[];
  loading: boolean;
  runLoading: boolean;
  error: string | null;
  selectedAutomationId: number | null;
  selectedAutomation: Automation | null;
  refresh: () => Promise<void>;
  activateTemplate: (
    templateId: string,
    customName?: string,
    overrides?: Record<string, unknown>,
  ) => Promise<Automation>;
  createFromNL: (prompt: string) => Promise<Record<string, unknown>>;
  confirmNLAutomation: (config: Record<string, unknown>) => Promise<Automation>;
  toggle: (id: number) => Promise<void>;
  doRunNow: (id: number) => Promise<AutomationRun>;
  doDelete: (id: number) => Promise<void>;
  selectAutomation: (id: number | null) => void;
  refreshRuns: (id: number) => Promise<void>;
};

export function useAutomations(): UseAutomationsReturn {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAutomationId, setSelectedAutomationId] = useState<number | null>(null);

  const selectedAutomation =
    automations.find((a) => a.id === selectedAutomationId) ?? null;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [autos, tmpls] = await Promise.all([listAutomations(), listTemplates()]);
      setAutomations(autos);
      setTemplates(tmpls);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRuns = useCallback(async (id: number) => {
    try {
      const r = await listRuns(id);
      setRuns(r);
    } catch {
      setRuns([]);
    }
  }, []);

  // Load automations on mount
  useEffect(() => {
    void refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload runs when selection changes
  useEffect(() => {
    if (selectedAutomationId !== null) {
      void refreshRuns(selectedAutomationId);
    } else {
      setRuns([]);
    }
  }, [selectedAutomationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const activateTemplate = useCallback(
    async (
      templateId: string,
      customName?: string,
      overrides?: Record<string, unknown>,
    ) => {
      const auto = await createFromTemplate(templateId, customName, overrides);
      setAutomations((prev) => [auto, ...prev]);
      setSelectedAutomationId(auto.id);
      return auto;
    },
    [],
  );

  const createFromNL = useCallback(async (prompt: string) => {
    return createFromNaturalLanguage(prompt);
  }, []);

  const confirmNLAutomation = useCallback(
    async (config: Record<string, unknown>) => {
      const auto = await createAutomation(config as Partial<Automation>);
      setAutomations((prev) => [auto, ...prev]);
      setSelectedAutomationId(auto.id);
      return auto;
    },
    [],
  );

  const toggle = useCallback(async (id: number) => {
    const updated = await toggleAutomation(id);
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? updated : a)),
    );
  }, []);

  const doRunNow = useCallback(async (id: number) => {
    setRunLoading(true);
    try {
      const run = await runNow(id);
      // Refresh the automation to get updated last_run_status
      const [autos] = await Promise.all([listAutomations()]);
      setAutomations(autos);
      setRuns((prev) => [run, ...prev]);
      return run;
    } finally {
      setRunLoading(false);
    }
  }, []);

  const doDelete = useCallback(
    async (id: number) => {
      await deleteAutomation(id);
      setAutomations((prev) => prev.filter((a) => a.id !== id));
      if (selectedAutomationId === id) {
        setSelectedAutomationId(null);
        setRuns([]);
      }
    },
    [selectedAutomationId],
  );

  const selectAutomation = useCallback((id: number | null) => {
    setSelectedAutomationId(id);
  }, []);

  return {
    automations,
    templates,
    runs,
    loading,
    runLoading,
    error,
    selectedAutomationId,
    selectedAutomation,
    refresh,
    activateTemplate,
    createFromNL,
    confirmNLAutomation,
    toggle,
    doRunNow,
    doDelete,
    selectAutomation,
    refreshRuns,
  };
}
