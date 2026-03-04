const BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

const getToken = () => localStorage.getItem("kg_token");

const headers = (extra = {}) => ({
  "Content-Type": "application/json",
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

export const api = {
  // Auth
  register: (data) =>
    fetch(`${BASE}/auth/register`, { method: "POST", headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),

  login: (data) =>
    fetch(`${BASE}/auth/login`, { method: "POST", headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),

  me: () =>
    fetch(`${BASE}/auth/me`, { headers: headers() }).then(r => r.json()),

  // Upload
  uploadFile: (file) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    }).then(r => r.json());
  },

  // Knowledge
  getKnowledge: (search = "", type = "") =>
    fetch(`${BASE}/knowledge?search=${search}&type=${type}`, { headers: headers() }).then(r => r.json()),

  getDocuments: () =>
    fetch(`${BASE}/knowledge/documents`, { headers: headers() }).then(r => r.json()),

  deleteItem: (id) =>
    fetch(`${BASE}/knowledge/${id}`, { method: "DELETE", headers: headers() }).then(r => r.json()),

  deleteDocument: (id) =>
    fetch(`${BASE}/knowledge/document/${id}`, { method: "DELETE", headers: headers() }).then(r => r.json()),

  // Chat
  chat: (message, history) =>
    fetch(`${BASE}/chat`, {
      method: "POST", headers: headers(),
      body: JSON.stringify({ message, history }),
    }).then(r => r.json()),
};
