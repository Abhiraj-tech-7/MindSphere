import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND}/api`;

export const http = axios.create({ baseURL: API });

http.interceptors.request.use((c) => {
  const t = localStorage.getItem("ms_token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

http.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e?.response?.status === 401) {
      localStorage.removeItem("ms_token");
      if (!window.location.pathname.startsWith("/auth") && window.location.pathname !== "/") {
        window.location.href = "/auth";
      }
    }
    return Promise.reject(e);
  }
);
