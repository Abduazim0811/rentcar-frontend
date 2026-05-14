import { useEffect, useState, type DependencyList } from 'react';
export function useAsync<T>(load: () => Promise<T>, initial: T, deps: DependencyList = []) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { let alive = true; setLoading(true); setError(''); load().then((next) => { if (alive) setData(next); }).catch((err) => { if (alive) setError(err instanceof Error ? err.message : 'Could not load data'); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, deps);
  return { data, loading, error };
}
