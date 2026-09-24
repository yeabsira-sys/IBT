import { useCallback, useEffect, useRef, useState } from "react";

export default function useFetch(
  url,
  { skip = false, parse, ...fetchOptions } = {},
) {
  const [state, setState] = useState({
    data: null,
    loading: !skip,
    error: null,
  });

  // Kept in refs so changing them doesn't retrigger the effect below —
  // only `url`, `skip`, and an explicit `refetch()` call should do that.
  const optionsRef = useRef(fetchOptions);
  optionsRef.current = fetchOptions;
  const parseRef = useRef(parse);
  parseRef.current = parse;

  const [reloadToken, setReloadToken] = useState(0);
  const refetch = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (skip || !url) return undefined;

    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));

    (async () => {
      try {
        const response = await fetch(url, {
          ...optionsRef.current,
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            `Request to ${url} failed with status ${response.status}`,
          );
        }
        const body = parseRef.current
          ? await parseRef.current(response)
          : await response.json();
        setState({ data: body, loading: false, error: null });
      } catch (err) {
        if (err.name === "AbortError") return; // superseded by a newer request
        setState({ data: null, loading: false, error: err });
      }
    })();

    return () => controller.abort();
  }, [url, skip, reloadToken]);

  return { ...state, refetch };
}
