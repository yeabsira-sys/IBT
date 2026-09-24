import { useCallback, useEffect, useState } from "react";

export default function useFetch(url) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });

  const [refetchKey, setRefetchKey] = useState(0);

  const refetch = useCallback(() => {
    setRefetchKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!url) return;

    const controller = new AbortController();

    async function fetchData() {
      try {
        setState({
          data: null,
          loading: true,
          error: null,
        });

        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const result = await response.json();

        setState({
          data: result.data,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (error.name === "AbortError") return;

        setState({
          data: null,
          loading: false,
          error,
        });
      }
    }

    fetchData();

    return () => controller.abort();
  }, [url, refetchKey]);

  return {
    ...state,
    refetch,
  };
}
