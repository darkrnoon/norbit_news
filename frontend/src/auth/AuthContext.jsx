import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { loginApi } from "../api/auth.api";
import { getMeApi } from "../api/me.api";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "../api/http";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getAccessToken() || "");
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(Boolean(getAccessToken()));

  const loadMe = useCallback(async () => {
    const currentToken = getAccessToken();

    if (!currentToken) {
      setToken("");
      setUser(null);
      setIsAuthLoading(false);
      return;
    }

    try {
      setIsAuthLoading(true);

      const me = await getMeApi();

      setToken(currentToken);
      setUser(me);
    } catch (e) {
      clearAccessToken();
      setToken("");
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    function handleLogout() {
      clearAccessToken();
      setToken("");
      setUser(null);
    }

    window.addEventListener("auth:logout", handleLogout);

    return () => {
      window.removeEventListener("auth:logout", handleLogout);
    };
  }, []);

  const login = useCallback(async (loginValue, password) => {
    const data = await loginApi(loginValue, password);

    setAccessToken(data.accessToken);
    setToken(data.accessToken);

    const me = await getMeApi();
    setUser(me);

    return me;
  }, []);

  const logout = useCallback(() => {
    clearAccessToken();
    setToken("");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuth: Boolean(token && user),
      isAuthLoading,
      login,
      logout,
      reloadUser: loadMe,
    }),
    [token, user, isAuthLoading, login, logout, loadMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}