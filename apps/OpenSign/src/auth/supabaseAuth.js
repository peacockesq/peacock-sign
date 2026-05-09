function getEnvValue(name) {
  const runtime = window?.RUNTIME_ENV || {};
  return runtime[name] || import.meta.env?.[name] || "";
}

export function isSupabaseAuthEnabled() {
  return Boolean(getEnvValue("VITE_SUPABASE_URL") && getEnvValue("VITE_SUPABASE_ANON_KEY"));
}

function getSupabaseConfig() {
  const url = getEnvValue("VITE_SUPABASE_URL")?.replace(/\/$/, "");
  const anonKey = getEnvValue("VITE_SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    throw new Error("LexySign Supabase auth is not configured.");
  }
  return { url, anonKey };
}

async function parseSupabaseResponse(response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error_description || json?.msg || json?.message || "Supabase auth failed.");
  }
  return json;
}

export async function signInWithPassword(email, password) {
  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  return parseSupabaseResponse(response);
}

export async function signUpWithPassword({ email, password, company, name }) {
  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      data: {
        company,
        organization_name: company,
        name,
        full_name: name,
      },
    }),
  });
  return parseSupabaseResponse(response);
}

export function persistSupabaseSession(session) {
  if (!session?.access_token) return;
  localStorage.setItem("lexysign_supabase_access_token", session.access_token);
  if (session.refresh_token) {
    localStorage.setItem("lexysign_supabase_refresh_token", session.refresh_token);
  }
  if (session.expires_at) {
    localStorage.setItem("lexysign_supabase_expires_at", String(session.expires_at));
  }
}

export function clearSupabaseSession() {
  localStorage.removeItem("lexysign_supabase_access_token");
  localStorage.removeItem("lexysign_supabase_refresh_token");
  localStorage.removeItem("lexysign_supabase_expires_at");
}
