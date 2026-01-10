import { createBrowserClient } from "@supabase/ssr";

// Minimal cookie adapter for the browser.
// Supabase SSR wants getAll/setAll style cookie access.
function getAllCookies() {
  if (typeof document === "undefined") return [];

  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const eqIndex = c.indexOf("=");
      const name = eqIndex === -1 ? c : c.slice(0, eqIndex);
      const value = eqIndex === -1 ? "" : c.slice(eqIndex + 1);
      return { name, value: decodeURIComponent(value) };
    });
}

function setCookie(name: string, value: string, options: any = {}) {
  if (typeof document === "undefined") return;

  let cookie = `${name}=${encodeURIComponent(value)}`;

  if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
  if (options.expires) cookie += `; Expires=${options.expires.toUTCString?.() ?? options.expires}`;
  if (options.path) cookie += `; Path=${options.path}`;
  else cookie += `; Path=/`;

  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  if (options.secure) cookie += `; Secure`;

  document.cookie = cookie;
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return getAllCookies();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(name, value, options);
          });
        },
      },
    }
  );
}
