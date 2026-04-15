import { useCallback, useEffect, useState } from "react";
import type { Employee, EmployeeInput } from "@/api/employeesClient";
import * as api from "@/api/employeesClient";

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listEmployees();
      setEmployees(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (data: EmployeeInput) => {
      await api.createEmployee(data);
      await refresh();
    },
    [refresh]
  );

  const update = useCallback(
    async (id: number, data: Partial<EmployeeInput>) => {
      await api.updateEmployee(id, data);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: number) => {
      await api.deleteEmployee(id);
      await refresh();
    },
    [refresh]
  );

  const removeBulk = useCallback(
    async (ids: number[]) => {
      await api.bulkDeleteEmployees(ids);
      await refresh();
    },
    [refresh]
  );

  const importFromCsv = useCallback(
    async (file: File) => {
      const result = await api.importCsv(file);
      await refresh();
      return result;
    },
    [refresh]
  );

  return {
    employees,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    removeBulk,
    importFromCsv,
  };
}
