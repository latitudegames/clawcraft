export function setQueryParam(search: string, key: string, value: string | null): string {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);

  if (value === null) {
    params.delete(key);
  } else {
    params.set(key, value);
  }

  const next = params.toString();
  return next ? `?${next}` : "";
}
