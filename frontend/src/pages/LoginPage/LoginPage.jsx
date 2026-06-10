import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import errorAuthIcon from "/assets/error_auth.svg";

import { useAuth } from "../../auth/AuthContext";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { login: loginUser } = useAuth();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/";

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!login.trim() || !password.trim()) {
      setError("Введите логин и пароль");
      return;
    }

    try {
      setIsSubmitting(true);

      await loginUser(login.trim(), password);

      navigate(from, { replace: true });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Не удалось выполнить вход. Проверьте логин и пароль"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1 className="login-card__title">Вход в систему</h1>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form__group">
            <label className="login-form__label" htmlFor="login">
              Логин
            </label>

            <input
              id="login"
              className="login-form__input"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              placeholder="ivanpetrov"
              autoComplete="username"
            />
          </div>

          <div className="login-form__group">
            <label className="login-form__label" htmlFor="password">
              Пароль
            </label>

            <input
              id="password"
              className="login-form__input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
        <div className="login-form__error">
          <img
            className="login-form__error-icon"
            src={errorAuthIcon}
            alt=""
            aria-hidden="true"
          />
          <span>{error}</span>
        </div>
      )}

          <button
            className="login-form__button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Вход..." : "Войти"}
          </button>
        </form>
      </section>
    </main>
  );
}