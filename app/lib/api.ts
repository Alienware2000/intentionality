/**
 * Type-safe API fetch utility.
 * Handles JSON parsing and error extraction consistently.
 */
export async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options);

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Request failed (${res.status}): Invalid JSON response`);
  }

  if (!res.ok || (data && typeof data === "object" && "ok" in data && !data.ok)) {
    const errorMessage =
      data && typeof data === "object" && "error" in data
        ? String(data.error)
        : `Request failed (${res.status})`;
    throw new Error(errorMessage);
  }

  return data as T;
}

/**
 * Helper to extract error message from unknown error.
 */
export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
