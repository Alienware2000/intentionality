// =============================================================================
// FETCH WITH RETRY
// A fetch wrapper that automatically retries on 401 errors.
// This handles the race condition that occurs when multiple parallel requests
// are made while the JWT token is being refreshed.
// =============================================================================

/**
 * Fetch wrapper that retries once on 401 Unauthorized errors.
 *
 * When multiple parallel API requests are made and the JWT token expires,
 * the middleware refreshes the token for one request, but other concurrent
 * requests may still fail with 401 because they started with the old token.
 *
 * This wrapper catches that case and retries the request, which will then
 * use the freshly refreshed token from cookies.
 *
 * @param input - The URL or Request object to fetch
 * @param init - Optional fetch init options
 * @returns The fetch Response
 *
 * @example
 * // Use instead of fetch for authenticated API calls
 * const res = await fetchWithRetry('/api/notifications');
 * const data = await res.json();
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(input, init);
  } catch (error) {
    // Network error (DNS failure, timeout, offline, etc.)
    // Retry once after a short delay
    console.warn("Fetch failed, retrying once:", error);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Second attempt - let this one throw if it fails
    response = await fetch(input, init);
  }

  // If we get a 401, retry once - the token may have been refreshed by another request
  if (response.status === 401) {
    // Small delay to allow cookie propagation
    await new Promise((resolve) => setTimeout(resolve, 100));
    return fetch(input, init);
  }

  return response;
}
