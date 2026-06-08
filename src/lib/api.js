const API_URLS = buildApiUrls();

let activeApiUrl = "";

export async function api(path, options = {}) {
  let lastError;
  const isFormData = options.body instanceof FormData;

  for (const apiUrl of getApiCandidates()) {
    try {
      const response = await fetch(`${apiUrl}${path}`, {
        method: options.method || "GET",
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
        body: options.body ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined,
      });

      const data = await response.json();
      activeApiUrl = apiUrl;
      if (response.ok) return data;
      const error = new Error(data.message || `API returned ${response.status}`);
      error.status = response.status;
      throw error;
    } catch (error) {
      if (error.name !== "TypeError") throw error;
      lastError = error;
    }
  }

  throw lastError || new Error("API unavailable");
}

function getApiCandidates() {
  const uniqueUrls = [...new Set(API_URLS)];
  if (!activeApiUrl) return uniqueUrls;
  return [activeApiUrl, ...uniqueUrls.filter((url) => url !== activeApiUrl)];
}

function buildApiUrls() {
  const browserHost =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.hostname
      : "localhost";

  return [
    import.meta.env.VITE_API_URL,
    `http://${browserHost}:4000`,
    "http://localhost:4000",
    "http://127.0.0.1:4000",
  ].filter(Boolean);
}
