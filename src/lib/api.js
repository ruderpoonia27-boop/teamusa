const API_URLS = buildApiUrls();
const responseCache = new Map();
const inFlightRequests = new Map();

let activeApiUrl = "";

export async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const method = options.method || "GET";
  const isGet = method === "GET" && !options.body;
  const cacheTtl = Number(options.cacheTtl ?? (isGet && !options.token ? 60000 : 0));
  const cacheKey = isGet ? `${options.token ? `auth:${options.token.slice(-12)}` : "public"}:${path}` : "";

  if (isGet && cacheTtl > 0) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    if (inFlightRequests.has(cacheKey)) return inFlightRequests.get(cacheKey);
  }

  const requestPromise = requestApi(path, {
    ...options,
    method,
    isFormData,
  });

  if (isGet && cacheTtl > 0) {
    inFlightRequests.set(cacheKey, requestPromise);
  }

  try {
    const data = await requestPromise;
    if (isGet && cacheTtl > 0) {
      responseCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + cacheTtl,
      });
    }
    return data;
  } finally {
    if (isGet && cacheTtl > 0) inFlightRequests.delete(cacheKey);
  }
}

export function clearApiCache(prefix = "") {
  for (const key of responseCache.keys()) {
    if (!prefix || key.includes(prefix)) responseCache.delete(key);
  }
}

export async function uploadApi(path, options = {}) {
  let lastError;

  for (const apiUrl of getApiCandidates()) {
    try {
      const data = await uploadRequest(`${apiUrl}${path}`, options);
      activeApiUrl = apiUrl;
      return data;
    } catch (error) {
      if (error.isNetworkError) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("API unavailable");
}

export function normalizeAssetUrl(value = "") {
  if (!value) return "";
  if (value.startsWith("data:")) return value;

  try {
    const url = new URL(value, typeof window !== "undefined" ? window.location.origin : undefined);
    const browserProtocol = typeof window !== "undefined" ? window.location.protocol : "https:";
    const isLocalHost = ["localhost", "127.0.0.1"].includes(url.hostname);

    if (browserProtocol === "https:" && url.protocol === "http:" && !isLocalHost) {
      url.protocol = "https:";
    }

    return url.toString();
  } catch {
    return value;
  }
}

async function requestApi(path, options = {}) {
  let lastError;

  for (const apiUrl of getApiCandidates()) {
    try {
      const response = await fetch(`${apiUrl}${path}`, {
        method: options.method,
        headers: {
          ...(options.isFormData ? {} : { "Content-Type": "application/json" }),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
        body: options.body ? (options.isFormData ? options.body : JSON.stringify(options.body)) : undefined,
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
  const browserProtocol =
    typeof window !== "undefined" && window.location.protocol
      ? window.location.protocol
      : "https:";
  const isLocalHost = ["localhost", "127.0.0.1"].includes(browserHost);
  const localProtocol = browserProtocol === "https:" ? "https:" : "http:";

  return [
    normalizeApiUrl(import.meta.env.VITE_API_URL),
    isLocalHost ? `${localProtocol}//${browserHost}:4000` : "",
    isLocalHost ? `${localProtocol}//${browserHost}:4001` : "",
    isLocalHost ? `${localProtocol}//${browserHost}:4002` : "",
  ].filter(Boolean);
}

function normalizeApiUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value);
    const browserProtocol = typeof window !== "undefined" ? window.location.protocol : "https:";
    const isLocalHost = ["localhost", "127.0.0.1"].includes(url.hostname);

    if (browserProtocol === "https:" && url.protocol === "http:" && !isLocalHost) {
      url.protocol = "https:";
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return String(value).replace(/\/$/, "");
  }
}

function uploadRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method || "POST", url);

    if (options.token) {
      xhr.setRequestHeader("Authorization", `Bearer ${options.token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !options.onProgress) return;
      options.onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      let data = {};
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        data = {};
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
        return;
      }

      const error = new Error(data.message || `API returned ${xhr.status}`);
      error.status = xhr.status;
      reject(error);
    };

    xhr.onerror = () => {
      const error = new Error("API unavailable");
      error.isNetworkError = true;
      reject(error);
    };

    xhr.send(options.body);
  });
}
