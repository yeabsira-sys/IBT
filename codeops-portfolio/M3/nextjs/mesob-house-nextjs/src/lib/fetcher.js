/** Shared SWR fetcher. Throws an Error carrying the HTTP status for callers. */
export async function fetcher(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    credentials: "same-origin",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message ?? `Request failed (${response.status})`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}
