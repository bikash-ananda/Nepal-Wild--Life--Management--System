const API_ROOT = import.meta.env.VITE_API_BASE || "";

function endpoint(path) {
  return `${API_ROOT}${path}`;
}

async function request(path, options = {}) {
  const response = await fetch(endpoint(path), {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = payload;
    throw error;
  }
  return payload;
}

function queryString(values = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

function listOptions(sortOrOptions, limit) {
  if (typeof sortOrOptions === "string") return { sort: sortOrOptions, limit };
  if (typeof sortOrOptions === "number") return { limit: sortOrOptions };
  return { ...(sortOrOptions || {}), ...(limit ? { limit } : {}) };
}

function entityApi(entity) {
  const root = `/api/entities/${encodeURIComponent(entity)}`;
  return {
    list: (sortOrOptions, limit) => request(`${root}${queryString(listOptions(sortOrOptions, limit))}`),
    filter: (filter = {}, sortOrOptions, limit) => request(`${root}${queryString({
      filter,
      ...listOptions(sortOrOptions, limit),
    })}`),
    get: (id) => request(`${root}/${encodeURIComponent(id)}`),
    create: (payload) => request(root, { method: "POST", body: JSON.stringify(payload) }),
    update: (id, patch) => request(`${root}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }),
    delete: (id) => request(`${root}/${encodeURIComponent(id)}`, { method: "DELETE" }),
  };
}

const entities = new Proxy({}, {
  get(_target, name) {
    if (typeof name !== "string") return undefined;
    if (name === "User") {
      return {
        list: () => request("/api/admin/users"),
        filter: (filter = {}) => request("/api/admin/users").then((users) => users.filter((user) => Object.entries(filter).every(([key, value]) => user[key] === value))),
        get: (id) => request(`/api/entities/User/${encodeURIComponent(id)}`),
        create: (payload) => request("/api/admin/users", { method: "POST", body: JSON.stringify(payload) }),
        update: (id, patch) => request(`/api/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }),
        delete: (id) => request(`/api/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status: "disabled" }) }),
      };
    }
    return entityApi(name);
  },
});

async function upload(path, { file, fields = {} }) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
  form.append("file", file, file?.name || "capture.jpg");
  return request(path, { method: "POST", body: form });
}

export const api = {
  entities,
  functions: {
    invoke: async (name, body = {}) => {
      const result = await request(`/api/functions/${encodeURIComponent(name)}`, { method: "POST", body: JSON.stringify(body) });
      return result?.data && typeof result.data === "object" ? { ...result, ...result.data, data: result.data } : result;
    },
  },
  notifications: {
    pushConfig: () => request("/api/notifications/push-config"),
    pushStatus: () => request("/api/notifications/push-status"),
    subscribe: (subscription) => request("/api/notifications/push-subscription", { method: "POST", body: JSON.stringify(subscription) }),
    unsubscribe: (endpoint) => request("/api/notifications/push-subscription", { method: "DELETE", body: JSON.stringify({ endpoint }) }),
  },
  cameras: {
    status: () => request("/api/cameras/status").then((response) => response.cameras || []),
    testConnection: (payload) => request("/api/cameras/test-connection", { method: "POST", body: JSON.stringify(payload) }),
    setup: (payload) => request("/api/cameras/setup", { method: "POST", body: JSON.stringify(payload) }),
    getConnection: (id) => request(`/api/cameras/${encodeURIComponent(id)}/connection`).then((response) => response.connection),
    configure: (id, payload) => request(`/api/cameras/${encodeURIComponent(id)}/connection`, { method: "PUT", body: JSON.stringify(payload) }).then((response) => response.connection),
    apply: (id) => request(`/api/cameras/${encodeURIComponent(id)}/connection/apply`, { method: "POST" }).then((response) => response.connection),
    remove: (id) => request(`/api/cameras/${encodeURIComponent(id)}/connection`, { method: "DELETE" }),
    viewToken: (id) => request(`/api/cameras/${encodeURIComponent(id)}/view-token`, { method: "POST" }),
    events: (id, limit = 30) => request(`/api/cameras/${encodeURIComponent(id)}/events?limit=${encodeURIComponent(limit)}`),
    eventStatus: (id) => request(`/api/cameras/${encodeURIComponent(id)}/events/status`),
    eventFeedUrl: (id) => `/api/cameras/${encodeURIComponent(id)}/events/ws`,
    ptz: (id, payload) => request(`/api/cameras/${encodeURIComponent(id)}/control/ptz`, { method: "POST", body: JSON.stringify(payload) }),
    deterrence: (id, payload) => request(`/api/cameras/${encodeURIComponent(id)}/control/deterrence`, { method: "POST", body: JSON.stringify(payload) }),
  },
  ai: {
    status: () => request("/api/ai/status"),
    analyze: (payload) => request("/api/ai/analyze", { method: "POST", body: JSON.stringify(payload) }),
  },
  public: {
    activeNotices: (ward = "", municipality = "") => request(`/api/v1/notices/active${queryString({ ward, municipality })}`),
    submitDamageReport: (payload) => request("/api/public/reports", { method: "POST", body: JSON.stringify(payload) }),
    reverseGeocode: (payload) => request("/api/public/geocode/reverse", { method: "POST", body: JSON.stringify(payload) }),
    manageNotices: () => request("/api/v1/notices/manage"),
    createManualNotice: (payload) => request("/api/v1/notices/manual", { method: "POST", body: JSON.stringify(payload) }),
    generateNoticeDraft: (payload) => request("/api/v1/notices/ai-generate", { method: "POST", body: JSON.stringify(payload) }),
    publishNotice: (id) => request(`/api/v1/notices/${encodeURIComponent(id)}/publish`, { method: "POST" }),
  },
  integrations: {
    Core: {
      UploadFile: ({ file }) => upload("/api/uploads", { file }),
      UploadPrivateFile: ({ file }) => upload("/api/uploads", { file }),
      UploadPublicFile: ({ file }) => upload("/api/public/uploads", { file, fields: { consent: true } }),
      CreateFileSignedUrl: ({ file_uri }) => request("/api/media/signed-url", { method: "POST", body: JSON.stringify({ file_uri }) }),
      SendEmail: ({ to, subject, body }) => request("/api/integrations/send-email", { method: "POST", body: JSON.stringify({ to, subject, body }) }),
    },
  },
  auth: {
    me: () => request("/api/auth/me").then((response) => response.user),
    loginViaEmailPassword: async (email, password) => {
      const response = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      return response.user;
    },
    logout: (redirectTo) => {
      const pending = request("/api/auth/logout", { method: "POST" }).catch(() => null);
      if (redirectTo) pending.finally(() => { window.location.assign("/login"); });
      return pending;
    },
    redirectToLogin: (returnTo = window.location.href) => {
      const path = new URL(returnTo, window.location.origin);
      const relative = path.origin === window.location.origin ? `${path.pathname}${path.search}${path.hash}` : "/";
      window.location.assign(`/login?returnTo=${encodeURIComponent(relative)}`);
    },
    resetPasswordRequest: (email) => request("/api/auth/request-password-reset", { method: "POST", body: JSON.stringify({ email }) }),
    resetPassword: (payload) => request("/api/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),
    loginWithProvider: () => { throw new Error("External sign-in is not configured for this deployment."); },
    verifyOtp: () => { throw new Error("Email verification is not enabled. New accounts need administrator approval."); },
    resendOtp: () => { throw new Error("Email verification is not enabled. New accounts need administrator approval."); },
    setToken: () => {},
  },
};

export default api;
