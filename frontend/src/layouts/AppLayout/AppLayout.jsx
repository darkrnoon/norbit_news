import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "./AppLayout.css";

function getInitials(name) {
  if (!name) return "П";
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}` || "П";
}

function getUserId(user) {
  return user?.user_id || user?.userId;
}

function getFullName(user) {
  return user?.contact?.full_name || user?.login || "Пользователь";
}

function getAvatar(user) {
  return user?.contact?.avatar || "";
}

function getBeads(user) {
  return user?.contact?.beads_balance ?? 0;
}

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef(null);

  const fullName = getFullName(user);
  const avatar = getAvatar(user);
  const beads = getBeads(user);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!profileRef.current) return;

      if (!profileRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleLogout() {
    setProfileMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__brand">
            <div className="app-header__logo">
              <img src="/assets/logo_norbit.svg" alt="" />
            </div>

            <div className="app-header__company">Норбит</div>
          </div>

          <div className="app-header__actions">
            <button
              className="app-header__create"
              type="button"
              onClick={() => navigate("/posts/new")}
            >
              <img src="/assets/plus.svg" alt="" />
              <span>Создать новость</span>
            </button>

            <div className="app-header__profile-wrap" ref={profileRef}>
              <button
                className="app-header__profile"
                type="button"
                onClick={() => setProfileMenuOpen((value) => !value)}
              >
                <div className="app-header__avatar">
                  {avatar ? (
                    <img src={avatar} alt="" />
                  ) : (
                    <span>{getInitials(fullName)}</span>
                  )}
                </div>

                <div className="app-header__profile-text">
                  <div className="app-header__name">{fullName}</div>

                  <div className="app-header__beads">
                    <img src="/assets/bead.svg" alt="" />
                    <span>{beads.toLocaleString("ru-RU")} бусинок</span>
                  </div>
                </div>
              </button>

              {profileMenuOpen && (
                <div className="app-header__profile-menu">
                  <button
                    className="app-header__profile-menu-item"
                    type="button"
                    onClick={handleLogout}
                  >
                    <img src="/assets/logout.svg" alt="" />
                    <span>Выйти из аккаунта</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="app-layout__body">
        <aside className="app-sidebar">
          <nav className="app-sidebar__nav">
            <NavLink className="app-sidebar__link" to="/" end>
              <img src="/assets/nav_feed.svg" alt="" />
              <span>Главная</span>
            </NavLink>

            <NavLink className="app-sidebar__link" to="/subscriptions">
              <img src="/assets/nav_subscriptions.svg" alt="" />
              <span>Мои подписки</span>
            </NavLink>

            <NavLink className="app-sidebar__link" to="/communities">
              <img src="/assets/nav_communities.svg" alt="" />
              <span>Сообщества</span>
            </NavLink>

            <NavLink className="app-sidebar__link" to="/help-requests">
              <img src="/assets/nav_help.svg" alt="" />
              <span>Запросы помощи</span>
            </NavLink>

            {user?.role?.should_display && (
              <NavLink className="app-sidebar__link" to="/admin">
                <img src="/assets/nav_admin.svg" alt="" />
                <span>Админ-панель</span>
              </NavLink>
            )}
          </nav>
        </aside>

        <main className="app-content">
          <Outlet context={{ userId: getUserId(user), user }} />
        </main>
      </div>
    </div>
  );
}