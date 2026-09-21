import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useFetch — a small, generic fetch hook for any JSON endpoint.
 *
 *   const { data, loading, error, refetch } = useFetch(url);
 *
 * - Cancels the in-flight request if `url` changes or the component unmounts
 *   (via AbortController), so a slow stale response can never overwrite a
 *   newer one.
 * - `skip: true` defers fetching — handy when the url depends on a param
 *   that isn't ready yet.
 * - `parse` overrides how the response body is read (defaults to `.json()`).
 * - Any extra fields are passed straight through to `fetch()` (method,
 *   headers, body, …).
 * - `refetch()` re-runs the same request on demand (e.g. a "Retry" button).
 *
 * This hook only fetches — it doesn't cache or share data across components.
 * For data used by more than one page (like the menu), wrap it in a context
 * provider instead, so every page reads the same in-flight request and
 * result. See `context/DishesContext.jsx` for that pattern.
 */
export default function useFetch(url, { skip = false, parse, ...fetchOptions } = {}) {
  const [state, setState] = useState({ data: null, loading: !skip, error: null });

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
        const response = await fetch(url, { ...optionsRef.current, signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Request to ${url} failed with status ${response.status}`);
        }
        const body = parseRef.current ? await parseRef.current(response) : await response.json();
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
