import { useState, useEffect, useCallback } from 'react';

export function useFetch<T>(fetcher: () => Promise<{ data: T }>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doFetch = useCallback(async () => {
    // Ne pas appeler si pas de token
    const token = localStorage.getItem('froidpom_token');
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      if (res && res.data !== undefined) setData(res.data);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erreur';
      if (msg !== 'Non autorisé') setError(msg);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { doFetch(); }, [doFetch]);

  return { data, loading, error, refetch: doFetch };
}