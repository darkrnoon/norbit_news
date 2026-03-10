import axios from "axios";

export const http = axios.create({
  baseURL: "/api",
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const url = err?.config?.url || ""; // например "/auth/login"

    // ✅ если это логин — 401 не трогаем, пусть LoginPage покажет ошибку
    const isLoginRequest = url.includes("/auth/login");

    if (status === 401 && !isLoginRequest) {
      localStorage.removeItem("accessToken");

      // редиректим только если не на /login
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(err);
  }
);