const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nexora_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("nexora_token", token);
  else localStorage.removeItem("nexora_token");
}

export function setBusinessId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem("nexora_business_id", id);
  else localStorage.removeItem("nexora_business_id");
}

export function getBusinessId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nexora_business_id");
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  provider?: string;
}

export function getStoredUser(): UserSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("nexora_user");
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user: UserSession | null) {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem("nexora_user", JSON.stringify(user));
  else localStorage.removeItem("nexora_user");
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (data?.error) {
      if (typeof data.error === "string") {
        message = data.error;
      } else if (typeof data.error === "object") {
        const errObj = data.error as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
        const fields = errObj.fieldErrors ? Object.entries(errObj.fieldErrors) : [];
        if (fields.length > 0) {
          message = fields.map(([_, errs]) => errs.join(", ")).join("; ");
        } else if (errObj.formErrors && errObj.formErrors.length > 0) {
          message = errObj.formErrors.join(", ");
        } else {
          message = JSON.stringify(data.error);
        }
      } else {
        message = JSON.stringify(data.error);
      }
    }
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  postForm: <T>(path: string, formData: FormData) => request<T>(path, { method: "POST", body: formData }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
};

export { ApiError };
