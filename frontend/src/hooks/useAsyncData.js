import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for fetching data with loading/error state management.
 *
 * @param {function} fetchFn - Async function that returns data
 * @param {object} [options]
 * @param {Array} [options.deps=[]] - Dependency array to re-trigger fetch
 * @param {boolean} [options.immediate=true] - Whether to fetch on mount
 * @returns {{ data, loading, error, refetch }}
 */
export default function useAsyncData(fetchFn, { deps = [], immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchFn()
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'An error occurred');
        setLoading(false);
      });
  }, [fetchFn]);

  useEffect(() => {
    if (immediate) {
      refetch();
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch, setData };
}
