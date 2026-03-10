import React, { createContext, useContext, useMemo, useState } from "react";
import { loginApi } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("accessToken") || "");

  const value = useMemo(() => {
    return {
      token,
      isAuth: !!token,

      async login(login, password) {
        const { accessToken } = await loginApi(login, password);
        localStorage.setItem("accessToken", accessToken);
        setToken(accessToken);
      },

      logout() {
        localStorage.removeItem("accessToken");
        setToken("");
      },
    };
  }, [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}