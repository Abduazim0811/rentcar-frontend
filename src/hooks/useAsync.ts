import { useEffect, useState } from 'react';
export function useAsync<T>(load: () => Promise<T>, initial: T) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { let alive = true; load().then((next) => { if (alive) setData(next); }).catch((err) => { if (alive) setError(err instanceof Error ? err.message : 'Could not load data'); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  return { data, loading, error };
}
