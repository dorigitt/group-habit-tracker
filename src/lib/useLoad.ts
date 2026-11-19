import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/** Loads data every time the screen gains focus; exposes pull-to-refresh state and errors. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const run = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      setData(await fn());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(useCallback(() => { run(); }, [run]));
  return { data, error, loading, refreshing, reload: () => run(), onRefresh: () => run(true) };
}
