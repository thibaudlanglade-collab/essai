import { useEffect, useState } from "react";
import { fetchFeatures } from "../api/client";
import type { Feature } from "../types";

export function useFeatures() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeatures()
      .then(setFeatures)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { features, loading, error };
}
