import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "../styles/login.css";

export default function LoginPage() {
  const { login: doLogin, isAuth, logout } = useAuth();
  const nav = useNavigate();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ редирект только эффектом, без навигации в render
  useEffect(() => {
    if (isAuth) nav("/", { replace: true });
  }, [isAuth, nav]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await doLogin(login, password);
      nav("/", { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.message || "Не удалось войти. Проверьте логин и пароль.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <h1 className="title">Вход в систему</h1>

        <form onSubmit={onSubmit}>
          <div className="field">
            <label className="label">Логин</label>
            <input
              className="input"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="ivan.petrov@norbit.ru"
              autoComplete="username"
            />
          </div>

          <div className="field">
            <label className="label">Пароль</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button className="button" type="submit" disabled={loading || !login || !password}>
            {loading ? "Вход..." : "Войти"}
          </button>

          {err && <div className="error">{err}</div>}
        </form>

        {/* опционально: кнопка "Выйти", чтобы можно было перелогиниться */}
        {isAuth && (
          <div style={{ marginTop: 10, textAlign: "center" }}>
            <button type="button" onClick={logout}>
              Выйти
            </button>
          </div>
        )}
      </div>
    </div>
  );
}