export type Environment = "LIVE" | "SANDBOX";
export const portalBases: Record<Environment, string> = {
  LIVE: "https://vestra-server-s44md.ondigitalocean.app/api",
  // Same-origin rewrite prevents browser CORS failures from the Sandbox host.
  SANDBOX: "/sandbox-api",
};
export const machineBases: Record<Environment, string> = {
  LIVE: "https://vestra-server-s44md.ondigitalocean.app/api/merchant/v1",
  SANDBOX: "https://merchant-sandbox-9qc2.onrender.com/api/merchant/v1",
};
export type Merchant = {
  id: string;
  name: string;
  code: string;
  email: string;
};


export type Session = { token: string; merchant: Merchant };
export class PortalError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
  ) {
    super(message);
  }
}



async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
  environment: Environment = "LIVE",
  authBase = false,
): Promise<T> {
  const r = await fetch(`${portalBases[authBase ? "LIVE" : environment]}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.success === false)
    throw new PortalError(
      body.message || "Request failed",
      body.code,
      r.status,
    );
  return body.data ?? body;
}
export const portalApi = {
  login: (email: string, password: string) =>
    request<Session>("/merchant/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, undefined, "LIVE", true),
  verify: (email: string, otp: string) =>
    request<Session>("/merchant/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    }, undefined, "LIVE", true),
  resend: (email: string) =>
    request("/merchant/auth/resend-verification-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    }, undefined, "LIVE", true),
  forgot: (email: string) =>
    request("/merchant/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }, undefined, "LIVE", true),
  reset: (
    email: string,
    otp: string,
    password: string,
    confirmPassword: string,
  ) =>
    request("/merchant/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, otp, password, confirmPassword }),
    }, undefined, "LIVE", true),
  me: (t: string, e: Environment) => request<Merchant>("/merchant/dashboard/me", {}, t, e),
  overview: (t: string, e: Environment) => request<any>("/merchant/dashboard/metrics/overview", {}, t, e),
  customerMetrics: (t: string, e: Environment) => request<any>("/merchant/dashboard/metrics/customers", {}, t, e),
  transactionMetrics: (t: string, e: Environment) => request<any>("/merchant/dashboard/metrics/transactions", {}, t, e),
  productMetrics: (t: string, e: Environment) => request<any>("/merchant/dashboard/metrics/products", {}, t, e),
  customers: (t: string, e: Environment) => request<any>("/merchant/dashboard/customers?page=1&limit=25", {}, t, e),
  transactions: (t: string, e: Environment, filters = "") =>
    request<any>(`/merchant/dashboard/transactions?page=1&limit=25${filters}`, {}, t, e),
  products: (t: string, e: Environment) => request<any>("/merchant/dashboard/products", {}, t, e),
  keys: (t: string, e: Environment) => request<any>("/merchant/dashboard/api-keys", { cache: "no-store" }, t, e),
  createKey: (t: string, e: Environment, name: string) =>
    request<any>(
      "/merchant/dashboard/api-keys",
      { method: "POST", body: JSON.stringify({ name }), cache: "no-store" }, t, e,
    ),
  revokeKey: (t: string, e: Environment, id: string) =>
    request(`/merchant/dashboard/api-keys/${id}/revoke`, { method: "POST", cache: "no-store" }, t, e),
};
